import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { 
  Target, 
  Search, 
  Filter, 
  Plus,
  Edit,
  Eye,
  Trash2,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export function ProgramsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Données mockées des programmes
  const programs = [
    {
      id: 1,
      name: 'Entrepreneuriat Féminin 2024',
      description: 'Programme de soutien aux femmes entrepreneures du Sénégal',
      type: 'Grant',
      total_budget: 15000000,
      distributed_amount: 8500000,
      min_amount: 500000,
      max_amount: 3000000,
      status: 'active',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      application_deadline: '2024-11-30',
      target_sectors: ['Commerce', 'Services'],
      target_regions: ['Dakar', 'Thiès', 'Saint-Louis'],
      applications_count: 45,
      approved_count: 18,
      rejected_count: 12,
      pending_count: 15,
      success_rate: 72,
      created_at: '2023-12-01'
    },
    {
      id: 2,
      name: 'Innovation Technologique',
      description: 'Financement pour les startups tech et solutions innovantes',
      type: 'Loan',
      total_budget: 25000000,
      distributed_amount: 15500000,
      min_amount: 1000000,
      max_amount: 8000000,
      status: 'active',
      start_date: '2024-02-01',
      end_date: '2024-12-31',
      application_deadline: '2024-10-31',
      target_sectors: ['Technologie', 'Services'],
      target_regions: ['Dakar', 'Thiès'],
      applications_count: 28,
      approved_count: 12,
      rejected_count: 8,
      pending_count: 8,
      success_rate: 60,
      created_at: '2024-01-15'
    },
    {
      id: 3,
      name: 'Agriculture Durable',
      description: 'Soutien aux pratiques agricoles durables et biologiques',
      type: 'Hybrid',
      total_budget: 12000000,
      distributed_amount: 7200000,
      min_amount: 300000,
      max_amount: 2500000,
      status: 'active',
      start_date: '2024-03-01',
      end_date: '2024-11-30',
      application_deadline: '2024-10-15',
      target_sectors: ['Agriculture'],
      target_regions: ['Kaolack', 'Fatick', 'Louga'],
      applications_count: 35,
      approved_count: 22,
      rejected_count: 8,
      pending_count: 5,
      success_rate: 73,
      created_at: '2024-02-10'
    },
    {
      id: 4,
      name: 'Artisanat Traditionnel',
      description: 'Valorisation et modernisation de l\'artisanat sénégalais',
      type: 'Grant',
      total_budget: 8000000,
      distributed_amount: 8000000,
      min_amount: 200000,
      max_amount: 1500000,
      status: 'completed',
      start_date: '2023-06-01',
      end_date: '2024-05-31',
      application_deadline: '2024-04-30',
      target_sectors: ['Artisanat'],
      target_regions: ['Dakar', 'Saint-Louis', 'Thiès'],
      applications_count: 42,
      approved_count: 28,
      rejected_count: 14,
      pending_count: 0,
      success_rate: 67,
      created_at: '2023-05-01'
    }
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Actif', icon: CheckCircle },
      completed: { color: 'bg-blue-100 text-blue-800', label: 'Terminé', icon: CheckCircle },
      suspended: { color: 'bg-yellow-100 text-yellow-800', label: 'Suspendu', icon: AlertCircle },
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Brouillon', icon: Clock }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.active;
    const IconComponent = statusConfig.icon;
    
    return (
      <Badge className={statusConfig.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('XOF', 'FCFA');
  };

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || program.status === filterStatus;
    const matchesType = filterType === 'all' || program.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: programs.length,
    active: programs.filter(p => p.status === 'active').length,
    totalBudget: programs.reduce((sum, p) => sum + p.total_budget, 0),
    totalDistributed: programs.reduce((sum, p) => sum + p.distributed_amount, 0),
    totalApplications: programs.reduce((sum, p) => sum + p.applications_count, 0),
    totalApproved: programs.reduce((sum, p) => sum + p.approved_count, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Programmes</h1>
          <p className="text-gray-600">Créez et gérez vos programmes de financement</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#006666] hover:bg-[#004d4d]">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau programme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau programme de financement</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du programme</Label>
                <Input id="name" placeholder="Ex: Entrepreneuriat Féminin 2025" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type de financement</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grant">Subvention</SelectItem>
                    <SelectItem value="loan">Prêt</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                    <SelectItem value="equity">Équité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Décrivez les objectifs et critères du programme..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_budget">Budget total (FCFA)</Label>
                <Input id="total_budget" type="number" placeholder="15000000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_amount">Montant minimum (FCFA)</Label>
                <Input id="min_amount" type="number" placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_amount">Montant maximum (FCFA)</Label>
                <Input id="max_amount" type="number" placeholder="3000000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input id="start_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input id="end_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Date limite candidatures</Label>
                <Input id="deadline" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectors">Secteurs ciblés</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner secteurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commerce">Commerce</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="artisanat">Artisanat</SelectItem>
                    <SelectItem value="agriculture">Agriculture</SelectItem>
                    <SelectItem value="technologie">Technologie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regions">Régions ciblées</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dakar">Dakar</SelectItem>
                    <SelectItem value="thies">Thiès</SelectItem>
                    <SelectItem value="saint-louis">Saint-Louis</SelectItem>
                    <SelectItem value="kaolack">Kaolack</SelectItem>
                    <SelectItem value="fatick">Fatick</SelectItem>
                    <SelectItem value="louga">Louga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="criteria">Critères d'éligibilité</Label>
                <Textarea 
                  id="criteria" 
                  placeholder="Définissez les critères d'éligibilité pour ce programme..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button className="bg-[#006666] hover:bg-[#004d4d]">
                Créer le programme
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Target className="w-8 h-8 text-[#006666]" />
            <div>
              <p className="text-sm text-gray-600">Programmes</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">Actifs</p>
              <p className="text-xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-[#FF9933]" />
            <div>
              <p className="text-sm text-gray-600">Budget total</p>
              <p className="text-lg font-bold">{formatAmount(stats.totalBudget / 1000000)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Distribué</p>
              <p className="text-lg font-bold">{formatAmount(stats.totalDistributed / 1000000)}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Candidatures</p>
              <p className="text-xl font-bold">{stats.totalApplications}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-[#006666]" />
            <div>
              <p className="text-sm text-gray-600">Approuvées</p>
              <p className="text-xl font-bold">{stats.totalApproved}</p>
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
                placeholder="Rechercher un programme..."
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
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="completed">Terminés</SelectItem>
                <SelectItem value="suspended">Suspendus</SelectItem>
                <SelectItem value="draft">Brouillons</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Grant">Subventions</SelectItem>
                <SelectItem value="Loan">Prêts</SelectItem>
                <SelectItem value="Hybrid">Hybrides</SelectItem>
                <SelectItem value="Equity">Équité</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {filteredPrograms.length} programme(s) trouvé(s)
          </div>
        </div>
      </Card>

      {/* Liste des programmes */}
      <div className="space-y-4">
        {filteredPrograms.map((program) => (
          <Card key={program.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                  {getStatusBadge(program.status)}
                  {getTypeBadge(program.type)}
                </div>
                <p className="text-gray-600 mb-3">{program.description}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{program.start_date} → {program.end_date}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>Limite: {program.application_deadline}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Budget et distribution</p>
                <p className="font-semibold text-[#006666]">{formatAmount(program.total_budget)}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Progress 
                    value={(program.distributed_amount / program.total_budget) * 100} 
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-gray-600">
                    {Math.round((program.distributed_amount / program.total_budget) * 100)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatAmount(program.distributed_amount)} distribués
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Montants</p>
                <p className="text-sm">Min: <span className="font-medium">{formatAmount(program.min_amount)}</span></p>
                <p className="text-sm">Max: <span className="font-medium">{formatAmount(program.max_amount)}</span></p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Candidatures</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-medium">{program.applications_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Approuvées:</span>
                    <span className="font-medium text-green-600">{program.approved_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">En attente:</span>
                    <span className="font-medium text-yellow-600">{program.pending_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Rejetées:</span>
                    <span className="font-medium text-red-600">{program.rejected_count}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Performance</p>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#006666]">{program.success_rate}%</p>
                  <p className="text-sm text-gray-600">Taux de succès</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Secteurs ciblés:</p>
                  <div className="flex flex-wrap gap-1">
                    {program.target_sectors.map((sector, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {sector}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Régions ciblées:</p>
                  <div className="flex flex-wrap gap-1">
                    {program.target_regions.map((region, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}