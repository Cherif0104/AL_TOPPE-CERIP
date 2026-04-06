import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { 
  Users, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
  Crown,
  Star,
  Building
} from 'lucide-react';
import { apiService } from '../services/api';
import Swal from 'sweetalert2';

type UIUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'entrepreneur' | 'coach' | 'bailleur' | 'admin';
  status: 'active' | 'inactive';
  created_at?: string;
  last_login?: string;
  verified: boolean;
  location?: string;
  sessions_count?: number;
  entrepreneurs_count?: number;
  specialization?: string;
  business?: string;
  programs_count?: number;
  total_funding?: string;
  permissions?: string;
};

type CreateForm = {
  name: string;
  phone: string;
  email: string;
  role: 'entrepreneur' | 'coach' | 'bailleur' | 'admin';
  password: string;
  password_confirm: string;
  organization: string;
  specialization: string;
  years_experience: number | string;
  bio: string;
  skills: string;
  certifications: string;
  is_certified: boolean;
  is_active: boolean;
  max_entrepreneurs: number | string;
  availability_schedule: string;
  preferred_contact_method: 'phone' | 'email' | 'whatsapp';
  success_rate: number | string;
  average_rating: number | string;
};

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [users, setUsers] = useState<UIUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UIUser | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<CreateForm['role']>('entrepreneur');
  const [savingEdit, setSavingEdit] = useState(false);

  // Form création
  const [form, setForm] = useState<CreateForm>({
    name: '',
    phone: '',
    email: '',
    role: 'entrepreneur',
    password: '',
    password_confirm: '',
    // champs coach optionnels
    organization: '',
    specialization: '',
    years_experience: 0,
    bio: '',
    skills: '',
    certifications: '',
    is_certified: false,
    is_active: true,
    max_entrepreneurs: 0,
    availability_schedule: '',
    preferred_contact_method: 'phone',
    success_rate: 0,
    average_rating: 0,
  });

  type BackendUser = {
    id: string;
    full_name?: string;
    phone: string;
    email: string;
    role: UIUser['role'] | string;
    is_active: boolean;
    created_at?: string;
    last_login?: string;
  };

  const normalizePhoneForApi = (raw: string): string => {
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('221')) {
      return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    }
    return raw.trim();
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiService.adminListUsers({
        search: searchTerm || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
        is_active: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
      });
      const list: BackendUser[] = (Array.isArray(data) ? data : (data.results || [])) as BackendUser[];
      const mapped: UIUser[] = list.map((u) => ({
        id: u.id,
        name: u.full_name || u.phone,
        phone: u.phone,
        email: u.email,
        role: u.role,
        status: u.is_active ? 'active' : 'inactive',
        created_at: u.created_at,
        last_login: u.last_login,
        verified: true,
        location: '',
      }));
      setUsers(mapped);
    } catch (e) {
      // fallback: garder liste vide
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => loadUsers(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterStatus, searchTerm]);

  const getRoleBadge = (role: string) => {
    const config: Record<string, { color: string; label: string; icon: typeof Building }> = {
      entrepreneur: { color: 'bg-blue-100 text-blue-800', label: 'Entrepreneur', icon: Building },
      coach: { color: 'bg-green-100 text-green-800', label: 'Coach', icon: Star },
      bailleur: { color: 'bg-purple-100 text-purple-800', label: 'Bailleur', icon: Crown },
      admin: { color: 'bg-red-100 text-red-800', label: 'Admin', icon: Shield },
    };
    
    const roleConfig = config[role] || config.entrepreneur;
    const IconComponent = roleConfig.icon;
    
    return (
      <Badge className={roleConfig.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {roleConfig.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string, verified: boolean) => {
    if (status === 'active' && verified) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <UserCheck className="w-3 h-3 mr-1" />
          Actif vérifié
        </Badge>
      );
    } else if (status === 'active' && !verified) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <ShieldX className="w-3 h-3 mr-1" />
          Actif non vérifié
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          <UserX className="w-3 h-3 mr-1" />
          Inactif
        </Badge>
      );
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.status === 'active') ||
                         (filterStatus === 'inactive' && user.status === 'inactive') ||
                         (filterStatus === 'verified' && user.verified) ||
                         (filterStatus === 'unverified' && !user.verified);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    // Comptes par rôle (en se basant sur les valeurs backend en minuscule)
    entrepreneurs: users.filter(u => u.role === 'entrepreneur').length,
    coaches: users.filter(u => u.role === 'coach').length,
    bailleurs: users.filter(u => u.role === 'bailleur').length,
    admins: users.filter((u) =>
      ['admin', 'administrateur'].includes(String(u.role || '').toLowerCase())
    ).length,
    active: users.filter(u => u.status === 'active').length,
    verified: users.filter(u => u.verified).length
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const phoneNorm = normalizePhoneForApi(form.phone);
      if (!phoneNorm || phoneNorm.replace(/\s/g, '').length < 12) {
        Swal.fire({ icon: 'warning', title: 'Téléphone', text: 'Saisis un numéro sénégalais valide (ex. 221701234567).' });
        setCreating(false);
        return;
      }
      const payloadUser = {
        phone: phoneNorm,
        email: form.email || undefined,
        role: form.role,
        password: form.password,
        password_confirm: form.password_confirm,
      };
      if (form.role === 'entrepreneur') {
        const entrepreneurPayload: Record<string, unknown> = {
          first_name: form.name.split(' ')[0] || form.name,
          last_name: form.name.split(' ').slice(1).join(' ') || '—',
          civility: 'M',
          cni_number: '',
          address: 'À compléter',
          whatsapp: '',
          birth_date: new Date().toISOString().slice(0, 10),
          phone: phoneNorm,
          email: form.email || '',
          password: form.password,
          password_confirm: form.password_confirm,
          primary_address: 'À compléter',
          primary_region: 'Dakar',
          primary_city: 'Dakar',
          primary_lat: '0',
          primary_lng: '0',
        };
        await apiService.createEntrepreneur(entrepreneurPayload);
      } else {
        const created: { id: string } = await apiService.adminCreateUser(payloadUser);

      if (form.role === 'coach') {
        let availabilityParsed: Record<string, unknown> = {};
        if (form.availability_schedule?.trim()) {
          try {
            availabilityParsed = JSON.parse(form.availability_schedule) as Record<string, unknown>;
          } catch {
            availabilityParsed = { raw: form.availability_schedule };
          }
        }
        const coachPayload: Record<string, unknown> = {
          user: created.id,
          organization: form.organization,
          specialization: form.specialization,
          years_experience: Number(form.years_experience) || 0,
          bio: form.bio,
          skills: form.skills ? String(form.skills).split(',').map((s: string) => s.trim()) : [],
          certifications: form.certifications ? String(form.certifications).split(',').map((s: string) => s.trim()) : [],
          is_certified: !!form.is_certified,
          is_active: !!form.is_active,
          max_entrepreneurs: Number(form.max_entrepreneurs) || 0,
          availability_schedule: availabilityParsed,
          preferred_contact_method: form.preferred_contact_method || 'phone',
          success_rate: Number(form.success_rate) || 0,
          average_rating: Number(form.average_rating) || 0,
        };
        await apiService.createCoach(coachPayload);
      } else if (form.role === 'bailleur') {
        const bailleurPayload: Record<string, unknown> = {
          user: created.id,
          organization_name: form.name || 'Organisation',
          organization_type: 'ong',
          contact_person: form.name,
          contact_position: '',
          website: '',
          sectors_supported: '',
          regions_covered: '',
          funding_capacity: '0',
          is_active: !!form.is_active,
        };
        await apiService.createBailleur(bailleurPayload);
      }
      }

      setShowAddDialog(false);
      setForm({
        ...form,
        name: '',
        phone: '',
        email: '',
        password: '',
        password_confirm: '',
      });
      await loadUsers();
      Swal.fire({ icon: 'success', title: 'Utilisateur créé', timer: 1800, showConfirmButton: false });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'Création impossible. Vérifie les champs ou les logs API.';
      Swal.fire({ icon: 'error', title: 'Erreur', text: msg });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: UIUser) => {
    setEditingUser(u);
    setEditEmail(u.email);
    setEditRole(u.role as CreateForm['role']);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await apiService.adminUpdateUser(editingUser.id, {
        email: editEmail || undefined,
        role: editRole,
      });
      setEditingUser(null);
      await loadUsers();
      Swal.fire({ icon: 'success', title: 'Modifications enregistrées', timer: 1500, showConfirmButton: false });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: string }).message)
          : 'Mise à jour impossible.';
      Swal.fire({ icon: 'error', title: 'Erreur', text: msg });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleVerify = async (u: UIUser) => {
    if (u.status !== 'active') {
      try {
        await apiService.adminUpdateUser(u.id, { is_active: true });
        await loadUsers();
        Swal.fire({ icon: 'success', title: 'Compte activé', timer: 1500, showConfirmButton: false });
      } catch (e: unknown) {
        Swal.fire({ icon: 'error', title: 'Erreur', text: 'Activation impossible.' });
      }
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Compte actif',
        text: 'Ce compte est déjà actif. La vérification téléphonique se fait via OTP à la connexion si besoin.',
      });
    }
  };

  const handleDelete = async (id: string, userName: string, isActive: boolean) => {
    // Confirmation avant désactivation
    const result = await Swal.fire({
      title: isActive ? 'Désactiver l\'utilisateur ?' : 'Réactiver l\'utilisateur ?',
      html: isActive 
        ? `<p>Êtes-vous sûr de vouloir <strong>désactiver</strong> l'utilisateur <strong>${userName}</strong> ?</p><p class="text-sm text-gray-600 mt-2">L'utilisateur ne pourra plus se connecter mais ses données seront conservées.</p>`
        : `<p>Êtes-vous sûr de vouloir <strong>réactiver</strong> l'utilisateur <strong>${userName}</strong> ?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: isActive ? '#dc2626' : '#006666',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isActive ? 'Oui, désactiver' : 'Oui, réactiver',
      cancelButtonText: 'Annuler',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Désactiver ou réactiver l'utilisateur au lieu de le supprimer
      await apiService.adminUpdateUser(id, { is_active: !isActive });
      
      await loadUsers();
      
      // Message de succès
      Swal.fire({
        icon: 'success',
        title: isActive ? 'Utilisateur désactivé' : 'Utilisateur réactivé',
        text: isActive 
          ? `L'utilisateur ${userName} a été désactivé avec succès.`
          : `L'utilisateur ${userName} a été réactivé avec succès.`,
        confirmButtonColor: '#006666',
        timer: 2000
      });
    } catch (e: any) {
      console.error('Erreur lors de la désactivation:', e);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: e.message || 'Une erreur est survenue lors de la désactivation de l\'utilisateur',
        confirmButtonColor: '#006666'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600">Administration des comptes et permissions</p>
        </div>
        {!showAddDialog && (
          <Button className="bg-[#006666] hover:bg-[#004d4d]" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        )}
      </div>
      {showAddDialog && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Créer un nouvel utilisateur</h2>
          </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="Prénom Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" placeholder="221XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as CreateForm['role'] })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="bailleur">Bailleur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                {form.role === 'coach' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organisation</Label>
                    <Input id="organization" placeholder="Organisation" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Spécialisation</Label>
                    <Input id="specialization" placeholder="Spécialisation" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Expérience (années)</Label>
                    <Input id="years_experience" type="number" value={form.years_experience} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input id="bio" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Compétences (séparées par des virgules)</Label>
                    <Input id="skills" placeholder="SEO,Growth,Branding" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certifications">Certifications (séparées par des virgules)</Label>
                    <Input id="certifications" placeholder="Google Ads" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability_schedule">Disponibilités (JSON)</Label>
                    <Input id="availability_schedule" placeholder='{"monday":"9h-17h"}' value={form.availability_schedule} onChange={(e) => setForm({ ...form, availability_schedule: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_contact_method">Contact préféré</Label>
                    <Select value={form.preferred_contact_method} onValueChange={(value) => setForm({ ...form, preferred_contact_method: value as CreateForm['preferred_contact_method'] })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Téléphone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_entrepreneurs">Max entrepreneurs</Label>
                    <Input id="max_entrepreneurs" type="number" value={form.max_entrepreneurs} onChange={(e) => setForm({ ...form, max_entrepreneurs: e.target.value })} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="Mot de passe" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirmation</Label>
                <Input id="password_confirm" type="password" placeholder="Confirmer" value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} />
              </div>
              <div className="col-span-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="active" checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
                  <Label htmlFor="active">Compte actif</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button className="bg-[#006666] hover:bg-[#004d4d]" onClick={handleCreate} disabled={creating}>
                {creating ? 'Création...' : 'Créer'}
              </Button>
            </div>
        </Card>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">{editingUser.phone}</p>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as CreateForm['role'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="bailleur">Bailleur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  Annuler
                </Button>
                <Button className="bg-[#006666]" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#006666]">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.entrepreneurs}</p>
            <p className="text-sm text-gray-600">Entrepreneurs</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.coaches}</p>
            <p className="text-sm text-gray-600">Coaches</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.bailleurs}</p>
            <p className="text-sm text-gray-600">Bailleurs</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            <p className="text-sm text-gray-600">Admins</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FF9933]">{stats.active}</p>
            <p className="text-sm text-gray-600">Actifs</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{stats.verified}</p>
            <p className="text-sm text-gray-600">Vérifiés</p>
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="entrepreneur">Entrepreneurs</SelectItem>
                <SelectItem value="coach">Coaches</SelectItem>
                <SelectItem value="bailleur">Bailleurs</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
                <SelectItem value="verified">Vérifiés</SelectItem>
                <SelectItem value="unverified">Non vérifiés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {filteredUsers.length} utilisateur(s) trouvé(s)
          </div>
        </div>
      </Card>

      {/* Table des utilisateurs */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#006666] rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {(user.name || user.phone || '?')
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">ID: {user.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="font-medium">{user.phone}</p>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status, user.verified)}</TableCell>
                <TableCell className="text-sm text-gray-600">{user.location}</TableCell>
                <TableCell className="text-sm text-gray-600">{user.last_login}</TableCell>
                
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" title="Modifier" onClick={() => openEdit(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title={user.status === 'active' ? 'Compte actif' : 'Activer le compte'}
                      onClick={() => handleVerify(user)}
                    >
                      {user.status === 'active' ? (
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                      ) : (
                        <ShieldX className="w-4 h-4 text-yellow-600" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      title="Désactiver / réactiver"
                      className="text-red-600"
                      onClick={() => handleDelete(user.id, user.name, user.status === 'active')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}