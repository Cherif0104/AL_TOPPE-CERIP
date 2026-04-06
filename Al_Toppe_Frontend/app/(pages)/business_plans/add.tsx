import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { 
  ArrowLeft, 
  Save,
  Plus,
  X,
  CheckCircle,
  XCircle,
  ChevronDown,
  Building2,
  Target,
  DollarSign,
  ClipboardList,
  Calendar,
  FileText
} from 'lucide-react-native';
import { router } from 'expo-router';
import { BusinessPlanService } from '@/services/business_plan';
import { Alert } from 'react-native';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { ActivityItem, ActivityService } from '@/services/activity';
import { AppEvents } from '@/services/storage';
import Colors from '@/constants/colors';
import Toast from 'react-native-toast-message';

// Types pour les données
interface MarketAnalysis {
  target_market: string;
  competition: string;
  market_size: string;
  trends: string;
}

interface Offer {
  products: string[];
  services: string[];
  unique_value: string;
}

interface BusinessModel {
  revenue_streams: string[];
  cost_structure: string[];
  key_partners: string[];
}

interface FinancialProjections {
  year_1_revenue: number;
  year_1_expenses: number;
  year_1_profit: number;
  break_even_month: number;
}

interface ImplementationPlan {
  phase_1: string;
  phase_2: string;
  phase_3: string;
}

interface BusinessPlanForm {
  title: string;
  summary: string;
  market_analysis: MarketAnalysis;
  offer: Offer;
  business_model: BusinessModel;
  financial_projections: FinancialProjections;
  implementation_plan: ImplementationPlan;
  sector: string;
}

export default function AddBusinessPlanScreen() {
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [dropdownModalVisible, setDropdownModalVisible] = useState(false);
  const [currentDropdown, setCurrentDropdown] = useState<'activity' | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    planId?: string;
  }>({ title: '', message: '' });

  const [formData, setFormData] = useState<BusinessPlanForm>({
    title: '',
    summary: '',
    sector: '',
    market_analysis: {
      target_market: '',
      competition: '',
      market_size: '',
      trends: ''
    },
    offer: {
      products: [''],
      services: [''],
      unique_value: ''
    },
    business_model: {
      revenue_streams: [''],
      cost_structure: [''],
      key_partners: ['']
    },
    financial_projections: {
      year_1_revenue: 0,
      year_1_expenses: 0,
      year_1_profit: 0,
      break_even_month: 0
    },
    implementation_plan: {
      phase_1: '',
      phase_2: '',
      phase_3: ''
    }
  });

  const [errors, setErrors] = useState<Partial<BusinessPlanForm & { activity: string }>>({});

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type,
      text1: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  // Validation des champs
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'title':
        if (!value?.trim()) return 'Le titre est requis';
        if (value.length < 3) return 'Doit contenir au moins 3 caractères';
        break;
      
      case 'summary':
        if (!value?.trim()) return 'Le résumé est requis';
        if (value.length < 10) return 'Doit contenir au moins 10 caractères';
        break;
      
      case 'activity':
        if (!selectedActivityId) return 'Veuillez sélectionner une activité';
        break;
      
      case 'sector':
        if (!value?.trim()) return 'Le secteur est requis';
        break;
      
      case 'market_analysis.target_market':
        if (!value?.trim()) return 'Le marché cible est requis';
        break;
      
      case 'financial_projections.year_1_revenue':
        if (!value || value <= 0) return 'Les revenus doivent être positifs';
        break;
      
      case 'financial_projections.year_1_expenses':
        if (!value || value < 0) return 'Les dépenses ne peuvent pas être négatives';
        break;
      
      case 'financial_projections.break_even_month':
        if (!value || value < 1 || value > 36) return 'Le mois de rentabilité doit être entre 1 et 36';
        break;
    }
    return null;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    setTouchedFields(prev => new Set([...prev, field]));

    if (touchedFields.has(field)) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }
  };

  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof BusinessPlanForm],
        [field]: value
      }
    }));

    const fullFieldName = `${section}.${field}`;
    setTouchedFields(prev => new Set([...prev, fullFieldName]));

    if (touchedFields.has(fullFieldName)) {
      const error = validateField(fullFieldName, value);
      setErrors(prev => ({
        ...prev,
        [fullFieldName]: error || undefined
      }));
    }
  };

  const handleArrayChange = (section: string, field: string, index: number, value: string) => {
    const currentArray = [...formData[section as keyof BusinessPlanForm][field]];
    currentArray[index] = value;
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof BusinessPlanForm],
        [field]: currentArray
      }
    }));
  };

  const addArrayItem = (section: string, field: string) => {
    const currentArray = [...formData[section as keyof BusinessPlanForm][field]];
    currentArray.push('');
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof BusinessPlanForm],
        [field]: currentArray
      }
    }));
  };

  const removeArrayItem = (section: string, field: string, index: number) => {
    const currentArray = [...formData[section as keyof BusinessPlanForm][field]];
    if (currentArray.length > 1) {
      currentArray.splice(index, 1);
      
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof BusinessPlanForm],
          [field]: currentArray
        }
      }));
    }
  };

  const handleFocus = (field: string) => {
    setFocusedField(field);
    setTouchedFields(prev => new Set([...prev, field]));
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  // Gestion des dropdowns avec Modal
  const handleDropdownOpen = (type: 'activity') => {
    setCurrentDropdown(type);
    setDropdownModalVisible(true);
  };

  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setDropdownModalVisible(false);
    setCurrentDropdown(null);
    
    // Validation
    const error = validateField('activity', activityId);
    setErrors(prev => ({
      ...prev,
      activity: error || undefined
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<BusinessPlanForm & { activity: string }> = {};
    
    // Valider les champs de base
    const fieldsToValidate = [
      { field: 'title', value: formData.title },
      { field: 'summary', value: formData.summary },
      { field: 'sector', value: formData.sector },
      { field: 'activity', value: selectedActivityId },
      { field: 'market_analysis.target_market', value: formData.market_analysis.target_market },
      { field: 'financial_projections.year_1_revenue', value: formData.financial_projections.year_1_revenue },
      { field: 'financial_projections.year_1_expenses', value: formData.financial_projections.year_1_expenses },
      { field: 'financial_projections.break_even_month', value: formData.financial_projections.break_even_month }
    ];

    fieldsToValidate.forEach(({ field, value }) => {
      const error = validateField(field, value);
      if (error) {
        newErrors[field as keyof typeof newErrors] = error;
      }
    });

    setErrors(newErrors);
    setTouchedFields(new Set([...touchedFields, ...fieldsToValidate.map(f => f.field)]));
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('error', 'Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    try {
      const entrepreneurId = await getEntrepreneurId();

      if (!entrepreneurId) {
        showToast('error', 'ID entrepreneur non trouvé');
        return;
      }

      if (!selectedActivityId) {
        showToast('error', 'Veuillez sélectionner une activité');
        return;
      }

      setLoading(true);

      // Filtrer les tableaux vides
      const cleanedData = {
        ...formData,
        entrepreneur: entrepreneurId,
        activity: selectedActivityId,
        sector: formData.sector || '',
        status: 'draft', // Statut par défaut : Brouillon
        offer: {
          ...formData.offer,
          products: formData.offer.products.filter(p => p.trim() !== ''),
          services: formData.offer.services.filter(s => s.trim() !== '')
        },
        business_model: {
          ...formData.business_model,
          revenue_streams: formData.business_model.revenue_streams.filter(r => r.trim() !== ''),
          cost_structure: formData.business_model.cost_structure.filter(c => c.trim() !== ''),
          key_partners: formData.business_model.key_partners.filter(k => k.trim() !== '')
        },
        // Activer la génération automatique avec IA
        use_ai: true,
        language: 'french'
      };

      try {
      const response = await BusinessPlanService.createBusinessPlan(cleanedData);

      // Afficher un message de succès avec info IA si disponible
      console.log('response', response);
     
      } catch (error: any) {
        console.error('Error creating business plan:', error);
        showToast('error', error.message);
      }
   
    } catch (error: any) {
      console.error('Error creating business plan:', error);
      showToast('error', error.message);
      // Gestion détaillée des erreurs
      let errorMessage = 'Erreur lors de la création du plan d\'affaires';
      
      // Le service HTTP utilise error.data et error.status directement
      const status = error.status || error.response?.status;
      const data = error.data || error.response?.data || {};
      
      console.log('Error status:', status);
      console.log('Error data:', data);
      console.log('Error message:', error.message);
      
      if (status) {
        // Erreur avec réponse du serveur

        switch (status) {
          case 409:
            // Conflit - Plan existant
            const existingPlanId = data?.existing_plan_id;
            const planTitle = data?.existing_plan_title || 'le plan existant';
            
            // Afficher un toast avec action
            showToast(
              'error', 
              data?.message || 'Un plan d\'affaires existe déjà pour cette activité'
            );
            
            // Proposer de naviguer après un délai
            setTimeout(() => {
              // Utiliser un Modal personnalisé au lieu de Alert
              setConfirmModalVisible(true);
              setConfirmModalData({
                title: 'Plan d\'affaires existant',
                message: `Un plan existe déjà pour cette activité: "${planTitle}". Voulez-vous le consulter ?`,
                planId: existingPlanId
              });
            }, 2000);
            return;
          
          case 400:
            // Erreur de validation
            if (data?.missing_fields) {
              const missing = Object.entries(data.missing_fields)
                .filter(([_, isMissing]) => isMissing)
                .map(([field]) => field)
                .join(', ');
              errorMessage = `Champs manquants: ${missing}`;
            } else {
              errorMessage = data?.message || 'Données invalides';
            }
            break;
          
          case 404:
            // Ressource introuvable
            errorMessage = data?.message || 'Activité ou entrepreneur introuvable';
            break;
          
          case 500:
            // Erreur serveur - Vérifier si c'est une contrainte UNIQUE
            const errorText = String(data?.error || data?.message || error.message || JSON.stringify(data || {}));
            const isUniqueConstraint = errorText.includes('UNIQUE constraint') || 
                                     errorText.includes('unique constraint') ||
                                     errorText.toLowerCase().includes('unique') ||
                                     (errorText.includes('entrepreneur_id') && errorText.includes('activity_id'));
            
            console.log('Error text:', errorText);
            console.log('Is unique constraint:', isUniqueConstraint);
            
            if (isUniqueConstraint) {
              // Plan existant pour cette combinaison entrepreneur + activité + version
              showToast('error', 'Un plan d\'affaires existe déjà pour cette activité');
              
              // Essayer de récupérer le plan existant
              setTimeout(async () => {
                try {
                  const entrepreneurId = await getEntrepreneurId();
                  if (entrepreneurId && selectedActivityId) {
                    const plansResponse = await BusinessPlanService.entrepreneurPlans(entrepreneurId, { activity: selectedActivityId });
                    const existingPlans = plansResponse?.results || (Array.isArray(plansResponse) ? plansResponse : []);
                    
                    if (existingPlans.length > 0) {
                      const existingPlan = Array.isArray(existingPlans) ? existingPlans[0] : existingPlans;
                      setConfirmModalVisible(true);
                      setConfirmModalData({
                        title: '⚠️ Plan d\'affaires existant',
                        message: `Un plan d'affaires existe déjà pour cette activité.\n\nPlan existant: "${existingPlan.title || 'Plan existant'}"\n\nVoulez-vous le consulter ?`,
                        planId: existingPlan.id
                      });
                    } else {
                      // Si on ne trouve pas le plan, afficher quand même un message clair
                      setConfirmModalVisible(true);
                      setConfirmModalData({
                        title: '⚠️ Plan d\'affaires existant',
                        message: 'Un plan d\'affaires existe déjà pour cette activité et cette version.\n\nVous pouvez consulter vos plans existants depuis la liste.',
                      });
                    }
                  } else {
                    setConfirmModalVisible(true);
                    setConfirmModalData({
                      title: '⚠️ Plan d\'affaires existant',
                      message: 'Un plan d\'affaires existe déjà pour cette activité et cette version.\n\nVous pouvez consulter vos plans existants depuis la liste des plans d\'affaires.',
                    });
                  }
                } catch (fetchError) {
                  console.error('Error fetching existing plan:', fetchError);
                  setConfirmModalVisible(true);
                  setConfirmModalData({
                    title: '⚠️ Plan d\'affaires existant',
                    message: 'Un plan d\'affaires existe déjà pour cette activité et cette version.\n\nVeuillez consulter vos plans existants depuis la liste des plans d\'affaires.',
                  });
                }
              }, 1500);
              return;
            } else {
              // Autre erreur serveur
              errorMessage = data?.message || data?.error || error.message || 'Erreur serveur. Veuillez réessayer plus tard.';
              console.error('Server error details:', data);
            }
            break;
          
          default:
            errorMessage = data?.message || data?.error || 'Une erreur est survenue';
        }
      } else if (error.request) {
        // Pas de réponse du serveur
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        // Autre erreur
        errorMessage = error.message || 'Une erreur inattendue est survenue';
      }
      
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    AppEvents.on('finances:changed', fetchData);
    
  
  }, []);

  const fetchData = async () => {
    const entrepreneur_id = await getEntrepreneurId();
    if (!entrepreneur_id) return;

    try {
      setIsLoading(true);

      // Activités
      if (!activities.length) {
        const acts = await ActivityService.listByEntrepreneur(entrepreneur_id);
        const actResults: ActivityItem[] = (acts?.results ?? []).map((a: any) => ({ id: a.id, title: a.title }));
        setActivities(actResults);
        if (!selectedActivityId && actResults.length > 0) setSelectedActivityId(actResults[0].id);
      }

    } catch (err) {
      console.error("Erreur fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Composant Activity Selector amélioré
  const ActivitySelector = () => {
    const error = errors.activity;
    const isTouched = touchedFields.has('activity');
    const isValid = isTouched && !error;

    const selectedActivity = activities.find(a => a.id === selectedActivityId);

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Activité *</Text>
        <TouchableOpacity 
          onPress={() => handleDropdownOpen('activity')} 
          style={[
            styles.dropdownButton,
            error && styles.dropdownButtonError,
            isValid && styles.dropdownButtonValid
          ]}
        >
          <Building2 
            size={20} 
            color={error ? '#EF4444' : isValid ? Colors.primary : '#64748B'} 
            style={styles.inputIcon} 
          />
          <Text style={[
            styles.dropdownText, 
            !selectedActivityId && styles.placeholderText,
            error && styles.dropdownTextError,
            isValid && styles.dropdownTextValid
          ]}>
            {selectedActivity ? selectedActivity.title : 'Sélectionnez une activité'}
          </Text>
          <ChevronDown 
            size={20} 
            color={error ? '#EF4444' : isValid ? Colors.primary : '#64748B'} 
          />
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  // Modal pour la sélection d'activité
  const ActivityModal = () => (
    <Modal
      visible={dropdownModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDropdownModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setDropdownModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionnez une activité</Text>
                <TouchableOpacity 
                  onPress={() => setDropdownModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseText}>×</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                {activities.map((activity) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.modalOption,
                      selectedActivityId === activity.id && styles.modalOptionSelected
                    ]}
                    onPress={() => handleActivitySelect(activity.id)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      selectedActivityId === activity.id && styles.modalOptionTextSelected
                    ]}>
                      {activity.title}
                    </Text>
                    {selectedActivityId === activity.id && (
                      <CheckCircle size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Modal de confirmation personnalisé
  const ConfirmModal = () => (
    <Modal
      visible={confirmModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setConfirmModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.confirmModalContent}>
              <View style={styles.confirmModalHeader}>
                <XCircle size={48} color="#F59E0B" />
              </View>
              
              <Text style={styles.confirmModalTitle}>{confirmModalData.title}</Text>
              <Text style={styles.confirmModalMessage}>{confirmModalData.message}</Text>
              
              <View style={styles.confirmModalButtons}>
                {confirmModalData.planId ? (
                  <>
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.confirmButtonSecondary]}
                      onPress={() => {
                        setConfirmModalVisible(false);
                        setTimeout(() => {
                          router.replace('/(pages)/business_plans');
                        }, 300);
                      }}
                    >
                      <Text style={styles.confirmButtonTextSecondary}>Voir mes plans</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.confirmButtonPrimary]}
                      onPress={() => {
                        setConfirmModalVisible(false);
                        setTimeout(() => {
                          router.replace(`/(pages)/business_plans/${confirmModalData.planId}`);
                        }, 300);
                      }}
                    >
                      <Text style={styles.confirmButtonTextPrimary}>Consulter ce plan</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.confirmButtonSecondary]}
                      onPress={() => setConfirmModalVisible(false)}
                    >
                      <Text style={styles.confirmButtonTextSecondary}>Fermer</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.confirmButton, styles.confirmButtonPrimary]}
                      onPress={() => {
                        setConfirmModalVisible(false);
                        setTimeout(() => {
                          router.replace('/(pages)/business_plans');
                        }, 300);
                      }}
                    >
                      <Text style={styles.confirmButtonTextPrimary}>Voir mes plans</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Création du plan d'affaires...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau Plan d'Affaires</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Save size={20} color="#22C55E" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informations de base */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Informations de Base</Text>
          </View>

          <ActivitySelector />

          {/* Titre */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Titre *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'title' && styles.inputContainerFocused,
              errors.title && styles.inputContainerError,
              touchedFields.has('title') && !errors.title && styles.inputContainerValid
            ]}>
              <FileText 
                size={20} 
                color={errors.title ? '#EF4444' : 
                       touchedFields.has('title') && !errors.title ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.title && styles.inputError,
                  touchedFields.has('title') && !errors.title && styles.inputValid
                ]}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Titre du plan d'affaires"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                onFocus={() => handleFocus('title')}
                onBlur={handleBlur}
              />
              {touchedFields.has('title') && !errors.title && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.title && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Secteur */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Secteur</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'sector' && styles.inputContainerFocused,
              errors.sector && styles.inputContainerError,
              touchedFields.has('sector') && !errors.sector && styles.inputContainerValid
            ]}>
              <Building2 
                size={20} 
                color={errors.sector ? '#EF4444' : 
                       touchedFields.has('sector') && !errors.sector ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.sector && styles.inputError,
                  touchedFields.has('sector') && !errors.sector && styles.inputValid
                ]}
                value={formData.sector}
                onChangeText={(text) => handleInputChange('sector', text)}
                placeholder="Secteur d'activité"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                onFocus={() => handleFocus('sector')}
                onBlur={handleBlur}
              />
              {touchedFields.has('sector') && !errors.sector && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.sector && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.sector && <Text style={styles.errorText}>{errors.sector}</Text>}
          </View>

          {/* Résumé */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Résumé *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'summary' && styles.inputContainerFocused,
              errors.summary && styles.inputContainerError,
              touchedFields.has('summary') && !errors.summary && styles.inputContainerValid
            ]}>
              <FileText 
                size={20} 
                color={errors.summary ? '#EF4444' : 
                       touchedFields.has('summary') && !errors.summary ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  errors.summary && styles.inputError,
                  touchedFields.has('summary') && !errors.summary && styles.inputValid
                ]}
                value={formData.summary}
                onChangeText={(text) => handleInputChange('summary', text)}
                placeholder="Résumé du projet"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('summary')}
                onBlur={handleBlur}
              />
              {touchedFields.has('summary') && !errors.summary && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.summary && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.summary && <Text style={styles.errorText}>{errors.summary}</Text>}
          </View>
        </View>

        {/* Analyse du marché */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Analyse du Marché</Text>
          </View>

          {/* Marché cible */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Marché cible *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'market_analysis.target_market' && styles.inputContainerFocused,
              errors.market_analysis?.target_market && styles.inputContainerError,
              touchedFields.has('market_analysis.target_market') && !errors.market_analysis?.target_market && styles.inputContainerValid
            ]}>
              <Target 
                size={20} 
                color={errors.market_analysis?.target_market ? '#EF4444' : 
                       touchedFields.has('market_analysis.target_market') && !errors.market_analysis?.target_market ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  errors.market_analysis?.target_market && styles.inputError,
                  touchedFields.has('market_analysis.target_market') && !errors.market_analysis?.target_market && styles.inputValid
                ]}
                value={formData.market_analysis.target_market}
                onChangeText={(text) => handleNestedChange('market_analysis', 'target_market', text)}
                placeholder="Décrivez votre marché cible"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('market_analysis.target_market')}
                onBlur={handleBlur}
              />
              {touchedFields.has('market_analysis.target_market') && !errors.market_analysis?.target_market && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.market_analysis?.target_market && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.market_analysis?.target_market && <Text style={styles.errorText}>{errors.market_analysis.target_market}</Text>}
          </View>

          {/* Concurrence */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Concurrence</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'market_analysis.competition' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Target 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.market_analysis.competition}
                onChangeText={(text) => handleNestedChange('market_analysis', 'competition', text)}
                placeholder="Analyse de la concurrence"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('market_analysis.competition')}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Taille du marché */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Taille du marché</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'market_analysis.market_size' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Target 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.market_analysis.market_size}
                onChangeText={(text) => handleNestedChange('market_analysis', 'market_size', text)}
                placeholder="Estimation de la taille du marché"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('market_analysis.market_size')}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Tendances */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Tendances</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'market_analysis.trends' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Target 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.market_analysis.trends}
                onChangeText={(text) => handleNestedChange('market_analysis', 'trends', text)}
                placeholder="Tendances du marché"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('market_analysis.trends')}
                onBlur={handleBlur}
              />
            </View>
          </View>
        </View>

        {/* Offre de produits/services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardList size={20} color="#EC4899" />
            <Text style={styles.sectionTitle}>Offre Commerciale</Text>
          </View>

          {/* Produits */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Produits</Text>
            {formData.offer.products.map((product, index) => (
              <View key={index} style={styles.arrayItem}>
                <View style={[
                  styles.inputContainer,
                  styles.arrayInputContainer
                ]}>
                  <ClipboardList 
                    size={20} 
                    color="#64748B"
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.arrayInput]}
                    value={product}
                    onChangeText={(text) => handleArrayChange('offer', 'products', index, text)}
                    placeholder="Produit ou service"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {formData.offer.products.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeArrayItem('offer', 'products', index)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              onPress={() => addArrayItem('offer', 'products')}
              style={styles.addButton}
            >
              <Plus size={16} color="#22C55E" />
              <Text style={styles.addButtonText}>Ajouter un produit</Text>
            </TouchableOpacity>
          </View>

          {/* Services */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Services</Text>
            {formData.offer.services.map((service, index) => (
              <View key={index} style={styles.arrayItem}>
                <View style={[
                  styles.inputContainer,
                  styles.arrayInputContainer
                ]}>
                  <ClipboardList 
                    size={20} 
                    color="#64748B"
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.arrayInput]}
                    value={service}
                    onChangeText={(text) => handleArrayChange('offer', 'services', index, text)}
                    placeholder="Service"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {formData.offer.services.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeArrayItem('offer', 'services', index)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              onPress={() => addArrayItem('offer', 'services')}
              style={styles.addButton}
            >
              <Plus size={16} color="#22C55E" />
              <Text style={styles.addButtonText}>Ajouter un service</Text>
            </TouchableOpacity>
          </View>

          {/* Valeur unique */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Valeur unique</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'offer.unique_value' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <ClipboardList 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.offer.unique_value}
                onChangeText={(text) => handleNestedChange('offer', 'unique_value', text)}
                placeholder="Quelle est votre proposition de valeur unique ?"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('offer.unique_value')}
                onBlur={handleBlur}
              />
            </View>
          </View>
        </View>

        {/* Modèle économique */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#22C55E" />
            <Text style={styles.sectionTitle}>Modèle Économique</Text>
          </View>

          {/* Sources de revenus */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Sources de revenus</Text>
            {formData.business_model.revenue_streams.map((item, index) => (
              <View key={index} style={styles.arrayItem}>
                <View style={[
                  styles.inputContainer,
                  styles.arrayInputContainer
                ]}>
                  <DollarSign 
                    size={20} 
                    color="#64748B"
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.arrayInput]}
                    value={item}
                    onChangeText={(text) => handleArrayChange('business_model', 'revenue_streams', index, text)}
                    placeholder="Source de revenus"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {formData.business_model.revenue_streams.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeArrayItem('business_model', 'revenue_streams', index)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              onPress={() => addArrayItem('business_model', 'revenue_streams')}
              style={styles.addButton}
            >
              <Plus size={16} color="#22C55E" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {/* Structure des coûts */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Structure des coûts</Text>
            {formData.business_model.cost_structure.map((item, index) => (
              <View key={index} style={styles.arrayItem}>
                <View style={[
                  styles.inputContainer,
                  styles.arrayInputContainer
                ]}>
                  <DollarSign 
                    size={20} 
                    color="#64748B"
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.arrayInput]}
                    value={item}
                    onChangeText={(text) => handleArrayChange('business_model', 'cost_structure', index, text)}
                    placeholder="Coût ou dépense"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {formData.business_model.cost_structure.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeArrayItem('business_model', 'cost_structure', index)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              onPress={() => addArrayItem('business_model', 'cost_structure')}
              style={styles.addButton}
            >
              <Plus size={16} color="#22C55E" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {/* Partenaires clés */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Partenaires clés</Text>
            {formData.business_model.key_partners.map((item, index) => (
              <View key={index} style={styles.arrayItem}>
                <View style={[
                  styles.inputContainer,
                  styles.arrayInputContainer
                ]}>
                  <DollarSign 
                    size={20} 
                    color="#64748B"
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.arrayInput]}
                    value={item}
                    onChangeText={(text) => handleArrayChange('business_model', 'key_partners', index, text)}
                    placeholder="Partenaire"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {formData.business_model.key_partners.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeArrayItem('business_model', 'key_partners', index)}
                    style={styles.removeButton}
                  >
                    <X size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity 
              onPress={() => addArrayItem('business_model', 'key_partners')}
              style={styles.addButton}
            >
              <Plus size={16} color="#22C55E" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Projections financières */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Projections Financières</Text>
          </View>

          {/* Revenus année 1 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Revenus année 1 (FCFA) *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'financial_projections.year_1_revenue' && styles.inputContainerFocused,
              errors.financial_projections?.year_1_revenue && styles.inputContainerError,
              touchedFields.has('financial_projections.year_1_revenue') && !errors.financial_projections?.year_1_revenue && styles.inputContainerValid
            ]}>
              <DollarSign 
                size={20} 
                color={errors.financial_projections?.year_1_revenue ? '#EF4444' : 
                       touchedFields.has('financial_projections.year_1_revenue') && !errors.financial_projections?.year_1_revenue ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.financial_projections?.year_1_revenue && styles.inputError,
                  touchedFields.has('financial_projections.year_1_revenue') && !errors.financial_projections?.year_1_revenue && styles.inputValid
                ]}
                value={formData.financial_projections.year_1_revenue.toString()}
                onChangeText={(text) => handleNestedChange('financial_projections', 'year_1_revenue', parseFloat(text) || 0)}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                onFocus={() => handleFocus('financial_projections.year_1_revenue')}
                onBlur={handleBlur}
              />
              {touchedFields.has('financial_projections.year_1_revenue') && !errors.financial_projections?.year_1_revenue && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.financial_projections?.year_1_revenue && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.financial_projections?.year_1_revenue && <Text style={styles.errorText}>{errors.financial_projections.year_1_revenue}</Text>}
          </View>

          {/* Dépenses année 1 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dépenses année 1 (FCFA) *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'financial_projections.year_1_expenses' && styles.inputContainerFocused,
              errors.financial_projections?.year_1_expenses && styles.inputContainerError,
              touchedFields.has('financial_projections.year_1_expenses') && !errors.financial_projections?.year_1_expenses && styles.inputContainerValid
            ]}>
              <DollarSign 
                size={20} 
                color={errors.financial_projections?.year_1_expenses ? '#EF4444' : 
                       touchedFields.has('financial_projections.year_1_expenses') && !errors.financial_projections?.year_1_expenses ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.financial_projections?.year_1_expenses && styles.inputError,
                  touchedFields.has('financial_projections.year_1_expenses') && !errors.financial_projections?.year_1_expenses && styles.inputValid
                ]}
                value={formData.financial_projections.year_1_expenses.toString()}
                onChangeText={(text) => handleNestedChange('financial_projections', 'year_1_expenses', parseFloat(text) || 0)}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                onFocus={() => handleFocus('financial_projections.year_1_expenses')}
                onBlur={handleBlur}
              />
              {touchedFields.has('financial_projections.year_1_expenses') && !errors.financial_projections?.year_1_expenses && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.financial_projections?.year_1_expenses && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.financial_projections?.year_1_expenses && <Text style={styles.errorText}>{errors.financial_projections.year_1_expenses}</Text>}
          </View>

          {/* Profit année 1 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Profit année 1 (FCFA)</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'financial_projections.year_1_profit' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <DollarSign 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                value={formData.financial_projections.year_1_profit.toString()}
                onChangeText={(text) => handleNestedChange('financial_projections', 'year_1_profit', parseFloat(text) || 0)}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                onFocus={() => handleFocus('financial_projections.year_1_profit')}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Mois de rentabilité */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mois de rentabilité *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'financial_projections.break_even_month' && styles.inputContainerFocused,
              errors.financial_projections?.break_even_month && styles.inputContainerError,
              touchedFields.has('financial_projections.break_even_month') && !errors.financial_projections?.break_even_month && styles.inputContainerValid
            ]}>
              <Calendar 
                size={20} 
                color={errors.financial_projections?.break_even_month ? '#EF4444' : 
                       touchedFields.has('financial_projections.break_even_month') && !errors.financial_projections?.break_even_month ? Colors.primary : '#64748B'} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.financial_projections?.break_even_month && styles.inputError,
                  touchedFields.has('financial_projections.break_even_month') && !errors.financial_projections?.break_even_month && styles.inputValid
                ]}
                value={formData.financial_projections.break_even_month.toString()}
                onChangeText={(text) => handleNestedChange('financial_projections', 'break_even_month', parseInt(text) || 0)}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                onFocus={() => handleFocus('financial_projections.break_even_month')}
                onBlur={handleBlur}
              />
              {touchedFields.has('financial_projections.break_even_month') && !errors.financial_projections?.break_even_month && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.financial_projections?.break_even_month && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.financial_projections?.break_even_month && <Text style={styles.errorText}>{errors.financial_projections.break_even_month}</Text>}
          </View>
        </View>

        {/* Plan de mise en œuvre */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Plan de Mise en Œuvre</Text>
          </View>

          {/* Phase 1 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phase 1</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'implementation_plan.phase_1' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Calendar 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.implementation_plan.phase_1}
                onChangeText={(text) => handleNestedChange('implementation_plan', 'phase_1', text)}
                placeholder="Description de la phase 1"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('implementation_plan.phase_1')}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Phase 2 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phase 2</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'implementation_plan.phase_2' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Calendar 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.implementation_plan.phase_2}
                onChangeText={(text) => handleNestedChange('implementation_plan', 'phase_2', text)}
                placeholder="Description de la phase 2"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('implementation_plan.phase_2')}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Phase 3 */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phase 3</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'implementation_plan.phase_3' && styles.inputContainerFocused,
              styles.inputContainer
            ]}>
              <Calendar 
                size={20} 
                color="#64748B"
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput
                ]}
                value={formData.implementation_plan.phase_3}
                onChangeText={(text) => handleNestedChange('implementation_plan', 'phase_3', text)}
                placeholder="Description de la phase 3"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('implementation_plan.phase_3')}
                onBlur={handleBlur}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer avec bouton de sauvegarde */}
      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButtonLarge, loading && styles.submitButtonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Créer le Plan d'Affaires</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal pour la sélection d'activité */}
      <ActivityModal />
      
      {/* Modal de confirmation */}
      <ConfirmModal />
    </KeyboardAvoidingView>
  );
}

// Les styles restent exactement les mêmes que dans votre code précédent
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 12,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputContainerValid: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 20,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    color: '#EF4444',
  },
  inputValid: {
    color: Colors.primary,
  },
  validationIcon: {
    marginRight: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  arrayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  arrayInputContainer: {
    flex: 1,
  },
  arrayInput: {
    marginRight: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#22C55E15',
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Styles dropdown
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  dropdownButtonError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  dropdownButtonValid: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  dropdownTextError: {
    color: '#EF4444',
  },
  dropdownTextValid: {
    color: Colors.primary,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  // Styles modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionSelected: {
    backgroundColor:  Colors.primary,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Styles pour le modal de confirmation
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center',
  },
  confirmModalHeader: {
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  confirmButtonSecondary: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButtonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonTextSecondary: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
});