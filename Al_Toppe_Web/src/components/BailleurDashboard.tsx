import { useEffect, useState } from 'react';
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
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '@/services/api';
import { exportRowsAsExcel, exportTextAsSimplePdf } from '@/services/exportService';
import { logExportAudit } from '@/services/exportAudit';

export function BailleurDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remotePrograms, setRemotePrograms] = useState<Array<Record<string, unknown>>>([]);
  const [remoteApplications, setRemoteApplications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const plansRaw = await apiService.request<unknown>('/business-plans/');
        const plans = Array.isArray(plansRaw) ? plansRaw as Array<Record<string, unknown>> : [];
        setRemotePrograms(plans);
        setRemoteApplications(plans);
      } catch (e) {
        console.error(e);
        setLoadError("Connexion Supabase indisponible : fallback local actif.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

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

  const displayPrograms = remotePrograms.length
    ? remotePrograms.slice(0, 6).map((p, idx) => ({
        id: idx + 1,
        name: String(p.title || 'Programme'),
        type: String(p.financing_type || 'Grant'),
        budget: `${Math.round(Number((p.financial_projections as Record<string, unknown> | undefined)?.total_budget || 0) / 1_000_000) || 5}M FCFA`,
        distributed: `${Math.round(Number((p.financial_projections as Record<string, unknown> | undefined)?.distributed_amount || 0) / 1_000_000) || 2}M FCFA`,
        applications: Number(p.applications_count || 0),
        approved: Number(p.approved_count || 0),
        status: String(p.status || 'active'),
        deadline: String(p.updated_at || new Date().toISOString()).slice(0, 10),
      }))
    : programs;

  const displayApplications = remoteApplications.length
    ? remoteApplications.slice(0, 8).map((p, idx) => ({
        id: idx + 1,
        entrepreneur: String(p.entrepreneur_name || 'Entrepreneur'),
        business: String(p.activity_title || p.sector_display || 'Activité'),
        program: String(p.title || 'Programme'),
        amount: `${Math.round(Number((p.financial_projections as Record<string, unknown> | undefined)?.requested_amount || 0) / 1_000_000) || 1}M FCFA`,
        status: String(p.status || 'pending'),
        submitted: String(p.created_at || new Date().toISOString()).slice(0, 10),
        score: Number(p.score || 75),
      }))
    : recentApplications;

  const prioritizedRiskCases = displayApplications
    .map((app) => {
      let riskScore = 0;
      const notes: string[] = [];
      const status = String(app.status || '').toLowerCase();
      const score = Number(app.score || 0);
      if (status === 'rejected') {
        riskScore += 55;
        notes.push('Dossier rejeté');
      }
      if (status === 'pending' || status === 'under_review') {
        riskScore += 15;
        notes.push('En attente prolongée');
      }
      if (score < 70) {
        riskScore += 30;
        notes.push('Score faible');
      }
      return { ...app, riskScore: Math.min(100, riskScore), notes };
    })
    .filter((item) => item.riskScore >= 30)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 4);

  const prioritizedHighPotential = displayApplications
    .filter((app) => {
      const status = String(app.status || '').toLowerCase();
      const score = Number(app.score || 0);
      return score >= 85 && (status === 'pending' || status === 'under_review' || status === 'approved');
    })
    .slice(0, 4);

  const exportPrioritizationReport = () => {
    const dateTag = new Date().toISOString().slice(0, 10);
    const rows = [
      ...prioritizedRiskCases.map((item) => ({
        categorie: 'Risque',
        entrepreneur: String(item.entrepreneur || ''),
        programme: String(item.program || ''),
        score: String(item.riskScore || 0),
        statut: String(item.status || ''),
        notes: Array.isArray(item.notes) ? item.notes.join(' | ') : '',
      })),
      ...prioritizedHighPotential.map((item) => ({
        categorie: 'Haut potentiel',
        entrepreneur: String(item.entrepreneur || ''),
        programme: String(item.program || ''),
        score: String(item.score || 0),
        statut: String(item.status || ''),
        notes: String(item.business || ''),
      })),
    ];

    if (!rows.length) return;

    exportRowsAsExcel(`bailleur-priorisation-${dateTag}.xls`, rows);
    exportTextAsSimplePdf(
      `bailleur-priorisation-${dateTag}.pdf`,
      'Rapport bailleur - risques et potentiels',
      rows.map((r) => `${r.categorie} | ${r.entrepreneur} | score ${r.score} | ${r.statut} | ${r.notes}`),
    );
    void logExportAudit({
      scope: 'bailleur_risk_potential',
      format: 'xls,pdf',
      item_count: rows.length,
      metadata: {
        riskCount: prioritizedRiskCases.length,
        potentialCount: prioritizedHighPotential.length,
      },
    });
  };

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
      {isLoading && <Card className="p-3 text-sm text-gray-600">Chargement des données bailleur...</Card>}
      {loadError && <Card className="p-3 text-sm text-amber-700">{loadError}</Card>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Bailleur</h1>
          <p className="text-gray-600">Gestion des programmes de financement</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={exportPrioritizationReport}>
            <FileText className="w-4 h-4 mr-2" />
            Export risques/potentiels
          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 border-red-200 bg-red-50/60">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-700" />
              <h3 className="font-semibold text-red-900">Cas à risque priorisés</h3>
            </div>
            <Badge className="bg-red-100 text-red-800">{prioritizedRiskCases.length}</Badge>
          </div>
          {prioritizedRiskCases.length === 0 ? (
            <p className="text-sm text-red-800">Aucun cas critique détecté pour le moment.</p>
          ) : (
            <div className="space-y-2">
              {prioritizedRiskCases.map((item) => (
                <div key={`${item.id}-risk`} className="rounded-lg border border-red-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{item.entrepreneur}</p>
                    <span className="text-xs font-medium text-red-700">Risque {item.riskScore}%</span>
                  </div>
                  <p className="text-xs text-red-700">{item.notes.join(' • ')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 border-green-200 bg-green-50/60">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-green-900">Entrepreneurs haut potentiel</h3>
            <Badge className="bg-green-100 text-green-800">{prioritizedHighPotential.length}</Badge>
          </div>
          {prioritizedHighPotential.length === 0 ? (
            <p className="text-sm text-green-800">Aucun profil haut potentiel détecté.</p>
          ) : (
            <div className="space-y-2">
              {prioritizedHighPotential.map((item) => (
                <div key={`${item.id}-potential`} className="rounded-lg border border-green-200 bg-white p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{item.entrepreneur}</p>
                    <span className="text-xs font-medium text-green-700">Score {item.score}/100</span>
                  </div>
                  <p className="text-xs text-green-700">{item.business}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Programmes actifs */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Programmes de financement</h3>
            <Button variant="outline" size="sm">Gérer tous</Button>
          </div>
          <div className="space-y-4">
            {displayPrograms.map((program) => (
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
            {displayApplications.map((application) => (
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