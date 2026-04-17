import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, 
  Filter, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Building,
  Star
} from 'lucide-react';
import { apiService } from '@/services/api';

export function ApplicationsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProgram, setFilterProgram] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remoteApplications, setRemoteApplications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const raw = await apiService.request<unknown>('/business-plans/');
        const plans = Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
        setRemoteApplications(plans);
      } catch (e) {
        console.error(e);
        setLoadError("Lecture Supabase indisponible, fallback local.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  // Données mockées des candidatures
  const applications = [
    {
      id: 1,
      entrepreneur: {
        name: 'Fatou Diop',
        phone: '+221 77 123 4567',
        email: 'fatou.diop@email.com',
        location: 'Dakar, Plateau',
        business: 'Commerce alimentaire bio',
        sector: 'Commerce',
        cni: 'CNI123456789',
        experience: '3 ans'
      },
      program: {
        id: 1,
        name: 'Entrepreneuriat Féminin 2024',
        type: 'Grant'
      },
      amount_requested: 2500000,
      submitted_at: '2024-09-20',
      status: 'pending',
      score: 85,
      business_plan: {
        summary: 'Développement d\'une chaîne de magasins bio dans la région de Dakar',
        market_analysis: 'Marché en croissance de 15% par an, forte demande pour les produits bio',
        financial_projections: {
          year1_revenue: 12000000,
          year2_revenue: 18000000,
          year3_revenue: 25000000
        }
      },
      documents: [
        { name: 'Plan d\'affaires', status: 'verified', url: '#' },
        { name: 'CNI', status: 'verified', url: '#' },
        { name: 'Justificatifs revenus', status: 'pending', url: '#' }
      ],
      evaluation: {
        innovation: 4,
        feasibility: 4,
        market_potential: 5,
        team: 4,
        financial_viability: 4
      },
      notes: 'Projet très prometteur avec une approche innovante du commerce bio au Sénégal.'
    },
    {
      id: 2,
      entrepreneur: {
        name: 'Moussa Sall',
        phone: '+221 77 987 6543',
        email: 'moussa.sall@email.com',
        location: 'Thiès, Centre',
        business: 'Application mobile fintech',
        sector: 'Technologie',
        cni: 'CNI987654321',
        experience: '5 ans'
      },
      program: {
        id: 2,
        name: 'Innovation Technologique',
        type: 'Loan'
      },
      amount_requested: 5000000,
      submitted_at: '2024-09-18',
      status: 'under_review',
      score: 92,
      business_plan: {
        summary: 'Plateforme de paiement mobile pour les micro-entreprises',
        market_analysis: 'Plus de 70% des paiements encore en espèces, opportunité énorme',
        financial_projections: {
          year1_revenue: 25000000,
          year2_revenue: 45000000,
          year3_revenue: 80000000
        }
      },
      documents: [
        { name: 'Plan d\'affaires', status: 'verified', url: '#' },
        { name: 'CNI', status: 'verified', url: '#' },
        { name: 'Prototype technique', status: 'verified', url: '#' }
      ],
      evaluation: {
        innovation: 5,
        feasibility: 4,
        market_potential: 5,
        team: 5,
        financial_viability: 4
      },
      notes: 'Excellent projet avec une équipe technique solide et un marché clairement identifié.'
    },
    {
      id: 3,
      entrepreneur: {
        name: 'Awa Ndiaye',
        phone: '+221 77 555 0123',
        email: 'awa.ndiaye@email.com',
        location: 'Saint-Louis, Centre',
        business: 'Ferme urbaine intelligente',
        sector: 'Agriculture',
        cni: 'CNI555123789',
        experience: '2 ans'
      },
      program: {
        id: 3,
        name: 'Agriculture Durable',
        type: 'Hybrid'
      },
      amount_requested: 3200000,
      submitted_at: '2024-09-15',
      status: 'approved',
      score: 88,
      business_plan: {
        summary: 'Production urbaine de légumes biologiques avec système d\'irrigation intelligent',
        market_analysis: 'Demande croissante pour les produits locaux et biologiques',
        financial_projections: {
          year1_revenue: 8000000,
          year2_revenue: 14000000,
          year3_revenue: 22000000
        }
      },
      documents: [
        { name: 'Plan d\'affaires', status: 'verified', url: '#' },
        { name: 'CNI', status: 'verified', url: '#' },
        { name: 'Étude de faisabilité', status: 'verified', url: '#' }
      ],
      evaluation: {
        innovation: 5,
        feasibility: 4,
        market_potential: 4,
        team: 4,
        financial_viability: 4
      },
      notes: 'Projet approuvé - Innovation remarquable dans l\'agriculture urbaine.'
    }
  ];

  const programs = [
    { id: 1, name: 'Entrepreneuriat Féminin 2024' },
    { id: 2, name: 'Innovation Technologique' },
    { id: 3, name: 'Agriculture Durable' },
    { id: 4, name: 'Artisanat Traditionnel' }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente', icon: Clock },
      under_review: { color: 'bg-blue-100 text-blue-800', label: 'En examen', icon: Eye },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approuvé', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejeté', icon: XCircle },
      on_hold: { color: 'bg-gray-100 text-gray-800', label: 'En attente', icon: AlertCircle }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.pending;
    const IconComponent = statusConfig.icon;
    
    return (
      <Badge className={statusConfig.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getDocumentStatusBadge = (status: string) => {
    const config = {
      verified: { color: 'bg-green-100 text-green-800', label: 'Vérifié' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejeté' }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
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

  const sourceApplications = remoteApplications.length
    ? remoteApplications.map((p, idx) => ({
        id: idx + 1,
        entrepreneur: {
          name: String(p.entrepreneur_name || 'Entrepreneur'),
          phone: '',
          email: '',
          location: '',
          business: String(p.activity_title || p.sector_display || 'Activité'),
          sector: String(p.sector_display || 'General'),
          cni: '',
          experience: '',
        },
        program: {
          id: idx + 1,
          name: String(p.title || 'Programme'),
          type: String(p.financing_type || 'Grant'),
        },
        amount_requested: Number((p.financial_projections as Record<string, unknown> | undefined)?.requested_amount || 0),
        submitted_at: String(p.created_at || '').slice(0, 10),
        status: String(p.status || 'pending'),
        score: Number(p.score || 70),
        business_plan: {
          summary: String(p.summary || ''),
          market_analysis: '',
          financial_projections: {
            year1_revenue: 0,
            year2_revenue: 0,
            year3_revenue: 0,
          },
        },
        documents: [],
        evaluation: {
          innovation: 0,
          feasibility: 0,
          market_potential: 0,
          team: 0,
          financial_viability: 0,
        },
        notes: '',
      }))
    : applications;

  const filteredApplications = sourceApplications.filter(application => {
    const matchesSearch = application.entrepreneur.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.entrepreneur.business.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || application.status === filterStatus;
    const matchesProgram = filterProgram === 'all' || application.program.id.toString() === filterProgram;
    
    return matchesSearch && matchesStatus && matchesProgram;
  });

  const stats = {
    total: sourceApplications.length,
    pending: sourceApplications.filter(a => a.status === 'pending').length,
    under_review: sourceApplications.filter(a => a.status === 'under_review').length,
    approved: sourceApplications.filter(a => a.status === 'approved').length,
    rejected: sourceApplications.filter(a => a.status === 'rejected').length,
    total_requested: sourceApplications.reduce((sum, a) => sum + a.amount_requested, 0),
    avg_score: sourceApplications.length
      ? Math.round(sourceApplications.reduce((sum, a) => sum + a.score, 0) / sourceApplications.length)
      : 0
  };

  const renderStarRating = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
    setShowDetailsDialog(true);
  };

  const handleStatusChange = (applicationId: number, newStatus: string) => {
    // Ici vous implémenterez l'appel API pour changer le statut
    console.log(`Changement de statut pour la candidature ${applicationId}: ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      {isLoading && <Card className="p-3 text-sm text-gray-600">Chargement des candidatures...</Card>}
      {loadError && <Card className="p-3 text-sm text-amber-700">{loadError}</Card>}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Candidatures</h1>
          <p className="text-gray-600">Examinez et validez les demandes de financement</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter liste
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-[#006666]" />
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Eye className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">En examen</p>
              <p className="text-xl font-bold">{stats.under_review}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Approuvées</p>
              <p className="text-xl font-bold">{stats.approved}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-[#FF9933]" />
            <div>
              <p className="text-sm text-gray-600">Montant total</p>
              <p className="text-lg font-bold">{formatCurrency(stats.total_requested / 1000000)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Star className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-sm text-gray-600">Score moyen</p>
              <p className="text-xl font-bold">{stats.avg_score}/100</p>
            </div>
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
                placeholder="Rechercher une candidature..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="under_review">En examen</SelectItem>
                <SelectItem value="approved">Approuvées</SelectItem>
                <SelectItem value="rejected">Rejetées</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProgram} onValueChange={setFilterProgram}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les programmes</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id.toString()}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {filteredApplications.length} candidature(s) trouvée(s)
          </div>
        </div>
      </Card>

      {/* Liste des candidatures */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entrepreneur</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date soumission</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#006666] rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {application.entrepreneur.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{application.entrepreneur.name}</p>
                      <p className="text-sm text-gray-600">{application.entrepreneur.business}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{application.program.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {application.program.type}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-[#006666]">
                  {formatCurrency(application.amount_requested)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${
                      application.score >= 80 ? 'text-green-600' : 
                      application.score >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {application.score}/100
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          application.score >= 80 ? 'bg-green-500' : 
                          application.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${application.score}%` }}
                      ></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(application.status)}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {application.submitted_at}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(application)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {application.status === 'pending' && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600"
                          onClick={() => handleStatusChange(application.id, 'approved')}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => handleStatusChange(application.id, 'rejected')}
                        >
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

      {/* Dialog de détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la candidature</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="business">Plan d'affaires</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="evaluation">Évaluation</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3">Informations entrepreneur</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Nom:</span> {selectedApplication.entrepreneur.name}</p>
                      <p><span className="font-medium">Téléphone:</span> {selectedApplication.entrepreneur.phone}</p>
                      <p><span className="font-medium">Email:</span> {selectedApplication.entrepreneur.email}</p>
                      <p><span className="font-medium">Localisation:</span> {selectedApplication.entrepreneur.location}</p>
                      <p><span className="font-medium">CNI:</span> {selectedApplication.entrepreneur.cni}</p>
                      <p><span className="font-medium">Expérience:</span> {selectedApplication.entrepreneur.experience}</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3">Détails candidature</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Programme:</span> {selectedApplication.program.name}</p>
                      <p><span className="font-medium">Type:</span> {selectedApplication.program.type}</p>
                      <p><span className="font-medium">Montant demandé:</span> {formatCurrency(selectedApplication.amount_requested)}</p>
                      <p><span className="font-medium">Date soumission:</span> {selectedApplication.submitted_at}</p>
                      <p><span className="font-medium">Score:</span> {selectedApplication.score}/100</p>
                      <p><span className="font-medium">Statut:</span> {getStatusBadge(selectedApplication.status)}</p>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="business" className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Résumé du projet</h4>
                  <p className="text-sm text-gray-700">{selectedApplication.business_plan.summary}</p>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Analyse de marché</h4>
                  <p className="text-sm text-gray-700">{selectedApplication.business_plan.market_analysis}</p>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Projections financières</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Année 1</p>
                      <p className="font-bold text-[#006666]">
                        {formatCurrency(selectedApplication.business_plan.financial_projections.year1_revenue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Année 2</p>
                      <p className="font-bold text-[#006666]">
                        {formatCurrency(selectedApplication.business_plan.financial_projections.year2_revenue)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Année 3</p>
                      <p className="font-bold text-[#006666]">
                        {formatCurrency(selectedApplication.business_plan.financial_projections.year3_revenue)}
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Documents fournis</h4>
                  <div className="space-y-3">
                    {selectedApplication.documents.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getDocumentStatusBadge(doc.status)}
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="evaluation" className="space-y-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Critères d'évaluation</h4>
                  <div className="space-y-4">
                    {Object.entries(selectedApplication.evaluation).map(([criteria, rating]) => (
                      <div key={criteria} className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {criteria.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {renderStarRating(rating as number)}
                          </div>
                          <span className="text-sm text-gray-600">{rating}/5</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Notes d'évaluation</h4>
                  <p className="text-sm text-gray-700">{selectedApplication.notes}</p>
                </Card>
                
                <div className="flex space-x-3">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approuver
                  </Button>
                  <Button variant="outline" className="border-red-600 text-red-600">
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button variant="outline">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Demander plus d'infos
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}