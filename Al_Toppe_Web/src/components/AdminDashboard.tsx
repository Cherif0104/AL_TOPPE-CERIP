import { Card } from './ui/card';
import { useEffect, useState } from 'react';
import { apiService, Coach, Entrepreneur } from '../services/api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DashboardCard } from './DashboardCard';
import { TransactionJournal } from './TransactionJournal';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { 
  Users, 
  Building, 
  DollarSign, 
  TrendingUp,
  Shield,
  AlertTriangle,
  Activity,
  FileText,
  Settings,
  Download,
  UserCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { User } from '../services/api';

interface AdminDashboardProps {
  user: User;
  onPageChange?: (page: string) => void;
}

export function AdminDashboard({ user: _user, onPageChange }: AdminDashboardProps) {
  // Données initiales (fallback)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeEntrepreneurs: 0,
    totalCoaches: 0,
    totalBailleurs: 0,
    monthlyGrowth: '—',
    totalFunding: '0',
    entrepreneursNewThisMonth: 0,
    fundingVsPrevLabel: '—',
    systemHealth: 0,
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      type: 'user_registration',
      user: 'Fatou Diop',
      action: 'Nouveau compte entrepreneur',
      time: 'Il y a 2 minutes',
      status: 'success'
    },
    {
      id: 2,
      type: 'funding_application',
      user: 'Moussa Sall',
      action: 'Candidature à un programme',
      time: 'Il y a 15 minutes',
      status: 'pending'
    },
    {
      id: 3,
      type: 'coach_assignment',
      user: 'Coach Awa Ndiaye',
      action: 'Assignation nouvel entrepreneur',
      time: 'Il y a 1 heure',
      status: 'success'
    },
    {
      id: 4,
      type: 'system_alert',
      user: 'Système',
      action: 'Mise à jour base de données',
      time: 'Il y a 2 heures',
      status: 'warning'
    }
  ]);

  const [systemMetrics, setSystemMetrics] = useState([
    { name: 'CPU', value: 45, color: '#006666' },
    { name: 'Mémoire', value: 67, color: '#FF9933' },
    { name: 'Disque', value: 23, color: '#006666' },
    { name: 'Réseau', value: 89, color: '#FF9933' }
  ]);

  const [topCoaches, setTopCoaches] = useState<Array<{
    name: string;
    entrepreneurs: number;
    success_rate: number;
    id?: string;
    raw?: unknown;
  }>>([]);

  const [entrepreneurs, setEntrepreneurs] = useState<Array<{ id: string; full_name: string; phone: string }>>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string>('');
  const [selectedEntrepreneurs, setSelectedEntrepreneurs] = useState<Set<string>>(new Set());
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignResult, setBulkAssignResult] = useState<{
    created: number;
    skipped: number;
    errors: number;
    details?: unknown;
  } | null>(null);

  const loadStats = async () => {
    try {
      const data = await apiService.getAdminStats();
      setStats({
        totalUsers: data.total_users,
        activeEntrepreneurs: data.active_entrepreneurs,
        totalCoaches: data.total_coaches,
        totalBailleurs: data.total_bailleurs,
        monthlyGrowth: data.monthly_growth ?? '—',
        totalFunding: String(data.total_funding ?? '0'),
        entrepreneursNewThisMonth: data.entrepreneurs_new_this_month ?? 0,
        fundingVsPrevLabel: data.funding_vs_prev_label ?? '—',
        systemHealth: data.system_health ?? 0,
      });
      setRecentActivities(data.recent_activities || []);
      setSystemMetrics(data.system_metrics || []);
      // Ne pas utiliser top_coaches de l'API, on utilisera les données réelles des coaches
      // setTopCoaches(data.top_coaches || []);
    } catch (e) {
      // fallback silencieux
    }
  };
  
  const loadEntrepreneurs = async () => {
    try {
      const data = await apiService.request<unknown>('/entrepreneurs/');
      const results = Array.isArray((data as { results?: unknown[] })?.results)
        ? (data as { results: unknown[] }).results
        : (Array.isArray(data) ? data : []);
      const formatted = results.map((ent: {
        id?: string;
        full_name?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        phone_number?: string;
      }) => ({
        id: ent.id || '',
        full_name: ent.full_name || `${ent.first_name || ''} ${ent.last_name || ''}`.trim() || 'Entrepreneur',
        phone: ent.phone || ent.phone_number || ''
      }));
      setEntrepreneurs(formatted);
    } catch (e) {
      console.error('Erreur chargement entrepreneurs:', e);
    }
  };

  const loadCoaches = async () => {
    try {
      const coachesList = await apiService.getCoaches();
      // Normaliser la réponse : peut être un tableau ou un objet avec 'results'
      const normalized = Array.isArray(coachesList) 
        ? coachesList 
        : (Array.isArray((coachesList as unknown as { results?: Coach[] })?.results) 
          ? (coachesList as unknown as { results?: Coach[] }).results 
          : []);
      setCoaches(normalized);
      
      // Mettre à jour topCoaches avec les données réelles des coaches
      // Trier par nombre d'entrepreneurs et prendre les 4 premiers
      const coachesWithStats = normalized
        .map((coach) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = coach as any;
          const entrepreneursCount = Array.isArray(c.entrepreneurs) 
            ? c.entrepreneurs.length 
            : (typeof c.current_entrepreneurs_count === 'number' 
              ? c.current_entrepreneurs_count 
              : 0);
          
          return {
            name: c.coach_name || c.organization || `Coach ${coach.id.substring(0, 8)}`,
            entrepreneurs: entrepreneursCount,
            success_rate: typeof c.success_rate === 'number' ? c.success_rate : (c.average_rating ? Math.round(parseFloat(c.average_rating) * 10) : 85),
            id: coach.id,
            raw: c
          };
        })
        .filter(c => c.entrepreneurs > 0) // Filtrer ceux qui ont au moins un entrepreneur
        .sort((a, b) => b.entrepreneurs - a.entrepreneurs) // Trier par nombre décroissant
        .slice(0, 4); // Prendre les 4 premiers
      
      if (coachesWithStats.length > 0) {
        setTopCoaches(coachesWithStats);
      }
    } catch (e) {
      console.error('Erreur chargement coaches:', e);
      setCoaches([]); // S'assurer que c'est toujours un tableau
    }
  };

  useEffect(() => {
    loadStats();
    loadEntrepreneurs();
    loadCoaches();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <Users className="w-4 h-4" />;
      case 'funding_application': return <DollarSign className="w-4 h-4" />;
      case 'coach_assignment': return <Shield className="w-4 h-4" />;
      case 'system_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      success: { color: 'bg-green-100 text-green-800', label: 'Succès' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      warning: { color: 'bg-orange-100 text-orange-800', label: 'Attention' },
      error: { color: 'bg-red-100 text-red-800', label: 'Erreur' }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.success;
    
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen space-y-8">
      {/* Header premium */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#006666] via-[#008080] to-[#006666] rounded-2xl shadow-xl p-6 md:p-8">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span className="bg-white/20 backdrop-blur-sm rounded-xl p-2 shadow-lg">🛡️</span>
              Administration AL-TOPPE
            </h1>
            <p className="text-white/90 text-sm md:text-base mt-2">
              Supervisez la plateforme, suivez l’activité et lancez les actions d’administration.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white shadow-sm"
              onClick={async () => {
                try {
                  const data = await apiService.request<unknown>('/entrepreneurs/');
                  const rows = Array.isArray((data as { results?: unknown[] })?.results)
                    ? (data as { results: unknown[] }).results
                    : (Array.isArray(data) ? data : []);
                  const csv = ['id,full_name,phone'].concat(
                    rows.map((r: { id?: string; full_name?: string; phone?: string }) =>
                      `"${r.id || ''}","${(r.full_name || '').replace(/"/g, '""')}","${r.phone || ''}"`,
                    ),
                  ).join('\n');
                  const blob = new Blob([ csv ], { type: 'text/csv;charset=utf-8' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `export-entrepreneurs-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter données
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white shadow-sm"
              onClick={() => onPageChange?.('analytics')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Rapport mensuel
            </Button>
            <Button className="bg-white text-[#006666] hover:bg-white/90 shadow-md" onClick={() => onPageChange?.('settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </div>
        </div>
      </div>

      {/* Statistiques principales (premium cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="group relative overflow-hidden bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/70 text-sm font-medium">{stats.monthlyGrowth}</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.totalUsers}</div>
            <div className="text-white/80 text-sm">Utilisateurs totaux</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16" />
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/70 text-sm font-medium">
                {stats.entrepreneursNewThisMonth > 0 ? '+' : ''}
                {stats.entrepreneursNewThisMonth} ce mois
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.activeEntrepreneurs}</div>
            <div className="text-white/80 text-sm">Entrepreneurs actifs</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16" />
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/70 text-sm font-medium">{stats.fundingVsPrevLabel}</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {Number.isFinite(Number(stats.totalFunding))
                ? `${Number(stats.totalFunding).toLocaleString('fr-FR')} FCFA`
                : stats.totalFunding}
            </div>
            <div className="text-white/80 text-sm">Revenus enregistrés (cumul)</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16" />
          </div>
        </div>

        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="text-white/70 text-sm font-medium">Excellent</div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.systemHealth}%</div>
            <div className="text-white/80 text-sm">Santé du système</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mb-16" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activités récentes */}
        <Card className="lg:col-span-2 p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-xl p-2 shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Activités récentes</h3>
                <p className="text-xs text-gray-500 mt-0.5">Derniers événements de la plateforme</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white transition-colors shadow-sm">
              Voir tout
            </Button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:shadow-md hover:border-[#006666]/20 transition-all"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#006666]">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{activity.user}</p>
                  <p className="text-sm text-gray-600">{activity.action}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(activity.status)}
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Métriques système */}
        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-xl p-2 shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Métriques système</h3>
              <p className="text-xs text-gray-500 mt-0.5">Charge et disponibilité</p>
            </div>
          </div>
          <div className="space-y-4">
            {systemMetrics.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className="text-sm text-gray-600">{metric.value}%</span>
                </div>
                <Progress 
                  value={metric.value} 
                  className="h-2"
                  style={{ backgroundColor: metric.color }}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-800">✓ Tous les systèmes opérationnels</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top coaches */}
        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-2 shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Meilleurs coaches</h3>
              <p className="text-xs text-gray-500 mt-0.5">Performance & suivi</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coach</TableHead>
                <TableHead>Entrepreneurs</TableHead>
                <TableHead>Taux succès</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCoaches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    Aucun coach avec des entrepreneurs assignés
                  </TableCell>
                </TableRow>
              ) : (
                topCoaches.map((coach, index) => (
                  <TableRow key={coach.id || index} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-transparent transition-colors">
                    <TableCell className="font-medium">{coach.name}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-900">{coach.entrepreneurs}</span>
                      <span className="text-xs text-gray-500 ml-1">entrepreneur{coach.entrepreneurs > 1 ? 's' : ''}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold">{coach.success_rate}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#006666] to-[#004d4d] h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${coach.success_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Répartition des utilisateurs */}
        <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-2 shadow-md">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Répartition des utilisateurs</h3>
              <p className="text-xs text-gray-500 mt-0.5">Vue par rôle</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#006666] rounded-full"></div>
                <span className="text-sm font-medium">Entrepreneurs</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{stats.activeEntrepreneurs}</span>
                <p className="text-xs text-gray-600">71.5%</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[#FF9933] rounded-full"></div>
                <span className="text-sm font-medium">Coaches</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{stats.totalCoaches}</span>
                <p className="text-xs text-gray-600">3.6%</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Bailleurs</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{stats.totalBailleurs}</span>
                <p className="text-xs text-gray-600">1.8%</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Journal des Transactions */}
      <div className="mb-6">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-[#006666] to-[#004d4d] rounded-xl p-2 shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Journal des Transactions</h3>
          </div>
          <p className="text-xs text-gray-500 ml-12">Suivez les transactions financières des entrepreneurs</p>
        </div>
        <TransactionJournal 
          showEntrepreneurSelector={true}
          entrepreneurs={entrepreneurs}
        />
      </div>

      {/* Actions d'administration */}
      <Card className="p-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm rounded-2xl hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="bg-gradient-to-br from-[#FF9933] to-[#e68a2e] rounded-xl p-2 shadow-md">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Actions d'administration</h3>
            <p className="text-xs text-gray-500 mt-0.5">Outils rapides</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-2xl border-2 border-transparent hover:border-[#006666]/30 bg-gradient-to-br from-white to-gray-50 shadow-sm hover:shadow-md transition-all"
            onClick={() => onPageChange?.('users')}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006666] to-[#004d4d] flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Gérer utilisateurs</span>
          </Button>
          <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="h-24 flex-col gap-2 rounded-2xl border-2 border-transparent hover:border-[#FF9933]/30 bg-gradient-to-br from-white to-orange-50/50 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF9933] to-[#e68a2e] flex items-center justify-center shadow-md">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <span className="font-semibold">Assigner coach</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assigner un Coach à Plusieurs Entrepreneurs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Sélection du coach */}
                <div className="space-y-2">
                  <Label htmlFor="coach-select">Sélectionner un Coach *</Label>
                  <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                    <SelectTrigger id="coach-select">
                      <SelectValue placeholder="Choisir un coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(coaches) && coaches.length > 0 ? (
                        coaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            <div className="flex items-center justify-between w-full">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              <span>{(coach as any).coach_name || coach.organization || `Coach ${coach.id.substring(0, 8)}`}</span>
                              <span className="text-xs text-gray-500 ml-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {(coach as any).current_entrepreneurs_count || 0}/{coach.max_entrepreneurs || '∞'}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-coaches" disabled>
                          Aucun coach disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedCoach && Array.isArray(coaches) && (
                    <div className="text-sm text-gray-600">
                      {(() => {
                        const coach = coaches.find(c => c.id === selectedCoach);
                        return coach ? (
                          <>
                            <p>Spécialisation: {coach.specialization}</p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <p>Places disponibles: {(coach as any).available_slots || 'Illimité'}</p>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>

                {/* Sélection des entrepreneurs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sélectionner les Entrepreneurs *</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allIds = new Set(entrepreneurs.map(e => e.id));
                          setSelectedEntrepreneurs(selectedEntrepreneurs.size === entrepreneurs.length ? new Set() : allIds);
                        }}
                      >
                        {selectedEntrepreneurs.size === entrepreneurs.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                    {entrepreneurs.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun entrepreneur disponible</p>
                    ) : (
                      <div className="space-y-2">
                        {entrepreneurs.map((entrepreneur) => (
                          <div key={entrepreneur.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`ent-${entrepreneur.id}`}
                              checked={selectedEntrepreneurs.has(entrepreneur.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedEntrepreneurs);
                                if (checked) {
                                  newSet.add(entrepreneur.id);
                                } else {
                                  newSet.delete(entrepreneur.id);
                                }
                                setSelectedEntrepreneurs(newSet);
                              }}
                            />
                            <Label
                              htmlFor={`ent-${entrepreneur.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              {entrepreneur.full_name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedEntrepreneurs.size} entrepreneur(s) sélectionné(s)
                  </p>
                </div>

                {/* Date de début */}
                <div className="space-y-2">
                  <Label htmlFor="start-date">Date de début</Label>
                  <Input
                    id="start-date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Résultats de l'assignation */}
                {bulkAssignResult && (
                  <div className={`p-4 rounded-lg ${
                    bulkAssignResult.errors === 0 ? 'bg-green-50' : 'bg-yellow-50'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {bulkAssignResult.errors === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      )}
                      <h4 className="font-semibold">Résultat de l'assignation</h4>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-green-600">✓ {bulkAssignResult.created} assignation(s) créée(s)</p>
                      {bulkAssignResult.skipped > 0 && (
                        <p className="text-yellow-600">⚠ {bulkAssignResult.skipped} assignation(s) ignorée(s) (déjà assigné)</p>
                      )}
                      {bulkAssignResult.errors > 0 && (
                        <p className="text-red-600">✗ {bulkAssignResult.errors} erreur(s)</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowBulkAssignDialog(false);
                      setSelectedCoach('');
                      setSelectedEntrepreneurs(new Set());
                      setBulkAssignResult(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    className="bg-[#006666] hover:bg-[#004d4d]"
                    onClick={async () => {
                      if (!selectedCoach || selectedEntrepreneurs.size === 0) {
                        alert('Veuillez sélectionner un coach et au moins un entrepreneur');
                        return;
                      }

                      setBulkAssigning(true);
                      setBulkAssignResult(null);
                      
                      try {
                        const startDateInput = document.getElementById('start-date') as HTMLInputElement;
                        const result = await apiService.bulkAssignCoach({
                          coach: selectedCoach,
                          entrepreneurs: Array.from(selectedEntrepreneurs),
                          start_date: startDateInput?.value || new Date().toISOString().split('T')[0],
                          objectives: ['Assignation en masse par administrateur']
                        });

                        setBulkAssignResult({
                          created: result.summary.created,
                          skipped: result.summary.skipped,
                          errors: result.summary.errors,
                          details: result
                        });

                        // Recharger les données après un délai
                        setTimeout(() => {
                          loadStats();
                          loadEntrepreneurs();
                          loadCoaches();
                        }, 2000);
                      } catch (error: unknown) {
                        const errMsg =
                          typeof error === 'object' && error && 'message' in error
                            ? String((error as { message?: unknown }).message ?? '')
                            : '';
                        setBulkAssignResult({
                          created: 0,
                          skipped: 0,
                          errors: selectedEntrepreneurs.size,
                          details: { error: errMsg || 'Erreur lors de l\'assignation' }
                        });
                      } finally {
                        setBulkAssigning(false);
                      }
                    }}
                    disabled={!selectedCoach || selectedEntrepreneurs.size === 0 || bulkAssigning}
                  >
                    {bulkAssigning ? 'Assignation en cours...' : `Assigner ${selectedEntrepreneurs.size} entrepreneur(s)`}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-2xl border-2 border-transparent hover:border-indigo-500/30 bg-gradient-to-br from-white to-indigo-50/50 shadow-sm hover:shadow-md transition-all"
            onClick={() => onPageChange?.('settings')}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Configuration</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-2xl border-2 border-transparent hover:border-emerald-500/30 bg-gradient-to-br from-white to-emerald-50/50 shadow-sm hover:shadow-md transition-all"
            onClick={() => onPageChange?.('analytics')}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Rapports</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 rounded-2xl border-2 border-transparent hover:border-red-500/30 bg-gradient-to-br from-white to-red-50/50 shadow-sm hover:shadow-md transition-all"
            onClick={() => onPageChange?.('settings')}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-semibold">Sécurité</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}