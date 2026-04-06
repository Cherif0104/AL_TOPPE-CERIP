import React, { useState , useEffect} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Plus, TrendingUp, TrendingDown, Filter, Search, Calendar } from 'lucide-react-native';
import ApiService from '@/services/api';
import { FinanceService, TransactionPayload, TransactionType as TxType } from '@/services/finance';
import { ActivityService } from '@/services/activity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { CategoryService, CategoryItem } from '@/services/category';
import { AppEvents } from '@/services/storage';


// Types
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
}

interface ActivityItem {
  id: string;
  title: string;
} 

export default function FinancesComponent() {
  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false); // ✅ Déclare l'état
  const [transactions, setTransactions] = useState<TransactionItemData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

const [transactionType, setTransactionType] = useState<TransactionType>('income');
const [amount, setAmount] = useState('');
const [description, setDescription] = useState('');
const [category, setCategory] = useState('');
// const transactionss = [
//     { id: 1, type: 'income', amount: 45000, description: 'Vente tissus', category: 'Ventes', date: '2025-01-08', status: 'completed' },
//     { id: 2, type: 'expense', amount: 25000, description: 'Transport marchandises', category: 'Transport', date: '2025-01-08', status: 'completed' },
//     { id: 3, type: 'income', amount: 30000, description: 'Service couture', category: 'Services', date: '2025-01-07', status: 'completed' },
//     { id: 4, type: 'expense', amount: 15000, description: 'Fils et boutons', category: 'Matières premières', date: '2025-01-07', status: 'completed' },
//     { id: 5, type: 'income', amount: 55000, description: 'Commande mariage', category: 'Ventes', date: '2025-01-06', status: 'pending' },
//   ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };
  // const userInfoString = await AsyncStorage.getItem('userInfo');
  
  // if (userInfoString) {
  //   const userInfo = JSON.parse(userInfoString);
  //   console.log("email", userInfo.email);
  //   console.log("entrepreneur_id", userInfo.entrepreneur?.id);

  //   // Move the assignment to the outer scope
  //   entrepreneur_id = userInfo.entrepreneur?.id;
  // }

  // // Only proceed if we have an entrepreneur_id
  // if (!entrepreneur_id) {
  //   console.warn("No entrepreneur_id found; skipping fetchTransactions.");
  //   return;
  // }

  const fetcheTrans = async () => {
    const entrepreneur_id = await getEntrepreneurId();

    if (!entrepreneur_id) {
      console.warn('Aucun entrepreneur_id, annulation du chargement des transactions.');
      setTransactions([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await FinanceService.list(entrepreneur_id);
      const results: TransactionItemData[] = (response?.results ?? []) as TransactionItemData[];
      setTransactions(results);
      // Charger les activités en même temps si pas encore faites
      if (!activities.length) {
        const acts = await ActivityService.listByEntrepreneur(entrepreneur_id);
        const actResults: ActivityItem[] = (acts?.results ?? []).map((a: any) => ({ id: a.id, title: a.title }));
        setActivities(actResults);
        if (!selectedActivityId && actResults.length > 0) setSelectedActivityId(actResults[0].id);
      }

      // categories
      const categorys = await CategoryService.list();
      setCategories(Array.isArray(categorys) ? categorys : []);
      if (!category && categorys.length > 0) setCategory(categorys[0].id);

    } catch (error) {
      console.error("Erreur fetch transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetcheTrans();
    
    AppEvents.on('finances:changed', () => {
      fetcheTrans();
    });

  }, []);
  
  const getFilteredTransactions = (): TransactionItemData[] => {
    let filtered: TransactionItemData[] = transactions;
  
    if (!Array.isArray(filtered)) return []; // sécurité
  
    if (activeTab !== 'all') {
      filtered = filtered.filter((t: TransactionItemData) => 
        (activeTab === 'income' ? 'income' : activeTab) === t.type
      );
    }
  
    if (searchQuery) {
      filtered = filtered.filter((t: TransactionItemData) =>
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category || t.category_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  
    return filtered;
  };
  
  const safeNumber = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };
  
  const getTotalAmount = (type: 'all' | TransactionType) => {
    return transactions
      .filter((t: TransactionItemData) => type === 'all' || t.type === type)
      .reduce((sum: number, t: TransactionItemData) => sum + safeNumber(t.amount), 0);
  };
  
  const handleSaveTransaction = async () => {
    // Nettoyer et sécuriser le montant
    const parsedAmount = Math.abs(Number(amount));
    const entrepreneur_id = await getEntrepreneurId();

    if (!parsedAmount || isNaN(parsedAmount)) {
      alert("Veuillez entrer un montant valide.");
      return;
    }

    if (!entrepreneur_id) {
      alert("Impossible d'identifier l'entrepreneur.");
      return;
    }

    if (!selectedActivityId) {
      alert("Veuillez sélectionner une activité.");
      return;
    }
  
    // Construire le payload pour ton API
    const newTransaction: TransactionPayload = {
      entrepreneur: entrepreneur_id,
      activity: selectedActivityId,
      title: description || "Transaction",
      description,
      type: transactionType,
      amount: parsedAmount, // toujours positif
      category,
      date: new Date().toISOString().split("T")[0], // ex: "2025-08-24"
      frequency: "one_time",
      payment_status: "pending",
      payment_method: "cash",
      reference: `txn_${Date.now()}`,
    };
  
    try {
      await FinanceService.create(entrepreneur_id, newTransaction);
  
      alert("Transaction enregistrée ✅");
      setShowAddModal(false);
  
      // reset du form
      setAmount("");
      setDescription("");
      setCategory("");
      // garder l'activité sélectionnée

      // Rafraîchir la liste
      fetcheTrans();
  
    } catch (error) {
      console.error(error);
      alert("Impossible d'enregistrer la transaction ❌");
    }
  };
  const TabButton = ({ id, title, count }: any) => (
    <TouchableOpacity 
      style={[styles.tabButton, activeTab === id && styles.activeTabButton]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[styles.tabText, activeTab === id && styles.activeTabText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  const TransactionItem = ({ transaction }: { transaction: TransactionItemData }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={[
          styles.typeIndicator,
          { backgroundColor: transaction.type === 'income' ? '#22C55E15' : '#EF444415' }
        ]}>
          {transaction.type === 'income' ? 
            <TrendingUp size={18} color="#22C55E" /> : 
            <TrendingDown size={18} color="#EF4444" />
          }
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <Text style={styles.transactionCategory}>{transaction.category}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[
            styles.transactionAmount,
            { color: transaction.type === 'income' ? '#22C55E' : '#EF4444' }
          ]}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: transaction.payment_status === 'paid' ? '#22C55E15' : '#EAB30815' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: transaction.status === 'completed' ? '#22C55E' : '#EAB308' }
            ]}>
              {transaction.payment_status === 'paid' ? 'Complété' : 'En attente'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.transactionFooter}>
        <Text style={styles.transactionDate}>
          {new Date(transaction.date).toLocaleDateString('fr-FR', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Finances</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { borderLeftColor: '#22C55E' }]}>
          <Text style={styles.summaryLabel}>Total Revenus</Text>
          <Text style={[styles.summaryAmount, { color: '#22C55E' }]}>
            {formatCurrency(getTotalAmount('income'))}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
          <Text style={styles.summaryLabel}>Total Dépenses</Text>
          <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
            {formatCurrency(getTotalAmount('expense'))}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une transaction..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TabButton 
          id="all" 
          title="Toutes" 
          count={transactions.length} 
        />
        <TabButton 
          id="income" 
          title="Revenus" 
          count={transactions.filter(t => t.type === 'income').length} 
        />
        <TabButton 
          id="expense" 
          title="Dépenses" 
          count={transactions.filter(t => t.type === 'expense').length} 
        />
      </View>

      <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
        {getFilteredTransactions().map((transaction) => (
          <TransactionItem key={transaction.id} transaction={transaction} />
        ))}
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouvelle Transaction</Text>
            
            <View style={styles.typeSelector}>
              <TouchableOpacity 
                style={[styles.typeButton, transactionType === 'income' && styles.activeTypeButton]}
                onPress={() => setTransactionType('income')}
              >
                <TrendingUp size={16} color={transactionType === 'income' ? '#FFFFFF' : '#22C55E'} />
                <Text style={[styles.typeButtonText, transactionType === 'income' && styles.activeTypeButtonText]}>
                  Revenus
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.typeButton, transactionType === 'expense' && styles.activeTypeButton]}
                onPress={() => setTransactionType('expense')}
              >
                <TrendingDown size={16} color={transactionType === 'expense' ? '#FFFFFF' : '#EF4444'} />
                <Text style={[styles.typeButtonText, transactionType === 'expense' && styles.activeTypeButtonText]}>
                  Dépenses
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
  style={styles.modalInput}
  placeholder="Montant (F CFA)"
  keyboardType="numeric"
  value={amount}
  onChangeText={setAmount}
  placeholderTextColor="#94A3B8"
/>

<TextInput
  style={styles.modalInput}
  placeholder="Description"
  value={description}
  onChangeText={setDescription}
  placeholderTextColor="#94A3B8"
/>

{/* Sélecteur simple d'activité */}
<View style={{ marginBottom: 16 }}>
  <Text style={{ marginBottom: 8, color: '#64748B', fontFamily: 'Inter-Medium' }}>Activité</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {activities.map((act) => (
      <TouchableOpacity
        key={act.id}
        onPress={() => setSelectedActivityId(act.id)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: selectedActivityId === act.id ? '#22C55E' : '#E2E8F0',
          backgroundColor: selectedActivityId === act.id ? '#22C55E' : '#FFFFFF',
          marginRight: 8,
        }}
      >
        <Text style={{ color: selectedActivityId === act.id ? '#FFFFFF' : '#1E293B', fontFamily: 'Inter-Medium' }}>{act.title}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

<View style={{ marginBottom: 16 }}>
  <Text style={{ marginBottom: 8, color: '#64748B', fontFamily: 'Inter-Medium' }}>Catégorie</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    {categories.map((cat) => (
      <TouchableOpacity
        key={cat.id}
        onPress={() => setCategory(cat.id)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: category === cat.id ? '#22C55E' : '#E2E8F0',
          backgroundColor: category === cat.id ? '#22C55E' : '#FFFFFF',
          marginRight: 8,
        }}
      >
        <Text style={{ color: category === cat.id ? '#FFFFFF' : '#1E293B', fontFamily: 'Inter-Medium' }}>{cat.name}</Text>        
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>
{/* 
<TextInput
  style={styles.modalInput}
  placeholder="Catégorie"
  value={category}
  onChangeText={setCategory}
  placeholderTextColor="#94A3B8"
/> */}


            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTransaction}>
  <Text style={styles.saveButtonText}>Enregistrer</Text>
</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  addButton: {
    backgroundColor: '#22C55E',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTabButton: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  transactionFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  transactionDate: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTypeButton: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});