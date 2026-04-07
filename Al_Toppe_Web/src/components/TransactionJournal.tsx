import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from './ui/chart';
import { PieChart, Pie, Cell } from 'recharts';
// Même base que apiService (VITE_API_BASE_URL)
import { apiService } from '@/services/api';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Edit,
  Save
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  client_supplier?: string;
  category?: string;
  category_name?: string;
  category_id?: string;
  amount: number;
  payment_method?: string;
  invoice_number?: string;
  has_invoice?: boolean;
  description?: string;
  title?: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface TransactionJournalProps {
  entrepreneurId?: string;
  showEntrepreneurSelector?: boolean;
  entrepreneurs?: Array<{ id: string; full_name: string , phone: string }>;
  period?: { start_date?: string; end_date?: string };
}

export function TransactionJournal({ 
  entrepreneurId: initialEntrepreneurId,
  showEntrepreneurSelector = false,
  entrepreneurs = [],
  period
}: TransactionJournalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEntrepreneurId, setSelectedEntrepreneurId] = useState<string>(initialEntrepreneurId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportingPDF, setExportingPDF] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!selectedEntrepreneurId) return;
    
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = new URLSearchParams();
      // Priorité aux dates du composant, sinon utiliser period
      if (startDate) params.append('start_date', startDate);
      else if (period?.start_date) params.append('start_date', period.start_date);
      
      if (endDate) params.append('end_date', endDate);
      else if (period?.end_date) params.append('end_date', period.end_date);
      
      const results = await apiService.getCashflowEntries(selectedEntrepreneurId, {
        start_date: params.get('start_date') || undefined,
        end_date: params.get('end_date') || undefined,
      });
      
      const formattedTransactions: Transaction[] = results.map((tx: Record<string, unknown>) => ({
        id: String(tx.id || ''),
        date: String(tx.date || ''),
        type: (tx.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
        client_supplier: String(tx.client_supplier || ''),
        category: String(tx.category || ''),
        category_id: typeof tx.category === 'object' && tx.category !== null 
          ? String((tx.category as Record<string, unknown>).id || '') 
          : String(tx.category || ''),
        category_name: String(tx.category_name || (typeof tx.category === 'object' && tx.category !== null ? (tx.category as Record<string, unknown>).name : '') || 'Non catégorisé'),
        amount: parseFloat(String(tx.amount || 0)),
        payment_method: String(tx.payment_method || 'cash'),
        invoice_number: String(tx.invoice_number || ''),
        has_invoice: Boolean(tx.has_invoice || false),
        description: String(tx.description || tx.title || ''),
        title: String(tx.title || tx.description || ''),
      }));

      // Trier par date décroissante
      formattedTransactions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEntrepreneurId, period, startDate, endDate]);

  // Initialiser les dates par défaut (30 derniers jours)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (selectedEntrepreneurId) {
      fetchTransactions();
    }
  }, [selectedEntrepreneurId, fetchTransactions, startDate, endDate]);

  // Récupérer les catégories et le rôle de l'utilisateur
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const results = await apiService.getFinanceCategories();
        setCategories(results.map((cat: { id: string; name: string; type: string }) => ({
          id: String(cat.id),
          name: String(cat.name),
          type: cat.type as 'income' | 'expense',
        })));
      } catch {
        /* API hors ligne : catégories vides, saisie manuelle possible */
      }
    };

    // Récupérer le rôle de l'utilisateur
    const storedUser = localStorage.getItem('altoppe_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserRole(user.role || '');
      } catch (error) {
        console.error('Erreur lors du parsing du user:', error);
      }
    }

    fetchCategories();
  }, []);

  const roleNorm = (userRole || '')
    .toLowerCase()
    .replace(/administrateur|administrator/g, 'admin');
  const canEdit = ['admin', 'coach'].includes(roleNorm);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      title: transaction.title || transaction.description || '',
      description: transaction.description || '',
      amount: transaction.amount,
      category_id: transaction.category_id || transaction.category || '',
      date: transaction.date.split('T')[0], // Format YYYY-MM-DD
      payment_method: transaction.payment_method || 'cash',
      client_supplier: transaction.client_supplier || '',
      invoice_number: transaction.invoice_number || '',
      has_invoice: transaction.has_invoice || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction || !selectedEntrepreneurId) return;

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: editFormData.title || editFormData.description || '',
        description: editFormData.description || '',
        amount: editFormData.amount,
        category: editFormData.category_id,
        date: editFormData.date,
        payment_method: editFormData.payment_method || 'cash',
        client_supplier: editFormData.client_supplier || '',
        invoice_number: editFormData.invoice_number || '',
        has_invoice: editFormData.has_invoice || false,
      };
      await apiService.updateCashflowEntry(
        selectedEntrepreneurId,
        editingTransaction.id,
        payload,
      );

      // Rafraîchir la liste des transactions
      await fetchTransactions();
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la transaction');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodColor = (method: string) => {
    const methodLower = method?.toLowerCase() || '';
    if (methodLower.includes('espèces') || methodLower.includes('cash')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (methodLower.includes('orange')) {
      return 'bg-orange-100 text-orange-800';
    }
    if (methodLower.includes('wave')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (methodLower.includes('virement')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodLower = method?.toLowerCase() || '';
    if (methodLower.includes('espèces') || methodLower.includes('cash')) return 'Espèces';
    if (methodLower.includes('orange')) return 'Orange Money';
    if (methodLower.includes('wave')) return 'Wave';
    if (methodLower.includes('virement')) return 'Virement';
    return method || 'Non spécifié';
  };

  const inSelectedDateRange = (tx: Transaction) => {
    const d = (tx.date || '').split('T')[0];
    if (!d) return true;
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!inSelectedDateRange(tx)) return false;
    const matchesSearch =
      !searchQuery ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.client_supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculer la répartition par catégorie pour les revenus
  const incomeByCategory = filteredTransactions
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => {
      const categoryName = tx.category_name || 'Non catégorisé';
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, amount: 0, count: 0 };
      }
      acc[categoryName].amount += tx.amount;
      acc[categoryName].count += 1;
      return acc;
    }, {} as Record<string, { name: string; amount: number; count: number }>);

  const incomeCategoriesData = Object.values(incomeByCategory)
    .map((cat, index) => ({
      name: cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name,
      fullName: cat.name,
      value: cat.amount,
      percentage: totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0,
      color: [
        '#3B82F6', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899',
        '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'
      ][index % 9]
    }))
    .sort((a, b) => b.value - a.value);

  // Calculer la répartition par catégorie pour les dépenses
  const expenseByCategory = filteredTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => {
      const categoryName = tx.category_name || 'Non catégorisé';
      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, amount: 0, count: 0 };
      }
      acc[categoryName].amount += tx.amount;
      acc[categoryName].count += 1;
      return acc;
    }, {} as Record<string, { name: string; amount: number; count: number }>);

  const expenseCategoriesData = Object.values(expenseByCategory)
    .map((cat, index) => ({
      name: cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name,
      fullName: cat.name,
      value: cat.amount,
      percentage: totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0,
      color: [
        '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
        '#22C55E', '#10B981', '#14B8A6', '#06B6D4'
      ][index % 9]
    }))
    .sort((a, b) => b.value - a.value);

  const handleExport = () => {
    // Créer un CSV
    const headers = ['Date', 'Type', 'Fournisseur/Client', 'Catégorie', 'Montant (FCFA)', 'Mode de Paiement', 'N° Facture', 'Facture dispo'];
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.date),
      tx.type === 'income' ? 'Recette' : 'Dépense',
      tx.client_supplier || '',
      tx.category_name || '',
      tx.amount.toString(),
      getPaymentMethodLabel(tx.payment_method || ''),
      tx.invoice_number || '',
      tx.has_invoice ? 'Oui' : 'Non'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-transactions-${selectedEntrepreneurId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!selectedEntrepreneurId || !startDate || !endDate) {
      alert('Veuillez sélectionner un entrepreneur et une période');
      return;
    }

    setExportingPDF(true);
    try {
      const blob = await apiService.downloadFinanceReportPdf(selectedEntrepreneurId, {
        start_date: startDate,
        end_date: endDate,
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `rapport-financier-${selectedEntrepreneurId}-${startDate}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export du rapport PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            Journal des Transactions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Toutes les transactions financières, une par ligne. C'est la base de données principale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={exportingPDF || !selectedEntrepreneurId || !startDate || !endDate}
            className="bg-[#006666] hover:bg-[#004d4d] text-white"
          >
            {exportingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Génération...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Télécharger le rapport PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sélecteur d'entrepreneur (si nécessaire) */}
      {showEntrepreneurSelector && entrepreneurs.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <Select value={selectedEntrepreneurId} onValueChange={setSelectedEntrepreneurId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Sélectionner un entrepreneur" />
            </SelectTrigger>
            <SelectContent>
              {entrepreneurs.map((ent) => (
                <SelectItem key={ent.id} value={ent.id}>
                  {ent.full_name} {ent.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filteredTransactions.length > 0 && (
        <div className="    relative">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''} affichée{filteredTransactions.length > 1 ? 's' : ''}
            </span>
            
          </div>
        </div>
      )}   
        </div>
      )}

      {/* Sélection de période */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Date de début
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4" />
            Date de fin
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(start.getDate() - 30);
              setEndDate(end.toISOString().split('T')[0]);
              setStartDate(start.toISOString().split('T')[0]);
            }}
            className="w-full"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Réinitialiser (30j)
          </Button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
       
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par description, fournisseur, catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={(value: 'all' | 'income' | 'expense') => setFilterType(value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="income">Revenus uniquement</SelectItem>
            <SelectItem value="expense">Dépenses uniquement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Répartition par Catégorie */}
      {(incomeCategoriesData.length > 0 || expenseCategoriesData.length > 0) && (
        <div className="mb-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Répartition par Catégorie</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Section Revenus */}
            {incomeCategoriesData.length > 0 && (
              <Card className="p-4 bg-green-50/50 border-green-200">
                <h4 className="font-semibold text-green-900 mb-4">PRODUITS (Recettes)</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Tableau Revenus */}
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-green-300">
                            <th className="text-left py-2 px-2 text-green-900">%</th>
                            <th className="text-right py-2 px-2 text-green-900">Montant (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incomeCategoriesData.map((cat, index) => (
                            <tr key={cat.fullName} className="border-b border-green-200/50">
                              <td className="py-2 px-2 text-green-800">
                                {index + 1}. {cat.fullName}
                              </td>
                              <td className="text-right py-2 px-2">
                                <div className="flex flex-col items-end">
                                  <span className="text-green-900 font-medium">{cat.percentage.toFixed(2)}%</span>
                                  <span className="text-green-700">{formatCurrency(cat.value)}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-green-500 font-bold bg-green-100">
                            <td className="py-2 px-2 text-green-900">TOTAL DES PRODUITS (A)</td>
                            <td className="text-right py-2 px-2 text-green-900">{formatCurrency(totalIncome)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Donut Chart Revenus */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <ChartContainer
                      config={incomeCategoriesData.reduce((acc, cat) => {
                        acc[cat.fullName] = { label: cat.fullName, color: cat.color };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>)}
                      className="h-[220px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip 
                          content={<ChartTooltipContent 
                            formatter={(value: number) => [formatCurrency(value), '']} 
                          />} 
                        />
                        <Pie
                          data={incomeCategoriesData}
                          dataKey="value"
                          nameKey="fullName"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={2}
                          label={({ percentage }) => percentage > 3 ? `${percentage.toFixed(1)}%` : ''}
                          labelLine={false}
                        >
                          {incomeCategoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    {/* Légende horizontale personnalisée */}
                    <div className="w-full">
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                        {incomeCategoriesData.map((cat) => (
                          <div key={cat.fullName} className="flex items-center gap-1.5">
                            <div
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-gray-700 whitespace-nowrap">
                              {cat.fullName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Section Dépenses */}
            {expenseCategoriesData.length > 0 && (
              <Card className="p-4 bg-red-50/50 border-red-200">
                <h4 className="font-semibold text-red-900 mb-4">CHARGES (Dépenses)</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Tableau Dépenses */}
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-red-300">
                            <th className="text-left py-2 px-2 text-red-900">%</th>
                            <th className="text-right py-2 px-2 text-red-900">Montant (FCFA)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseCategoriesData.map((cat, index) => (
                            <tr key={cat.fullName} className="border-b border-red-200/50">
                              <td className="py-2 px-2 text-red-800">
                                {cat.fullName}
                              </td>
                              <td className="text-right py-2 px-2">
                                <div className="flex flex-col items-end">
                                  <span className="text-red-900 font-medium">{cat.percentage.toFixed(2)}%</span>
                                  <span className="text-red-700">{formatCurrency(cat.value)}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-red-500 font-bold bg-red-100">
                            <td className="py-2 px-2 text-red-900">TOTAL DES CHARGES (B)</td>
                            <td className="text-right py-2 px-2 text-red-900">{formatCurrency(totalExpense)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Donut Chart Dépenses */}
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <ChartContainer
                      config={expenseCategoriesData.reduce((acc, cat) => {
                        acc[cat.fullName] = { label: cat.fullName, color: cat.color };
                        return acc;
                      }, {} as Record<string, { label: string; color: string }>)}
                      className="h-[220px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip 
                          content={<ChartTooltipContent 
                            formatter={(value: number) => [formatCurrency(value), '']} 
                          />} 
                        />
                        <Pie
                          data={expenseCategoriesData}
                          dataKey="value"
                          nameKey="fullName"
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={2}
                          label={({ percentage }) => percentage > 3 ? `${percentage.toFixed(1)}%` : ''}
                          labelLine={false}
                        >
                          {expenseCategoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    {/* Légende horizontale personnalisée */}
                    <div className="w-full">
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
                        {expenseCategoriesData.map((cat) => (
                          <div key={cat.fullName} className="flex items-center gap-1.5">
                            <div
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-gray-700 whitespace-nowrap">
                              {cat.fullName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Résultat Net */}
          <Card className="p-4 bg-blue-50/50 border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-900">RÉSULTAT AVANT IMPÔT (A - B)</h4>
              <span className={`text-xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Totaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Total Revenus</span>
          </div>
          <p className="text-xl font-bold text-green-900">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Total Dépenses</span>
          </div>
          <p className="text-xl font-bold text-red-900">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Solde Net</span>
          </div>
          <p className={`text-xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Tableau des transactions */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#006666] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Chargement des transactions...</p>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedEntrepreneurId 
              ? 'Aucune transaction trouvée pour cette période.' 
              : 'Sélectionnez un entrepreneur pour voir ses transactions.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>   
            
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[100px]">Type</TableHead>
                <TableHead className="min-w-[100px]">Description</TableHead>

                <TableHead className="min-w-[150px]">Catégorie</TableHead>
                <TableHead className="min-w-[120px] text-right">Montant (FCFA)</TableHead>
                <TableHead className="min-w-[120px]">Mode de Paiement</TableHead>
                <TableHead className="min-w-[120px]">N° Facture</TableHead>
                <TableHead className="min-w-[100px]">Facture dispo</TableHead>
                <TableHead className="min-w-[150px]">Fournisseur/Client</TableHead>
                {canEdit && <TableHead className="min-w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={tx.type === 'income' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-red-100 text-red-800 hover:bg-red-200'}
                    >
                      {tx.type === 'income' ? 'Recette' : 'Dépense'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {tx.description || '-'}
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={tx.type === 'income' 
                        ? 'border-green-300 text-green-700' 
                        : 'border-red-300 text-red-700'}
                    >
                      {tx.category_name || 'Non catégorisé'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={tx.type === 'income' ? 'text-green-700' : 'text-red-700'}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentMethodColor(tx.payment_method || '')}>
                      {getPaymentMethodLabel(tx.payment_method || '')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {tx.invoice_number || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={tx.has_invoice 
                        ? 'bg-gray-100 text-gray-700 border-gray-300' 
                        : 'bg-gray-200 text-gray-600 border-gray-400'}
                    >
                      {tx.has_invoice ? 'Oui' : 'Non'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={tx.client_supplier || ''}>
                    {tx.client_supplier || '-'}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tx)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la transaction</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la transaction. Les champs marqués d'un * sont obligatoires.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Titre *</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Titre de la transaction"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Description détaillée"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Montant (FCFA) *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.amount || 0}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Catégorie *</Label>
                <Select
                  value={editFormData.category_id || ''}
                  onValueChange={(value) => setEditFormData({ ...editFormData, category_id: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(cat => cat.type === editingTransaction?.type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-payment-method">Mode de paiement</Label>
                <Select
                  value={editFormData.payment_method || 'cash'}
                  onValueChange={(value) => setEditFormData({ ...editFormData, payment_method: value })}
                >
                  <SelectTrigger id="edit-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="wave">Wave</SelectItem>
                    <SelectItem value="virement">Virement bancaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client-supplier">Fournisseur/Client</Label>
                <Input
                  id="edit-client-supplier"
                  value={editFormData.client_supplier || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, client_supplier: e.target.value })}
                  placeholder="Nom du fournisseur ou client"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-invoice-number">N° Facture</Label>
                <Input
                  id="edit-invoice-number"
                  value={editFormData.invoice_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, invoice_number: e.target.value })}
                  placeholder="Numéro de facture"
                />
              </div>
              <div className="space-y-2 flex items-center">
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="edit-has-invoice"
                    checked={editFormData.has_invoice || false}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, has_invoice: checked as boolean })}
                  />
                  <Label htmlFor="edit-has-invoice" className="cursor-pointer">
                    Facture disponible
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTransaction(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || !editFormData.amount || !editFormData.date || !editFormData.category_id}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Résumé en bas */}
      {filteredTransactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''} affichée{filteredTransactions.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-green-700 font-medium">
                Revenus: {formatCurrency(totalIncome)}
              </span>
              <span className="text-red-700 font-medium">
                Dépenses: {formatCurrency(totalExpense)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

