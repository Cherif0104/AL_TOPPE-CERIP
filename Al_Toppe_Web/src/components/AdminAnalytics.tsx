import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  DollarSign,
  Activity,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiService, User } from '../services/api';

export function AdminAnalytics({ user: _user }: { user?: User }) {
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState('users');

  const [userGrowthData, setUserGrowthData] = useState<
    { date: string; entrepreneurs: number; coaches: number; bailleurs: number; total: number }[]
  >([]);

  const [sectorDistribution, setSectorDistribution] = useState<
    { name: string; value: number; users: number; color: string }[]
  >([]);

  const [regionDistribution, setRegionDistribution] = useState<
    { name: string; users: number; percentage: number }[]
  >([]);

  const [deviceStats, setDeviceStats] = useState<
    { device: string; users: number; percentage: number; color: string }[]
  >([]);

  const [activityData, setActivityData] = useState<
    { hour: string; logins: number; sessions: number }[]
  >([]);

  const [performanceMetrics, setPerformanceMetrics] = useState<
    { metric: string; value: string; status: string; trend: string }[]
  >([]);

  const [conversionFunnel, setConversionFunnel] = useState<
    { step: string; count: number; percentage: number }[]
  >([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    newUsersInPeriod: 0,
    sessionsToday: 0,
    avgSessionDuration: 0,
    totalRevenue: 0,
    conversionRate: 0,
    churnRate: 0,
  });

  const load = async () => {
    setLoadError(null);
    try {
      const data = await apiService.getAdminAnalytics(timeRange);
      setUserGrowthData(data.user_growth || []);
      setSectorDistribution(data.sector_distribution || []);
      setRegionDistribution(data.region_distribution || []);
      setDeviceStats(data.device_stats || []);
      setActivityData(data.activity_by_hour || []);
      setPerformanceMetrics(data.performance_metrics || []);
      setConversionFunnel(data.conversion_funnel || []);
      setStats({
        totalUsers: data.stats?.total_users ?? 0,
        activeUsers: data.stats?.active_users ?? 0,
        newUsersToday: data.stats?.new_users_today ?? 0,
        newUsersInPeriod: data.stats?.new_users_in_period ?? 0,
        sessionsToday: data.stats?.sessions_today ?? 0,
        avgSessionDuration: data.stats?.avg_session_duration ?? 0,
        totalRevenue: data.stats?.total_revenue ?? 0,
        conversionRate: data.stats?.conversion_rate ?? 0,
        churnRate: data.stats?.churn_rate ?? 0,
      });
    } catch {
      setLoadError('Impossible de charger les analytics (réseau ou droits administrateur).');
      setUserGrowthData([]);
      setSectorDistribution([]);
      setRegionDistribution([]);
      setDeviceStats([]);
      setActivityData([]);
      setPerformanceMetrics([]);
      setConversionFunnel([]);
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersInPeriod: 0,
        sessionsToday: 0,
        avgSessionDuration: 0,
        totalRevenue: 0,
        conversionRate: 0,
        churnRate: 0,
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setRefreshing(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Avancés</h1>
          <p className="text-gray-600">Analyses détaillées de la plateforme AL-TOPPE</p>
        </div>
        <div className="flex space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">7 derniers jours</SelectItem>
              <SelectItem value="last_30_days">30 derniers jours</SelectItem>
              <SelectItem value="last_90_days">90 derniers jours</SelectItem>
              <SelectItem value="last_year">Dernière année</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            className="bg-[#006666] hover:bg-[#004d4d]"
            onClick={() => {
              const payload = {
                exported_at: new Date().toISOString(),
                timeRange,
                stats,
                userGrowthData,
                sectorDistribution,
                regionDistribution,
                deviceStats,
                activityData,
                performanceMetrics,
                conversionFunnel,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `altoppe-analytics-${timeRange}-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      )}

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs totaux</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-sm text-green-600">
                +{stats.newUsersToday} aujourd’hui
                {stats.newUsersInPeriod > 0 ? (
                  <span className="text-gray-600"> · {stats.newUsersInPeriod} sur la période</span>
                ) : null}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#006666] rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.activeUsers}</p>
              <p className="text-sm text-blue-600">
                {stats.totalUsers > 0
                  ? `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% du total`
                  : '—'}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#FF9933] rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sessions aujourd'hui</p>
              <p className="text-3xl font-bold text-gray-900">{stats.sessionsToday}</p>
              <p className="text-sm text-gray-600">Moy: {stats.avgSessionDuration}min</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de conversion</p>
              <p className="text-3xl font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-sm text-gray-500">Indicateur non mesuré — voir funnel ci-dessous</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
          <TabsTrigger value="geography">Géographie</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Croissance des utilisateurs */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Croissance des utilisateurs</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="entrepreneurs" stackId="1" stroke="#006666" fill="#006666" />
                  <Area type="monotone" dataKey="coaches" stackId="1" stroke="#FF9933" fill="#FF9933" />
                  <Area type="monotone" dataKey="bailleurs" stackId="1" stroke="#0088CC" fill="#0088CC" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Distribution par secteur */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Distribution par secteur</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectorDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number; value?: number }) => {
                      const pct =
                        props.percent != null
                          ? Math.round(props.percent * 100)
                          : Number(props.value ?? 0);
                      return `${props.name ?? 'Secteur'} ${pct}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Dispositifs utilisés */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Dispositifs utilisés</h3>
            <div className="space-y-4">
              {deviceStats.map((device, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {device.device === 'Mobile' && <Smartphone className="w-5 h-5 text-gray-600" />}
                    {device.device === 'Desktop' && <Monitor className="w-5 h-5 text-gray-600" />}
                    {device.device === 'Tablet' && <Globe className="w-5 h-5 text-gray-600" />}
                    <span className="font-medium">{device.device}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">{device.users.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{device.percentage}%</p>
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${device.percentage}%`,
                          backgroundColor: device.color 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Activité par heure */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Activité par heure</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="logins" fill="#006666" name="Connexions" />
                <Bar dataKey="sessions" fill="#FF9933" name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="geography" className="space-y-6">
          {/* Distribution géographique */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Distribution géographique</h3>
            <div className="space-y-4">
              {regionDistribution.map((region, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">{region.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">{region.users.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{region.percentage}%</p>
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#006666] h-2 rounded-full" 
                        style={{ width: `${region.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Métriques de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {performanceMetrics.map((metric, index) => (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.metric}</p>
                    <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                      {metric.value}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    metric.status === 'excellent' ? 'bg-green-500' : 
                    metric.status === 'good' ? 'bg-blue-500' : 
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <Badge variant={
                    metric.trend === 'up' ? 'default' : 
                    metric.trend === 'down' ? 'secondary' : 'outline'
                  }>
                    {metric.trend === 'up' ? '↗️' : metric.trend === 'down' ? '↘️' : '→'} 
                    {metric.trend === 'up' ? 'En hausse' : 
                     metric.trend === 'down' ? 'En baisse' : 'Stable'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          {/* Entonnoir de conversion */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Entonnoir de conversion</h3>
            <div className="space-y-4">
              {conversionFunnel.map((step, index) => (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{step.step}</p>
                      <p className="text-sm text-gray-600">{step.count.toLocaleString()} utilisateurs</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#006666]">{step.percentage}%</p>
                      {index > 0 && (
                        <p className="text-sm text-gray-600">
                          -{((conversionFunnel[index-1].count - step.count) / conversionFunnel[index-1].count * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#006666] h-2 rounded-full" 
                      style={{ width: `${step.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}