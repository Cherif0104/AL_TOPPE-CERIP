// components/incomeStatement/IncomeStatementCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';
import { IncomeStatementResult } from '@/types/incomeStatement';
import { incomeStatementService } from '@/services/incomeStatement';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';

interface Props {
  entrepreneurId?: string;
}

export default function IncomeStatementCard({ entrepreneurId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IncomeStatementResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Dates par défaut (30 derniers jours)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount).replace('XOF', 'FCFA');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const id = entrepreneurId || await getEntrepreneurId();
      if (!id) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Entrepreneur non trouvé',
        });
        return;
      }

      // Vérifier que la date de début est avant la date de fin
      if (startDate > endDate) {
        Toast.show({
          type: 'error',
          text1: 'Erreur de dates',
          text2: 'La date de début doit être antérieure à la date de fin',
        });
        return;
      }

      const startStr = formatDateForAPI(startDate);
      const endStr = formatDateForAPI(endDate);

      const result = await incomeStatementService.generateIncomeStatement(id, startStr, endStr);
      setData(result);
      setExpanded(true);
      
      Toast.show({
        type: 'success',
        text1: 'Compte de résultat généré',
        text2: `Période: ${result.period.start_date} au ${result.period.end_date}`,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de générer le compte de résultat',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileText size={24} color={Colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Compte de Résultat</Text>
              <Text style={styles.subtitle}>Générer votre compte de résultat professionnel</Text>
            </View>
          </View>
        </View>

        {/* Sélecteurs de dates */}
        <View style={styles.dateSelectorContainer}>
          <View style={styles.dateSelectorRow}>
            <Text style={styles.dateLabel}>Date de début</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateSelectorRow}>
            <Text style={styles.dateLabel}>Date de fin</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Calendar size={18} color={Colors.primary} />
              <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <FileText size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Générer le Compte de Résultat</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
            maximumDate={endDate}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
            minimumDate={startDate}
            maximumDate={new Date()}
          />
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Génération du compte de résultat...</Text>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <FileText size={24} color={Colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Compte de Résultat</Text>
            <Text style={styles.subtitle}>
              {data.period.start_date} au {data.period.end_date}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={24} color={Colors.gray600} />
        ) : (
          <ChevronDown size={24} color={Colors.gray600} />
        )}
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Totaux */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Revenus</Text>
              <Text style={[styles.totalAmount, styles.incomeAmount]}>
                {formatCurrency(data.totals.total_income)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Dépenses</Text>
              <Text style={[styles.totalAmount, styles.expenseAmount]}>
                {formatCurrency(data.totals.total_expense)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.netRow]}>
              <Text style={styles.netLabel}>Résultat Net</Text>
              <Text style={[
                styles.totalAmount,
                data.totals.net_result >= 0 ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {formatCurrency(data.totals.net_result)}
              </Text>
            </View>
            <View style={styles.marginRow}>
              <Text style={styles.marginLabel}>Marge bénéficiaire</Text>
              <Text style={styles.marginValue}>
                {data.totals.profit_margin.toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Revenus */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Revenus</Text>
            {data.income.categories.map((cat, index) => {
              const maxIncome = Math.max(...data.income.categories.map(c => c.amount), 1);
              const percentage = (cat.amount / maxIncome) * 100;
              const colors = ['#8B5CF6', '#06B6D4', Colors.primary, '#F59E0B', Colors.secondary];
              const color = colors[index % colors.length];
              
              return (
                <View key={index} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                    <View style={[styles.categoryDot, { backgroundColor: color }]} />
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </View>
                  <View style={styles.categoryValue}>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: color
                          }
                        ]}
                      />
                    </View>
                  </View>
              </View>
              );
            })}
          </View>

          {/* Dépenses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💸 Dépenses</Text>
            {data.expenses.categories.map((cat, index) => {
              const maxExpense = Math.max(...data.expenses.categories.map(c => c.amount), 1);
              const percentage = (cat.amount / maxExpense) * 100;
              const expenseColors = ['#EF4444', '#F97316', '#3B82F6', '#10B981', '#8B5CF6'];
              const color = expenseColors[index % expenseColors.length];
              
              return (
              <View key={index} style={styles.categoryContainer}>
                  <View style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                      <View style={[styles.categoryDot, { backgroundColor: color }]} />
                    <Text style={styles.categoryName}>{cat.name}</Text>
                  </View>
                    <View style={styles.categoryValue}>
                  <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor: color
                            }
                          ]}
                        />
                      </View>
                    </View>
                </View>
                {cat.subcategories && cat.subcategories.length > 0 && (
                  <View style={styles.subcategoriesContainer}>
                    {cat.subcategories.map((sub, subIndex) => (
                      <View key={subIndex} style={styles.subcategoryRow}>
                        <Text style={styles.subcategoryName}>• {sub.name}</Text>
                        <Text style={styles.subcategoryAmount}>{formatCurrency(sub.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              );
            })}
          </View>

          {/* Sélecteurs de dates pour régénérer */}
          <View style={styles.dateSelectorContainer}>
            <View style={styles.dateSelectorRow}>
              <Text style={styles.dateLabel}>Date de début</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Calendar size={18} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateSelectorRow}>
              <Text style={styles.dateLabel}>Date de fin</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Calendar size={18} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton régénérer */}
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={generateReport}
          >
            <FileText size={18} color={Colors.primary} />
            <Text style={styles.regenerateButtonText}>Régénérer</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
          maximumDate={endDate}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray600,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.gray600,
    fontSize: 14,
  },
  content: {
    maxHeight: 600,
  },
  totalsSection: {
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  netRow: {
    borderTopWidth: 2,
    borderTopColor: Colors.gray200,
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  netLabel: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  incomeAmount: {
    color: Colors.primary,
  },
  expenseAmount: {
    color: Colors.error,
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  marginLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  marginValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
    flexShrink: 1,
  },
  categoryPercentage: {
    fontSize: 13,
    color: Colors.gray600,
    fontWeight: '500',
  },
  categoryValue: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  categoryAmount: {
    fontSize: 12,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  subcategoriesContainer: {
    marginLeft: 16,
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: Colors.gray200,
  },
  subcategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  subcategoryName: {
    fontSize: 14,
    color: Colors.gray700,
    flex: 1,
  },
  subcategoryAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray700,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  regenerateButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  dateSelectorContainer: {
    marginBottom: 16,
    gap: 12,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: Colors.gray700,
    fontWeight: '500',
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  dateButtonText: {
    fontSize: 14,
    color: Colors.gray900,
    fontWeight: '500',
  },
});

