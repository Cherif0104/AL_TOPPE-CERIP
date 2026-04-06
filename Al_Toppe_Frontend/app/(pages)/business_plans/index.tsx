import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  FileText,
  Plus,
  Edit3,
  Download,
  Share,
  Target,
  DollarSign,
  Calendar,
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  Sparkles,
  Award,
  X,
  Lightbulb
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { BusinessPlanService, type BusinessPlansResponse, type BusinessPlan } from '@/services/business_plan';
import Colors from '@/constants/colors';
import { useNavigation } from '@react-navigation/native';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { LinearGradient } from 'expo-linear-gradient';
import { useOfflineData } from '@/hooks/useOfflineData';
import { CacheKeys } from '@/services/cacheService';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function BusinessPlanScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    getEntrepreneurId().then(id => setEntrepreneurId(id || null));
  }, []);

  // Statuts disponibles (correspondent à STATUS_CHOICES du backend)
  const STATUS_CHOICES = {
    'draft': { label: 'Brouillon', color: '#64748B', progress: 40 },
    'submitted': { label: 'Soumis', color: '#3B82F6', progress: 60 },
    'under_review': { label: 'En cours de révision', color: '#F59E0B', progress: 75 },
    'approved': { label: 'Approuvé', color: '#22C55E', progress: 100 },
    'rejected': { label: 'Rejeté', color: '#EF4444', progress: 0 },
    'archived': { label: 'Archivé', color: '#94A3B8', progress: 100 },
  };

  // Fonction helper pour calculer le progrès (définie avant utilisation)
  const calculateProgress = (status: string): number => {
    const statusConfig = STATUS_CHOICES[status as keyof typeof STATUS_CHOICES];
    if (statusConfig) {
      return statusConfig.progress;
    }
    // Fallback pour les anciens statuts
    switch (status) {
      case 'completed': return 100;
      case 'submitted': return 80;
      case 'in_progress': return 60;
      case 'draft': return 40;
      default: return 20;
    }
  };

  // ✅ Utilisation du hook useOfflineData pour les business plans
  const { 
    data: businessPlansData, 
    loading, 
    error: dataError,
    refetch: refetchBusinessPlans 
  } = useOfflineData<BusinessPlansResponse>({
    cacheKey: entrepreneurId ? `${CacheKeys.BUSINESS_PLANS}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      const id = await getEntrepreneurId();
      if (!id) throw new Error('ID entrepreneur non trouvé');
      return await BusinessPlanService.entrepreneurPlans(id) as BusinessPlansResponse;
    },
    cacheExpiry: 24 * 60 * 60 * 1000, // 24h
    enabled: !!entrepreneurId,
  });

  // ✅ Calcul optimisé avec useMemo
  const businessPlans = useMemo(() => {
    const results = (businessPlansData?.results ?? []) as BusinessPlan[];
    return results.map(plan => ({
      ...plan,
      progress: calculateProgress(plan.status) || 0
    }));
  }, [businessPlansData]);

  const error = dataError?.message || null;

  const templates: Template[] = [
    { id: 'commerce', name: 'Commerce & Vente', description: 'Boutique, vente de produits', icon: '🏪' },
    { id: 'artisanat', name: 'Artisanat', description: 'Bijoux, décoration, art', icon: '🎨' },
    { id: 'service', name: 'Services', description: 'Coiffure, beauté, réparation', icon: '✂️' },
    { id: 'agriculture', name: 'Agriculture', description: 'Maraîchage, élevage, pêche', icon: '🌾' },
  ];

  const fetchBusinessPlans = async () => {
    await refetchBusinessPlans();
  };

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000).toFixed(0)}K FCFA`;
  };

  const getStatusColor = (status: string) => {
    const statusConfig = STATUS_CHOICES[status as keyof typeof STATUS_CHOICES];
    if (statusConfig) {
      return statusConfig.color;
    }
    // Fallback pour les anciens statuts
    switch (status) {
      case 'completed': return Colors.primary;
      case 'submitted':
      case 'in_review': return '#EAB308';
      case 'in_progress': return '#3B82F6';
      default: return '#64748B';
    }
  };

  const handleCreatePlan = async () => {
    if (!selectedTemplate || !newPlanName.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner un modèle et donner un nom à votre plan');
      return;
    }
    try {
      const entrepreneurId = await getEntrepreneurId();
      const activityId = await AsyncStorage.getItem('activity_id');
      if (!entrepreneurId) {
        throw new Error('ID entrepreneur non trouvé');
      }
      const newPlan: any = {
        title: newPlanName,
        template: selectedTemplate,
        entrepreneur: entrepreneurId,
        activity: activityId || undefined,
        status: 'draft'
      };
      await BusinessPlanService.createBusinessPlan(newPlan);
      Alert.alert('Succès', 'Plan créé avec succès');
      setShowCreateModal(false);
      setSelectedTemplate('');
      setNewPlanName('');
      fetchBusinessPlans();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le plan');
      console.error('Error creating business plan:', error);
    }
  };

  const handleEditPlan = (planId: string) => {
    router.push(`/business_plans/${planId}`);
  };

  const handleDownloadPlan = async (planId: string) => {
    try {
      await BusinessPlanService.exportPdf(planId);
      Alert.alert('Téléchargement', 'PDF généré avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le plan');
      console.error('Error downloading plan:', error);
    }
  };

  const BusinessPlanCard = ({ plan }: { plan: BusinessPlan }) => {
    const financials = plan.financial_projections ? {
      investment: plan.financial_projections.year_1_expenses,
      revenue: plan.financial_projections.year_1_revenue,
      profit: plan.financial_projections.year_1_profit
    } : { investment: 0, revenue: 0, profit: 0 };

    return (
      <TouchableOpacity
        style={styles.planCard}
        onPress={() => handleEditPlan(plan.id)}
        activeOpacity={0.7}
      >
        {/* Header Card */}
        <View style={styles.planCardHeader}>
          <LinearGradient
            colors={[getStatusColor(plan.status) + '25', getStatusColor(plan.status) + '10']}
            style={styles.planIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <FileText size={24} color={getStatusColor(plan.status)} />
          </LinearGradient>

          <View style={styles.planHeaderInfo}>
            <Text style={styles.planTitle} numberOfLines={1}>{plan.title}</Text>
            <Text style={styles.planSubtitle}>{plan.activity_title}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(plan.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(plan.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(plan.status) }]}>
              {plan.status_display}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Complétion</Text>
            <Text style={styles.progressValue}>{plan.progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={[getStatusColor(plan.status), getStatusColor(plan.status) + '80']}
              style={[styles.progressBarFill, { width: plan.progress ? `${plan.progress}%` : '0%' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>

        {/* Financial Stats */}
        {financials.revenue > 0 && (
          <View style={styles.financialsGrid}>
            <View style={styles.financialStatCard}>
              <View style={styles.financialIconWrapper}>
                <DollarSign size={16} color="#F59E0B" />
              </View>
              <Text style={styles.financialStatLabel}>Investissement</Text>
              <Text style={styles.financialStatValue}>{formatCurrency(financials.investment)}</Text>
            </View>

            <View style={styles.financialStatCard}>
              <View style={[styles.financialIconWrapper, { backgroundColor: '#10B98120' }]}>
                <TrendingUp size={16} color={Colors.primary} />
              </View>
              <Text style={styles.financialStatLabel}>Revenus prévus</Text>
              <Text style={[styles.financialStatValue, { color: Colors.primary }]}>
                {formatCurrency(financials.revenue)}
              </Text>
            </View>

            <View style={styles.financialStatCard}>
              <View style={[styles.financialIconWrapper, { backgroundColor: '#3B82F620' }]}>
                <Award size={16} color="#3B82F6" />
              </View>
              <Text style={styles.financialStatLabel}>Profit estimé</Text>
              <Text style={[styles.financialStatValue, { color: '#3B82F6' }]}>
                {formatCurrency(financials.profit)}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {/* <View style={styles.planActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Edit3 size={16} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDownloadPlan(plan.id)}
          >
            <Download size={16} color="#F59E0B" />
            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Share size={16} color="#3B82F6" />
            <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Partager</Text>
          </TouchableOpacity>
        </View> */}

        {/* Footer */}
        <View style={styles.planFooter}>
          <Calendar size={12} color="#94A3B8" />
          <Text style={styles.lastModified}>
            Modifié le {new Date(plan.updated_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const TemplateCard = ({ template }: { template: Template }) => (
    <TouchableOpacity
      style={[
        styles.templateCard,
        selectedTemplate === template.id && styles.selectedTemplateCard
      ]}
      onPress={() => setSelectedTemplate(template.id)}
      activeOpacity={0.7}
    >
      <View style={styles.templateIcon}>
        <Text style={styles.templateEmoji}>{template.icon}</Text>
      </View>
      <View style={styles.templateInfo}>
        <Text style={styles.templateName}>{template.name}</Text>
        <Text style={styles.templateDescription}>{template.description}</Text>
      </View>
      {selectedTemplate === template.id && (
        <CheckCircle size={24} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  const stats = {
    activePlans: businessPlans.length,
    totalInvestment: businessPlans.reduce((sum, plan) =>
      sum + (plan.financial_projections?.year_1_expenses || 0), 0),
    completedPlans: businessPlans.filter(p => p.status === 'completed').length
  };

  // if (loading) {
  //   return (
  //     <View style={styles.container}>
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

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title="Plans d'affaires"
          onNotificationPress={() => navigation.navigate('alerts' as never)}
          onProfilePress={() => navigation.navigate('profile' as never)}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrapper}>
            <X size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Oups !</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButtonWrapper} onPress={fetchBusinessPlans}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Plans d'affaires</Text>
            <Text style={styles.headerSubtitle}>Gérez vos projets</Text>
          </View>

          <TouchableOpacity
            style={styles.addButtonHeader}
            onPress={() => setShowCreateModal(true)}  // ✅ NOUVEAU
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats in Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <Target size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.activePlans}</Text>
            <Text style={styles.statLabel}>Plans actifs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <DollarSign size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{(stats.totalInvestment / 1000000).toFixed(1)}M</Text>
            <Text style={styles.statLabel}>Investissement</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <CheckCircle size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.completedPlans}</Text>
            <Text style={styles.statLabel}>Complétés</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Plans List */}
      <ScrollView
        style={styles.plansList}
        contentContainerStyle={styles.plansListContent}
        showsVerticalScrollIndicator={false}
      >
        {businessPlans.length > 0 ? (
          businessPlans.map((plan) => (
            <BusinessPlanCard key={plan.id} plan={plan} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#F0F9FF', '#FFF7ED']}
              style={styles.emptyGradient}
            >
              <View style={styles.emptyIconWrapper}>
                <FileText size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Aucun plan d'affaires</Text>
              <Text style={styles.emptyText}>
                Créez votre premier plan pour structurer votre projet
              </Text>
              <TouchableOpacity
                style={styles.emptyButtonWrapper}
                onPress={() => setShowCreateModal(true)}  // ✅ NOUVEAU
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primary]}
                  style={styles.emptyButton}
                >
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Créer un plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create Modal */}
      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau plan 🚀</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setSelectedTemplate('');
                  setNewPlanName('');
                }}
              >
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choisissez un modèle adapté à votre activité
            </Text>

            <ScrollView
              style={styles.templatesContainer}
              showsVerticalScrollIndicator={false}
            >
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}


            </ScrollView>


            {/* Button for Guided Mode */}
            {selectedTemplate && (
              <TouchableOpacity
                style={styles.guidedButton}
                onPress={() => {
                  setShowCreateModal(false);
                  router.push(`/business_plans/guided?sector=${selectedTemplate}`);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primary]}
                  style={styles.guidedButtonGradient}
                >
                  <Lightbulb size={20} color="#FFFFFF" />
                  <View style={styles.guidedButtonText}>
                    <Text style={styles.guidedButtonTitle}>Mode Guidé Intelligent</Text>

                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Modal>
      <Footer showNavigation />

    </View>
  );
}

const styles = StyleSheet.create({
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  addButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },

  
  // financialStatCard: {
  //   flex: 1,
  //   backgroundColor: 'rgba(255, 255, 255, 0.15)',
  //   borderRadius: 16,
  //   padding: 12,
  //   alignItems: 'center',
  // },
  // financialIconWrapper: {
  //   fontSize: 14,
  //   fontFamily: 'Inter-Bold',
  //   color: '#FFFFFF',
  //   marginTop: 8,
  //   marginBottom: 2,
  // },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  plansList: {
    flex: 1,
  },
  plansListContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  progressValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  financialsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  }, 
  financialStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  financialIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  financialStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  financialStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  planActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lastModified: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  emptyState: {
    marginTop: 40,
  },
  emptyGradient: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 24,
  },
  templatesContainer: {
    maxHeight: 350,
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedTemplateCard: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  templateEmoji: {
    fontSize: 24,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  inputIcon: {
    marginRight: 12,
  },
  planNameInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 13,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelModalButtonText: {
    fontSize: 16,

    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  createButtonWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  guidedButton: {
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  guidedButtonGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 70,
  },
  guidedButtonText: {
    flex: 1,
    flexShrink: 1,
  },
  guidedButtonTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  guidedButtonSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
});