import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import {
  ArrowLeft,
  Save,
  HelpCircle,
  ChevronDown,
  CheckCircle,
  XCircle,
  Lightbulb
} from 'lucide-react-native';
import { router } from 'expo-router';
import { BusinessPlanService, type GuidedTemplate, type GuidedQuestion } from '@/services/business_plan';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { Activity, ActivityService } from '@/services/activity';
import { useGlobalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

interface GuidedAnswers {
  [key: string]: any;
}

export default function GuidedBusinessPlanScreen() {
  const params = useGlobalSearchParams();
  const sector = params.sector as string;
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [template, setTemplate] = useState<GuidedTemplate | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [answers, setAnswers] = useState<GuidedAnswers>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [currentSelectQuestion, setCurrentSelectQuestion] = useState<GuidedQuestion | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sections = template ? [
    { key: 'market_analysis', label: 'Analyse de Marché' },
    { key: 'offer', label: 'Offre et Services' },
    { key: 'business_model', label: 'Modèle Économique' },
    { key: 'financial_projections', label: 'Projections Financières' },
    { key: 'implementation_plan', label: 'Plan de Mise en Œuvre' }
  ] : [];

  useEffect(() => {
    fetchTemplate();
    fetchActivities();
  }, [sector]);

  const fetchTemplate = async () => {
    try {
      setLoadingTemplate(true);
      if (!sector) {
        Alert.alert('Erreur', 'Secteur non spécifié');
        router.back();
        return;
      }
      const data = await BusinessPlanService.getGuidedQuestions(sector as string);
      setTemplate(data);
    } catch (error: any) {
      console.error('Error fetching template:', error);
      Alert.alert('Erreur', 'Impossible de charger le formulaire guidé');
      router.back();
    } finally {
      setLoadingTemplate(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) return;
      const data = await ActivityService.listByEntrepreneur(entrepreneurId) as { results: Activity[] };
      setActivities(data.results || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateSection = () => {
    const currentSectionKey = sections[currentSection]?.key;
    if (!template || !currentSectionKey) return false;

    const questions = template.sections[currentSectionKey as keyof typeof template.sections]?.questions || [];
    const newErrors: Record<string, string> = {};

    questions.forEach((q: GuidedQuestion) => {
      if (q.required && !answers[q.id]) {
        newErrors[q.id] = 'Ce champ est requis';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateSection()) {
      Toast.show({
        type: 'error',
        text1: 'Validation',
        text2: 'Veuillez compléter tous les champs requis',
        position: 'top',
      });
      return;
    }

    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = async () => {
    if (!planTitle.trim()) {
      Alert.alert('Erreur', 'Veuillez donner un titre à votre plan');
      return;
    }

    if (!selectedActivityId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une activité');
      return;
    }

    if (!validateSection()) {
      Toast.show({
        type: 'error',
        text1: 'Validation',
        text2: 'Veuillez compléter tous les champs requis',
        position: 'top',
      });
      return;
    }

    try {
      setLoading(true);
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) {
        throw new Error('ID entrepreneur non trouvé');
      }

      const result = await BusinessPlanService.generateFromGuided({
        sector: sector as string,
        title: planTitle,
        entrepreneur_id: entrepreneurId,
        activity_id: selectedActivityId,
        answers: answers
      });

      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Plan créé avec succès!',
        position: 'top',
      });
      console.log('result', result);  
      setTimeout(() => {
        router.replace('/(pages)/business_plans');
      }, 1500);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: error.message || 'Impossible de créer le plan',
        position: 'top',
      });
      console.error('Error creating guided plan:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer le plan');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: GuidedQuestion) => {
    const value = answers[question.id];
    const hasError = !!errors[question.id];

    switch (question.type) {
      case 'textarea':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              {question.label}
              {question.required && <Text style={styles.required}> *</Text>}
            </Text>
            {question.help && (
              <View style={styles.helpContainer}>
                <HelpCircle size={14} color={Colors.primary} />
                <Text style={styles.helpText}>{question.help}</Text>
              </View>
            )}
            <TextInput
              style={[styles.textArea, hasError && styles.inputError]}
              placeholder={`Répondez à : ${question.label}`}
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={value || ''}
              onChangeText={(text) => updateAnswer(question.id, text)}
            />
            {hasError && <Text style={styles.errorText}>{errors[question.id]}</Text>}
          </View>
        );

      case 'number':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              {question.label}
              {question.required && <Text style={styles.required}> *</Text>}
            </Text>
            {question.help && (
              <View style={styles.helpContainer}>
                <HelpCircle size={14} color={Colors.primary} />
                <Text style={styles.helpText}>{question.help}</Text>
              </View>
            )}
            <TextInput
              style={[styles.textInput, hasError && styles.inputError]}
              placeholder="Entrez un nombre"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={value ? String(value) : ''}
              onChangeText={(text) => updateAnswer(question.id, text ? parseFloat(text) : '')}
            />
            {hasError && <Text style={styles.errorText}>{errors[question.id]}</Text>}
          </View>
        );

      case 'select':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              {question.label}
              {question.required && <Text style={styles.required}> *</Text>}
            </Text>
            {question.help && (
              <View style={styles.helpContainer}>
                <HelpCircle size={14} color={Colors.primary} />
                <Text style={styles.helpText}>{question.help}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.selectButton, hasError && styles.inputError]}
              onPress={() => {
                setCurrentSelectQuestion(question);
                setShowSelectModal(true);
              }}
            >
              <Text style={[styles.selectText, !value && styles.placeholderText]}>
                {value || 'Sélectionner une option'}
              </Text>
              <ChevronDown size={20} color="#64748B" />
            </TouchableOpacity>
            {hasError && <Text style={styles.errorText}>{errors[question.id]}</Text>}
          </View>
        );

      case 'multiselect':
        return (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              {question.label}
              {question.required && <Text style={styles.required}> *</Text>}
            </Text>
            {question.help && (
              <View style={styles.helpContainer}>
                <HelpCircle size={14} color={Colors.primary} />
                <Text style={styles.helpText}>{question.help}</Text>
              </View>
            )}
            <View style={styles.optionsContainer}>
              {question.options!.map((opt) => {
                const isSelected = Array.isArray(value) && value.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                    onPress={() => {
                      const current = Array.isArray(value) ? value : [];
                      if (current.includes(opt)) {
                        updateAnswer(question.id, current.filter((v: string) => v !== opt));
                      } else {
                        updateAnswer(question.id, [...current, opt]);
                      }
                    }}
                  >
                    {isSelected && <CheckCircle size={16} color={Colors.primary} />}
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {hasError && <Text style={styles.errorText}>{errors[question.id]}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  if (loadingTemplate) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement du formulaire...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <XCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorTextFull}>Impossible de charger le formulaire guidé</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentQuestions = template.sections[sections[currentSection].key as keyof typeof template.sections]?.questions || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Formulaire Guidé</Text>
            <Text style={styles.headerSubtitle}>{template.name}</Text>
          </View>
          <View style={styles.iconWrapper}>
            <Lightbulb size={24} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>Titre du plan</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Ex: Mon Plan Commerce - Mars 2025"
            placeholderTextColor="#94A3B8"
            value={planTitle}
            onChangeText={setPlanTitle}
          />
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>Activité concernée</Text>
          <TouchableOpacity
            style={styles.activityButton}
            onPress={() => setShowActivityModal(true)}
          >
            <Text style={[styles.activityButtonText, !selectedActivityId && styles.placeholderText]}>
              {selectedActivityId
                ? activities.find(a => a.id === selectedActivityId)?.title
                : 'Sélectionner une activité'}
            </Text>
            <ChevronDown size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            Section {currentSection + 1} sur {sections.length}
          </Text>
          <Text style={styles.sectionTitle}>{sections[currentSection]?.label}</Text>
        </View>

        <View style={styles.questionsContainer}>
          {currentQuestions.map((question: GuidedQuestion) => renderQuestion(question))}
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, styles.backNavButton, currentSection === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentSection === 0 || loading}
          >
            <ArrowLeft size={20} color={currentSection === 0 ? "#94A3B8" : "#FFFFFF"} />
            <Text style={[styles.navButtonText, { color: currentSection === 0 ? "#94A3B8" : "#FFFFFF" }]}>
              Précédent
            </Text>
          </TouchableOpacity>

          {currentSection < sections.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextNavButton]}
              onPress={handleNext}
              disabled={loading}
            >
              <Text style={styles.navButtonText}>Suivant</Text>
              <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.submitNavButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.navButtonText}>Créer le plan</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Activity Modal */}
      <Modal visible={showActivityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une activité</Text>
              <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[styles.activityItem, selectedActivityId === activity.id && styles.activityItemSelected]}
                  onPress={() => {
                    setSelectedActivityId(activity.id);
                    setShowActivityModal(false);
                  }}
                >
                  <Text style={styles.activityItemText}>{activity.title}</Text>
                  {selectedActivityId === activity.id && (
                    <CheckCircle size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Select Options Modal */}
      <Modal visible={showSelectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentSelectQuestion?.label}
              </Text>
              <TouchableOpacity onPress={() => setShowSelectModal(false)}>
                <XCircle size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.optionsListContainer}>
              {currentSelectQuestion?.options?.map((option) => {
                const isSelected = answers[currentSelectQuestion.id] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.selectOptionItem,
                      isSelected && styles.selectOptionItemSelected
                    ]}
                    onPress={() => {
                      updateAnswer(currentSelectQuestion.id, option);
                      setShowSelectModal(false);
                      setCurrentSelectQuestion(null);
                    }}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      isSelected && styles.selectOptionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {isSelected && (
                      <CheckCircle size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  errorTextFull: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    flex: 1,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  questionsContainer: {
    gap: 20,
  },
  questionContainer: {
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: Colors.primary,
    flex: 1,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    flex: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  optionChipSelected: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  optionTextSelected: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 40,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  backNavButton: {
    backgroundColor: '#E2E8F0',
  },
  nextNavButton: {
    backgroundColor: Colors.primary,
  },
  submitNavButton: {
    backgroundColor: Colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    flex: 1,
    paddingRight: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  activityItemSelected: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activityItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  optionsListContainer: {
    maxHeight: 400,
  },
  selectOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectOptionItemSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: Colors.primary,
  },
  selectOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    flex: 1,
  },
  selectOptionTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
});