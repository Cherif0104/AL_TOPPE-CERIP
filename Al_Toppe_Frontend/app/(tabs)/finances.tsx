import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal,
  Alert, ActivityIndicator
} from 'react-native';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  DollarSign,
  Calendar,
  X,
  CheckCircle,
  Package,
  Zap
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Header from '@/components/ui/Header';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { FinanceService, TransactionPayload, TransactionType as TxType } from '@/services/finance';
import { ActivityService } from '@/services/activity';
import { CategoryService, CategoryItem } from '@/services/category';
import { AppEvents } from '@/services/storage';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useOfflineData } from '@/hooks/useOfflineData';
import { CacheKeys } from '@/services/cacheService';
// IA
import aiService from '@/services/ai';
import { FinancialAnalysisResult, RecurringExpensesResult } from '@/types/ai';
import RecurringExpensesCard from '@/components/ai/RecurringExpensesCard';
import Toast from 'react-native-toast-message';
import FinancialHealthCard from '@/components/ai/FinancialHealthCard';
type TransactionType = TxType;

interface TransactionItemData {
  id: string | number;
  type: TransactionType;
  amount: number;
  description?: string;
  category?: string;
  category_name?: string;
  payment_status?: 'paid' | 'pending' | string;
  status?: 'completed' | 'pending' | string;
  date: string;
  activity?: string;
  activity_title?: string;
  // Nouveaux champs optionnels pour le compte de résultat
  invoice_number?: string;
  client_supplier?: string;
  has_invoice?: boolean;
}

interface ActivityItem {
  id: string;
  title: string;
}

export default function FinancesScreen() {
  const [activeTab, setActiveTab] = useState<'all' | TransactionType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null);

  const [transactions, setTransactions] = useState<TransactionItemData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([]); // Stocker toutes les catégories

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  // Nouveaux champs optionnels
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientSupplier, setClientSupplier] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<TransactionItemData | null>(null);


  // IA
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpensesResult | null>(null);
  const [detectingRecurring, setDetectingRecurring] = useState(false);

  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const safeNumber = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const getTotalAmount = (type: 'all' | TransactionType) => {
    return transactions
      .filter((t) => type === 'all' || t.type === type)
      .reduce((sum, t) => sum + safeNumber(t.amount), 0);
  };

  // ✅ Utilisation du hook useOfflineData pour les transactions
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  
  useEffect(() => {
    getEntrepreneurId().then(id => {
      setEntrepreneurId(id || null);
    });
  }, []);

  const { 
    data: transactionsData, 
    loading: transactionsLoading, 
    refetch: refetchTransactions,
    isFromCache: transactionsFromCache 
  } = useOfflineData<{ results: TransactionItemData[] }>({
    cacheKey: entrepreneurId ? `${CacheKeys.TRANSACTIONS}_${entrepreneurId}` : '',
    fetchFunction: async () => {
    const entrepreneur_id = await getEntrepreneurId();
      if (!entrepreneur_id) throw new Error('Entrepreneur ID not found');
      return await FinanceService.list(entrepreneur_id);
    },
    cacheExpiry: 24 * 60 * 60 * 1000, // 24h
    enabled: !!entrepreneurId,
  });

  const { 
    data: activitiesData, 
    loading: activitiesLoading 
  } = useOfflineData<{ results: ActivityItem[] }>({
    cacheKey: entrepreneurId ? `${CacheKeys.ACTIVITIES}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      const entrepreneur_id = await getEntrepreneurId();
      if (!entrepreneur_id) throw new Error('Entrepreneur ID not found');
      return await ActivityService.listByEntrepreneur(entrepreneur_id);
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours (activités changent rarement)
    enabled: !!entrepreneurId && !activities.length,
  });

  const { 
    data: categoriesData, 
    loading: categoriesLoading 
  } = useOfflineData<CategoryItem[]>({
    cacheKey: CacheKeys.CATEGORIES,
    fetchFunction: async () => {
      return await CategoryService.list();
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours (catégories changent rarement)
    enabled: !categories.length,
  });

  // Mettre à jour les états quand les données arrivent
  useEffect(() => {
    if (transactionsData?.results) {
      setTransactions(transactionsData.results);
    }
  }, [transactionsData]);

  useEffect(() => {
    if (activitiesData?.results) {
      const actResults: ActivityItem[] = activitiesData.results.map((a: any) => ({ id: a.id, title: a.title }));
        setActivities(actResults);
        if (!selectedActivityId && actResults.length > 0) setSelectedActivityId(actResults[0].id);
      }
  }, [activitiesData, selectedActivityId]);

  useEffect(() => {
    if (categoriesData) {
      const cats = Array.isArray(categoriesData) ? categoriesData : [];
      setAllCategories(cats); // Stocker toutes les catégories
      
      // Filtrer selon le type de transaction initial
      const filteredCats = cats.filter((cat: CategoryItem) => {
        if (transactionType === 'income') {
          return cat.type === 'income' || cat.type === 'both';
        } else {
          return cat.type === 'expense' || cat.type === 'both';
        }
      });
      setCategories(filteredCats);
      if (!category && filteredCats.length > 0) setCategory(filteredCats[0].id);
    }
  }, [categoriesData, category, transactionType]);

  // Combiner les états de chargement
  useEffect(() => {
    setIsLoading(transactionsLoading || activitiesLoading || categoriesLoading);
  }, [transactionsLoading, activitiesLoading, categoriesLoading]);

  // Fonction pour recharger après modification
  const fetchData = async () => {
    await refetchTransactions();
  };

  useEffect(() => {
    AppEvents.on('finances:changed', fetchData);
  }, []);

  const getFilteredTransactions = (): TransactionItemData[] => {
    let filtered = [...transactions];
    if (activeTab !== 'all') {
      filtered = filtered.filter((t) => t.type === activeTab);
    }
    if (searchQuery) {
      filtered = filtered.filter((t) =>
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || t.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.activity_title || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const handleSaveTransaction = async () => {
    const parsedAmount = Math.abs(Number(amount));
    const entrepreneur_id = await getEntrepreneurId();

    if (!parsedAmount || isNaN(parsedAmount) || !entrepreneur_id || !selectedActivityId) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Validation : si facture disponible, les champs sont obligatoires
    if (hasInvoice && (!invoiceNumber.trim() || !clientSupplier.trim())) {
      alert("Veuillez remplir le numéro de facture et le fournisseur/client si une facture est disponible.");
      return;
    }

    const payload: TransactionPayload = {
      entrepreneur: entrepreneur_id,
      activity: selectedActivityId,
      title: description || "Transaction",
      description,
      type: transactionType,
      amount: parsedAmount,
      category,
      date: new Date().toISOString().split('T')[0],
      frequency: "one_time",
      payment_status: "pending",
      payment_method: "cash",
      reference: `txn_${Date.now()}`,
      // Nouveaux champs optionnels
      invoice_number: hasInvoice ? invoiceNumber : undefined,
      client_supplier: hasInvoice ? clientSupplier : undefined,
      has_invoice: hasInvoice,
    };

    try {
      await FinanceService.create(entrepreneur_id, payload);
      alert("Transaction enregistrée ✅");
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement ❌");
    }
  };

  const handleEditTransaction = async () => {
    if (!editingTransaction) return;
    const parsedAmount = Math.abs(Number(amount));
    const entrepreneur_id = await getEntrepreneurId();

    if (!parsedAmount || !entrepreneur_id || !selectedActivityId) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Validation : si facture disponible, les champs sont obligatoires
    if (hasInvoice && (!invoiceNumber.trim() || !clientSupplier.trim())) {
      alert("Veuillez remplir le numéro de facture et le fournisseur/client si une facture est disponible.");
      return;
    }

    const payload: TransactionPayload = {
      entrepreneur: entrepreneur_id,
      activity: selectedActivityId,
      title: description || "Transaction",
      description,
      type: transactionType,
      amount: parsedAmount,
      category,
      date: editingTransaction.date,
      frequency: "one_time",
      payment_status: editingTransaction.payment_status || "pending",
      payment_method: "cash",
      reference: editingTransaction.id.toString(),
      // Nouveaux champs optionnels
      invoice_number: hasInvoice ? invoiceNumber : undefined,
      client_supplier: hasInvoice ? clientSupplier : undefined,
      has_invoice: hasInvoice,
    };

    try {
      await FinanceService.update(entrepreneur_id, editingTransaction.id.toString(), payload);
      alert("Transaction modifiée ✅");
      setShowEditModal(false);
      setEditingTransaction(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert("Erreur lors de la modification ❌");
    }
  };

  const handleDeleteTransaction = async (transactionId: string | number) => {
    // Demander confirmation avant de supprimer
    const confirm = await new Promise<boolean>((resolve) => {
      // Utilise l'API native de confirmation en React Native
      if (typeof window === 'undefined' && global?.alert) {
        // Android/iOS (React Native)
        // @ts-ignore
        global.alert("Confirmation de suppression", "Êtes-vous sûr de vouloir supprimer cette transaction ?");
        resolve(true);
      } else {
        // Web/Expo fallback
        resolve(window.confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?"));
      }
    });

    if (!confirm) return;

    const entrepreneur_id = await getEntrepreneurId();
    if (!entrepreneur_id) return;

    try {
      setIsDeleting(transactionId);
      await FinanceService.delete(entrepreneur_id, transactionId.toString());
      alert("Transaction supprimée ✅");
      fetchData();
    } catch (err) {
      alert("Erreur lors de la suppression ❌");
    } finally {
      setIsDeleting(null);
    }
  };

  const openEditModal = (transaction: TransactionItemData) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description || '');
    setSelectedActivityId(transaction.activity || null);
    // Nouveaux champs optionnels
    setInvoiceNumber(transaction.invoice_number || '');
    setClientSupplier(transaction.client_supplier || '');
    setHasInvoice(transaction.has_invoice || false);
    
    // Filtrer les catégories selon le type de transaction
    const filteredCats = getFilteredCategories(transaction.type);
    setCategories(filteredCats);
    setCategory(transaction.category || (filteredCats.length > 0 ? filteredCats[0].id : ''));
    
    setShowEditModal(true);
  };

  // Filtrer les catégories selon le type de transaction
  const getFilteredCategories = (type: TransactionType): CategoryItem[] => {
    return allCategories.filter((cat) => {
      if (type === 'income') {
        return cat.type === 'income' || cat.type === 'both';
      } else {
        return cat.type === 'expense' || cat.type === 'both';
      }
    });
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setTransactionType('income');
    // Nouveaux champs optionnels
    setInvoiceNumber('');
    setClientSupplier('');
    setHasInvoice(false);
    if (activities.length > 0) setSelectedActivityId(activities[0].id);
    
    // Filtrer et définir la première catégorie selon le type
    const filteredCats = getFilteredCategories('income');
    setCategories(filteredCats);
    if (filteredCats.length > 0) setCategory(filteredCats[0].id);
  };

  const balance = getTotalAmount('income') - getTotalAmount('expense');
  const [analyzingHealth, setAnalyzingHealth] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<FinancialAnalysisResult | null>(null);
  const handleAnalyzeFinancialHealth = async () => {
    try {
      setAnalyzingHealth(true);
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Profil entrepreneur non trouvé',
        });
        setAnalyzingHealth(false);
        return;
      }
      const result = await aiService.analyzeFinancialHealth(entrepreneurId, 30);
      
      // Vérifier si c'est une erreur de quota
      if (!result.success && result.error) {
        const errorMessage = result.error.toLowerCase();
        if (errorMessage.includes('429') || 
            errorMessage.includes('quota') || 
            errorMessage.includes('exceeded') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('rate-limit') ||
            errorMessage.includes('generativelanguage')) {
          Toast.show({
            type: 'error',
            text1: 'Quota dépassé',
            text2: 'Le quota quotidien de l\'IA a été atteint. Veuillez réessayer demain.',
            visibilityTime: 5000,
          });
          setAnalyzingHealth(false);
          return;
        }
      }
      
      setAiAnalysis(result);
      setAnalyzingHealth(false);
    } catch (error: any) {
      console.error('Erreur analyse:', error);
      setAnalyzingHealth(false);
      
      // Vérifier si c'est une erreur de quota dans le message d'erreur
      const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
      if (errorMessage.includes('429') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('rate-limit') ||
          errorMessage.includes('generativelanguage')) {
        Toast.show({
          type: 'error',
          text1: 'Quota dépassé',
          text2: 'Le quota quotidien de l\'IA a été atteint. Veuillez réessayer demain.',
          visibilityTime: 5000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Une erreur est survenue lors de l\'analyse',
        });
      }
    }
  };  
// IA
  const handleDetectRecurring = async () => {
    try {
      setDetectingRecurring(true);
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Profil entrepreneur non trouvé',
        });
        setDetectingRecurring(false);
        return;
      }
      const result = await aiService.detectRecurringExpenses(entrepreneurId, 90);
      
      // Vérifier si c'est une erreur
      if (!result.success && result.error) {
        const errorMessage = result.error.toLowerCase();
        const errorText = result.error || '';
        
        // Erreur de quota
        if (errorMessage.includes('429') || 
            errorMessage.includes('quota') || 
            errorMessage.includes('exceeded') ||
            errorMessage.includes('rate limit') ||
            errorMessage.includes('rate-limit') ||
            errorMessage.includes('generativelanguage')) {
          Toast.show({
            type: 'error',
            text1: 'Quota dépassé',
            text2: 'Le quota quotidien de l\'IA a été atteint. Veuillez réessayer demain.',
            visibilityTime: 5000,
          });
          setDetectingRecurring(false);
          return;
        }
        
        // Pas assez de données
        if (errorMessage.includes('pas assez de données') || 
            errorMessage.includes('au moins 10 dépenses')) {
          Toast.show({
            type: 'info',
            text1: 'Données insuffisantes',
            text2: 'Ajoutez au moins 10 dépenses pour détecter les patterns récurrents.',
            visibilityTime: 6000,
          });
          // On définit quand même le résultat pour afficher un message dans la carte
      setRecurringExpenses(result);
      setDetectingRecurring(false);
          return;
        }
        
        // Aucun pattern détecté
        if (errorMessage.includes('aucun pattern') || 
            errorMessage.includes('pas de dépenses récurrentes')) {
          Toast.show({
            type: 'info',
            text1: 'Aucun pattern détecté',
            text2: 'Aucune dépense récurrente n\'a été identifiée dans vos transactions.',
            visibilityTime: 5000,
          });
          setRecurringExpenses(result);
          setDetectingRecurring(false);
          return;
        }
        
        // Autre erreur - afficher le message d'erreur spécifique
        Toast.show({
          type: 'error',
          text1: 'Erreur de détection',
          text2: errorText || 'Une erreur est survenue lors de la détection.',
          visibilityTime: 5000,
        });
        setRecurringExpenses(result);
        setDetectingRecurring(false);
        return;
      }
      
      console.log('📊 Recurring expenses result:', {
        success: result?.success,
        has_expenses: !!result?.recurring_expenses,
        expenses_count: result?.recurring_expenses?.length || 0,
        total_monthly: result?.total_monthly_estimate,
        full_result: result,
      });
      setRecurringExpenses(result);
      setDetectingRecurring(false);
    } catch (error: any) {
      console.error('Erreur détection:', error);
      setDetectingRecurring(false);
      
      // Vérifier si c'est une erreur de quota dans le message d'erreur
      const errorMessage = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';
      if (errorMessage.includes('429') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('rate-limit') ||
          errorMessage.includes('generativelanguage')) {
        Toast.show({
          type: 'error',
          text1: 'Quota dépassé',
          text2: 'Le quota quotidien de l\'IA a été atteint. Veuillez réessayer demain.',
          visibilityTime: 5000,
        });
      } else {
        // Extraire le message d'erreur si disponible
        const errorMessage = error?.message || error?.toString() || 'Une erreur est survenue lors de la détection';
      Toast.show({
        type: 'error',
        text1: 'Erreur',
          text2: errorMessage,
          visibilityTime: 5000,
      });
      }
    }
  };
  // if (isLoading && transactions.length === 0) {
  //   return (
  //     <View style={styles.container}>
  //       <Header
  //         title="Finances"
  //         onNotificationPress={() => router.push('alerts' as never)}
  //         onProfilePress={() => router.push('profile' as never)}
  //       />
  //       <LinearGradient
  //         colors={[Colors.primary, Colors.secondary]}
  //         style={styles.loadingGradient}
  //       >
  //         <ActivityIndicator size="large" color="#FFFFFF" />
  //         <Text style={styles.loadingText}>Chargement...</Text>
  //       </LinearGradient>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      <Header
        title="Finances"
        onNotificationPress={() => router.push('alerts' as never)}
        onProfilePress={() => router.push('profile' as never)}
      />

      <ScrollView
        style={styles.plansList}
        contentContainerStyle={styles.plansListContent}
        showsVerticalScrollIndicator={false}
      >

        {/* si  activite ne existe pas btn ajouter activite */}


        <LinearGradient
            colors={[Colors.primary, Colors.primary]}
            style={styles.heroHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Finances</Text>
              <Text style={styles.heroSubtitle}>Gestion complète</Text>
            </View>

            <TouchableOpacity style={styles.addButtonHero} onPress={() => setShowAddModal(true)}>
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <DollarSign size={24} color="#FFFFFF" />
              <Text style={styles.balanceLabel}>Solde Net</Text>
            </View>
            <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#FFFFFF' : '#EF4444' }]}>
              {formatCurrency(balance)}
            </Text>
          </View>
        </LinearGradient>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <LinearGradient
            colors={[Colors.primary + '20', Colors.primary + '10']}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIconWrapper}>
              <TrendingUp size={20} color={Colors.primary} />
            </View>
            <Text style={styles.summaryLabel}>Revenus</Text>
            <Text style={[styles.summaryAmount, { color: Colors.primary }]}>
              {formatCurrency(getTotalAmount('income'))}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={['#EF444420', '#EF444410']}
            style={styles.summaryCard}
          >
            <View style={[styles.summaryIconWrapper, { backgroundColor: '#EF444420' }]}>
              <TrendingDown size={20} color="#EF4444" />
            </View>
            <Text style={styles.summaryLabel}>Dépenses</Text>
            <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
              {formatCurrency(getTotalAmount('expense'))}
            </Text>
          </LinearGradient>
        </View>


        {/* Section IA Dépenses Récurrentes - Améliorée */}
        <View style={styles.aiRecurringSection}>
          
        {/* Section IA Analyse Financière */}
        <TouchableOpacity
            style={styles.aiButtonWrapper}
            activeOpacity={0.9}
            onPress={handleAnalyzeFinancialHealth}
            disabled={analyzingHealth}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + 'DD']}
              style={[styles.aiButton, analyzingHealth && styles.aiButtonDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.aiButtonIconCircle}>
                <Text style={styles.aiButtonIcon}>📊</Text>
              </View>
              <View style={[styles.aiButtonTextContainer, { marginLeft: 16 }]}>
                <Text style={styles.aiButtonTitle}>
                  {analyzingHealth ? 'Analyse en cours...' : 'Analyser ma santé financière'}
                </Text>
                <Text style={styles.aiButtonSubtitle}>
                  {analyzingHealth ? 'Al Toppe analyse vos données' : 'Score, insights & recommandations'}
                </Text>
              </View>
              <View style={{ marginLeft: 16 }}>
                {analyzingHealth ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.aiButtonArrow}>
                    <Zap size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        <FinancialHealthCard analysis={aiAnalysis} loading={analyzingHealth} />

          <TouchableOpacity
            style={styles.detectButtonWrapper}
            activeOpacity={0.9}
            onPress={handleDetectRecurring}
            disabled={detectingRecurring}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + 'DD']}
              style={[styles.detectButton, detectingRecurring && styles.detectButtonDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.detectButtonIconCircle}>
                <Text style={styles.detectButtonIcon}>🔔</Text>
              </View>
              <View style={styles.detectButtonTextContainer}>
                <Text style={styles.detectButtonTitle}>
                  {detectingRecurring ? 'Détection en cours...' : 'Détecter mes dépenses récurrentes'}
                </Text>
                <Text style={styles.detectButtonSubtitle}>
                  {detectingRecurring ? 'Analyse des 90 derniers jours' : 'Powered by Al Toppe AI'}
                </Text>
              </View>
              {detectingRecurring ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.detectButtonArrow}>
                  <Calendar size={16} color="#FFFFFF" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <RecurringExpensesCard result={recurringExpenses} loading={detectingRecurring} />
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View
          style={styles.tapSection}

        >
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
              Toutes ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'income' && styles.tabChipActive]}
            onPress={() => setActiveTab('income')}
          >
            <TrendingUp size={14} color={activeTab === 'income' ? '#FFFFFF' : Colors.primary} />
            <Text style={[styles.tabChipText, activeTab === 'income' && styles.tabChipTextActive]}>
              Revenus ({transactions.filter(t => t.type === 'income').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'expense' && styles.tabChipActive]}
            onPress={() => setActiveTab('expense')}
          >
            <TrendingDown size={14} color={activeTab === 'expense' ? '#FFFFFF' : '#EF4444'} />
            <Text style={[styles.tabChipText, activeTab === 'expense' && styles.tabChipTextActive]}>
              Dépenses ({transactions.filter(t => t.type === 'expense').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#F0F9FF', '#FFF7ED']}
                  style={styles.emptyGradient}
                >
                  <View style={styles.emptyIconWrapper}>
                    <Package size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Aucun activité</Text>
                  <Text style={styles.emptyText}>
                    Créez votre premier activité avant de commencer
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyButtonWrapper}
                    onPress={() => router.push('/activites/add')}
                  >
                    <LinearGradient
                      colors={[Colors.primary, Colors.secondary]}
                      style={styles.emptyButton}
                    >
                      <Plus size={20} color="#FFFFFF" />
                      <Text style={styles.emptyButtonText}>Créer un activité</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
        ) : (
          <ScrollView
            style={styles.transactionsList}
            contentContainerStyle={styles.transactionsContent}
            showsVerticalScrollIndicator={false}
          >
            {getFilteredTransactions().map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <LinearGradient
                    colors={transaction.type === 'income'
                      ? [Colors.primary + '25', Colors.primary + '10']
                      : ['#EF444425', '#EF444410']
                    }
                    style={styles.transactionIcon}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp size={20} color={Colors.primary} />
                    ) : (
                      <TrendingDown size={20} color="#EF4444" />
                    )}
                  </LinearGradient>

                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{transaction.description || 'Transaction'}</Text>
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionCategory}>{transaction.category_name || transaction.category}</Text>
                      {transaction.activity_title && (
                        <>
                          <Text style={styles.metaDivider}>•</Text>
                          {/* <Text style={styles.transactionActivity}>{transaction.activity_title}</Text> */}
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.transactionRight}>

                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: transaction.payment_status === 'paid' ? '#10B98120' : '#F59E0B20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: transaction.payment_status === 'paid' ? '#10B981' : '#F59E0B' }
                      ]}>
                        {transaction.payment_status === 'paid' ? 'Payé' : 'En attente'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? Colors.primary : '#EF4444' }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.transactionFooter}>
                  <View style={styles.transactionDate}>
                    <Calendar size={12} color="#94A3B8" />
                    <Text style={styles.dateText}>
                      {new Date(transaction.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>

                  <View style={styles.transactionActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => openEditModal(transaction)}
                      disabled={isDeleting === transaction.id}
                    >
                      <Edit size={16} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDelete]}
                      onPress={() => handleDeleteTransaction(transaction.id)}
                      disabled={isDeleting === transaction.id}
                    >
                      {isDeleting === transaction.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Trash2 size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {getFilteredTransactions().length === 0 && (
              <View style={styles.emptyState}>
                <LinearGradient
                  colors={['#F0F9FF', '#FFF7ED']}
                  style={styles.emptyGradient}
                >
                  <View style={styles.emptyIconWrapper}>
                    <DollarSign size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Aucune transaction</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery || activeTab !== 'all'
                      ? 'Modifiez vos filtres de recherche'
                      : 'Ajoutez votre première transaction'
                    }
                  </Text>
                </LinearGradient>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        )}
        {/* Modal Add/Edit Transaction */}
        <Modal
          visible={showAddModal || showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            resetForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {showEditModal ? 'Modifier' : 'Nouvelle'} Transaction
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}>
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Type Selector - Design moderne */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeBtn, transactionType === 'income' && styles.typeBtnActive]}
                    onPress={() => {
                      setTransactionType('income');
                      // Filtrer les catégories et réinitialiser la sélection
                      const filteredCats = getFilteredCategories('income');
                      setCategories(filteredCats);
                      if (filteredCats.length > 0) {
                        setCategory(filteredCats[0].id);
                      } else {
                        setCategory('');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={transactionType === 'income'
                        ? [Colors.primary, Colors.primary]
                        : ['#F8FAFC', '#F8FAFC']
                      }
                      style={styles.typeBtnGradient}
                    >
                      <TrendingUp size={20} color={transactionType === 'income' ? '#FFFFFF' : Colors.primary} />
                      <Text style={[styles.typeBtnText, transactionType === 'income' && styles.typeBtnTextActive]}>
                        Revenu
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeBtn, transactionType === 'expense' && styles.typeBtnActive]}
                    onPress={() => {
                      setTransactionType('expense');
                      // Filtrer les catégories et réinitialiser la sélection
                      const filteredCats = getFilteredCategories('expense');
                      setCategories(filteredCats);
                      if (filteredCats.length > 0) {
                        setCategory(filteredCats[0].id);
                      } else {
                        setCategory('');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={transactionType === 'expense'
                        ? ['#EF4444', '#DC2626']
                        : ['#F8FAFC', '#F8FAFC']
                      }
                      style={styles.typeBtnGradient}
                    >
                      <TrendingDown size={20} color={transactionType === 'expense' ? '#FFFFFF' : '#EF4444'} />
                      <Text style={[styles.typeBtnText, transactionType === 'expense' && styles.typeBtnTextActive]}>
                        Dépense
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Montant <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <DollarSign size={20} color={Colors.primary} />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="0"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.inputSuffix}>F CFA</Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.modalInput, styles.textAreaInput]}
                    placeholder="Décrivez la transaction..."
                    value={description}
                    onChangeText={setDescription}
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* Nouveaux champs optionnels pour le compte de résultat */}
                <View style={styles.inputGroup}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setHasInvoice(!hasInvoice)}
                  >
                    <View style={[styles.checkbox, hasInvoice && styles.checkboxChecked]}>
                      {hasInvoice && <CheckCircle size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>Facture disponible</Text>
                  </TouchableOpacity>
                </View>

                {/* Afficher les champs facture uniquement si "Facture disponible" est coché */}
                {hasInvoice && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>N° Facture/Pièce <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Ex: MP250826.1319.D50745"
                        value={invoiceNumber}
                        onChangeText={setInvoiceNumber}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Fournisseur/Client <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="Ex: Woyofal, ORANGE, Cheikh Mbacké DIOP"
                        value={clientSupplier}
                        onChangeText={setClientSupplier}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </>
                )}

               
                {/* Category Selector - Design moderne avec grille */}
                <View style={styles.selectorSection}>
                  <Text style={styles.selectorLabel}>
                    Catégorie {transactionType === 'income' ? 'de revenu' : 'de dépense'}
                  </Text>
                  <View style={styles.categoryGrid}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategory(cat.id)}
                        style={[
                          styles.categoryChip,
                          category === cat.id && styles.categoryChipActive
                        ]}
                      >
                        <View style={[
                          styles.categoryChipIcon,
                          category === cat.id && styles.categoryChipIconActive
                        ]}>
                          {category === cat.id ? (
                            <CheckCircle size={18} color="#FFFFFF" />
                          ) : (
                            <View style={[styles.categoryDot, { backgroundColor: cat.color || Colors.primary }]} />
                          )}
                        </View>
                        <Text style={[
                          styles.categoryChipText,
                          category === cat.id && styles.categoryChipTextActive
                        ]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {categories.length === 0 && (
                    <View style={styles.emptyCategoryState}>
                      <Text style={styles.emptyCategoryText}>
                        Aucune catégorie disponible pour ce type
                      </Text>
                    </View>
                  )}
                </View>
                {/* Activity Selector - Design moderne */}
                <View style={styles.selectorSection}>
                  <Text style={styles.selectorLabel}>Activité</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
                    {activities.map((act) => (
                      <TouchableOpacity
                        key={act.id}
                        onPress={() => setSelectedActivityId(act.id)}
                        style={[
                          styles.activityChip,
                          selectedActivityId === act.id && styles.activityChipActive
                        ]}
                      >
                        <Text style={[
                          styles.activityChipText,
                          selectedActivityId === act.id && styles.activityChipTextActive
                        ]} numberOfLines={1}>
                          {act.title}
                        </Text>
                        {selectedActivityId === act.id && (
                          <CheckCircle size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtnWrapper}
                  onPress={showEditModal ? handleEditTransaction : handleSaveTransaction}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primary]}
                    style={styles.modalSaveBtn}
                  >
                    <Text style={styles.modalSaveText}>
                      {showEditModal ? 'Modifier' : 'Enregistrer'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  // Section IA Récurrente Améliorée
  aiRecurringSection: {
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  aiRecurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  aiRecurringIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  aiRecurringIcon: {
    fontSize: 28,
  },
  aiRecurringTextContainer: {
    flex: 1,
  },
  aiRecurringTitle: {
    fontSize: 19,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  aiRecurringSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    lineHeight: 18,
  },
  detectButtonWrapper: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detectButtonDisabled: {
    opacity: 0.7,
  },
  detectButtonIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detectButtonIcon: {
    fontSize: 24,
  },
  detectButtonTextContainer: {
    flex: 1,
  },
  detectButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  detectButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  detectButtonArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansList: {
    flex: 1,
  },
  plansListContent: {
    paddingBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  heroHeader: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  addButtonHero: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: 25,
    padding: 10,
    marginBottom: -20,

    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFF',
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  summaryIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },

  tapSection: {
    flexDirection: 'row',
    paddingHorizontal: 5,
    marginBottom: 10,
    gap: 2,
  },



  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  tabsContainer: {
    marginBottom: 10,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDesc: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  transactionCategory: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaDivider: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
  transactionActivity: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  transactionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnDelete: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  aiButtonWrapper: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  aiButtonDisabled: {
    opacity: 0.7,
  },
  aiButtonIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 16,
  },
  aiButtonIcon: {
    fontSize: 24,
  },
  aiButtonTextContainer: {
    flex: 1,
  },
  aiButtonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  aiButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  aiButtonArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButtonWrapper: {
    width: '100%',
  },
  emptyButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },

 
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 4,
    borderRadius: 16,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  typeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBtnGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
  typeBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  inputSuffix: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: '#E2E8F0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  selectorSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  // Catégories en grille moderne
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 10,
    minWidth: '47%',
    maxWidth: '47%',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryChipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    lineHeight: 18,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  emptyCategoryState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyCategoryText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Activités en scroll horizontal moderne
  activityScroll: {
    marginHorizontal: -4,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  activityChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activityChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    maxWidth: 150,
  },
  activityChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  modalSaveBtnWrapper: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSaveBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

// Ajoutez ces types si nécessaire
type StatItem = {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
};