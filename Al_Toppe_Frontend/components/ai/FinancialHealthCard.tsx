// components/ai/FinancialHealthCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, AlertTriangle, Volume2, VolumeX } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import Colors from '@/constants/colors';
import { FinancialAnalysisResult } from '@/types/ai';

interface Props {
  analysis: FinancialAnalysisResult | null;
  loading: boolean;
}

export default function FinancialHealthCard({ analysis, loading }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'wo'>('fr');

  // Debug: Log analysis data
  React.useEffect(() => {
    if (analysis) {
      console.log('📊 FinancialHealthCard - Analysis data:', {
        success: analysis.success,
        has_indicators: !!analysis.financial_indicators,
        indicators_keys: analysis.financial_indicators ? Object.keys(analysis.financial_indicators) : [],
        has_insights: !!analysis.insights,
        insights_count: analysis.insights?.length || 0,
        has_recommendations: !!analysis.recommendations,
        recommendations_count: analysis.recommendations?.length || 0,
      });
    }
  }, [analysis]);

  const speakText = async (text: string, lang: 'fr' | 'wo' = language) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    
    // Pour le wolof, on utilise le français comme fallback car expo-speech ne supporte pas directement le wolof
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
    if (!analysis || !analysis.success) return '';
    
    const score = analysis.health_score || 0;
    const risk = analysis.risk_level || 'medium';
    
    if (language === 'wo') {
      // Texte en Wolof
      let text = `Sa santé financière score bi moom na ${score} sur 100. `;
      
      if (risk === 'low') text += 'Risque bi doy faible, yaw motax na lool. ';
      else if (risk === 'medium') text += 'Risque bi doy moyen, amul problème bu mag. ';
      else text += 'Risque bi doy élevé, war nga fay attention. ';
      
      if (analysis.metrics) {
        text += `Sa revenus yi moom na ${analysis.metrics.total_income} francs CFA. `;
        text += `Sa dépenses yi moom na ${analysis.metrics.total_expense} francs CFA. `;
        text += `Sa solde bi moom na ${analysis.metrics.balance} francs CFA. `;
      }
      
      if (analysis.insights && analysis.insights.length > 0) {
        text += `Al Toppe détecte na ${analysis.insights.length} insights. `;
        analysis.insights.slice(0, 3).forEach((insight, i) => {
          text += `${insight.title}. ${insight.description}. `;
        });
      }
      
      return text;
    } else {
      // Texte en Français
      let text = `Votre score de santé financière est de ${score} sur 100. `;
      
      if (risk === 'low') text += 'Le niveau de risque est faible, vous êtes sur la bonne voie. ';
      else if (risk === 'medium') text += 'Le niveau de risque est moyen, restez vigilant. ';
      else text += 'Le niveau de risque est élevé, une attention particulière est nécessaire. ';
      
      if (analysis.metrics) {
        text += `Vos revenus totaux sont de ${analysis.metrics.total_income} francs CFA. `;
        text += `Vos dépenses totales sont de ${analysis.metrics.total_expense} francs CFA. `;
        text += `Votre solde est de ${analysis.metrics.balance} francs CFA. `;
      }
      
      if (analysis.insights && analysis.insights.length > 0) {
        text += `Al Toppe a détecté ${analysis.insights.length} insights importants. `;
        analysis.insights.slice(0, 3).forEach((insight, i) => {
          text += `${insight.title}. ${insight.description}. `;
        });
      }
      
      return text;
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyse en cours avec IA Al Toppe...</Text>
        <Text style={styles.loadingSubtext}>Cela peut prendre 10-15 secondes</Text>
      </View>
    );
  }

  if (!analysis || !analysis.success) {
    if (analysis?.error) {
      return (
        <View style={[styles.card, styles.errorCard]}>
          <AlertTriangle size={32} color={Colors.error} />
          <Text style={styles.errorText}>{analysis.error}</Text>
        </View>
      );
    }
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle size={24} color={Colors.success} />;
      case 'medium':
        return <AlertCircle size={24} color={Colors.warning} />;
      case 'high':
      case 'critical':
        return <AlertCircle size={24} color={Colors.error} />;
      default:
        return null;
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyen';
      case 'high': return 'Élevé';
      case 'critical': return 'Critique';
      default: return 'Inconnu';
    }
  };

  // Vérifier si on a au moins des métriques à afficher
  const hasData = analysis.metrics || analysis.financial_indicators || 
                  (analysis.insights && analysis.insights.length > 0) || 
                  (analysis.recommendations && analysis.recommendations.length > 0);

  if (!hasData) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Header avec icône et contrôles vocaux */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🤖 Analyse IA</Text>
          <Text style={styles.headerSubtitle}>
            Analyse terminée en {((analysis.processing_time_ms || 0) / 1000).toFixed(1)}s
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

      {/* Score de santé */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Score de Santé</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(analysis.health_score || 0) }]}>
          {analysis.health_score}/100
        </Text>
        <View style={[styles.scoreBar, { width: '100%', backgroundColor: Colors.gray200, height: 8, borderRadius: 4, marginTop: 12 }]}>
          <View style={[styles.scoreBarFill, { 
            width: `${analysis.health_score || 0}%`, 
            backgroundColor: getScoreColor(analysis.health_score || 0),
            height: '100%',
            borderRadius: 4 
          }]} />
        </View>
      </View>

      {/* Niveau de risque */}
      <View style={styles.riskContainer}>
        {getRiskIcon(analysis.risk_level || 'medium')}
        <Text style={styles.riskText}>
          Risque: {getRiskLabel(analysis.risk_level || 'medium')}
        </Text>
      </View>

      {/* Métriques */}
      {analysis.metrics && (
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>📊 Résumé Financier</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Revenus</Text>
            <Text style={[styles.metricValue, { color: Colors.success }]}>
              {analysis.metrics.total_income.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Dépenses</Text>
            <Text style={[styles.metricValue, { color: Colors.error }]}>
              {analysis.metrics.total_expense.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={[styles.metricRow, styles.metricRowHighlight]}>
            <Text style={[styles.metricLabel, { fontWeight: 'bold' }]}>Solde</Text>
            <Text style={[styles.metricValue, { 
              fontWeight: 'bold',
              color: analysis.metrics.balance >= 0 ? Colors.success : Colors.error 
            }]}>
              {analysis.metrics.balance.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Marge de profit</Text>
            <Text style={[styles.metricValue, { 
              color: analysis.metrics.profit_margin >= 20 ? Colors.success : 
                     analysis.metrics.profit_margin >= 10 ? Colors.warning : Colors.error
            }]}>
              {analysis.metrics.profit_margin.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Indicateurs financiers */}
      {analysis.financial_indicators && 
       (analysis.financial_indicators.revenue_trend || analysis.financial_indicators.expense_control) && (
        <View style={styles.indicatorsContainer}>
          <Text style={styles.sectionTitle}>📈 Indicateurs Clés</Text>
          {analysis.financial_indicators.revenue_trend && (
            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Tendance revenus</Text>
              <View style={[styles.indicatorBadge, { 
                backgroundColor: analysis.financial_indicators.revenue_trend === 'growing' ? Colors.success + '20' :
                               analysis.financial_indicators.revenue_trend === 'stable' ? Colors.warning + '20' : Colors.error + '20'
              }]}>
                <Text style={[styles.indicatorValue, {
                  color: analysis.financial_indicators.revenue_trend === 'growing' ? Colors.success :
                         analysis.financial_indicators.revenue_trend === 'stable' ? Colors.warning : Colors.error
                }]}>
                  {analysis.financial_indicators.revenue_trend === 'growing' ? '📈 Croissance' :
                   analysis.financial_indicators.revenue_trend === 'stable' ? '➡️ Stable' : '📉 Déclin'}
                </Text>
              </View>
            </View>
          )}
          {analysis.financial_indicators.expense_control && (
            <View style={styles.indicatorRow}>
              <Text style={styles.indicatorLabel}>Contrôle dépenses</Text>
              <View style={[styles.indicatorBadge, {
                backgroundColor: analysis.financial_indicators.expense_control === 'good' ? Colors.success + '20' :
                               analysis.financial_indicators.expense_control === 'moderate' ? Colors.warning + '20' : Colors.error + '20'
              }]}>
                <Text style={[styles.indicatorValue, {
                  color: analysis.financial_indicators.expense_control === 'good' ? Colors.success :
                         analysis.financial_indicators.expense_control === 'moderate' ? Colors.warning : Colors.error
                }]}>
                  {analysis.financial_indicators.expense_control === 'good' ? '✅ Bon' :
                   analysis.financial_indicators.expense_control === 'moderate' ? '⚠️ Modéré' : '❌ Faible'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Insights */}
      {analysis.insights && analysis.insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>💡 Insights Détectés</Text>
          {analysis.insights.map((insight, index) => (
            <View key={index} style={styles.insightRow}>
              <View style={[styles.insightDot, { 
                backgroundColor: insight.type === 'positive' ? Colors.success : 
                                insight.type === 'warning' ? Colors.warning : Colors.error 
              }]} />
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>
                  {insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : '🚨'} {insight.title}
                </Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
                {insight.impact && (
                  <Text style={styles.insightImpact}>Impact: {insight.impact}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recommandations (si présentes dans l'analyse) */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.sectionTitle}>🎯 Recommandations</Text>
          {analysis.recommendations.slice(0, 3).map((rec, index) => (
            <View key={index} style={styles.recommendationRow}>
              <View style={[styles.priorityBadge, {
                backgroundColor: rec.priority === 'urgent' ? Colors.error + '20' :
                               rec.priority === 'high' ? Colors.warning + '20' : Colors.primary + '20'
              }]}>
                <Text style={[styles.priorityText, {
                  color: rec.priority === 'urgent' ? Colors.error :
                         rec.priority === 'high' ? Colors.warning : Colors.primary
                }]}>
                  {rec.priority === 'urgent' ? '🚨 URGENT' :
                   rec.priority === 'high' ? '⚠️ HAUTE' : '💡 NORMALE'}
                </Text>
              </View>
              <Text style={styles.recommendationTitle}>{rec.title}</Text>
              <Text style={styles.recommendationDescription} numberOfLines={2}>
                {rec.description}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by Al Toppe AI 🤖
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
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.error,
    fontSize: 14,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: Colors.gray600,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 4,
    textAlign: 'center',
    color: Colors.gray500,
    fontSize: 12,
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
    fontSize: 12,
    color: Colors.gray500,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.gray600,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  scoreBar: {},
  scoreBarFill: {},
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
  },
  riskText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray800,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.gray900,
  },
  metricsContainer: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  metricRowHighlight: {
    backgroundColor: Colors.gray50,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
  },
  indicatorsContainer: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicatorLabel: {
    fontSize: 14,
    color: Colors.gray600,
  },
  indicatorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  indicatorValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightsContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    marginBottom: 20,
  },
  insightRow: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
    marginBottom: 4,
  },
  insightImpact: {
    fontSize: 12,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  recommendationsContainer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    marginBottom: 20,
  },
  recommendationRow: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray900,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 13,
    color: Colors.gray600,
    lineHeight: 18,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.gray500,
  },
});

