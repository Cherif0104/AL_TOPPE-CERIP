import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Calendar,
  Eye,
  Download,
  Building,
  MapPin,
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export function PortfolioManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [timeRange, setTimeRange] = useState('last_year');

  // Données mockées du portfolio
  const investments = [
    {
      id: 1,
      entrepreneur: 'Fatou Diop',
      business: 'Commerce alimentaire bio',
      sector: 'Commerce',
      location: 'Dakar',
      initial_investment: 2500000,
      current_valuation: 4200000,
      investment_date: '2024-01-15',
      status: 'performing',
      roi: 68,
      revenue_growth: 180,
      employees: 8,
      milestones_achieved: 6,
      milestones_total: 8,
      last_update: '2024-09-20',
      risk_level: 'low',
      next_milestone: 'Ouverture deuxième magasin'
    },
    {
      id: 2,
      entrepreneur: 'Moussa Sall',
      business: 'Application mobile fintech',
      sector: 'Technologie',
      location: 'Thiès',
      initial_investment: 5000000,
      current_valuation: 12000000,
      investment_date: '2024-02-20',
      status: 'high_performing',
      roi: 140,
      revenue_growth: 350,
      employees: 15,
      milestones_achieved: 8,
      milestones_total: 10,
      last_update: '2024-09-18',
      risk_level: 'medium',
      next_milestone: 'Lancement version 2.0'
    },
    {
      id: 3,
      entrepreneur: 'Awa Ndiaye',
      business: 'Ferme urbaine intelligente',
      sector: 'Agriculture',
      location: 'Saint-Louis',
      initial_investment: 3200000,
      current_valuation: 4800000,
      investment_date: '2024-03-10',
      status: 'performing',
      roi: 50,
      revenue_growth: 120,
      employees: 6,
      milestones_achieved: 4,
      milestones_total: 7,
      last_update: '2024-09-15',
      risk_level: 'low',
      next_milestone: 'Certification bio'
    },
    {
      id: 4,
      entrepreneur: 'Omar Ba',
      business: 'Plateforme e-commerce',
      sector: 'Technologie',
      location: 'Kaolack',
      initial_investment: 4800000,
      current_valuation: 3600000,
      investment_date: '2023-08-15',
      status: 'underperforming',
      roi: -25,
      revenue_growth: -15,
      employees: 4,
      milestones_achieved: 3,
      milestones_total: 8,
      last_update: '2024-09-12',
      risk_level: 'high',
      next_milestone: 'Pivot stratégique'
    },
    {
      id: 5,
      entrepreneur: 'Aminata Diallo',
      business: 'Services de nettoyage écologique',
      sector: 'Services',
      location: 'Dakar',
      initial_investment: 1800000,
      current_valuation: 3400000,
      investment_date: '2023-11-20',
      status: 'performing',
      roi: 89,
      revenue_growth: 220,
      employees: 12,
      milestones_achieved: 7,
      milestones_total: 8,
      last_update: '2024-09-22',
      risk_level: 'low',
      next_milestone: 'Expansion régionale'
    }
  ];

  // Données pour les graphiques
  const portfolioPerformance = [
    { month: 'Jan', total_value: 18500000, investments: 5, roi: 45 },
    { month: 'Fév', total_value: 20200000, investments: 6, roi: 52 },
    { month: 'Mar', total_value: 22800000, investments: 7, roi: 58 },
    { month: 'Avr', total_value: 24500000, investments: 8, roi: 62 },
    { month: 'Mai', total_value: 26800000, investments: 9, roi: 67 },
    { month: 'Jun', total_value: 28200000, investments: 10, roi: 71 },
    { month: 'Jul', total_value: 29800000, investments: 11, roi: 74 },
    { month: 'Aoû', total_value: 31500000, investments: 12, roi: 78 },
    { month: 'Sep', total_value: 32000000, investments: 12, roi: 75 }
  ];

  const sectorAllocation = [
    { name: 'Commerce', value: 35, amount: 11200000, color: '#006666' },
    { name: 'Technologie', value: 30, amount: 9600000, color: '#FF9933' },
    { name: 'Agriculture', value: 20, amount: 6400000, color: '#28A745' },
    { name: 'Services', value: 15, amount: 4800000, color: '#0088CC' }
  ];

  const riskDistribution = [
    { level: 'Faible', count: 3, percentage: 60, color: '#28A745' },
    { level: 'Moyen', count: 1, percentage: 20, color: '#FF9933' },
    { level: 'Élevé', count: 1, percentage: 20, color: '#DC3545' }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      high_performing: { color: 'bg-green-100 text-green-800', label: 'Très performant', icon: TrendingUp },
      performing: { color: 'bg-blue-100 text-blue-800', label: 'Performant', icon: CheckCircle },
      underperforming: { color: 'bg-red-100 text-red-800', label: 'Sous-performant', icon: TrendingDown },
      at_risk: { color: 'bg-yellow-100 text-yellow-800', label: 'À risque', icon: AlertCircle }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.performing;
    const IconComponent = statusConfig.icon;
    
    return (
      <Badge className={statusConfig.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const config = {
      low: { color: 'bg-green-100 text-green-800', label: 'Faible' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Moyen' },
      high: { color: 'bg-red-100 text-red-800', label: 'Élevé' }
    };
    
    const riskConfig = config[risk as keyof typeof config] || config.medium;
    
    return (
      <Badge className={riskConfig.color}>
        {riskConfig.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('XOF', 'FCFA');
  };

  const filteredInvestments = investments.filter(investment => {
    const matchesSearch = investment.entrepreneur.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investment.business.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = filterSector === 'all' || investment.sector === filterSector;
    const matchesStatus = filterStatus === 'all' || investment.status === filterStatus;
    
    return matchesSearch && matchesSector && matchesStatus;
  });

  const stats = {
    totalInvestments: investments.length,
    totalValue: investments.reduce((sum, inv) => sum + inv.current_valuation, 0),
    totalInvested: investments.reduce((sum, inv) => sum + inv.initial_investment, 0),
    avgROI: Math.round(investments.reduce((sum, inv) => sum + inv.roi, 0) / investments.length),
    totalEmployees: investments.reduce((sum, inv) => sum + inv.employees, 0),
    highPerforming: investments.filter(inv => inv.status === 'high_performing').length,
    atRisk: investments.filter(inv => inv.status === 'underperforming' || inv.status === 'at_risk').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio d'Investissements</h1>
          <p className="text-gray-600">Suivi et analyse de vos investissements</p>
        </div>
        <div className="flex space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Dernier mois</SelectItem>
              <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
              <SelectItem value="last_year">Dernière année</SelectItem>
              <SelectItem value="all_time">Tout</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Rapport portfolio
          </Button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur totale</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue / 1000000)}M</p>
              <p className="text-sm text-green-600">
                +{formatCurrency((stats.totalValue - stats.totalInvested) / 1000000)}M gains
              </p>
            </div>
            <div className="w-12 h-12 bg-[#006666] rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ROI moyen</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgROI}%</p>
              <p className="text-sm text-blue-600">{stats.highPerforming} très performants</p>
            </div>
            <div className="w-12 h-12 bg-[#FF9933] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Investissements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvestments}</p>
              <p className="text-sm text-yellow-600">{stats.atRisk} à surveiller</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Emplois créés</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-sm text-green-600">Impact social</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="investments">Investissements</TabsTrigger>
          <TabsTrigger value="risk">Analyse risques</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance du portfolio */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Évolution du portfolio</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={portfolioPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'total_value') return [formatCurrency(value as number), 'Valeur totale'];
                    if (name === 'roi') return [`${value}%`, 'ROI'];
                    return [value, name];
                  }} />
                  <Area yAxisId="left" type="monotone" dataKey="total_value" stroke="#006666" fill="#006666" fillOpacity={0.3} />
                  <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#FF9933" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Répartition par secteur */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Répartition par secteur</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sectorAllocation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sectorAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Métriques détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sectorAllocation.map((sector, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{sector.name}</h4>
                  <Building className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-[#006666]">{formatCurrency(sector.amount / 1000000)}M</p>
                <p className="text-sm text-gray-600">{sector.value}% du portfolio</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full" 
                    style={{ 
                      width: `${sector.value}%`,
                      backgroundColor: sector.color 
                    }}
                  ></div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Top performers */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top performers</h3>
            <div className="space-y-4">
              {investments
                .sort((a, b) => b.roi - a.roi)
                .slice(0, 5)
                .map((investment, index) => (
                <div key={investment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-[#006666] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{investment.entrepreneur}</p>
                      <p className="text-sm text-gray-600">{investment.business}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{investment.roi}%</p>
                      <p className="text-sm text-gray-600">ROI</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(investment.current_valuation)}</p>
                      <p className="text-sm text-gray-600">Valeur actuelle</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          {/* Filtres */}
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un investissement..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterSector} onValueChange={setFilterSector}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les secteurs</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Technologie">Technologie</SelectItem>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="high_performing">Très performant</SelectItem>
                  <SelectItem value="performing">Performant</SelectItem>
                  <SelectItem value="underperforming">Sous-performant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Liste des investissements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInvestments.map((investment) => (
              <Card key={investment.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{investment.entrepreneur}</h4>
                    <p className="text-sm text-gray-600">{investment.business}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline">{investment.sector}</Badge>
                      {getStatusBadge(investment.status)}
                      {getRiskBadge(investment.risk_level)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Investissement initial</p>
                    <p className="font-medium">{formatCurrency(investment.initial_investment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valeur actuelle</p>
                    <p className="font-medium">{formatCurrency(investment.current_valuation)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">ROI</p>
                    <p className={`font-bold ${investment.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {investment.roi >= 0 ? '+' : ''}{investment.roi}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employés</p>
                    <p className="font-medium">{investment.employees}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Objectifs atteints</span>
                    <span className="text-sm font-medium">
                      {investment.milestones_achieved}/{investment.milestones_total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#006666] h-2 rounded-full" 
                      style={{ width: `${(investment.milestones_achieved / investment.milestones_total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">{investment.location}</span>
                    </div>
                    <span className="text-gray-600">Mis à jour: {investment.last_update}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Prochain objectif:</span> {investment.next_milestone}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution des risques */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Distribution des risques</h3>
              <div className="space-y-4">
                {riskDistribution.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: risk.color }}
                      ></div>
                      <span className="font-medium">Risque {risk.level}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{risk.count} investissements</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${risk.percentage}%`,
                            backgroundColor: risk.color 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{risk.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Alertes risques */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Alertes et recommandations</h3>
              <div className="space-y-3">
                {investments
                  .filter(inv => inv.risk_level === 'high' || inv.roi < 0)
                  .map((investment) => (
                  <div key={investment.id} className="p-3 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">{investment.entrepreneur}</p>
                        <p className="text-sm text-red-700">{investment.business}</p>
                        <p className="text-xs text-red-600 mt-1">
                          ROI: {investment.roi}% | Risque: {investment.risk_level}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {investments.filter(inv => inv.risk_level === 'high' || inv.roi < 0).length === 0 && (
                  <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-700">Aucune alerte critique détectée</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}