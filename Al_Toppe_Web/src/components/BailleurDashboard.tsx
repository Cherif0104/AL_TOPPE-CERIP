import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DashboardCard } from './DashboardCard';
import { Progress } from './ui/progress';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  FileText,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  PieChart,
  BarChart3
} from 'lucide-react';

export function BailleurDashboard() {
  // Données mockées
  const stats = {
    totalPrograms: 12,
    activePrograms: 8,
    totalFunding: '45.2M FCFA',
    distributedFunding: '32.8M FCFA',
    pendingApplications: 47,
    approvedApplications: 156,
    monthlyGrowth: '+15%'
  };

  const programs = [
    {
      id: 1,
      name: 'Entrepreneuriat Féminin 2024',
      type: 'Grant',
      budget: '15M FCFA',
      distributed: '8.5M FCFA',
      applications: 28,
      approved: 12,
      status: 'active',
      deadline: '2024-12-31'
    },
    {
      id: 2,
      name: 'Innovation Technologique',
      type: 'Loan',
      budget: '20M FCFA',
      distributed: '12.3M FCFA',
      applications: 15,
      approved: 8,
      status: 'active',
      deadline: '2024-11-15'
    },
    {
      id: 3,
      name: 'Agriculture Durable',
      type: 'Hybrid',
      budget: '10M FCFA',
      distributed: '6.2M FCFA',
      applications: 22,
      approved: 14,
      status: 'active',
      deadline: '2024-10-30'
    }
  ];

  const recentApplications = [
    {
      id: 1,
      entrepreneur: 'Fatou Diop',
      business: 'Commerce alimentaire bio',
      program: 'Entrepreneuriat Féminin 2024',
      amount: '2.5M FCFA',
      status: 'pending',
      submitted: '2024-09-20',
      score: 85
    },
    {
      id: 2,
      entrepreneur: 'Moussa Sall',
      business: 'Application mobile fintech',
      program: 'Innovation Technologique',
      amount: '5M FCFA',
      status: 'under_review',
      submitted: '2024-09-18',
      score: 92
    },
    {
      id: 3,
      entrepreneur: 'Awa Ndiaye',
      business: 'Ferme urbaine intelligente',
      program: 'Agriculture Durable',
      amount: '3.2M FCFA',
      status: 'approved',
      submitted: '2024-09-15',
      score: 88
    },
    {
      id: 4,
      entrepreneur: 'Omar Ba',
      business: 'Plateforme e-commerce',
      program: 'Innovation Technologique',
      amount: '4.8M FCFA',
      status: 'rejected',
      submitted: '2024-09-12',
      score: 65
    }
  ];

  const sectors = [
    { name: 'Commerce', applications: 45, funded: 28, success_rate: 62 },
    { name: 'Technologie', applications: 23, funded: 18, success_rate: 78 },
    { name: 'Agriculture', applications: 34, funded: 22, success_rate: 65 },
    { name: 'Artisanat', applications: 18, funded: 12, success_rate: 67 },
    { name: 'Services', applications: 29, funded: 19, success_rate: 66 }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente', icon: Clock },
      under_review: { color: 'bg-blue-100 text-blue-800', label: 'En examen', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approuvé', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejeté', icon: XCircle },
      active: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getProgramTypeBadge = (type: string) => {
    const config = {
      Grant: { color: 'bg-purple-100 text-purple-800', label: 'Subvention' },
      Loan: { color: 'bg-blue-100 text-blue-800', label: 'Prêt' },
      Hybrid: { color: 'bg-orange-100 text-orange-800', label: 'Hybride' },
      Equity: { color: 'bg-green-100 text-green-800', label: 'Équité' }
    };
    
    const typeConfig = config[type as keyof typeof config] || config.Grant;
    
    return (
      <Badge className={typeConfig.color}>
        {typeConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Bailleur</h1>
          <p className="text-gray-600">Gestion des programmes de financement</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <BarChart3 className="w-4 h-4 mr-2" />
            Rapport d'impact
          </Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d]">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau programme
          </Button>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Programmes actifs"
          value={stats.activePrograms}
          change={`${stats.totalPrograms} au total`}
          changeType="neutral"
          icon={Target}
          color="#006666"
        />
        <DashboardCard
          title="Budget total"
          value={stats.totalFunding}
          change={`${stats.distributedFunding} distribués`}
          changeType="positive"
          icon={DollarSign}
          color="#FF9933"
        />
        <DashboardCard
          title="Candidatures en attente"
          value={stats.pendingApplications}
          change={`${stats.approvedApplications} approuvées`}
          changeType="positive"
          icon={FileText}
          color="#006666"
        />
        <DashboardCard
          title="Taux d'approbation"
          value="73%"
          change={stats.monthlyGrowth}
          changeType="positive"
          icon={TrendingUp}
          color="#FF9933"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programmes actifs */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Programmes de financement</h3>
            <Button variant="outline" size="sm">Gérer tous</Button>
          </div>
          <div className="space-y-4">
            {programs.map((program) => (
              <div key={program.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{program.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      {getProgramTypeBadge(program.type)}
                      {getStatusBadge(program.status)}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#006666]">{program.budget}</p>
                    <p className="text-sm text-gray-600">Budget total</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Distribué</p>
                    <p className="font-medium">{program.distributed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Candidatures</p>
                    <p className="font-medium">{program.applications}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Approuvées</p>
                    <p className="font-medium">{program.approved}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Progression du budget</span>
                    <span className="text-sm font-medium">
                      {Math.round((parseFloat(program.distributed.replace('M FCFA', '')) / parseFloat(program.budget.replace('M FCFA', ''))) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((parseFloat(program.distributed.replace('M FCFA', '')) / parseFloat(program.budget.replace('M FCFA', ''))) * 100)}
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Échéance: {program.deadline}</span>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Analyse par secteur */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance par secteur</h3>
          <div className="space-y-4">
            {sectors.map((sector) => (
              <div key={sector.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{sector.name}</span>
                  <span className="text-sm text-gray-600">{sector.success_rate}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <span>{sector.applications} candidatures</span>
                  <span>{sector.funded} financées</span>
                </div>
                <Progress value={sector.success_rate} className="h-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Candidatures récentes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Candidatures récentes</h3>
          <Button variant="outline" size="sm">Voir toutes</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entrepreneur</TableHead>
              <TableHead>Activité</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date soumission</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-medium">{application.entrepreneur}</TableCell>
                <TableCell>{application.business}</TableCell>
                <TableCell className="text-sm">{application.program}</TableCell>
                <TableCell className="font-medium text-[#006666]">{application.amount}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      application.score >= 80 ? 'text-green-600' : 
                      application.score >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {application.score}/100
                    </span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(application.status)}</TableCell>
                <TableCell className="text-sm text-gray-600">{application.submitted}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {application.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="sm" className="text-green-600">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Actions rapides */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Plus className="w-6 h-6" />
            <span>Créer programme</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Users className="w-6 h-6" />
            <span>Examiner candidatures</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <PieChart className="w-6 h-6" />
            <span>Analyse d'impact</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <FileText className="w-6 h-6" />
            <span>Générer rapport</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}