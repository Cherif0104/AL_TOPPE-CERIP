import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DashboardCard } from './DashboardCard';
import { EntrepreneurProfile } from './EntrepreneurProfile';
import { EntrepreneurQuickCapture } from './EntrepreneurQuickCapture';
import { TransactionJournal } from './TransactionJournal';
import {
  Users,
  Calendar,
  TrendingUp,
  Clock,
  Phone,
  MessageCircle,
  FileText,
  CheckCircle,
  Star,
  Award,
  Play,
  User as UserIcon
} from 'lucide-react';
import {
  User,
  apiService,
  formatRating,
  getSessionStatusColor,
  getAssignmentStatusColor,
  formatDate,
  getSessionTypeIcon,
  formatSessionDuration
} from '../services/api';
import { coachService, resolveCoachId } from '../services/coach';
import Swal from 'sweetalert2';

type Session = {
  id: string | number;
  session_type?: string;
  entrepreneur?: string;
  entrepreneur_name?: string;
  entrepreneur_detail?: Record<string, unknown>;
  scheduled_date?: string;
  duration_minutes?: number;
  agenda?: string;
  status?: string;
  [k: string]: unknown;
};

interface CoachDashboardProps {
  user: User;
  onPageChange?: (page: string, action?: string) => void;
}

export function CoachDashboard({ user, onPageChange }: CoachDashboardProps) {
  // Hooks: always declared unconditionally
  const [coachData, setCoachData] = useState<Record<string, unknown> | null>(null);
  const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entrepreneurs, setEntrepreneurs] = useState<{ id: string; full_name: string; business: string; status: string; raw: Record<string, unknown> }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSkills, setProfileSkills] = useState('');
  const [profileSpec, setProfileSpec] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      let coachId: string | null = resolveCoachId(user);
      if (!coachId && typeof window !== 'undefined') {
        const stored = localStorage.getItem('altoppe_user') || localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored as string);
            const pr = String(parsed?.role || '').trim().toLowerCase();
            coachId =
              parsed?.coach?.id ||
              parsed?.coach_id ||
              parsed?.coachId ||
              ((pr === 'coach' || pr === 'formateur') && parsed?.id ? String(parsed.id) : null) ||
              coachId;
          } catch (err) {
            console.warn('CoachDashboard: erreur parsing localStorage user', err);
          }
        }
      }

      if (!coachId && user?.id) {
        const ur = String(user.role || '').trim().toLowerCase();
        if (ur === 'coach' || ur === 'formateur') {
          coachId = String(user.id);
        }
      }

      try {
        const assignmentsPromise = coachId
          ? coachService.getAssignments(coachId).catch(() => [])
          : apiService.getAssignments().catch(() => []);
        const sessionsPromise = coachId
          ? coachService.getSessions(coachId).catch(() => [])
          : apiService.getSessions().catch(() => []);

        const [assignmentsData, sessionsData] = await Promise.all([assignmentsPromise, sessionsPromise]);

        const coachAssignmentsRaw = Array.isArray(assignmentsData) ? (assignmentsData as unknown[]) : [];
        const coachAssignmentsMapped = coachAssignmentsRaw.map((a) => a as Record<string, unknown>);
        const coachAssignments = coachId
          ? coachAssignmentsMapped.filter((rec) => String(rec["coach"]) === String(coachId))
          : coachAssignmentsMapped.filter((rec) => rec["coach"] === user.coach?.id);

        const coachSessionsRaw = Array.isArray(sessionsData) ? (sessionsData as unknown[]) : [];
        const coachSessions: Session[] = coachSessionsRaw.map(s => {
          const ss = s as Record<string, unknown>;

          // Recherche du nom dans différentes structures possibles
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entrepreneurDetail = ss['entrepreneur_detail'] as any;
          const eName = typeof ss['entrepreneur_name'] === 'string' ? ss['entrepreneur_name'] as string : '';
          const eDetailName = entrepreneurDetail?.full_name || entrepreneurDetail?.name ||
            (entrepreneurDetail?.first_name ? `${entrepreneurDetail.first_name} ${entrepreneurDetail.last_name || ''}`.trim() : '');

          const resolvedName = eName || eDetailName || (typeof ss['entrepreneur'] === 'string' ? ss['entrepreneur'] as string : '');

          return {
            id: ss['id'] ?? '',
            session_type: typeof ss['session_type'] === 'string' ? ss['session_type'] as string : undefined,
            entrepreneur: resolvedName,
            entrepreneur_id: ss['entrepreneur'],
            entrepreneur_name: resolvedName,
            entrepreneur_detail: entrepreneurDetail,
            scheduled_date: ss['scheduled_date'] ? String(ss['scheduled_date']) : undefined,
            duration_minutes: typeof ss['duration_minutes'] === 'number' ? ss['duration_minutes'] as number : (typeof ss['duration_minutes'] === 'string' ? parseInt(String(ss['duration_minutes']), 10) : undefined),
            agenda: typeof ss['agenda'] === 'string' ? ss['agenda'] as string : undefined,
            status: typeof ss['status'] === 'string' ? ss['status'] as string : undefined,
            ...ss,
          } as Session;
        });

        setAssignments(coachAssignments.length ? coachAssignments : []);
        setSessions(coachSessions.length ? coachSessions : []);
      } catch (e) {
        console.error('Erreur lors du chargement des assignments/sessions:', e);
        setAssignments([]);
        setSessions([]);
      }

      // Entrepreneurs: try to load via coachService using coach id
      try {
        if (coachId) {
          const data = await coachService.getCoachEntrepreneurs(coachId);
          console.log('Coach entrepreneurs payload:', data);

          const list: unknown[] = Array.isArray(data)
            ? (data as unknown[])
            : (Array.isArray((data as { entrepreneurs?: unknown[] })?.entrepreneurs)
              ? ((data as { entrepreneurs?: unknown[] }).entrepreneurs as unknown[])
              : []);

          const normalized = list.map((item) => {
            const e = item as Record<string, unknown>;
            const getStr = (k: string) => (typeof e[k] === 'string' ? (e[k] as string) : '');
            const first_name = getStr('first_name') || getStr('prenom') || '';
            const last_name = getStr('last_name') || getStr('nom') || '';
            const full_name = getStr('full_name') || `${first_name} ${last_name}`.trim();
            const activities = Array.isArray(e['activities']) ? (e['activities'] as unknown[]) : [];
            const firstActivity = activities.length > 0 ? (activities[0] as Record<string, unknown>) : null;
            const business = firstActivity ? (typeof firstActivity['title'] === 'string' ? (firstActivity['title'] as string) : '') : (getStr('business') || getStr('entreprise'));
            const status = typeof e['is_active'] === 'boolean' ? ((e['is_active'] as boolean) ? 'En cours' : 'Suspendu') : (getStr('status_display') || getStr('status') || 'Nouveau');

            return {
              id: getStr('id') || String(e['id'] || ''),
              full_name,
              business,
              status,
              raw: e,
            } as { id: string; full_name: string; business: string; status: string; raw: Record<string, unknown> };
          });

          setEntrepreneurs(normalized);
        } else {
          setEntrepreneurs([]);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des entrepreneurs:', err);
        setEntrepreneurs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!profileOpen || !user) return;
    setProfilePhone(user.phone || '');
    const sk = user.coach?.skills;
    setProfileSkills(Array.isArray(sk) ? sk.join(', ') : '');
    setProfileSpec(user.coach?.specialization || '');
  }, [profileOpen, user]);

  const normalizeCoachPhone = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('221')) {
      return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    }
    return raw.trim();
  };

  const saveCoachProfile = async () => {
    const coachId = user.coach?.id;
    if (!coachId) {
      Swal.fire({ icon: 'warning', title: 'Profil coach', text: 'Profil coach introuvable.' });
      return;
    }
    setProfileSaving(true);
    try {
      const phoneNorm = normalizeCoachPhone(profilePhone);
      if (phoneNorm.replace(/\s/g, '').length >= 12) {
        await apiService.updateProfile({ phone: phoneNorm });
      }
      const skillsArr = profileSkills.split(',').map((s) => s.trim()).filter(Boolean);
      await apiService.updateCoach(coachId, {
        skills: skillsArr,
        specialization: profileSpec || user.coach?.specialization,
      });
      const refreshed = await apiService.getProfile();
      localStorage.setItem('altoppe_user', JSON.stringify(refreshed));
      setProfileOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Profil mis à jour',
        timer: 1800,
        showConfirmButton: false,
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Mise à jour impossible.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Statistiques calculées
  const stats = {
    totalEntrepreneurs: user.coach?.current_entrepreneurs_count || entrepreneurs.length || assignments.length,
    activePrograms: assignments.filter((a: unknown) => String((a as Record<string, unknown>)['status']) === 'active').length,
    completedSessions: user.coach?.completed_sessions || sessions.filter(s => s.status === 'completed').length,
    successRate: user.coach?.success_rate || '85%'
  };

  const upcomingSessions = sessions
    .filter(s => String(s.status) === 'scheduled' && s.scheduled_date && new Date(String(s.scheduled_date)) >= new Date())
    .sort((a, b) => new Date(String(a.scheduled_date)).getTime() - new Date(String(b.scheduled_date)).getTime())
    .slice(0, 5);

  const journalEntrepreneurs = (
    entrepreneurs.length > 0
      ? entrepreneurs
      : assignments
          .map((a) => {
            const ar = a as Record<string, unknown>;
            const ent = ar['entrepreneur'];
            let id = '';
            let full_name = String(ar['entrepreneur_name'] || '');
            let phone = '';
            if (typeof ent === 'string') {
              id = ent;
            } else if (ent && typeof ent === 'object') {
              const o = ent as Record<string, unknown>;
              id = String(o['id'] || '');
              full_name =
                full_name ||
                String(o['full_name'] || o['name'] || `${o['first_name'] || ''} ${o['last_name'] || ''}`.trim());
              phone = String(o['phone'] || '');
            }
            return { id, full_name, phone, raw: {} as Record<string, unknown> };
          })
          .filter((row) => row.id)
  ).map((e) => {
    const raw = (e as { raw?: Record<string, unknown> }).raw || {};
    const nestedUser =
      raw.user && typeof raw.user === 'object'
        ? (raw.user as Record<string, unknown>)
        : null;
    const phoneFromUser =
      nestedUser && typeof nestedUser.phone === 'string' ? nestedUser.phone : '';
    return {
      id: e.id,
      full_name: e.full_name,
      phone:
        (typeof raw.phone === 'string' ? raw.phone : '') ||
        phoneFromUser ||
        ('phone' in e ? String((e as { phone?: string }).phone || '') : ''),
    };
  });

  const displayEntrepreneurs = entrepreneurs.length
    ? entrepreneurs
    : assignments.map((a) => {
      const ar = a as Record<string, unknown>;
      const entrepreneur = ar['entrepreneur'];
      let full_name = '';
      let business = '';
      if (entrepreneur && typeof entrepreneur === 'object') {
        full_name = String((entrepreneur as Record<string, unknown>)['name'] || '');
        business = String((entrepreneur as Record<string, unknown>)['business'] || '');
      } else {
        full_name = String(entrepreneur || '');
      }
      return {
        id: String(ar['id'] || ''),
        full_name,
        business,
        status: String(ar['status'] || 'Nouveau'),
        raw: ar,
      } as { id: string; full_name: string; business: string; status: string; raw: Record<string, unknown> };
    });

  const getEntrepreneurName = (session: Session) => {
    if (session.entrepreneur_name && !/^\d+$/.test(session.entrepreneur_name)) {
      return session.entrepreneur_name;
    }
    // Si c'est un ID, chercher dans la liste des entrepreneurs
    const eId = session.entrepreneur_id || session.entrepreneur;
    const found = entrepreneurs.find(e => String(e.id) === String(eId));
    if (found) return found.full_name;

    // Si session a assignment, essayer de trouver via assignment
    if (session.assignment) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assign = assignments.find(a => String((a as any).id) === String(session.assignment));
      if (assign) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ent = (assign as any).entrepreneur;
        if (ent && typeof ent === 'object') return ent.name || ent.full_name || '';
      }
    }

    return session.entrepreneur_name || session.entrepreneur || 'Entrepreneur inconnu';
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-[#006666]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#006666] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
          <p className="text-gray-700 font-semibold text-lg mb-1">Chargement du tableau de bord</p>
          <p className="text-gray-500 text-sm">Récupération de vos données...</p>
        </div>
      </div>
    );
  }

  const handleStartSession = async (sessionId: string | number) => {
    try {
      await coachService.updateSession(sessionId, { status: 'in_progress' });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'in_progress' } : s));
      Swal.fire({
        icon: 'success',
        title: 'Session démarrée',
        text: 'La session est maintenant en cours.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      console.error('Erreur démarrage session:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de démarrer la session.',
        confirmButtonColor: '#006666'
      });
    }
  };

  const handleDownloadReport = async () => {
    try {
      setReportDownloading(true);
      // determine coachId same way as above
      let coachId: string | null = user.coach?.id || null;
      if (!coachId && typeof window !== 'undefined') {
        const stored = localStorage.getItem('altoppe_user') || localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored as string);
            coachId = parsed?.coach?.id || parsed?.coach_id || parsed?.coachId || coachId;
          } catch (e) {
            // ignore
          }
        }
      }

      const payload = await coachService.getReports(coachId ?? undefined).catch((err) => { throw err; });
      if (!payload) {
        Swal.fire({
          icon: 'info',
          title: 'Information',
          text: 'Aucune donnée de rapport disponible',
          confirmButtonColor: '#006666'
        });
        return;
      }

      const filename = `al-toppe-report-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur génération rapport:', e);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Erreur lors de la génération du rapport. Voir la console pour plus de détails.',
        confirmButtonColor: '#006666'
      });
    } finally {
      setReportDownloading(false);
    }
  };

  // Si c'est un entrepreneur, afficher son profil
  if ((user.role || '').toLowerCase() === 'entrepreneur') {
    return (
      <div className="p-6 pb-36 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        <div className="mb-6 relative overflow-hidden bg-gradient-to-r from-[#006666] via-[#008080] to-[#006666] rounded-2xl shadow-xl p-6 md:p-8">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
                👋
              </span>
              Bienvenue {user.entrepreneur?.first_name || 'Entrepreneur'} !
            </h1>
            <p className="text-white/90 text-sm md:text-base">Voici un aperçu de votre profil et de vos activités sur AL-TOPPE.</p>
          </div>
        </div>
        <EntrepreneurProfile user={user} />
        <EntrepreneurQuickCapture user={user} />
      </div>
    );
  }

  return (
      <div className="p-4 md:p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
      {/* Styles CSS pour animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
      
      {/* En-tête moderne avec gradient */}
      <div className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#006666] via-[#008080] to-[#006666] rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          {/* Effet de brillance animé */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer"></div>
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <span className="bg-white/20 backdrop-blur-sm rounded-xl p-2 shadow-lg animate-bounce-subtle">
                    👨‍🏫
                  </span>
                  Tableau de bord Coach
                </h1>
                <p className="text-white/90 text-sm md:text-base">
                  {user.coach ? `${user.coach.organization} • ` : ''}Suivez vos entrepreneurs et gérez vos sessions d'accompagnement
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-white/40 bg-white/15 text-white hover:bg-white/25"
                  onClick={() => setProfileOpen(true)}
                  title="Téléphone, compétences, spécialisation"
                >
                  MàJ profil
                </Button>
                {user.coach?.is_certified && (
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 px-4 py-2 text-sm font-semibold shadow-lg">
                    <Award className="w-4 h-4 mr-2" />
                    Certifié
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-white/90 text-[#006666] hover:bg-white"
                  onClick={() => setProfileOpen(true)}
                >
                  Mettre à jour le profil
                </Button>
              </div>
            </div>

            {user.coach && (
              <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex flex-wrap items-center gap-4 md:gap-8 text-sm text-white">
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors cursor-default">
                    <Award className="w-4 h-4 text-[#FFD700]" />
                    <span><strong>{user.coach.specialization}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors cursor-default">
                    <Calendar className="w-4 h-4 text-[#87CEEB]" />
                    <span><strong>{user.coach.years_experience} ans</strong> d'expérience</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-colors cursor-default">
                    <Star className="w-4 h-4 text-[#FF9933] fill-[#FF9933]" />
                    <span><strong>{formatRating(parseFloat(user.coach.average_rating || '0'))}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cartes de statistiques modernes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/60 text-sm font-medium">Total</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalEntrepreneurs}</div>
            <div className="text-white/80 text-sm">{stats.activePrograms} actifs</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16"></div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/60 text-sm font-medium">Actifs</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.activePrograms}</div>
            <div className="text-white/80 text-sm">Programmes en cours</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16"></div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/60 text-sm font-medium">Terminées</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.completedSessions}</div>
            <div className="text-white/80 text-sm">Sessions complétées</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16"></div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/60 text-sm font-medium">Performance</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.successRate}</div>
            <div className="text-white/80 text-sm">Taux de succès</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16"></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Entrepreneurs récents */}
        <Card className="p-4 md:p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-xl p-2 shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Mes Entrepreneurs</h3>
                <p className="text-xs text-gray-500 mt-0.5">{displayEntrepreneurs.length} au total</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white transition-colors shadow-sm"
              onClick={() => onPageChange ? onPageChange('entrepreneurs') : undefined}
            >
              Voir tous
            </Button>
          </div>

          {displayEntrepreneurs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Aucun entrepreneur</p>
              <p className="text-gray-400 text-xs mt-1">Commencez par ajouter un entrepreneur</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100">
                    <TableHead className="min-w-[150px] text-gray-600 font-semibold">Entrepreneur</TableHead>
                    <TableHead className="text-gray-600 font-semibold">Statut</TableHead>
                    <TableHead className="min-w-[120px] text-gray-600 font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayEntrepreneurs.slice(0, 4).map((e) => (
                    <TableRow 
                      key={e.id} 
                      className="hover:bg-gradient-to-r hover:from-[#006666]/5 hover:to-transparent transition-all duration-200 cursor-pointer border-b border-gray-50 group"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#006666] to-[#004d4d] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform duration-200">
                            {e.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm md:text-base text-gray-900 truncate">{e.full_name}</p>
                            <p className="text-xs md:text-sm text-gray-500 truncate max-w-[150px]">{e.business || 'Aucune activité'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getAssignmentStatusColor(String(e.status))} text-[10px] md:text-xs whitespace-nowrap shadow-sm font-medium`}>
                          {String(e.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(String((e.raw && ((e.raw as Record<string, unknown>)['start_date'] || (e.raw as Record<string, unknown>)['created_at'])) || ''))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Sessions à venir */}
        <Card className="p-4 md:p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-xl p-2 shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Sessions à venir</h3>
                <p className="text-xs text-gray-500 mt-0.5">{upcomingSessions.length} prochaines</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-[#FF9933] text-[#FF9933] hover:bg-[#FF9933] hover:text-white transition-colors shadow-sm"
              onClick={() => onPageChange ? onPageChange('sessions') : undefined}
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Planifier</span>
            </Button>
          </div>

          <div className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Aucune session planifiée</p>
                <p className="text-gray-400 text-xs mt-1">Planifiez votre prochaine session</p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <div 
                  key={session.id} 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-[#FF9933]/30 hover:shadow-md transition-all duration-200 gap-3"
                >
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-xl flex items-center justify-center text-white text-lg shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <span>{getSessionTypeIcon(session.session_type)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm md:text-base truncate mb-1">{getEntrepreneurName(session)}</p>
                      <p className="text-xs md:text-sm text-gray-600 font-medium mb-1">
                        {new Date(session.scheduled_date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500 truncate">
                        {formatSessionDuration(session.duration_minutes)} • {session.agenda || 'Sans agenda'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 shrink-0">
                    <Badge className={`${getSessionStatusColor(session.status)} text-[10px] md:text-xs shadow-sm font-medium`}>
                      {session.status}
                    </Badge>
                    {session.status === 'scheduled' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleStartSession(session.id)} 
                        title="Démarrer" 
                        className="h-9 w-9 p-0 border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white transition-colors rounded-lg shadow-sm"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      {/* Journal des Transactions */}
      <div className="mt-8">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-2 shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Journal des Transactions</h3>
          </div>
          <p className="text-xs text-gray-500 ml-12">Suivez les transactions financières de vos entrepreneurs</p>
        </div>
        <TransactionJournal showEntrepreneurSelector={true} entrepreneurs={journalEntrepreneurs} />
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mettre à jour mon profil coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Téléphone</Label>
              <Input
                className="mt-1"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="221 70 123 45 67"
              />
            </div>
            <div>
              <Label>Spécialisation</Label>
              <Input className="mt-1" value={profileSpec} onChange={(e) => setProfileSpec(e.target.value)} />
            </div>
            <div>
              <Label>Compétences (séparées par des virgules)</Label>
              <Input
                className="mt-1"
                value={profileSkills}
                onChange={(e) => setProfileSkills(e.target.value)}
                placeholder="Marketing, Finance, Pitch…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-[#006666]" onClick={saveCoachProfile} disabled={profileSaving}>
              {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions rapides modernes */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="group relative overflow-hidden p-6 text-center flex flex-col items-center bg-gradient-to-br from-white to-gray-50 border-2 border-transparent hover:border-[#006666]/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h4 className="font-bold text-gray-900 mb-2 text-lg">Nouvel entrepreneur</h4>
          <p className="text-xs md:text-sm text-gray-600 mb-6 flex-grow">Ajouter un entrepreneur à accompagner</p>
          <Button 
            className="w-full bg-gradient-to-r from-[#006666] to-[#004d4d] hover:from-[#004d4d] hover:to-[#006666] text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold" 
            onClick={() => onPageChange ? onPageChange('entrepreneurs', 'add') : undefined}
          >
            Ajouter
          </Button>
        </Card>

        <Card className="group relative overflow-hidden p-6 text-center flex flex-col items-center bg-gradient-to-br from-white to-orange-50/50 border-2 border-transparent hover:border-[#FF9933]/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h4 className="font-bold text-gray-900 mb-2 text-lg">Planifier session</h4>
          <p className="text-xs md:text-sm text-gray-600 mb-6 flex-grow">Créer une nouvelle session de coaching</p>
          <Button 
            className="w-full bg-gradient-to-r from-[#FF9933] to-[#e68a2e] hover:from-[#e68a2e] hover:to-[#FF9933] text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl font-semibold" 
            onClick={() => onPageChange ? onPageChange('sessions', 'add') : undefined}
          >
            Planifier
          </Button>
        </Card>

        <Card className="group relative overflow-hidden p-6 text-center flex flex-col items-center sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-white to-green-50/50 border-2 border-transparent hover:border-green-500/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h4 className="font-bold text-gray-900 mb-2 text-lg">Rapport mensuel</h4>
          <p className="text-xs md:text-sm text-gray-600 mb-6 flex-grow">Générer le rapport d'activité complet</p>
          <Button 
            variant="outline" 
            className="w-full border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-all duration-300 rounded-xl font-semibold shadow-sm hover:shadow-md" 
            onClick={() => onPageChange ? onPageChange('reports') : undefined}
          >
            Générer
          </Button>
        </Card>
      </div>
    </div>
  );
}