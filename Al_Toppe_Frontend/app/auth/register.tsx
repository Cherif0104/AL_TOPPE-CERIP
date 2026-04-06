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
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { router } from 'expo-router';
import { regions, citiesByRegion } from '@/constants/senegal';
import { EntrepreneurService, EntrepreneurSignupData } from '@/services/entrepreneur';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';
import ApiService from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');

export default function EntrepreneurSignupScreen() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [dropdownModalVisible, setDropdownModalVisible] = useState(false);
  const [currentDropdown, setCurrentDropdown] = useState<'region' | 'city' | null>(null);

  const [formData, setFormData] = useState<EntrepreneurSignupData>({
    first_name: '',
    last_name: '',
    civility: 'M',
    cni_number: '',
    address: '',
    whatsapp: '',
    birth_date: '2008-01-01',
    phone: '',
    email: '',
    password: '',
    password_confirm: '',
    primary_address: '',
    primary_region: '',
    primary_city: '',
    primary_lat: '',
    primary_lng: ''
  });

  const [errors, setErrors] = useState<Partial<EntrepreneurSignupData>>({});


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
  const validateField = (field: keyof EntrepreneurSignupData, value: string | undefined): string | null => {
    const fieldValue = value || '';

    switch (field) {
      case 'first_name':
        if (!fieldValue.trim()) return 'Le prénom est requis';
        if (fieldValue.length < 2) return 'Doit contenir au moins 2 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(fieldValue)) return 'Caractères alphabétiques seulement';
        break;

      case 'last_name':
        if (!fieldValue.trim()) return 'Le nom est requis';
        if (fieldValue.length < 2) return 'Doit contenir au moins 2 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(fieldValue)) return 'Caractères alphabétiques seulement';
        break;

      case 'phone':
        if (!fieldValue.trim()) return 'Le téléphone est requis';
        if (!/^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$/.test(fieldValue)) {
          return 'Format: 221 XX XXX XX XX (77,76,71,70,75,78)';
        }
        break;

      case 'whatsapp':
        if (fieldValue && !/^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$/.test(fieldValue)) {
          return 'Format: 221 XX XXX XX XX';
        }
        break;

      case 'email':
        if (!fieldValue.trim()) return 'L\'email est requis';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValue)) return 'Format email invalide';
        break;

      case 'password':
        if (!fieldValue) return 'Le mot de passe est requis';
        if (fieldValue.length < 6) return 'Minimum 6 caractères';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(fieldValue)) {
          return 'Doit contenir majuscule, minuscule et chiffre';
        }
        break;

      case 'password_confirm':
        if (!fieldValue) return 'Confirmation requise';
        if (fieldValue !== formData.password) return 'Les mots de passe ne correspondent pas';
        break;

      case 'cni_number':
        if (!fieldValue.trim()) return 'Le CNI est requis';
        if (!/^\d{13}$/.test(fieldValue)) return '13 chiffres requis';
        break;

      case 'birth_date':
        if (fieldValue) {
          // Accepter les formats DD/MM/YYYY et YYYY-MM-DD
          const isoFormat = /^\d{4}-\d{2}-\d{2}$/;
          const frenchFormat = /^\d{2}\/\d{2}\/\d{4}$/;

          if (!isoFormat.test(fieldValue) && !frenchFormat.test(fieldValue)) {
            return 'Format: JJ/MM/AAAA ou AAAA-MM-JJ';
          }

          // Convertir au format ISO pour la validation
          let isoDate = fieldValue;
          if (frenchFormat.test(fieldValue)) {
            const [day, month, year] = fieldValue.split('/');
            isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          const birthDate = new Date(isoDate);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();

          if (age < 18) return 'Doit avoir au moins 18 ans';
          if (age > 100) return 'Âge invalide';
        }
        break;

      case 'primary_region':
        if (!fieldValue) return 'La région est requise';
        break;

      case 'primary_city':
        if (!fieldValue) return 'La ville est requise';
        break;
    }
    return null;
  };

  const handleInputChange = (field: keyof EntrepreneurSignupData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Marquer le champ comme touché
    setTouchedFields(prev => new Set([...prev, field]));

    // Valider en temps réel si le champ a été touché
    if (touchedFields.has(field)) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field]: error || undefined
      }));
    }

    // Réinitialiser la ville si la région change
    if (field === 'primary_region' && value !== formData.primary_region) {
      setFormData(prev => ({
        ...prev,
        primary_city: ''
      }));
      setErrors(prev => ({
        ...prev,
        primary_city: 'Veuillez sélectionner une ville'
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

  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR'); // Format DD/MM/YYYY
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('birth_date', formatDate(selectedDate));
    }
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };


  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');

    if (cleaned.startsWith('221')) {
      const match = cleaned.match(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/);
      if (match) {
        return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
      }
    }

    // Si c'est un nouveau numéro, formater progressivement
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `221 ${cleaned.substring(3)}`;
    if (cleaned.length <= 8) return `221 ${cleaned.substring(3, 5)} ${cleaned.substring(5)}`;
    if (cleaned.length <= 10) return `221 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;

    return `221 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8, 10)} ${cleaned.substring(10, 12)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  const handleWhatsAppChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('whatsapp', formatted);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EntrepreneurSignupData> = {};

    // Valider tous les champs requis
    (Object.keys(formData) as Array<keyof EntrepreneurSignupData>).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouchedFields(new Set(Object.keys(formData))); // Marquer tous les champs comme touchés

    return Object.keys(newErrors).length === 0;
  };

  // Gestion des dropdowns avec Modal
  const handleDropdownOpen = (type: 'region' | 'city') => {
    if (type === 'city' && !formData.primary_region) {
      Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner une région');
      return;
    }


    setCurrentDropdown(type);
    setDropdownModalVisible(true);
    // Fermer les autres dropdowns classiques
    setShowRegionDropdown(false);
    setShowCityDropdown(false);
  };

  const handleDropdownSelect = (value: string) => {
    if (currentDropdown === 'region') {
      handleInputChange('primary_region', value);
    } else if (currentDropdown === 'city') {
      handleInputChange('primary_city', value);
    }
    setDropdownModalVisible(false);
    setCurrentDropdown(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {

      showToast('error', `Veuillez corriger les erreurs avant de soumettre`);

      Alert.alert('Formulaire incomplet', 'Veuillez corriger les erreurs avant de soumettre');
      return;
    }

    setLoading(true);
    try {
      // Convertir la date au format ISO (YYYY-MM-DD)
      const formatDateToISO = (dateStr: string): string => {
        if (!dateStr) return '';

        // Si c'est déjà au format ISO, le retourner tel quel
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }

        // Si c'est au format DD/MM/YYYY, le convertir
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Si c'est au format DD-MM-YYYY, le convertir
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [day, month, year] = dateStr.split('-');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        return dateStr; // Retourner tel quel si format non reconnu
      };

      // Préparer les données pour l'API
      const submitData: EntrepreneurSignupData = {
        ...formData,
        phone: formData.phone, // Garder le format avec espaces pour Django
        whatsapp: formData.whatsapp || formData.phone, // Garder le format avec espaces
        birth_date: formatDateToISO(formData.birth_date),
        primary_lat: formData.primary_lat || undefined,
        primary_lng: formData.primary_lng || undefined
      };

      await EntrepreneurService.registerEntrepreneur(submitData);
      showToast('success', `Votre compte entrepreneur a été créé avec succès. Vous pouvez maintenant vous connecter et commencer à utiliser nos services.`, );
      // login(submitData);
      // login automatiquement l'utilisateur après la création du compte
      const response = await ApiService.login(submitData.phone, submitData.password  );
      if (response && response.user && response.access) {
              await AsyncStorage.setItem('authToken', response.access);
              await AsyncStorage.setItem('refreshToken', response.refresh);
              await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));
              
              Toast.show({
                type: 'success',
                text1: 'Connexion réussie',
                text2: `Bienvenue ${response.user.name || 'Entrepreneur'}!`,
              });
              
              router.replace('/activites/add');
            }
      router.push('/auth/login');

    } catch (error: any) {
      console.error('Signup error:', error);

      showToast('error', `Erreur:${error.message} ` || 'Une erreur est survenue lors de la création de votre compte. Veuillez réessayer.');

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
    disabled = false,
    type
  }: {
    label: string;
    value: string;
    options: string[];
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
    type: 'region' | 'city';
  }) => {
    const error = errors[label as keyof EntrepreneurSignupData];
    const isTouched = touchedFields.has(label);
    const isValid = isTouched && !error;

    const displayLabel = label === 'primary_region' ? 'Région principale' : 'Ville principale';

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {displayLabel} {required && '*'}
        </Text>

        <TouchableOpacity
          onPress={() => handleDropdownOpen(type)}
          style={[
            styles.dropdownButton,
            disabled && styles.dropdownButtonDisabled,
            error && styles.dropdownButtonError,
            isValid && styles.dropdownButtonValid
          ]}
          disabled={disabled}
        >
          <MapPin
            size={20}
            color={error ? '#EF4444' : isValid ? Colors.primary : Colors.secondary}
            style={styles.inputIcon}
          />
          <Text style={[
            styles.dropdownText,
            !value && styles.placeholderText,
            error && styles.dropdownTextError,
            isValid && styles.dropdownTextValid
          ]}>
            {value || placeholder}
          </Text>
          <ChevronDown
            size={20}
            color={error ? '#EF4444' : isValid ? Colors.primary : Colors.secondary}
          />
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  // Composant Modal pour les dropdowns
  const DropdownModal = () => {
    const options = currentDropdown === 'region'
      ? regions
      : (formData.primary_region ? citiesByRegion[formData.primary_region] || [] : []);

    const modalTitle = currentDropdown === 'region'
      ? 'Sélectionnez votre région'
      : 'Sélectionnez votre ville';

    const currentValue = currentDropdown === 'region'
      ? formData.primary_region
      : formData.primary_city;

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
                        currentValue === option && styles.modalOptionSelected
                      ]}
                      onPress={() => handleDropdownSelect(option)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        currentValue === option && styles.modalOptionTextSelected
                      ]}>
                        {option}
                      </Text>
                      {currentValue === option && (
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
        <Text style={styles.title}>Devenir Entrepreneur</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Section Informations Personnelles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Informations Personnelles</Text>
          </View>


          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Prénom *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'first_name' && styles.inputContainerFocused,
              errors.first_name && styles.inputContainerError,
              touchedFields.has('first_name') && !errors.first_name && styles.inputContainerValid
            ]}>
              <User
                size={20}
                color={errors.first_name ? '#EF4444' :
                  touchedFields.has('first_name') && !errors.first_name ? Colors.primary :  Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.first_name && styles.inputError,
                  touchedFields.has('first_name') && !errors.first_name && styles.inputValid
                ]}
                value={formData.first_name}
                onChangeText={(text) => handleInputChange('first_name', text)}
                placeholder="Votre prénom"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoComplete="name-given"
                autoCorrect={false}
                onFocus={() => handleFocus('first_name')}
                onBlur={handleBlur}
              />
              {touchedFields.has('first_name') && !errors.first_name && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.first_name && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
          </View>

          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Nom *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'last_name' && styles.inputContainerFocused,
              errors.last_name && styles.inputContainerError,
              touchedFields.has('last_name') && !errors.last_name && styles.inputContainerValid
            ]}>
              <User
                size={20}
                color={errors.last_name ? '#EF4444' :
                  touchedFields.has('last_name') && !errors.last_name ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.last_name && styles.inputError,
                  touchedFields.has('last_name') && !errors.last_name && styles.inputValid
                ]}
                value={formData.last_name}
                onChangeText={(text) => handleInputChange('last_name', text)}
                placeholder="Votre nom"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                autoComplete="name-family"
                autoCorrect={false}
                onFocus={() => handleFocus('last_name')}
                onBlur={handleBlur}
              />
              {touchedFields.has('last_name') && !errors.last_name && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.last_name && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Civilité *</Text>
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, formData.civility === 'M' && styles.radioButtonSelected]}
                onPress={() => handleInputChange('civility', 'M')}
              >
                <Text style={[styles.radioText, formData.civility === 'M' && styles.radioTextSelected]}>
                  Monsieur
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, formData.civility === 'Mme' && styles.radioButtonSelected]}
                onPress={() => handleInputChange('civility', 'Mme')}
              >
                <Text style={[styles.radioText, formData.civility === 'Mme' && styles.radioTextSelected]}>
                  Madame
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Date de naissance</Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                focusedField === 'birth_date' && styles.inputContainerFocused,
                errors.birth_date && styles.inputContainerError,
                touchedFields.has('birth_date') && !errors.birth_date && styles.inputContainerValid
              ]}
              onPress={showDatePickerModal}
              activeOpacity={0.7}
            >
              <Calendar
                size={20}
                color={errors.birth_date ? '#EF4444' :
                  touchedFields.has('birth_date') && !errors.birth_date ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <Text style={[
                styles.input,
                errors.birth_date && styles.inputError,
                touchedFields.has('birth_date') && !errors.birth_date && styles.inputValid
              ]}>
                {formData.birth_date ? formatDisplayDate(formData.birth_date) : "JJ/MM/AAAA"}
              </Text>
              {touchedFields.has('birth_date') && !errors.birth_date && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.birth_date && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={formData.birth_date ? new Date(formData.birth_date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                locale="fr-FR"
              />
            )}

            {errors.birth_date && <Text style={styles.errorText}>{errors.birth_date}</Text>}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Numéro CNI *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'cni_number' && styles.inputContainerFocused,
              errors.cni_number && styles.inputContainerError,
              touchedFields.has('cni_number') && !errors.cni_number && styles.inputContainerValid
            ]}>
              <User
                size={20}
                color={errors.cni_number ? '#EF4444' :
                  touchedFields.has('cni_number') && !errors.cni_number ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.cni_number && styles.inputError,
                  touchedFields.has('cni_number') && !errors.cni_number && styles.inputValid
                ]}
                value={formData.cni_number}
                onChangeText={(text) => handleInputChange('cni_number', text)}
                placeholder="13 chiffres de votre CNI"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                autoComplete="off"
                autoCorrect={false}
                onFocus={() => handleFocus('cni_number')}
                onBlur={handleBlur}
              />
              {touchedFields.has('cni_number') && !errors.cni_number && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.cni_number && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.cni_number && <Text style={styles.errorText}>{errors.cni_number}</Text>}
          </View>
        </View>

        {/* Section Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Phone size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Coordonnées</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Téléphone *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'phone' && styles.inputContainerFocused,
              errors.phone && styles.inputContainerError,
              touchedFields.has('phone') && !errors.phone && styles.inputContainerValid
            ]}>
              <Phone
                size={20}
                color={errors.phone ? '#EF4444' :
                  touchedFields.has('phone') && !errors.phone ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.phone && styles.inputError,
                  touchedFields.has('phone') && !errors.phone && styles.inputValid
                ]}
                value={formData.phone}
                onChangeText={handlePhoneChange}
                placeholder="221 XX XXX XX XX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoComplete="off"
                autoCorrect={false}
                onFocus={() => handleFocus('phone')}
                onBlur={handleBlur}
              />
              {touchedFields.has('phone') && !errors.phone && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.phone && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WhatsApp</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'whatsapp' && styles.inputContainerFocused,
              errors.whatsapp && styles.inputContainerError,
              touchedFields.has('whatsapp') && !errors.whatsapp && styles.inputContainerValid
            ]}>
              <Phone
                size={20}
                color={errors.whatsapp ? '#EF4444' :
                  touchedFields.has('whatsapp') && !errors.whatsapp ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.whatsapp && styles.inputError,
                  touchedFields.has('whatsapp') && !errors.whatsapp && styles.inputValid
                ]}
                value={formData.whatsapp}
                onChangeText={handleWhatsAppChange}
                placeholder="221 XX XXX XX XX (optionnel)"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                autoComplete="off"
                autoCorrect={false}
                onFocus={() => handleFocus('whatsapp')}
                onBlur={handleBlur}
              />
              {touchedFields.has('whatsapp') && !errors.whatsapp && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.whatsapp && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.whatsapp && <Text style={styles.errorText}>{errors.whatsapp}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'email' && styles.inputContainerFocused,
              errors.email && styles.inputContainerError,
              touchedFields.has('email') && !errors.email && styles.inputContainerValid
            ]}>
              <Mail
                size={20}
                color={errors.email ? '#EF4444' :
                  touchedFields.has('email') && !errors.email ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.email && styles.inputError,
                  touchedFields.has('email') && !errors.email && styles.inputValid
                ]}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="votre@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
              />
              {touchedFields.has('email') && !errors.email && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.email && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Adresse</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'address' && styles.inputContainerFocused,
              errors.address && styles.inputContainerError,
              touchedFields.has('address') && !errors.address && styles.inputContainerValid
            ]}>
              <MapPin
                size={20}
                color={errors.address ? '#EF4444' :
                  touchedFields.has('address') && !errors.address ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  errors.address && styles.inputError,
                  touchedFields.has('address') && !errors.address && styles.inputValid
                ]}
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                placeholder="Votre adresse complète"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoComplete="off"
                autoCorrect={false}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
                onFocus={() => handleFocus('address')}
                onBlur={handleBlur}
              />
              {touchedFields.has('address') && !errors.address && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.address && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
        </View>

        {/* Section Mot de passe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={20} color="#EC4899" />
            <Text style={styles.sectionTitle}>Sécurité</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Mot de passe *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputContainerFocused,
              errors.password && styles.inputContainerError,
              touchedFields.has('password') && !errors.password && styles.inputContainerValid
            ]}>
              <Lock
                size={20}
                color={errors.password ? '#EF4444' :
                  touchedFields.has('password') && !errors.password ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.password && styles.inputError,
                  touchedFields.has('password') && !errors.password && styles.inputValid
                ]}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Minimum 6 caractères"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                autoComplete="password"
                autoCorrect={false}
                onFocus={() => handleFocus('password')}
                onBlur={handleBlur}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                {showPassword ?
                  <EyeOff size={20} color="#64748B" /> :
                  <Eye size={20} color="#64748B" />
                }
              </TouchableOpacity>
              {touchedFields.has('password') && !errors.password && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.password && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirmer le mot de passe *</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'password_confirm' && styles.inputContainerFocused,
              errors.password_confirm && styles.inputContainerError,
              touchedFields.has('password_confirm') && !errors.password_confirm && styles.inputContainerValid
            ]}>
              <Lock
                size={20}
                color={errors.password_confirm ? '#EF4444' :
                  touchedFields.has('password_confirm') && !errors.password_confirm ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  errors.password_confirm && styles.inputError,
                  touchedFields.has('password_confirm') && !errors.password_confirm && styles.inputValid
                ]}
                value={formData.password_confirm}
                onChangeText={(text) => handleInputChange('password_confirm', text)}
                placeholder="Retapez votre mot de passe"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                autoComplete="password"
                autoCorrect={false}
                onFocus={() => handleFocus('password_confirm')}
                onBlur={handleBlur}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                {showConfirmPassword ?
                  <EyeOff size={20} color="#64748B" /> :
                  <Eye size={20} color="#64748B" />
                }
              </TouchableOpacity>
              {touchedFields.has('password_confirm') && !errors.password_confirm && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.password_confirm && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.password_confirm && <Text style={styles.errorText}>{errors.password_confirm}</Text>}
          </View>
        </View>

        {/* Section Adresse */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#22C55E" />
            <Text style={styles.sectionTitle}>Localisation</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Adresse principale</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'primary_address' && styles.inputContainerFocused,
              errors.primary_address && styles.inputContainerError,
              touchedFields.has('primary_address') && !errors.primary_address && styles.inputContainerValid
            ]}>
              <MapPin
                size={20}
                color={errors.primary_address ? '#EF4444' :
                  touchedFields.has('primary_address') && !errors.primary_address ? Colors.primary : Colors.secondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  errors.primary_address && styles.inputError,
                  touchedFields.has('primary_address') && !errors.primary_address && styles.inputValid
                ]}
                value={formData.primary_address}
                onChangeText={(text) => handleInputChange('primary_address', text)}
                placeholder="Adresse pour vos activités"
                placeholderTextColor="#94A3B8"
                autoCapitalize="sentences"
                autoComplete="off"
                autoCorrect={false}
                multiline={true}
                numberOfLines={2}
                textAlignVertical="top"
                onFocus={() => handleFocus('primary_address')}
                onBlur={handleBlur}
              />
              {touchedFields.has('primary_address') && !errors.primary_address && (
                <CheckCircle size={20} color="#22C55E" style={styles.validationIcon} />
              )}
              {errors.primary_address && (
                <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
              )}
            </View>
            {errors.primary_address && <Text style={styles.errorText}>{errors.primary_address}</Text>}
          </View>

          <DropdownField
            label="primary_region"
            value={formData.primary_region}
            options={regions}
            placeholder="Sélectionnez votre région"
            required={true}
            disabled={false}
            type="region"
          />

          <DropdownField
            label="primary_city"
            value={formData.primary_city}
            options={formData.primary_region ? citiesByRegion[formData.primary_region] || [] : []}
            placeholder={formData.primary_region ? "Sélectionnez votre ville" : "Sélectionnez d'abord une région"}
            required={true}
            disabled={!formData.primary_region}
            type="city"
          />
        </View>

        {/* Bouton de soumission */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <User size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Devenir Entrepreneur</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          En créant un compte, vous acceptez nos {' '}
          <Text style={styles.linkText}>conditions d'utilisation</Text> et notre {' '}
          <Text style={styles.linkText}>politique de confidentialité</Text>.
        </Text>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.loginText}>
            Déjà entrepreneur ? <Text style={styles.loginLinkText}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  halfField: {
    flex: 1,
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
  validationIcon: {
    marginRight: 16,
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  radioButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
  },
  radioTextSelected: {
    color: '#FFFFFF',
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
  dropdownButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#F1F5F9',
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
  termsText: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loginText: {
    fontSize: 16,
    color: Colors.secondary,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: 'bold',
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