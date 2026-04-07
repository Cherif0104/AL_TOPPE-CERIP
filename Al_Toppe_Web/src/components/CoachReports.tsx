import { useState, useEffect } from 'react';
import { coachService, resolveCoachId } from '../services/coach';
import Swal from 'sweetalert2';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Clock,
  BarChart3
} from 'lucide-react';

import { User as UserType } from '../services/api';
import { cn } from '@/lib/utils';

interface CoachReportsProps {
  user: UserType;
}

type ReportStats = {
  totalSessions: number;
  totalEntrepreneurs: number;
  avgSessionDuration: number;
  successRate: number;
  totalHours: number;
  monthlyGrowth: number;
  completedPrograms: number;
  avgRevenueGrowth: number;
};

type MonthlyPerformanceItem = { month: string; sessions: number; entrepreneurs: number; success_rate: number };
type SectorDistributionItem = { name: string; value: number; color: string };
type SessionTypeItem = { type: string; count: number; avg_duration: number };
type EntrepreneurProgressItem = { name: string; initial_revenue: number; current_revenue: number; progress: number; sessions: number };
type WeeklyActivityItem = { week: string; sessions: number; duration: number };

type AssignmentData = {
  id: string;
  entrepreneur: string;
  entrepreneur_name: string;
  status: string;
  duration_days: number;
  start_date: string;
};

type SessionData = {
  id: string;
  entrepreneur: string;
  session_type?: string;
  scheduled_date?: string;
  created_at?: string;
  duration_minutes?: number;
  actual_duration_minutes?: number;
  status?: string;
};

export function CoachReports({ user }: CoachReportsProps) {
  const [reportType, setReportType] = useState('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState('last_month');
  const [isLoading, setIsLoading] = useState(true);
  const [, setData] = useState<unknown>(null);

  // Données pour les graphiques (états initialisés avec des mocks comme fallback)
  const [monthlyPerformance, setMonthlyPerformance] = useState<MonthlyPerformanceItem[]>([
    { month: 'Jan', sessions: 18, entrepreneurs: 12, success_rate: 75 },
    { month: 'Fév', sessions: 22, entrepreneurs: 15, success_rate: 78 },
    { month: 'Mar', sessions: 25, entrepreneurs: 18, success_rate: 82 },
    { month: 'Avr', sessions: 28, entrepreneurs: 20, success_rate: 85 },
    { month: 'Mai', sessions: 30, entrepreneurs: 22, success_rate: 88 },
    { month: 'Jun', sessions: 32, entrepreneurs: 24, success_rate: 90 }
  ]);
  const [sectorDistribution, setSectorDistribution] = useState<SectorDistributionItem[]>([
    { name: 'Commerce', value: 40, color: '#006666' },
    { name: 'Services', value: 25, color: '#FF9933' },
    { name: 'Artisanat', value: 20, color: '#0088CC' },
    { name: 'Agriculture', value: 15, color: '#28A745' }
  ]);
  const [sessionTypes, setSessionTypes] = useState<SessionTypeItem[]>([
    { type: 'Suivi financier', count: 45, avg_duration: 65 },
    { type: 'Plan d\'affaires', count: 32, avg_duration: 90 },
    { type: 'Formation', count: 28, avg_duration: 120 },
    { type: 'Première rencontre', count: 15, avg_duration: 75 },
    { type: 'Bilan mensuel', count: 22, avg_duration: 80 }
  ]);
  const [entrepreneurProgress, setEntrepreneurProgress] = useState<EntrepreneurProgressItem[]>([
    { name: 'Fatou Diop', initial_revenue: 200000, current_revenue: 850000, progress: 75, sessions: 12 },
    { name: 'Moussa Sall', initial_revenue: 0, current_revenue: 180000, progress: 35, sessions: 6 },
    { name: 'Awa Ndiaye', initial_revenue: 150000, current_revenue: 420000, progress: 65, sessions: 8 },
    { name: 'Omar Ba', initial_revenue: 300000, current_revenue: 1200000, progress: 95, sessions: 18 },
    { name: 'Aminata Diallo', initial_revenue: 100000, current_revenue: 380000, progress: 55, sessions: 9 }
  ]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivityItem[]>([
    { week: 'S1', sessions: 8, duration: 520 },
    { week: 'S2', sessions: 6, duration: 420 },
    { week: 'S3', sessions: 10, duration: 680 },
    { week: 'S4', sessions: 8, duration: 560 }
  ]);
  const [stats, setStats] = useState<ReportStats>({
    totalSessions: 142,
    totalEntrepreneurs: 24,
    avgSessionDuration: 78,
    successRate: 87,
    totalHours: 186,
    monthlyGrowth: 15,
    completedPrograms: 8,
    avgRevenueGrowth: 180
  });

  // Fonction helper pour calculer les dates selon la période sélectionnée
  const getDateRange = (period: string) => {
    const today = new Date();
    const dateTo = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    let dateFrom: string;
    
    switch (period) {
      case 'last_week':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        dateFrom = lastWeek.toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        dateFrom = lastMonth.toISOString().split('T')[0];
        break;
      case 'last_quarter':
        const lastQuarter = new Date(today);
        lastQuarter.setMonth(today.getMonth() - 3);
        dateFrom = lastQuarter.toISOString().split('T')[0];
        break;
      case 'last_year':
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        dateFrom = lastYear.toISOString().split('T')[0];
        break;
      default:
        // Par défaut : dernier mois
        const defaultDate = new Date(today);
        defaultDate.setMonth(today.getMonth() - 1);
        dateFrom = defaultDate.toISOString().split('T')[0];
    }
    
    return { dateFrom, dateTo };
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedPeriod, reportType]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const coachId = resolveCoachId(user) || user.id;
      
      // Calculer les dates selon la période sélectionnée
      const { dateFrom, dateTo } = getDateRange(selectedPeriod);
      
      // Récupérer les données en parallèle avec filtres de date
      const [performanceData, assignmentsData, sessionsData, entrepreneursData] = await Promise.all([
        coachService.getReports(coachId).catch(() => null),
        coachService.getAssignments(coachId).catch(() => []),
        coachService.getSessions(coachId, undefined, dateFrom, dateTo).catch(() => []),
        coachService.getCoachEntrepreneurs(coachId).catch(() => [])
      ]);
      
      console.log('performanceData', performanceData);
      console.log('assignmentsData', assignmentsData);
      console.log('sessionsData', sessionsData);
      console.log('entrepreneursData', entrepreneursData);
      
      // Calculer les données des graphiques à partir des données réelles (avant filtrage)
      let assignments = Array.isArray(assignmentsData) ? assignmentsData : (assignmentsData?.results || []);
      let sessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData?.results || []);
      const entrepreneurs = Array.isArray(entrepreneursData) ? entrepreneursData : [];
      
      // Filtrer les assignations par date de début selon la période
      if (selectedPeriod !== 'custom') {
        const { dateFrom } = getDateRange(selectedPeriod);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        assignments = assignments.filter((assignment: any) => {
          if (!assignment.start_date) return true; // Garder si pas de date
          return assignment.start_date >= dateFrom;
        });
      }
      
      // Filtrer les sessions par date selon le type de rapport
      if (reportType === 'daily') {
        // Pour quotidien, prendre seulement les sessions d'aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessions = sessions.filter((session: any) => {
          const sessionDate = session.scheduled_date || session.created_at;
          if (!sessionDate) return true;
          return sessionDate.startsWith(today);
        });
      } else if (reportType === 'weekly') {
        // Pour hebdomadaire, prendre seulement les 7 derniers jours
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessions = sessions.filter((session: any) => {
          const sessionDate = session.scheduled_date || session.created_at;
          if (!sessionDate) return true;
          return sessionDate >= weekAgoStr;
        });
      } else if (reportType === 'quarterly') {
        // Pour trimestriel, prendre seulement les 3 derniers mois
        const quarterAgo = new Date();
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        const quarterAgoStr = quarterAgo.toISOString().split('T')[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessions = sessions.filter((session: any) => {
          const sessionDate = session.scheduled_date || session.created_at;
          if (!sessionDate) return true;
          return sessionDate >= quarterAgoStr;
        });
      } else if (reportType === 'annual') {
        // Pour annuel, prendre seulement les 12 derniers mois
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        const yearAgoStr = yearAgo.toISOString().split('T')[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sessions = sessions.filter((session: any) => {
          const sessionDate = session.scheduled_date || session.created_at;
          if (!sessionDate) return true;
          return sessionDate >= yearAgoStr;
        });
      }
      
      // Recalculer les stats à partir des données filtrées
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completedSessions = sessions.filter((s: any) => s.status === 'completed');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalDuration = sessions.reduce((sum: number, s: any) => {
        return sum + (s.duration_minutes || s.actual_duration_minutes || 0);
      }, 0);
      const avgDuration = sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0;
      const totalHours = Math.round(totalDuration / 60);
      const successRate = sessions.length > 0 
        ? Math.round((completedSessions.length / sessions.length) * 100) 
        : 0;
      
      // Calculer les entrepreneurs uniques dans les sessions filtrées
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueEntrepreneurs = new Set(sessions.map((s: any) => s.entrepreneur).filter(Boolean));
      
      // Calculer la croissance mensuelle (comparaison avec le mois précédent)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentMonthSessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date || s.created_at);
        return sessionDate >= currentMonthStart;
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastMonthSessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.scheduled_date || s.created_at);
        return sessionDate >= lastMonthStart && sessionDate <= lastMonthEnd;
      });
      
      const monthlyGrowth = lastMonthSessions.length > 0
        ? Math.round(((currentMonthSessions.length - lastMonthSessions.length) / lastMonthSessions.length) * 100)
        : 0;
      
      // Utiliser les stats de l'API si disponibles, sinon calculer depuis les données filtrées
      if (performanceData) {
        setData(performanceData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pd = performanceData as any;
        
        // Utiliser les stats calculées depuis les données filtrées pour refléter les filtres
        setStats({
          totalSessions: sessions.length,
          totalEntrepreneurs: uniqueEntrepreneurs.size || assignments.length,
          avgSessionDuration: avgDuration || pd.avg_session_duration || 0,
          successRate: successRate || Math.round(pd.success_rate || 0),
          totalHours: totalHours || Math.round((pd.total_sessions || 0) * (pd.avg_session_duration || 0) / 60),
          monthlyGrowth: monthlyGrowth || pd.monthly_growth || 0,
          completedPrograms: completedSessions.length || pd.completed_programs || pd.completed_sessions || 0,
          avgRevenueGrowth: pd.avg_revenue_growth || 0
        });
      } else {
        // Si pas de performanceData, utiliser uniquement les stats calculées
        setStats({
          totalSessions: sessions.length,
          totalEntrepreneurs: uniqueEntrepreneurs.size || assignments.length,
          avgSessionDuration: avgDuration,
          successRate: successRate,
          totalHours: totalHours,
          monthlyGrowth: monthlyGrowth,
          completedPrograms: completedSessions.length,
          avgRevenueGrowth: 0
        });
      }
      
      // Créer un map des entrepreneurs par ID pour accès rapide
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entrepreneursMap = new Map<string, any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entrepreneurs.forEach((ent: any) => {
        if (ent.id) entrepreneursMap.set(ent.id, ent);
      });
      
      // 1. Entrepreneur Progress : à partir des assignations + données entrepreneurs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entrepreneurProgressList: EntrepreneurProgressItem[] = assignments.slice(0, 5).map((assignment: any) => {
        const entrepreneur = entrepreneursMap.get(assignment.entrepreneur);
        // Calculer le revenu total depuis les activités
        let totalRevenue = 0;
        let initialRevenue = 0;
        if (entrepreneur?.activities && Array.isArray(entrepreneur.activities)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          entrepreneur.activities.forEach((activity: any) => {
            totalRevenue += activity.total_revenue || 0;
            // Estimation du revenu initial (première activité ou 0)
            if (initialRevenue === 0 && activity.total_revenue) {
              initialRevenue = activity.total_revenue * 0.3; // Estimation : 30% du revenu actuel
            }
          });
        }
        // Calculer le progrès basé sur les sessions complétées
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completedSessions = sessions.filter((s: any) => 
          s.entrepreneur === assignment.entrepreneur && s.status === 'completed'
        ).length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalSessionsForEnt = sessions.filter((s: any) => s.entrepreneur === assignment.entrepreneur).length;
        const progress = totalSessionsForEnt > 0 
          ? Math.min(100, Math.round((completedSessions / totalSessionsForEnt) * 100))
          : Math.min(100, Math.round((assignment.duration_days || 0) / 45 * 100));
        
        return {
          name: assignment.entrepreneur_name || entrepreneur?.full_name || 'Entrepreneur',
          initial_revenue: initialRevenue,
          current_revenue: totalRevenue,
          progress,
          sessions: totalSessionsForEnt
        };
      });
      setEntrepreneurProgress(
        entrepreneurProgressList.length > 0 ? entrepreneurProgressList : []
      );
      
      // 2. Session Types : compter les sessions par type
      const sessionTypesMap: Record<string, { count: number; totalDuration: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessions.forEach((session: any) => {
        const type = session.session_type || 'individual';
        const typeLabel = type === 'individual' ? 'Suivi individuel' : 
                         type === 'group' ? 'Groupe' : 
                         type === 'workshop' ? 'Formation' : 
                         type === 'assessment' ? 'Évaluation' : 'Autre';
        if (!sessionTypesMap[typeLabel]) {
          sessionTypesMap[typeLabel] = { count: 0, totalDuration: 0 };
        }
        sessionTypesMap[typeLabel].count++;
        sessionTypesMap[typeLabel].totalDuration += session.duration_minutes || session.actual_duration_minutes || 0;
      });
      const sessionTypesList: SessionTypeItem[] = Object.entries(sessionTypesMap).map(([type, data]) => ({
        type,
        count: data.count,
        avg_duration: Math.round(data.totalDuration / data.count) || 0
      }));
      setSessionTypes(sessionTypesList.length > 0 ? sessionTypesList : []);
      
      // 3. Weekly Activity : grouper les sessions par semaine
      const weeklyMap: Record<string, { sessions: number; duration: number }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessions.forEach((session: any) => {
        const date = new Date(session.scheduled_date || session.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Dimanche
        const weekKey = `S${Math.ceil(date.getDate() / 7)}`;
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { sessions: 0, duration: 0 };
        }
        weeklyMap[weekKey].sessions++;
        weeklyMap[weekKey].duration += session.duration_minutes || session.actual_duration_minutes || 0;
      });
      const weeklyList: WeeklyActivityItem[] = Object.entries(weeklyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-4) // Dernières 4 semaines
        .map(([week, data]) => ({
          week,
          sessions: data.sessions,
          duration: data.duration
        }));
      if (weeklyList.length > 0) {
        setWeeklyActivity(weeklyList);
      }
      
      // 4. Monthly Performance : grouper les sessions par mois
      const monthlyMap: Record<string, { sessions: number; entrepreneurs: Set<string> }> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessions.forEach((session: any) => {
        const date = new Date(session.scheduled_date || session.created_at);
        const monthKey = date.toLocaleDateString('fr-FR', { month: 'short' });
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { sessions: 0, entrepreneurs: new Set() };
        }
        monthlyMap[monthKey].sessions++;
        if (session.entrepreneur) {
          monthlyMap[monthKey].entrepreneurs.add(session.entrepreneur);
        }
      });
      const monthlyList: MonthlyPerformanceItem[] = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          sessions: data.sessions,
          entrepreneurs: data.entrepreneurs.size,
          success_rate: Math.round((data.sessions / Math.max(1, data.entrepreneurs.size)) * 10) // Estimation
        }))
        .sort((a, b) => {
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          return months.indexOf(a.month) - months.indexOf(b.month);
        });
      setMonthlyPerformance(monthlyList.length > 0 ? monthlyList : []);
      
      // 5. Sector Distribution : à partir des activités des entrepreneurs
      const sectorMap: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entrepreneurs.forEach((entrepreneur: any) => {
        if (entrepreneur.activities && Array.isArray(entrepreneur.activities)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          entrepreneur.activities.forEach((activity: any) => {
            const sector = activity.sector_display || activity.sector || 'Autre';
            sectorMap[sector] = (sectorMap[sector] || 0) + 1;
          });
        }
      });
      
      // Calculer les pourcentages et créer la liste
      const totalActivities = Object.values(sectorMap).reduce((sum, count) => sum + count, 0);
      let sectorList: SectorDistributionItem[] = [];
      if (totalActivities > 0) {
        const colors = ['#006666', '#FF9933', '#0088CC', '#10B981', '#EF4444', '#8B5CF6'];
        let colorIndex = 0;
        sectorList = Object.entries(sectorMap)
          .map(([name, count]) => ({
            name,
            value: Math.round((count / totalActivities) * 100),
            color: colors[colorIndex++ % colors.length]
          }))
          .sort((a, b) => b.value - a.value);
      }
      setSectorDistribution(sectorList);
      
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      setMonthlyPerformance([]);
      setSectorDistribution([]);
      setSessionTypes([]);
      setWeeklyActivity([]);
      setEntrepreneurProgress([]);
      setStats({
        totalSessions: 0,
        totalEntrepreneurs: 0,
        avgSessionDuration: 0,
        successRate: 0,
        totalHours: 0,
        monthlyGrowth: 0,
        completedPrograms: 0,
        avgRevenueGrowth: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mode "affichage uniquement" : exports désactivés (PDF/Excel/JSON)
  const showExportDisabled = () => {
    Swal.fire({
      title: 'Export désactivé',
      text: "Cette page est en mode affichage uniquement. L'export (PDF/Excel) n'est pas activé.",
      icon: 'info',
      confirmButtonColor: '#006666'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('XOF', 'FCFA');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006666]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Rapports de Performance</h1>
          <p className="text-sm md:text-base text-gray-600">Analysez votre impact et vos résultats de coaching</p>
        </div>
        {/* <div className="flex items-center gap-2 sm:space-x-3">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={showExportDisabled}>
            <BarChart3 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exporter données</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] flex-1 sm:flex-none text-white" size="sm" onClick={showExportDisabled}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Télécharger PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div> */}
      </div>

      {/* Filtres — <select> natif pour éviter conflits de portails Radix / mobile */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1 space-y-2">
            <label htmlFor="coach-report-type" className="text-sm font-medium">
              Type de rapport
            </label>
            <select
              id="coach-report-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006666]',
              )}
            >
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
              <option value="quarterly">Trimestriel</option>
              <option value="annual">Annuel</option>
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label htmlFor="coach-report-period" className="text-sm font-medium">
              Période
            </label>
            <select
              id="coach-report-period"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006666]',
              )}
            >
              <option value="last_week">Semaine dernière</option>
              <option value="last_month">Mois dernier</option>
              <option value="last_quarter">Trimestre dernier</option>
              <option value="last_year">Année dernière</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>
        </div>
      </Card>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Sessions totales</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
              <p className="text-[10px] md:text-xs text-green-600 mt-1">+{stats.monthlyGrowth}% ce mois</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#006666]/10 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-[#006666]" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Entrepreneurs actifs</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalEntrepreneurs}</p>
              <p className="text-[10px] md:text-xs text-blue-600 mt-1">6 nouveaux ce mois</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#FF9933]/10 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-[#FF9933]" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Taux de succès</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.successRate}%</p>
              <p className="text-[10px] md:text-xs text-green-600 mt-1">+3% vs mois dernier</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-500 mb-1">Heures totales</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalHours}h</p>
              <p className="text-[10px] md:text-xs text-gray-600 mt-1">Moy: {stats.avgSessionDuration}min</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Performance mensuelle */}
        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">Performance mensuelle</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                  tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                  tick={{ fill: '#1F2937', fontSize: 13, fontWeight: 600 }}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                  tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                  tick={{ fill: '#1F2937', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                  tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                  tick={{ fill: '#1F2937', fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '2px solid #006666',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 600, color: '#1F2937' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                  iconType="circle"
                />
                <Bar yAxisId="left" dataKey="sessions" fill="#006666" radius={[8, 8, 0, 0]} name="Sessions" />
                <Bar yAxisId="right" dataKey="entrepreneurs" fill="#FF9933" radius={[8, 8, 0, 0]} name="Entrepreneurs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribution par secteur */}
        <Card className="p-4 md:p-6 shadow-sm border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-6">Répartition par secteur</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={{ stroke: '#374151', strokeWidth: 1 }}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  {sectorDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '2px solid #006666',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 600, color: '#1F2937' }}
                  formatter={(value: number) => `${value}%`}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40}
                  iconType="circle"
                  iconSize={12}
                  wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Activité hebdomadaire */}
      <Card className="p-4 md:p-6 shadow-sm border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-6">Activité hebdomadaire</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey="week" 
                axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                tick={{ fill: '#1F2937', fontSize: 13, fontWeight: 600 }}
              />
              <YAxis 
                yAxisId="left"
                axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                tick={{ fill: '#1F2937', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                axisLine={{ stroke: '#6B7280', strokeWidth: 2 }}
                tickLine={{ stroke: '#6B7280', strokeWidth: 1 }}
                tick={{ fill: '#1F2937', fontSize: 12, fontWeight: 500 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '2px solid #006666',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                labelStyle={{ fontWeight: 600, color: '#1F2937' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                iconType="circle"
              />
              <Bar yAxisId="left" dataKey="sessions" fill="#006666" radius={[8, 8, 0, 0]} name="Sessions" />
              <Bar yAxisId="right" dataKey="duration" fill="#FF9933" radius={[8, 8, 0, 0]} name="Durée (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Progrès des entrepreneurs */}
      <Card className="p-4 md:p-6 shadow-sm border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Progrès des entrepreneurs</h3>
        <div className="space-y-4">
          {entrepreneurProgress.map((entrepreneur, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{entrepreneur.name}</h4>
                  <p className="text-xs md:text-sm text-gray-500">{entrepreneur.sessions} sessions complétées</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-bold">Croissance CA</p>
                  <p className="font-bold text-[#006666] text-lg">
                    {entrepreneur.initial_revenue === 0
                      ? formatCurrency(entrepreneur.current_revenue)
                      : `+${Math.round(((entrepreneur.current_revenue - entrepreneur.initial_revenue) / entrepreneur.initial_revenue) * 100)}%`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] md:text-xs text-gray-500 uppercase font-medium">Initial</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(entrepreneur.initial_revenue)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <p className="text-[10px] md:text-xs text-gray-500 uppercase font-medium">Actuel</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(entrepreneur.current_revenue)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Progression Objectifs</span>
                  <span className="font-bold text-[#006666]">{entrepreneur.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#006666] h-full rounded-full transition-all duration-500"
                    style={{ width: `${entrepreneur.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Analyse des types de sessions */}
      <Card className="p-4 md:p-6 shadow-sm border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Analyse des types de sessions</h3>
        <div className="space-y-3">
          {sessionTypes.map((session, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-3 border border-gray-100">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{session.type}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs text-gray-500">Moyenne: {session.avg_duration} min</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-center sm:text-right">
                  <p className="text-xl font-bold text-[#006666] leading-none">{session.count}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Sessions</p>
                </div>
                <div className="w-24 bg-gray-200 rounded-full h-2 shrink-0 overflow-hidden">
                  <div
                    className="bg-[#FF9933] h-full rounded-full"
                    style={{ width: `${(session.count / Math.max(...sessionTypes.map(s => s.count))) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions rapides */}
      {/* <Card className="p-4 md:p-6 shadow-sm border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button variant="outline" className="h-20 flex-col space-y-2 py-3 border-dashed hover:border-[#006666] hover:bg-[#006666]/5 group transition-all" onClick={showExportDisabled}>
            <FileText className="w-6 h-6 text-gray-400 group-hover:text-[#006666]" />
            <span className="text-xs md:text-sm font-medium">Rapport détaillé</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2 py-3 border-dashed hover:border-[#006666] hover:bg-[#006666]/5 group transition-all" onClick={showExportDisabled}>
            <Download className="w-6 h-6 text-gray-400 group-hover:text-[#006666]" />
            <span className="text-xs md:text-sm font-medium">Exporter Excel</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2 py-3 border-dashed hover:border-[#006666] hover:bg-[#006666]/5 group transition-all sm:col-span-2 lg:col-span-1" onClick={() => {
            Swal.fire({
              title: 'Analyse prédictive',
              text: 'Cette fonctionnalité sera bientôt disponible.',
              icon: 'info',
              confirmButtonColor: '#006666'
            });
          }}>
            <TrendingUp className="w-6 h-6 text-gray-400 group-hover:text-[#006666]" />
            <span className="text-xs md:text-sm font-medium">Analyse prédictive</span>
          </Button>
        </div>
      </Card> */}
    </div>
  );
}