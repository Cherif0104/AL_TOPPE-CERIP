import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import {
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  User as UserIcon,
  Building2,
  TrendingUp,
  DollarSign,
  Clock,
  Send,
  MessageSquare,
  Pencil
} from 'lucide-react';
import { User, apiService } from '../services/api';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { isLocalDataBackend } from '@/config';

interface BusinessPlan {
  id: string;
  title: string;
  summary: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived';
  status_display: string;
  entrepreneur: string;
  entrepreneur_name?: string;
  activity_title?: string;
  sector_display?: string;
  is_validated: boolean;
  created_at: string;
  updated_at: string;
  pdf_file_url?: string;
  financial_projections?: {
    year_1_revenue?: number | { answer: number | string; question?: string };
    year_1_expenses?: number | { answer: number | string; question?: string };
    year_1_profit?: number | { answer: number | string; question?: string };
    year_projection?: number | { answer: number | string; question?: string };
    monthly_revenue?: number | { answer: number | string; question?: string };
    monthly_expenses?: number | { answer: number | string; question?: string };
    startup_costs?: number | { answer: number | string; question?: string };
    break_even?: number | { answer: number | string; question?: string };
    projected_income?: number | { answer: number | string; question?: string };
    hourly_rate?: number | { answer: number | string; question?: string };
    clients_per_month?: number | { answer: number | string; question?: string };
    [key: string]: number | { answer: number | string; question?: string } | undefined;
  };
}

interface BusinessPlansManagementProps {
  user: User;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  submitted: 'bg-blue-500',
  under_review: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  archived: 'bg-gray-400',
};

export function BusinessPlansManagement({ user }: BusinessPlansManagementProps) {
  const [plans, setPlans] = useState<BusinessPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlan | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [validationAction, setValidationAction] = useState<'approve' | 'reject'>('approve');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editYear1Revenue, setEditYear1Revenue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const roleCode = (() => {
    const r = (user.role || '').toLowerCase();
    if (r === 'administrateur' || r === 'admin') return 'admin';
    if (r === 'coach') return 'coach';
    if (r === 'bailleur') return 'bailleur';
    return 'entrepreneur';
  })();

  const extractFinancialValue = (
    value: number | { answer: number | string; question?: string } | undefined
  ): number | undefined => {
    if (!value) return undefined;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'answer' in value) {
      const answer = value.answer;
      if (typeof answer === 'number') return answer;
      if (typeof answer === 'string') {
        const parsed = parseFloat(answer);
        return isNaN(parsed) ? undefined : parsed;
      }
    }
    return undefined;
  };

  const calculateYearRevenue = (
    financial_projections?: BusinessPlan['financial_projections']
  ): number | undefined => {
    if (!financial_projections) return undefined;
    const yearProjection = extractFinancialValue(financial_projections.year_projection);
    if (yearProjection !== undefined) return yearProjection;
    const year1Revenue = extractFinancialValue(financial_projections.year_1_revenue);
    if (year1Revenue !== undefined) return year1Revenue;
    const monthlyRevenue = extractFinancialValue(financial_projections.monthly_revenue);
    if (monthlyRevenue !== undefined && monthlyRevenue > 0) {
      return monthlyRevenue * 12;
    }
    const projectedIncome = extractFinancialValue(financial_projections.projected_income);
    if (projectedIncome !== undefined && projectedIncome > 0 && projectedIncome >= 1000) {
      return projectedIncome * 4;
    }
    const hourlyRate = extractFinancialValue(financial_projections.hourly_rate);
    const clientsPerMonth = extractFinancialValue(financial_projections.clients_per_month);
    if (hourlyRate !== undefined && clientsPerMonth !== undefined && hourlyRate > 0 && clientsPerMonth > 0) {
      const estimatedMonthlyRevenue = hourlyRate * clientsPerMonth * 2;
      return estimatedMonthlyRevenue * 12;
    }
    return undefined;
  };

  useEffect(() => {
    fetchBusinessPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchBusinessPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await apiService.request(`/business-plans/?${params.toString()}`);
      
      setPlans(Array.isArray(response) ? response : response.results || []);
    } catch (error) {
      console.error('Erreur lors du chargement des plans:', error);
      setPlans([]);
      toast.info(
        'API indisponible : les plans ne peuvent pas être chargés. Démarrez le backend ou vérifiez la connexion.',
        { duration: 6000 },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (planId: string) => {
    try {
      const response = await apiService.request(`/business-plans/${planId}/`);
      setSelectedPlan(response);
      setShowDetailsDialog(true);
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de charger les détails du plan',
      });
    }
  };

  const handleDownloadPDF = async (planId: string) => {
    try {
      if (isLocalDataBackend()) {
        toast.info(
          'Mode données locales : le PDF est généré côté serveur Django. Passez en VITE_DATA_BACKEND=remote avec l’API lancée pour le téléchargement.',
          { duration: 7000 },
        );
        return;
      }
      const blob = await apiService.downloadBusinessPlanPdf(planId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business_plan_${planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'PDF téléchargé avec succès',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de télécharger le PDF',
      });
    }
  };

  const handleOpenValidation = (plan: BusinessPlan, action: 'approve' | 'reject') => {
    setSelectedPlan(plan);
    setValidationAction(action);
    setValidationComment('');
    setShowValidationDialog(true);
  };

  const handleSubmitValidation = async () => {
    if (!selectedPlan) return;

    try {
      // Déterminer le type de validation selon le rôle de l'utilisateur
      // Pour le workflow 'basic', les coaches utilisent 'initial_review'
      // Pour le workflow 'funding', les coaches utilisent 'coach_review'
      // Par défaut, on utilise 'basic' avec 'initial_review' pour les coaches
      let validationType = 'initial_review';
      let workflowType = 'basic';

      if (roleCode === 'coach') {
        validationType = 'initial_review';
      } else if (roleCode === 'admin') {
        validationType = 'financial_review';
      } else if (roleCode === 'bailleur') {
        validationType = 'bailleur_evaluation';
        workflowType = 'funding';
      }

      const validationData = {
        business_plan: selectedPlan.id,
        validation_type: validationType,
        workflow_type: workflowType,
        is_approved: validationAction === 'approve',
        comments: validationComment,
      };

      const response = await apiService.request(`/business-plans/${selectedPlan.id}/workflow/validate/`, {
        method: 'POST',
        body: JSON.stringify(validationData),
      } as RequestInit) as {
        message?: string;
        business_plan_status?: string;
        business_plan_status_display?: string;
        is_workflow_complete?: boolean;
      };

      // Message personnalisé selon le statut
      let message = response.message || `Plan ${validationAction === 'approve' ? 'approuvé' : 'rejeté'} avec succès`;
      let icon: 'success' | 'info' = 'success';
      
      if (validationAction === 'approve') {
        if (response.is_workflow_complete) {
          message = '✅ Plan d\'affaires approuvé définitivement ! Toutes les validations sont complètes.';
          icon = 'success';
        } else {
          message = '✅ Validation enregistrée. Le plan reste en cours de révision (étapes restantes).';
          icon = 'info';
        }
      }

      Swal.fire({
        icon,
        title: validationAction === 'approve' ? 'Validation enregistrée' : 'Plan rejeté',
        text: message,
        timer: validationAction === 'approve' && response.is_workflow_complete ? 3000 : 2000,
        showConfirmButton: false,
      });

      setShowValidationDialog(false);
      setSelectedPlan(null);
      setValidationComment('');
      fetchBusinessPlans();
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de valider le plan',
      });
    }
  };

  const openEditPlan = (plan: BusinessPlan) => {
    setSelectedPlan(plan);
    setEditTitle(plan.title);
    setEditSummary(plan.summary || '');
    const y1 =
      extractFinancialValue(plan.financial_projections?.year_1_revenue) ??
      extractFinancialValue(plan.financial_projections?.year_projection) ??
      extractFinancialValue(plan.financial_projections?.monthly_revenue);
    setEditYear1Revenue(y1 != null && !Number.isNaN(y1) ? String(Math.round(y1)) : '');
    setShowEditDialog(true);
  };

  const handleSavePlanEdit = async () => {
    if (!selectedPlan) return;
    setSavingEdit(true);
    try {
      const rawRev = editYear1Revenue.replace(/\s/g, '').replace(',', '.').trim();
      const numRev = rawRev ? parseFloat(rawRev) : NaN;
      const financial_projections = selectedPlan.financial_projections
        ? (JSON.parse(JSON.stringify(selectedPlan.financial_projections)) as BusinessPlan['financial_projections'])
        : {};
      if (!Number.isNaN(numRev) && rawRev) {
        (financial_projections as Record<string, unknown>)['year_1_revenue'] = numRev;
      }
      const body: Record<string, unknown> = { title: editTitle, summary: editSummary };
      if (Object.keys(financial_projections || {}).length > 0) {
        body.financial_projections = financial_projections;
      }
      await apiService.request(`/business-plans/${selectedPlan.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setShowEditDialog(false);
      await fetchBusinessPlans();
      Swal.fire({ icon: 'success', title: 'Plan mis à jour', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Modification impossible.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = 
      plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.entrepreneur_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.activity_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stats = {
    total: plans.length,
    draft: plans.filter(p => p.status === 'draft').length,
    submitted: plans.filter(p => p.status === 'submitted').length,
    under_review: plans.filter(p => p.status === 'under_review').length,
    approved: plans.filter(p => p.status === 'approved').length,
    rejected: plans.filter(p => p.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plans d'Affaires</h1>
          <p className="text-gray-600 mt-1">Gérez et validez les plans d'affaires des entrepreneurs</p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Brouillons</p>
              <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Soumis</p>
              <p className="text-2xl font-bold text-blue-500">{stats.submitted}</p>
            </div>
            <Send className="h-8 w-8 text-blue-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En révision</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.under_review}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approuvés</p>
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejetés</p>
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Rechercher par titre, entrepreneur ou activité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="submitted">Soumis</SelectItem>
                <SelectItem value="under_review">En révision</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tableau des plans */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#006666]"></div>
            <p className="mt-4 text-gray-600">Chargement des plans d'affaires...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun plan d'affaires trouvé</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Entrepreneur</TableHead>
                <TableHead>Activité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Revenus An 1</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span>{plan.entrepreneur_name || 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span>
                        {(plan.activity_title || 'N/A').replace(
                          /\bventment\b/gi,
                          'vêtements'
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[plan.status] || 'bg-gray-500'}>
                      {plan.status_display}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(calculateYearRevenue(plan.financial_projections))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(plan.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(plan.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(plan.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                      </Button>
                      {(roleCode === 'admin' || roleCode === 'coach') &&
                        ['draft', 'submitted', 'under_review'].includes(plan.status) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          title="Modifier le plan"
                          onClick={() => openEditPlan(plan)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                        </Button>
                      )}
                      {/* Afficher les boutons d'approbation pour les plans soumis ou en révision, mais pas pour les plans déjà approuvés ou rejetés */}
                      {(plan.status === 'submitted' || plan.status === 'under_review') && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleOpenValidation(plan, 'approve')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenValidation(plan, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </>
                      )}
                      {/* Afficher un badge pour les plans approuvés */}
                      {plan.status === 'approved' && (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approuvé
                        </Badge>
                      )}
                     
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le plan d&apos;affaires</DialogTitle>
            <DialogDescription>Titre et résumé visibles par l&apos;entrepreneur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">Titre</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Résumé</label>
              <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} className="mt-1 min-h-[120px]" />
            </div>
            <div>
              <label className="text-sm font-medium">Revenus année 1 (FCFA, optionnel)</label>
              <Input
                inputMode="numeric"
                value={editYear1Revenue}
                onChange={(e) => setEditYear1Revenue(e.target.value)}
                className="mt-1"
                placeholder="ex. 1500000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button className="bg-[#006666]" onClick={handleSavePlanEdit} disabled={savingEdit}>
              {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de détails */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.title}</DialogTitle>
            <DialogDescription>
              Détails du plan d'affaires
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Entrepreneur</p>
                  <p className="font-medium">{selectedPlan.entrepreneur_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Statut</p>
                  <Badge className={STATUS_COLORS[selectedPlan.status] || 'bg-gray-500'}>
                    {selectedPlan.status_display}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date de création</p>
                  <p className="font-medium">{formatDate(selectedPlan.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Dernière mise à jour</p>
                  <p className="font-medium">{formatDate(selectedPlan.updated_at)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Résumé exécutif</p>
                <p className="text-gray-900">{selectedPlan.summary || 'Aucun résumé disponible'}</p>
              </div>
              {selectedPlan.financial_projections && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Revenus An 1</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(
                        extractFinancialValue(selectedPlan.financial_projections.year_1_revenue) ||
                        extractFinancialValue(selectedPlan.financial_projections.year_projection) ||
                        (extractFinancialValue(selectedPlan.financial_projections.monthly_revenue) ? 
                          extractFinancialValue(selectedPlan.financial_projections.monthly_revenue)! * 12 : 
                          undefined)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dépenses An 1</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(
                        extractFinancialValue(selectedPlan.financial_projections.year_1_expenses) ||
                        (extractFinancialValue(selectedPlan.financial_projections.monthly_expenses) ? 
                          extractFinancialValue(selectedPlan.financial_projections.monthly_expenses)! * 12 : 
                          undefined)
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profit An 1</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(
                        extractFinancialValue(selectedPlan.financial_projections.year_1_profit) ||
                        (() => {
                          const revenue = calculateYearRevenue(selectedPlan.financial_projections) || 0;
                          const expenses = extractFinancialValue(selectedPlan.financial_projections.year_1_expenses) ||
                            (extractFinancialValue(selectedPlan.financial_projections.monthly_expenses) ? 
                              extractFinancialValue(selectedPlan.financial_projections.monthly_expenses)! * 12 : 
                              0);
                          return revenue - expenses;
                        })()
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fermer
            </Button>
            {selectedPlan && (
              <Button onClick={() => handleDownloadPDF(selectedPlan.id)}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de validation */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {validationAction === 'approve' ? 'Approuver' : 'Rejeter'} le plan d'affaires
            </DialogTitle>
            <DialogDescription>
              {validationAction === 'approve'
                ? 'Confirmez l\'approbation de ce plan d\'affaires'
                : 'Indiquez la raison du rejet de ce plan d\'affaires'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Commentaire</p>
              <Textarea
                placeholder={
                  validationAction === 'approve'
                    ? 'Ajoutez un commentaire (optionnel)'
                    : 'Indiquez la raison du rejet'
                }
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Annuler
            </Button>
            <Button
              variant={validationAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleSubmitValidation}
            >
              {validationAction === 'approve' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approuver
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
