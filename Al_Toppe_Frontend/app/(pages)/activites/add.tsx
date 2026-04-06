import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  MapPin, 
  FileText, 
  Target, 
  DollarSign, 
  Users, 
  BarChart3,
  ClipboardList,
  Lightbulb,
  Save,
  CheckCircle,
  XCircle,
  ChevronDown,
  Repeat
} from 'lucide-react-native';
import { router } from 'expo-router';
import { ActivityService, ActivityCreateData } from '@/services/activity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const sectors = [
  { value: 'commerce', label: 'Commerce' },
  { value: 'service', label: 'Service' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'agriculture', label: 'Agriculture' }
];

// Updated to match backend LEGAL_FORM_CHOICES
const legalForms = [
  { value: 'Informel', label: 'Informel' },
  { value: 'EI', label: 'Entreprise Individuelle' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SARL', label: 'SARL' },
  { value: 'SA', label: 'SA' },
  { value: 'GIE', label: 'GIE' },
  { value: 'Association', label: 'Association' }
];

// Updated to match backend TAX_REGIME_CHOICES
const taxRegimes = [
  { value: 'Non imposable', label: 'Non imposable' },
  { value: 'Régime simplifié', label: 'Régime simplifié' },
  { value: 'Régime réel', label: 'Régime réel' }
];

// Frequency options
const frequencies = [
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'yearly', label: 'Annuelle' }
];

export default function ActivityCreateScreen() {
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [dropdownModalVisible, setDropdownModalVisible] = useState(false);
  const [currentDropdown, setCurrentDropdown] = useState<'sector' | 'legal_form' | 'tax_regime' | 'frequency' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFrequencyDayInput, setShowFrequencyDayInput] = useState(false);

  const [formData, setFormData] = useState<ActivityCreateData>({
    title: '',
    sector: '',
    description: '',
    creation_date: '',
    legal_form: '',
    tax_regime: '',
    frequency: 'monthly',
    frequency_day: undefined
  });

  const [errors, setErrors] = useState<Partial<ActivityCreateData>>({});

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type,
      text1: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // Validation des champs
  const validateField = (field: keyof ActivityCreateData, value: any): string | null => {
    switch (field) {
      case 'title':
        if (!value || typeof value !== 'string' || !value.trim()) return 'Le titre est requis';
        if (value.length < 3) return 'Doit contenir au moins 3 caractères';
        break;
      
      case 'sector':
        if (!value) return 'Le secteur est requis';
        break;
      
      case 'creation_date':
        if (!value) return 'La date de création est requise';
        break;
      
      case 'legal_form':
        if (!value) return 'La forme juridique est requise';
        break;
        
      case 'frequency_day':
        if (formData.frequency === 'monthly' && (value === undefined || value === null || isNaN(Number(value)) || Number(value) < 1 || Number(value) > 31)) {
          return 'Le jour doit être entre 1 et 31';
        }
        break;
    }
    return null;
  };

  const handleInputChange = (field: keyof ActivityCreateData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'frequency_day' ? (value ? parseInt(value, 10) : undefined) : value
    }));

    // Marquer le champ comme touché
    setTouchedFields(prev => new Set([...prev, field]));

    // Valider en temps réel si le champ a été touché
    if (touchedFields.has(field)) {
      const error = validateField(field, field === 'frequency_day' ? (value ? parseInt(value, 10) : undefined) : value);
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }
    
    // Show frequency day input only for monthly frequency
    if (field === 'frequency') {
      setShowFrequencyDayInput(value === 'monthly');
      if (value !== 'monthly') {
        setFormData(prev => ({
          ...prev,
          frequency_day: undefined
        }));
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.frequency_day;
          return newErrors;
        });
      }
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
  const handleDropdownOpen = (type: 'sector' | 'legal_form' | 'tax_regime' | 'frequency') => {
    setCurrentDropdown(type);
    setDropdownModalVisible(true);
  };

  const handleDropdownSelect = (value: string) => {
    if (currentDropdown === 'sector') {
      handleInputChange('sector', value);
    } else if (currentDropdown === 'legal_form') {
      handleInputChange('legal_form', value);
    } else if (currentDropdown === 'tax_regime') {
      handleInputChange('tax_regime', value);
    } else if (currentDropdown === 'frequency') {
      handleInputChange('frequency', value);
    }
    setDropdownModalVisible(false);
    setCurrentDropdown(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ActivityCreateData> = {};
    
    // Valider tous les champs requis
    Object.keys(formData).forEach(field => {
      const key = field as keyof ActivityCreateData;
      // Skip validation for undefined values
      if (formData[key] !== undefined) {
        const error = validateField(key, formData[key]);
        if (error) {
          newErrors[key] = error;
        }
      }
    });

    setErrors(newErrors);
    setTouchedFields(new Set(Object.keys(formData))); // Marquer tous les champs comme touchés
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast('error', `Veuillez corriger les erreurs avant de soumettre`);
      return;
    }

    const entrepreneurId = await getEntrepreneurId();

    if (!entrepreneurId) {
      Alert.alert('Erreur', 'Impossible de déterminer l\'entrepreneur');
      return;
    }

    setLoading(true);
    try {
      await ActivityService.create(entrepreneurId, formData);
      showToast('success', `Votre activité a été créée avec succès.`);
      router.push('/(pages)/activites');

    } catch (error: any) {
      console.error('Activity creation error:', error);
      showToast('error', `Erreur de création: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // Composant de dropdown révisé
  const DropdownField = ({ 
    label, 
    value, 
    options, 
    placeholder,
    required = false,
    type
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    placeholder: string;
    required?: boolean;
    type: 'sector' | 'legal_form' | 'tax_regime' | 'frequency';
  }) => {
    const error = errors[label as keyof ActivityCreateData];
    const isTouched = touchedFields.has(label);
    const isValid = isTouched && !error;

    const displayLabel = label === 'sector' ? 'Secteur d\'activité' : 
                         label === 'legal_form' ? 'Forme juridique' : 
                         label === 'tax_regime' ? 'Régime fiscal' : 'Fréquence';

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {displayLabel} {required && '*'}
        </Text>
        
        <TouchableOpacity 
          onPress={() => handleDropdownOpen(type)} 
          style={[
            styles.dropdownButton,
            error ? styles.dropdownButtonError : {},
            isValid ? styles.dropdownButtonValid : {}
          ]}
        >
          {type === 'frequency' ? (
            <Repeat 
              size={20} 
              color={error ? '#EF4444' : (isValid ? Colors.primary : Colors.secondary)} 
              style={styles.inputIcon}  
            />
          ) : (
            <Building2 
              size={20} 
              color={error ? '#EF4444' : (isValid ? Colors.primary : Colors.secondary)} 
              style={styles.inputIcon}  
            />
          )}
          <Text style={[
            styles.dropdownText, 
            !value ? styles.placeholderText : {},
            error ? styles.dropdownTextError : {},
            isValid ? styles.dropdownTextValid : {}
          ]}>
            {value ? options.find(opt => opt.value === value)?.label : placeholder}
          </Text>
          <ChevronDown 
            size={20} 
            color={error ? '#EF4444' : (isValid ? Colors.primary : Colors.secondary)} 
          />
        </TouchableOpacity>
        
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  // Composant Modal pour les dropdowns
  const DropdownModal = () => {
    let options: { value: string; label: string }[] = [];
    let modalTitle = '';
    
    switch (currentDropdown) {
      case 'sector':
        options = sectors;
        modalTitle = 'Sélectionnez le secteur';
        break;
      case 'legal_form':
        options = legalForms;
        modalTitle = 'Sélectionnez la forme juridique';
        break;
      case 'tax_regime':
        options = taxRegimes;
        modalTitle = 'Sélectionnez le régime fiscal';
        break;
      case 'frequency':
        options = frequencies;
        modalTitle = 'Sélectionnez la fréquence';
        break;
      default:
        options = [];
        modalTitle = '';
    }

    const currentValue = currentDropdown === 'sector' ? formData.sector :
                        currentDropdown === 'legal_form' ? formData.legal_form :
                        currentDropdown === 'tax_regime' ? formData.tax_regime :
                        currentDropdown === 'frequency' ? formData.frequency : '';

    return (
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
                  <Text style={styles.modalTitle}>{modalTitle}</Text>
                  <TouchableOpacity 
                    onPress={() => setDropdownModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={true}
                >
                  {options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.modalOption,
                        currentValue === option.value ? styles.modalOptionSelected : {}
                      ]}
                      onPress={() => handleDropdownSelect(option.value)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        currentValue === option.value ? styles.modalOptionTextSelected : {}
                      ]}>
                        {option.label}
                      </Text>
                      {currentValue === option.value && (
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
  };

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
        <Text style={styles.title}>Nouvelle Activité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Informations Générales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Informations Générales</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Titre de l'activité *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'title' ? styles.inputContainerFocused : {},
              errors.title ? styles.inputContainerError : {},
              (touchedFields.has('title') && !errors.title) ? styles.inputContainerValid : {}
            ]}>
              <FileText 
                size={20} 
                color={errors.title ? '#EF4444' : 
                       (touchedFields.has('title') && !errors.title ? Colors.primary : Colors.secondary)} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  errors.title ? styles.inputError : {},
                  (touchedFields.has('title') && !errors.title) ? styles.inputValid : {}
                ]}
                value={formData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Ex: Boulangerie Moderne"
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

          <DropdownField
            label="sector"
            value={formData.sector}
            options={sectors}
            placeholder="Sélectionnez le secteur"
            required={true}
            type="sector"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'description' ? styles.inputContainerFocused : {},
              errors.description ? styles.inputContainerError : {},
              (touchedFields.has('description') && !errors.description) ? styles.inputContainerValid : {}
            ]}>
              <FileText 
                size={20} 
                color={errors.description ? '#EF4444' : 
                       (touchedFields.has('description') && !errors.description ? Colors.primary : Colors.secondary)} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  errors.description ? styles.inputError : {},
                  (touchedFields.has('description') && !errors.description) ? styles.inputValid : {}
                ]}
                value={formData.description || ''}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Décrivez votre activité..."
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={() => handleFocus('description')}
                onBlur={handleBlur}
              />
              {touchedFields.has('description') && !errors.description && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.description && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>
        </View>

        {/* Section Informations Légales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Informations Légales</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date de création *</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.inputContainer,
                focusedField === 'creation_date' ? styles.inputContainerFocused : {},
                errors.creation_date ? styles.inputContainerError : {},
                (touchedFields.has('creation_date') && !errors.creation_date) ? styles.inputContainerValid : {}
              ]}
            >
              <Calendar 
                size={20} 
                color={errors.creation_date ? '#EF4444' : 
                       (touchedFields.has('creation_date') && !errors.creation_date ? Colors.primary : Colors.secondary)} 
                style={styles.inputIcon} 
              />
              <Text style={[
                styles.input,
                errors.creation_date ? styles.inputError : {},
                (touchedFields.has('creation_date') && !errors.creation_date) ? styles.inputValid : {},
                !formData.creation_date ? styles.placeholderText : {}
              ]}>
                {formData.creation_date ? formatDateDisplay(formData.creation_date) : 'Sélectionnez une date'}
              </Text>
              {(touchedFields.has('creation_date') && !errors.creation_date) && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.creation_date && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </TouchableOpacity>
            {errors.creation_date && <Text style={styles.errorText}>{errors.creation_date}</Text>}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.creation_date ? new Date(formData.creation_date) : new Date()}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  const formattedDate = selectedDate.toISOString().split('T')[0];
                  handleInputChange('creation_date', formattedDate);
                  setTouchedFields(prev => new Set([...prev, 'creation_date']));
                }
              }}
            />
          )}

          <DropdownField
            label="legal_form"
            value={formData.legal_form || ''}
            options={legalForms}
            placeholder="Sélectionnez la forme juridique"
            required={true}
            type="legal_form"
          />

          <DropdownField
            label="tax_regime"
            value={formData.tax_regime || ''}
            options={taxRegimes}
            placeholder="Sélectionnez le régime fiscal"
            required={false}
            type="tax_regime"
          />
        </View>

        {/* Section Fréquence */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Repeat size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Fréquence d'Activité</Text>
          </View>

          <DropdownField
            label="frequency"
            value={formData.frequency || 'monthly'}
            options={frequencies}
            placeholder="Sélectionnez la fréquence"
            required={true}
            type="frequency"
          />

          {showFrequencyDayInput && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Jour du mois</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'frequency_day' ? styles.inputContainerFocused : {},
                errors.frequency_day ? styles.inputContainerError : {},
                (touchedFields.has('frequency_day') && !errors.frequency_day) ? styles.inputContainerValid : {}
              ]}>
                <Calendar 
                  size={20} 
                  color={errors.frequency_day ? '#EF4444' : 
                         (touchedFields.has('frequency_day') && !errors.frequency_day ? Colors.primary : Colors.secondary)} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={[
                    styles.input,
                    errors.frequency_day ? styles.inputError : {},
                    (touchedFields.has('frequency_day') && !errors.frequency_day) ? styles.inputValid : {}
                  ]}
                  value={formData.frequency_day?.toString() || ''}
                  onChangeText={(text) => handleInputChange('frequency_day', text)}
                  placeholder="Ex: 15"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  onFocus={() => handleFocus('frequency_day')}
                  onBlur={handleBlur}
                />
                {(touchedFields.has('frequency_day') && !errors.frequency_day) && (
                  <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
                )}
                {errors.frequency_day && (
                  <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
                )}
              </View>
              {errors.frequency_day && <Text style={styles.errorText}>{errors.frequency_day}</Text>}
              <Text style={styles.helperText}>
                Indiquez le jour du mois où cette activité se déroule (1-31)
              </Text>
            </View>
          )}
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity 
          style={[styles.submitButton, loading ? styles.submitButtonDisabled : {}]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Créer l'Activité</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          💡 Conseil : Une activité bien définie vous aidera à mieux organiser 
          vos finances et à suivre vos performances.
        </Text>
      </ScrollView>

      {/* Modal pour les dropdowns */}
      <DropdownModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    position: 'relative',
    zIndex: 1,
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
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
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
    minHeight: 80,
    paddingTop: 14,
    paddingBottom: 14,
  },
  inputError: {
    color: '#EF4444',
  },
  inputValid: {
    color: Colors.primary,
  },
  placeholderText: {
    color: '#94A3B8',
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
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
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
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1E293B',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Styles pour le modal des dropdowns
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
    color: Colors.secondary,
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
    backgroundColor: Colors.primary,
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
});