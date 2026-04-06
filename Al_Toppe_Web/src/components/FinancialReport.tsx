import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = "https://api.altoppe.sn/api";

interface FinancialReportProps {
  entrepreneurId: string;
}

interface ReportData {
  period: {
    start_date: string;
    end_date: string;
    start_date_display: string;
    end_date_display: string;
  };
  summary: {
    total_produits: number;
    total_charges: number;
    benefice: number;
    marge_beneficiaire: number;
  };
  produits_by_category: Array<{
    category_name: string;
    amount: number;
    percentage: number;
  }>;
  charges_by_category: Array<{
    category_name: string;
    amount: number;
    percentage: number;
  }>;
  transaction_count: {
    income: number;
    expense: number;
    total: number;
  };
}

export function FinancialReport({ entrepreneurId }: FinancialReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  // Initialiser les dates (30 derniers jours par défaut)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Charger le rapport quand les dates changent
  useEffect(() => {
    if (startDate && endDate && entrepreneurId) {
      fetchReport();
    }
  }, [startDate, endDate, entrepreneurId]);

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('altoppe_access_token') || localStorage.getItem('altoppe_token') || localStorage.getItem('token');
      const url = `${API_BASE_URL}/finances/entrepreneurs/${entrepreneurId}/report/summary/?start_date=${startDate}&end_date=${endDate}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Erreur lors du chargement du rapport:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!startDate || !endDate) return;
    
    setExporting(true);
    try {
      const token = localStorage.getItem('altoppe_access_token') || localStorage.getItem('altoppe_token') || localStorage.getItem('token');
      const url = `${API_BASE_URL}/finances/entrepreneurs/${entrepreneurId}/report/export-pdf/?start_date=${startDate}&end_date=${endDate}`;
      
      const response = await fetch(url, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      // Télécharger le PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `rapport-financier-${entrepreneurId}-${startDate}-${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Erreur lors de l\'export du rapport PDF');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            Rapport Financier
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Synthèse financière avec Total Produits, Total Charges et Bénéfice
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportPDF}
          disabled={exporting || !reportData}
        >
          {exporting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Télécharger le rapport PDF
            </>
          )}
        </Button>
      </div>

      {/* Sélecteur de période */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date de début
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date de fin
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchReport} disabled={loading} className="w-full">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Résumé financier */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#006666] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Chargement du rapport...</p>
          </div>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Période */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Période du</p>
            <p className="text-lg font-semibold text-gray-900">
              {reportData.period.start_date_display} au {reportData.period.end_date_display}
            </p>
          </div>

          {/* Totaux */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Total Produits (A)</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(reportData.summary.total_produits)}
              </p>
            </Card>
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Total Charges (B)</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(reportData.summary.total_charges)}
              </p>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Bénéfice (A - B)</span>
              </div>
              <p className={`text-2xl font-bold ${reportData.summary.benefice >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(reportData.summary.benefice)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Marge: {reportData.summary.marge_beneficiaire.toFixed(2)}%
              </p>
            </Card>
          </div>

          {/* Détails par catégorie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Produits par catégorie */}
            {reportData.produits_by_category.length > 0 && (
              <Card className="p-4 bg-green-50/50 border-green-200">
                <h4 className="font-semibold text-green-900 mb-4">Produits par Catégorie</h4>
                <div className="space-y-2">
                  {reportData.produits_by_category.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.category_name}</p>
                        <p className="text-xs text-gray-600">{item.percentage.toFixed(2)}%</p>
                      </div>
                      <p className="text-sm font-semibold text-green-700">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Charges par catégorie */}
            {reportData.charges_by_category.length > 0 && (
              <Card className="p-4 bg-red-50/50 border-red-200">
                <h4 className="font-semibold text-red-900 mb-4">Charges par Catégorie</h4>
                <div className="space-y-2">
                  {reportData.charges_by_category.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.category_name}</p>
                        <p className="text-xs text-gray-600">{item.percentage.toFixed(2)}%</p>
                      </div>
                      <p className="text-sm font-semibold text-red-700">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Statistiques */}
          <Card className="p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-3">Statistiques</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{reportData.transaction_count.income}</p>
                <p className="text-xs text-gray-600">Revenus</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{reportData.transaction_count.expense}</p>
                <p className="text-xs text-gray-600">Dépenses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{reportData.transaction_count.total}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Sélectionnez une période et cliquez sur "Actualiser" pour générer le rapport
          </p>
        </div>
      )}
    </Card>
  );
}

