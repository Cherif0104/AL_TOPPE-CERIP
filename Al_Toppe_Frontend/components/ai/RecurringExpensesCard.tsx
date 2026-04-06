// components/ai/RecurringExpensesCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Calendar, DollarSign, Bell, TrendingUp, Volume2, VolumeX } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import Colors from '@/constants/colors';
import { RecurringExpensesResult } from '@/types/ai';

interface Props {
  result: RecurringExpensesResult | null;
  loading: boolean;
}

export default function RecurringExpensesCard({ result, loading }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'wo'>('fr');

  // Debug: Log result data
  React.useEffect(() => {
    if (result) {
      console.log('📊 RecurringExpensesCard - Result data:', {
        success: result.success,
        has_expenses: !!result.recurring_expenses,
        expenses_count: result.recurring_expenses?.length || 0,
        total_monthly: result.total_monthly_estimate,
        expenses_keys: result.recurring_expenses ? result.recurring_expenses.map(e => e.category) : [],
      });
    }
  }, [result]);

  const speakText = async (text: string, lang: 'fr' | 'wo' = language) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    
    const voiceLang = lang === 'wo' ? 'fr-FR' : 'fr-FR';
    
    try {
      await Speech.speak(text, {
        language: voiceLang,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Erreur lecture vocale:', error);
      setIsSpeaking(false);
    }
  };

  const generateSummaryText = () => {
    const hasExpenses = result?.recurring_expenses && Array.isArray(result.recurring_expenses) && result.recurring_expenses.length > 0;
    if (!result || !hasExpenses || !result.recurring_expenses) return '';
    
    const expenses = result.recurring_expenses;
    const count = expenses.length;
    const total = result.total_monthly_estimate || 0;
    
    if (language === 'wo') {
      // Texte en Wolof
      let text = `Al Toope détecte na ${count} dépense récurrente${count > 1 ? ' yi' : ''}. `;
      
      if (total > 0) {
        text += `Total mensuel bi estimé moom na ${total} francs CFA. `;
      }
      
      expenses.slice(0, 3).forEach((expense, i) => {
        text += `Dépense numero ${i + 1}: ${expense.category}, `;
        text += `montant moyen ${expense.average_amount} francs CFA, `;
        text += `fréquence ${expense.frequency}. `;
      });
      
      return text;
    } else {
      // Texte en Français
      let text = `Al Toope a détecté ${count} dépense${count > 1 ? 's' : ''} récurrente${count > 1 ? 's' : ''}. `;
      
      if (total > 0) {
        text += `Le total mensuel estimé est de ${total} francs CFA. `;
      }
      
      expenses.slice(0, 3).forEach((expense, i) => {
        text += `Dépense numéro ${i + 1}: ${expense.category}, `;
        text += `montant moyen ${expense.average_amount} francs CFA, `;
        text += `fréquence ${expense.frequency}. `;
      });
      
      return text;
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Détection des patterns...</Text>
      </View>
    );
  }

  // Vérifier si on a des données à afficher, même si success est false
  const hasExpenses = result?.recurring_expenses && Array.isArray(result.recurring_expenses) && result.recurring_expenses.length > 0;
  
  // Afficher un message d'erreur informatif si success est false
  if (!result || (!result.success && !hasExpenses)) {
    const errorMessage = result?.error || '';
    const messageText = result?.message || '';
    const isInsufficientData = errorMessage.toLowerCase().includes('pas assez de données') || 
                                errorMessage.toLowerCase().includes('au moins 3 dépenses');
    const isNoPattern = errorMessage.toLowerCase().includes('aucun pattern') || 
                        errorMessage.toLowerCase().includes('pas de dépenses récurrentes');
    
    return (
      <View style={styles.emptyCard}>
        {isInsufficientData ? (
          <>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Données insuffisantes</Text>
            <Text style={styles.emptySubtext}>{result?.error || 'Une erreur est survenue lors de la détection.'}</Text>
          </>
        ) : isNoPattern ? (
          <>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>Aucun pattern détecté</Text>
            
          </>
        ) : (
          <>
            <Text style={styles.emptyIcon}>🔍</Text>
           
          </>
        )}
      </View>
    );
  }
  
  // Si success est false mais qu'on a des données, on les affiche quand même
  if (!result.success && hasExpenses) {
    // On continue pour afficher les données disponibles
  }

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'biweekly': return '🗓️';
      case 'monthly': return '🗓️';
      case 'quarterly': return '📊';
      case 'yearly': return '📅';
      default: return '🔔';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Quotidien';
      case 'weekly': return 'Hebdomadaire';
      case 'biweekly': return 'Bi-hebdomadaire';
      case 'monthly': return 'Mensuel';
      case 'quarterly': return 'Trimestriel';
      case 'yearly': return 'Annuel';
      default: return 'Irrégulier';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return Colors.success;
    if (confidence >= 70) return Colors.warning;
    return Colors.error;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header avec contrôles vocaux */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🔔 Dépenses Récurrentes Détectées</Text>
          <Text style={styles.headerSubtitle}>
            {result.recurring_expenses?.length || 0} pattern{(result.recurring_expenses?.length || 0) > 1 ? 's' : ''} identifié{(result.recurring_expenses?.length || 0) > 1 ? 's' : ''}
          </Text>
        </View>
        
        <View style={styles.voiceControls}>
          {/* Sélecteur de langue */}
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={[styles.langButton, language === 'fr' && styles.langButtonActive]}
              onPress={() => setLanguage('fr')}
            >
              <Text style={[styles.langButtonText, language === 'fr' && styles.langButtonTextActive]}>
                FR
              </Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={[styles.langButton, language === 'wo' && styles.langButtonActive]}
              onPress={() => setLanguage('wo')}
            >
              <Text style={[styles.langButtonText, language === 'wo' && styles.langButtonTextActive]}>
                WO
              </Text>
            </TouchableOpacity> */}
          </View>
          
          {/* Bouton lecture vocale */}
          <TouchableOpacity
            style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
            onPress={() => speakText(generateSummaryText())}
          >
            {isSpeaking ? (
              <VolumeX size={20} color="#FFFFFF" />
            ) : (
              <Volume2 size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Total mensuel estimé */}
      {result.total_monthly_estimate && result.total_monthly_estimate > 0 && (
        <View style={styles.totalCard}>
          <View style={styles.totalIconContainer}>
            <DollarSign size={24} color={Colors.primary} />
          </View>
          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>Total Mensuel Estimé</Text>
            <Text style={styles.totalValue}>
              {result.total_monthly_estimate.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>
      )}

      {/* Alertes créées */}
      {result.alerts_created && result.alerts_created > 0 && (
        <View style={styles.alertsBanner}>
          <Bell size={16} color={Colors.primary} />
          <Text style={styles.alertsText}>
            {result.alerts_created} rappel{result.alerts_created > 1 ? 's' : ''} créé{result.alerts_created > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Liste des dépenses récurrentes */}
      <View style={styles.expensesContainer}>
        {(result.recurring_expenses || []).map((expense, index) => (
          <View key={index} style={styles.expenseCard}>
            {/* En-tête de la carte */}
            <View style={styles.expenseHeader}>
              <View style={styles.expenseHeaderLeft}>
                <Text style={styles.expenseIcon}>
                  {getFrequencyIcon(expense.frequency)}
                </Text>
                <View>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                  <Text style={styles.expenseFrequency}>
                    {getFrequencyLabel(expense.frequency)}
                  </Text>
                </View>
              </View>
              <View style={[styles.confidenceBadge, { 
                backgroundColor: getConfidenceColor(expense.confidence) + '20' 
              }]}>
                <Text style={[styles.confidenceText, { 
                  color: getConfidenceColor(expense.confidence) 
                }]}>
                  {expense.confidence}%
                </Text>
              </View>
            </View>

            {/* Montant */}
            <View style={styles.expenseAmount}>
              <Text style={styles.amountLabel}>Montant moyen</Text>
              <Text style={styles.amountValue}>
                {expense.average_amount.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>

            {/* Pattern description */}
            <View style={styles.patternContainer}>
              <Text style={styles.patternTitle}>Pattern détecté:</Text>
              <Text style={styles.patternDescription}>
                {expense.pattern_description}
              </Text>
            </View>

            {/* Prochain paiement */}
            <View style={styles.nextPaymentContainer}>
              <Calendar size={16} color={Colors.primary} />
              <View style={styles.nextPaymentText}>
                <Text style={styles.nextPaymentLabel}>Prochain paiement prévu:</Text>
                <Text style={styles.nextPaymentDate}>
                  {formatDate(expense.next_expected_date)}
                </Text>
              </View>
            </View>

            {/* Message de rappel */}
            {expense.reminder_message && (
              <View style={styles.reminderContainer}>
                <Bell size={14} color={Colors.gray600} />
                <Text style={styles.reminderText}>{expense.reminder_message}</Text>
              </View>
            )}

            {/* Recommandations */}
            {expense.recommendations && expense.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>💡 Recommandations:</Text>
                {expense.recommendations.map((rec, idx) => (
                  <Text key={idx} style={styles.recommendationItem}>
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TrendingUp size={16} color={Colors.gray500} />
        <Text style={styles.footerText}>
          Basé sur {(result.recurring_expenses || []).reduce((acc, e) => acc + (e.confidence / 100), 0).toFixed(0)} jours d'historique
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 40,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.gray600,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerLeft: {
    flex: 1,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: 8,
    padding: 2,
  },
  langButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langButtonActive: {
    backgroundColor: Colors.primary,
  },
  langButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray600,
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
  speakButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  speakButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.gray900,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.gray500,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  totalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  totalTextContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.gray600,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  alertsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertsText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  expensesContainer: {
    marginBottom: 16,
  },
  expenseCard: {
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expenseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gray900,
    textTransform: 'capitalize',
  },
  expenseFrequency: {
    fontSize: 12,
    color: Colors.gray600,
    marginTop: 2,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  expenseAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.gray600,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gray900,
  },
  patternContainer: {
    marginBottom: 12,
  },
  patternTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray700,
    marginBottom: 4,
  },
  patternDescription: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
  },
  nextPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  nextPaymentText: {
    marginLeft: 8,
    flex: 1,
  },
  nextPaymentLabel: {
    fontSize: 11,
    color: Colors.gray600,
  },
  nextPaymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warning + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  reminderText: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.gray700,
    flex: 1,
    lineHeight: 16,
  },
  recommendationsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.gray700,
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 12,
    color: Colors.gray600,
    lineHeight: 18,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.gray500,
  },
});

