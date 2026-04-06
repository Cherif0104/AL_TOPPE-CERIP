import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,

  StatusBar,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  TriangleAlert as AlertTriangle,
  Plus,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Target,
  Activity,

  Mic,
  UserCheck,
  Building,
  Zap,
} from 'lucide-react-native';
import { useAuth, getEntrepreneurId } from '@/contexts/AuthContext';
import { FinanceService } from '@/services/finance';
import { AppEvents } from '@/services/storage';
import { useFocusEffect } from "@react-navigation/native";
import Colors from '@/constants/colors';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import aiService from '@/services/ai';
import { FinancialAnalysisResult } from '@/types/ai';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import cacheService, { CacheKeys } from '@/services/cacheService';
import SyncService from '@/services/syncService';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import ConnectivityStatus from '@/components/ConnectivityStatus';
import FinancialHealthCard from '@/components/ai/FinancialHealthCard';
import IncomeStatementCard from '@/components/incomeStatement/IncomeStatementCard';

const { width } = Dimensions.get('window');

// Define types for our data
interface WeeklyTotal {
  week: string;
  income: number;
  expenses: number;
}

interface Category {
  category__name?: string;
  name?: string;
  total: number;
}

// Simple Voice Guide Modal Component


export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { isOnline } = useOfflineSync();
  const [showBalance, setShowBalance] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    balance: 0,
    total_income: 0,
    total_expenses: 0,
    profit_margin: 0,
    income_count: 0,
    expenses_count: 0,
    alerts: 0,
    daily_averages: { net: 0 },
    top_income_categories: [] as Category[],
    weekly_totals: [] as WeeklyTotal[],
    overdue_payments: 0,
    low_balance_alerts: [],
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const loadHealthScore = async () => {
     console.log('healthScore',);
    };
    
    loadHealthScore();
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) return;

      // ✅ MODE OFFLINE : Essayer le cache d'abord
      const cacheKey = `${CacheKeys.DASHBOARD}_${entrepreneurId}`;
      const cachedData = await cacheService.get(cacheKey);
      
      // Si offline, utiliser le cache
      if (!isOnline && cachedData) {
        console.log('📦 Utilisation des données en cache (mode offline)');
        if (isMountedRef.current) {
          setDashboardData(cachedData);
        }
        setLoading(false);
        return;
      }

      // Si online, récupérer les données fraîches
      try {
        const data = await FinanceService.dashboard(entrepreneurId);
        if (isMountedRef.current) {
          const dashboardData = {
            balance: parseFloat(data.net_result) || 0,
            total_income: parseFloat(data.total_income) || 0,
            total_expenses: parseFloat(data.total_expenses) || 0,
            profit_margin: data.profit_margin || 0,
            income_count: data.income_count || 0,
            expenses_count: data.expenses_count || 0,
            alerts: (data.overdue_payments || 0) + (data.low_balance_alerts?.length || 0),
            daily_averages: data.daily_averages || { net: 0 },
            top_income_categories: data.top_income_categories || [],
            weekly_totals: data.weekly_totals || [],
            overdue_payments: data.overdue_payments || 0,
            low_balance_alerts: data.low_balance_alerts || [],
            recentTransactions: data.recent_transactions || [],
          };
          
          setDashboardData(dashboardData);
          
          // Sauvegarder dans le cache
          await cacheService.set(cacheKey, dashboardData, 24 * 60 * 60 * 1000); // 24h
        }
      } catch (fetchError: any) {
        // Si erreur réseau et cache disponible, utiliser le cache
        if (cachedData) {
          console.log('⚠️ Erreur réseau, utilisation du cache');
          if (isMountedRef.current) {
            setDashboardData(cachedData);
          }
        } else {
          // Pas de cache et erreur réseau
          throw fetchError;
        }
      }
    } catch (error: any) {
      // Ne pas déconnecter si c'est juste une erreur réseau en mode offline
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        console.warn('[Dashboard] Erreur réseau (mode offline possible):', error);
        // Essayer le cache en dernier recours
        const entrepreneurId = await getEntrepreneurId();
        if (entrepreneurId) {
          const cacheKey = `${CacheKeys.DASHBOARD}_${entrepreneurId}`;
          const cachedData = await cacheService.get(cacheKey);
          if (cachedData && isMountedRef.current) {
            setDashboardData(cachedData);
          }
        }
      } else if (error.message?.includes('401') || (error as any).status === 401 || error.message?.includes('Unauthorized')) {
        // ✅ Erreur 401 : Token expiré, déconnecter
        console.warn('[Dashboard] Token expiré (401), déconnexion...');
        try {
          await logout();
          router.replace('/auth/login');
        } catch (logoutError) {
          console.error('[Dashboard] Erreur déconnexion:', logoutError);
          router.replace('/auth/login');
        }
      } else {
        // Erreur d'authentification ou autre
        console.warn('[Dashboard] Fetch error:', error);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [isOnline, logout]);

  // useEffect(() => {
  //   fetchDashboard();

  //   const listener = () => {
  //     fetchDashboard();
  //   };

  //   if (AppEvents && typeof AppEvents.on === "function") {
  //     AppEvents.on("finances:changed", listener);
  //   }

  //   return () => {
  //     if (AppEvents && typeof AppEvents.on === "function") {
  //       // Cleanup handled internally
  //     }
  //   };
  // }, [fetchDashboard]);
  // IA
  

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-SN", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const GlassCard = ({ children, style = {} }: { children: React.ReactNode; style?: any }) => (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );

  const MetricCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }) => (
    <View style={[styles.metricCard, { backgroundColor: color }]}>
      <View style={styles.metricCardContent}>
        <View style={styles.metricHeader}>
          <View style={styles.iconContainer}>
            {icon}
          </View>
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const WeeklyChartBar = ({ week, income, expenses, maxValue }: {
    week: string;
    income: number;
    expenses: number;
    maxValue: number
  }) => {
    const incomeHeight = maxValue > 0 ? (income / maxValue) * 40 : 0;
    const expenseHeight = maxValue > 0 ? (expenses / maxValue) * 40 : 0;

    return (
      <View style={styles.chartBar}>
        <View style={styles.barContainer}>
          <View style={[styles.incomeBar, { height: incomeHeight }]} />
          <View style={[styles.expenseBar, { height: expenseHeight }]} />
        </View>
        <Text style={styles.weekLabel}>{week}</Text>
      </View>
    );
  };

  // Composant graphique en courbe simplifié
  const LineChartComponent = ({ data }: { data: WeeklyTotal[] }) => {
    if (data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(w => Math.max(w.income, w.expenses)), 1);
    const chartHeight = 120;
    const chartPadding = 20;
    const chartWidth = width - 64 - (chartPadding * 2);
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;
    
    // Calculer les positions Y (inversées car Y=0 est en haut)
    const getYPosition = (value: number) => {
      return chartHeight - (value / maxValue) * chartHeight;
    };
    
    return (
      <View style={styles.lineChartContainer}>
        <View style={styles.lineChart}>
          {/* Grille horizontale */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { 
                  top: ratio * chartHeight,
                  width: '100%',
                  left: 0
                }
              ]}
            />
          ))}
          
          {/* Lignes de connexion et points */}
          <View style={[styles.lineChartContent, { paddingHorizontal: chartPadding }]}>
            {/* Ligne des revenus */}
            {data.map((week, index) => {
              if (index === 0) return null;
              const prevIncome = getYPosition(data[index - 1].income);
              const currIncome = getYPosition(week.income);
              const x1 = (index - 1) * stepX;
              const x2 = index * stepX;
              const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(currIncome - prevIncome, 2));
              const angle = Math.atan2(currIncome - prevIncome, x2 - x1) * (180 / Math.PI);
              
              return (
                <View
                  key={`income-line-${index}`}
                  style={[
                    styles.lineSegment,
                    {
                      left: x1,
                      top: prevIncome,
                      width: distance,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: Colors.primary,
                    }
                  ]}
                />
              );
            })}
            
            {/* Points revenus */}
            {data.map((week, index) => {
              const y = getYPosition(week.income);
              return (
                <View
                  key={`income-dot-${index}`}
                  style={[
                    styles.chartDot,
                    {
                      left: index * stepX - 4 + chartPadding,
                      top: y - 4,
                      backgroundColor: Colors.primary,
                    }
                  ]}
                />
              );
            })}
            
            {/* Ligne des dépenses */}
            {data.map((week, index) => {
              if (index === 0) return null;
              const prevExpense = getYPosition(data[index - 1].expenses);
              const currExpense = getYPosition(week.expenses);
              const x1 = (index - 1) * stepX;
              const x2 = index * stepX;
              const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(currExpense - prevExpense, 2));
              const angle = Math.atan2(currExpense - prevExpense, x2 - x1) * (180 / Math.PI);
              
              return (
                <View
                  key={`expense-line-${index}`}
                  style={[
                    styles.lineSegment,
                    {
                      left: x1,
                      top: prevExpense,
                      width: distance,
                      transform: [{ rotate: `${angle}deg` }],
                      backgroundColor: Colors.secondary,
                    }
                  ]}
                />
              );
            })}
            
            {/* Points dépenses */}
            {data.map((week, index) => {
              const y = getYPosition(week.expenses);
              return (
                <View
                  key={`expense-dot-${index}`}
                  style={[
                    styles.chartDot,
                    {
                      left: index * stepX - 4 + chartPadding,
                      top: y - 4,
                      backgroundColor: Colors.secondary,
                    }
                  ]}
                />
              );
            })}
          </View>
          
          {/* Labels en bas */}
          <View style={styles.lineChartLabels}>
            {data.map((week, index) => (
              <Text key={index} style={styles.lineChartLabel}>
                {week.week.replace('Semaine ', 'S')}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const CategoryItem = ({ category, index, maxValue }: {
    category: Category;
    index: number;
    maxValue: number
  }) => {
    const percentage = maxValue > 0 ? (category.total / maxValue) * 100 : 0;
    const colors = ['#8B5CF6', '#06B6D4', Colors.primary, '#F59E0B', Colors.secondary];

    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryDot, { backgroundColor: colors[index % colors.length] }]} />
          <Text style={styles.categoryName}>{category.category__name || category.name || ''}</Text>
        </View>
        <View style={styles.categoryValue}>
          <Text style={styles.categoryAmount}>{formatCurrency(category.total)}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: colors[index % colors.length]
                }
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

 
  const maxWeeklyValue = dashboardData.weekly_totals.length > 0
    ? Math.max(...dashboardData.weekly_totals.map(w => Math.max(w.income, w.expenses)))
    : 0;

  const maxCategoryValue = dashboardData.top_income_categories.length > 0
    ? Math.max(...dashboardData.top_income_categories.map(c => c.total))
    : 0;




    if (loading) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.greeting}>Salam aleykum! 🇸🇳</Text>
                <Text style={styles.userName}>{user?.full_name || 'Entrepreneur'}</Text>
              </View>
            </View>
          </View>
          <LoadingSpinner 
            message="Chargement de votre tableau de bord..." 
            color={Colors.primary}
            animated={true}
          />
        </View>
      );
    }

    return (
        <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Indicateur de connectivité */}
      <ConnectivityStatus />

      {/* Header with Guide Button */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Salam aleykum! dalal ak diame si altope 🇸🇳</Text>
            <Text style={styles.userName}>{user?.full_name || 'Entrepreneur'}</Text>
          </View>
          <View style={styles.headerActions}>
            {dashboardData.alerts > 0 && (
              <TouchableOpacity  
                style={styles.alertBadge}
                onPress={() => router.push('/(pages)/alerts')}
              >
                <AlertTriangle size={18} color="#FFFFFF" />
                <Text style={styles.alertCount}>{dashboardData.alerts}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.guideButton}
              onPress={() => router.push('/(pages)/profile')}
            >
              <UserCheck size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Balance Card */}
        <View style={styles.balanceSection}>
          <GlassCard style={styles.balanceCard}>
            <View style={[styles.balanceGradient, { backgroundColor: Colors.primary }]}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Résultat Net</Text>
                <TouchableOpacity
                  onPress={() => setShowBalance(!showBalance)}
                  style={styles.eyeButton}
                >
                  {showBalance ?
                    <EyeOff size={20} color="#FFFFFF" /> :
                    <Eye size={20} color="#FFFFFF" />
                  }
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>
                {showBalance ? formatCurrency(dashboardData.balance) : '*** *** F CFA'}
              </Text>
              <View style={styles.profitMarginContainer}>
                <Text style={styles.profitMarginLabel}>Marge bénéficiaire</Text>
                <Text style={styles.profitMarginValue}>{dashboardData.profit_margin.toFixed(1)}%</Text>
              </View>
              <TouchableOpacity
                style={styles.addButtonWrapper}
                activeOpacity={0.85}
                onPress={() => router.push('/voice-ai')}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)']}
                  style={styles.addButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.addButtonIconCircle}>
                    <Plus size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.addButtonText}>Nouvelle transaction</Text>
                  <View style={styles.addButtonBadge}>
                    <Mic size={12} color="#FFFFFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>

        {/* Métriques principales */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Revenus totaux"
            value={formatCurrency(dashboardData.total_income)}
            icon={<TrendingUp size={20} color="#FFFFFF" />}
            color={Colors.primary}
            subtitle={`${dashboardData.income_count} transactions`}
          />
          <MetricCard
            title="Dépenses totales"
            value={formatCurrency(dashboardData.total_expenses)}
            icon={<TrendingDown size={20} color="#FFFFFF" />}
            color={Colors.secondary}
            subtitle={`${dashboardData.expenses_count} transactions`}
          />
        </View>

        {/* Moyenne journalière */}
        <View style={styles.dailyAverageSection}>
          <GlassCard>
            <View style={styles.dailyAverageContent}>
              <Activity size={20} color={Colors.primary} />
              <View style={styles.dailyAverageInfo}>
                <Text style={styles.dailyAverageLabel}>Bénéfice moyen / jour</Text>
                <Text style={styles.dailyAverageValue}>
                  {formatCurrency(dashboardData.daily_averages.net)}
                </Text>
              </View>
              <Target size={20} color={Colors.primary} />
            </View>
          </GlassCard>
        </View>

        {/* Graphique hebdomadaire en courbe */}
        {dashboardData.weekly_totals.length > 0 && (
          <View style={styles.chartSection}>
            <GlassCard>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Évolution hebdomadaire</Text>
                <TrendingUp size={18} color={Colors.primary} />
              </View>
              <LineChartComponent data={dashboardData.weekly_totals} />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendText}>Revenus</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
                  <Text style={styles.legendText}>Dépenses</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Top catégories */}
        {dashboardData.top_income_categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <GlassCard>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top catégories revenus</Text>
                <PieChart size={18} color={Colors.primary} />
              </View>
              {dashboardData.top_income_categories.slice(0, 3).map((category, index) => (
                <CategoryItem
                  key={index}
                  category={category}
                  index={index}
                  maxValue={maxCategoryValue}
                />
              ))}
            </GlassCard>
          </View>
        )}

      
           <IncomeStatementCard />


        {/* Actions rapides */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.primary }]}
              onPress={() => router.push('/voice-ai')}
            >
              <Mic size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Voice AI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
              onPress={() => router.push('/finances')}
            >
              <TrendingDown size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Finances</Text>
            </TouchableOpacity>
            {/* activites */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.primary }]}
              onPress={() => router.push('/(pages)/activites')}
            >
              <Activity size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Activités</Text>
            </TouchableOpacity>
            {/* Business Plans */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
              onPress={() => router.push('/(pages)/business_plans')}
            >
              <Building size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Business Plans</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Widget Santé Amélioré
  healthWidgetContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  healthWidget: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  healthWidgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  healthIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  healthIcon: {
    fontSize: 24,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  healthLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  healthLoadingText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '500',
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 16,
  },
  healthScore: {
    fontSize: 64,
    fontWeight: 'bold',
    lineHeight: 70,
  },
  healthScoreMax: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: 8,
  },
  healthStatusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  healthStatusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  healthProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  healthProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthEmptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  healthEmptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  healthEmptyHint: {
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  widgetSubtext: {
    fontSize: 14,
    color: Colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  widgetDetail: {
    fontSize: 12,
    color: Colors.gray500,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  // Header
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 30,
    paddingBottom: 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  alertCount: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  guideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Glass Card
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Balance Section
  balanceSection: {
    marginBottom: 16,
    paddingTop: 0,
  },
  balanceCard: {
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  balanceGradient: {
    padding: 20,
    borderRadius: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-Medium',
  },
  eyeButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  profitMarginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  profitMarginLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  profitMarginValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  addButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 12,
  },
  addButtonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  addButtonBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  metricCardContent: {
    flex: 1,
  },
  metricHeader: {
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Inter-Regular',
  },
  // Daily Average
  dailyAverageSection: {
    marginBottom: 16,
  },
  dailyAverageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyAverageInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  dailyAverageLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  dailyAverageValue: {
    fontSize: 18,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginTop: 2,
  },
  // Chart Section
  chartSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 12,
  },
  chartBar: {
    alignItems: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    marginBottom: 6,
  },
  incomeBar: {
    width: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    marginRight: 2,
  },
  expenseBar: {
    width: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  weekLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  // Line Chart Styles
  lineChartContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  lineChart: {
    height: 140,
    width: '100%',
    position: 'relative',
    marginBottom: 24,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.5,
  },
  lineChartContent: {
    position: 'absolute',
    width: '100%',
    height: 120,
    top: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  lineChartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingHorizontal: 8,
  },
  lineChartLabel: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  // Categories Section
  categoriesSection: {
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  // Quick Actions
  quickActions: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    marginTop: 6,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Guide Modal Styles
  guideContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.primary,
  },
  guideTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  guideCloseButton: {
    padding: 4,
  },
  guideCloseText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  guideContent: {
    flex: 1,
    padding: 20,
  },
  guideSection: {
    marginBottom: 20,
  },
  guideSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  guideCommand: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  guideCommandText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  guideTip: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  guideTipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  guideExample: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  guideExampleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.textSecondary,
  },
  guideFooter: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  guideCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  guideCtaText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});