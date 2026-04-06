import React, { useState, useEffect } from 'react';
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
  Platform
} from 'react-native';
import { 
  ArrowLeft, 
  Edit3, 
  Save, 
  X, 
  Building2, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Target,
  ClipboardList,
  CheckCircle,
  XCircle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  
  Repeat1
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ActivityService, Activity, ActivityUpdateData } from '@/services/activity';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import Footer from '@/components/ui/Footer';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '@/components/ui/Header';

const sectors = [
  { value: 'commerce', label: 'Commerce' },
  { value: 'service', label: 'Service' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'agriculture', label: 'Agriculture' }
];

const legalForms = [
  { value: 'Informel', label: 'Informel' },
  { value: 'Auto-entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'SARL', label: 'SARL' },
  { value: 'SA', label: 'SA' },
  { value: 'GIE', label: 'GIE' }
];

const frequencies = [
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'yearly', label: 'Annuelle' }
];

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editableActivity, setEditableActivity] = useState<Partial<ActivityUpdateData> | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [showLegalFormDropdown, setShowLegalFormDropdown] = useState(false);
  const [errors, setErrors] = useState<Partial<ActivityUpdateData>>({});

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      const entrepreneurId = await getEntrepreneurId();
      setLoading(true);
      const activityId = Array.isArray(id) ? id[0] : id;
      const response = await ActivityService.getById(entrepreneurId, activityId as string);
      setActivity(response);
      setEditableActivity({
        title: response.title,
        sector: response.sector,
        description: response.description,
        legal_form: response.legal_form,
        tax_regime: response.tax_regime,
        creation_date: response.creation_date,
        status: response.status
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger l\'activité');
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const entrepreneurId = await getEntrepreneurId();
      const activityId = Array.isArray(id) ? id[0] : id;
      const response = await ActivityService.update(entrepreneurId, activityId as string, editableActivity || {});
      setActivity(response);
      setEditableActivity({
        title: response.title,
        sector: response.sector,
        description: response.description,
        legal_form: response.legal_form,
        tax_regime: response.tax_regime,
        creation_date: response.creation_date,
        status: response.status
      });
      setIsEditing(false);
      showToast('success', 'Activité mise à jour avec succès');
    } catch (error: any) {
      showToast('error', error.message || 'Impossible de sauvegarder');
      console.error('Error updating activity:', error);
    }
  };

  const handleCancel = () => {
    setEditableActivity({
      title: activity?.title,
      sector: activity?.sector,
      description: activity?.description,
      legal_form: activity?.legal_form,
      tax_regime: activity?.tax_regime,
      status: activity?.status
      
    });
    setIsEditing(false);
    setErrors({});
    setTouchedFields(new Set());
  };

  const handleInputChange = (field: keyof ActivityUpdateData, value: string) => {
    setEditableActivity(prev => ({
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

  const handleFocus = (field: string) => {
    setFocusedField(field);
    setTouchedFields(prev => new Set([...prev, field]));
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  const validateField = (field: keyof ActivityUpdateData, value: string): string | null => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Le titre est requis';
        if (value.length < 3) return 'Doit contenir au moins 3 caractères';
        break;
      case 'sector':
        if (!value) return 'Le secteur est requis';
        break;
      case 'legal_form':
        if (!value) return 'La forme juridique est requise';
        break;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const getSectorColor = (sector: string) => {
    const colors = {
      commerce: '#3B82F6',
      service: '#8B5CF6',
      artisanat: '#F59E0B',
      agriculture: '#10B981'
    };
    return colors[sector as keyof typeof colors] || '#6B7280';
  };

  const getSectorLabel = (sector: string) => {
    const sectorObj = sectors.find(s => s.value === sector);
    return sectorObj?.label || sector;
  };

  const getLegalFormLabel = (legalForm: string) => {
    const formObj = legalForms.find(f => f.value === legalForm);
    return formObj?.label || legalForm;
  };

  const getFrequencyLabel = (frequency: string) => {
    const freqObj = frequencies.find(f => f.value === frequency);
    return freqObj?.label || frequency;
  };

  const getFrequencyIcon = (frequency: string) => {
    return Repeat1;
  };

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type,
      text1: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const DropdownField = ({ 
    label, 
    value, 
    options, 
    onSelect,
    isOpen,
    onToggle,
    placeholder,
    required = false
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onSelect: (value: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    placeholder: string;
    required?: boolean;
  }) => {
    const error = errors[label as keyof ActivityUpdateData];
    const isTouched = touchedFields.has(label);
    const isValid = isTouched && !error;

    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          {label === 'sector' ? 'Secteur' : label === 'legal_form' ? 'Forme juridique' : 'Fréquence'} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity 
          onPress={onToggle} 
          style={[
            styles.dropdownButton,
            error && styles.dropdownButtonError,
            isValid && styles.dropdownButtonValid
          ]}
        >
          {label === 'frequency' ? (
            <Repeat1 
              size={20} 
              color={error ? '#EF4444' : (isValid ? Colors.primary : '#94A3B8')} 
              style={styles.inputIcon} 
            />
          ) : (
            <Building2 
              size={20} 
              color={error ? '#EF4444' : (isValid ? Colors.primary : '#94A3B8')} 
              style={styles.inputIcon} 
            />
          )}
          <Text style={[
            styles.dropdownText, 
            !value && styles.placeholderText,
            error && styles.dropdownTextError,
            isValid && styles.dropdownTextValid
          ]}>
            {value ? options.find(opt => opt.value === value)?.label : placeholder}
          </Text>
          <ChevronDown 
            size={20} 
            color={error ? '#EF4444' : (isValid ? Colors.primary : '#94A3B8')} 
          />
        </TouchableOpacity>
        
        {isOpen && (
          <View style={styles.dropdownList}>
            <ScrollView 
              style={styles.dropdownScroll} 
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    onToggle();
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    value === option.value && styles.dropdownItemTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <CheckCircle size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <XCircle size={48} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Activité introuvable</Text>
        <TouchableOpacity style={styles.retryButtonWrapper} onPress={fetchActivity}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
  <Header
        title="Activité"
        onNotificationPress={() => router.push('alerts' as never)}
        onProfilePress={() => router.push('profile' as never)}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >   
      
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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {activity.title}
            </Text>
            <View style={styles.headerBadge}>
              <View style={[styles.badgeDot, { backgroundColor: '#FFFFFF' }]} />
              <Text style={styles.headerBadgeText}>
                {getSectorLabel(activity.sector)}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={handleCancel} style={[styles.iconButton, styles.cancelIconButton]}>
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.iconButton, styles.saveIconButton]}>
                  <Save size={20} color="#10B981" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}>
                <Edit3 size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards in Header */}
        <View style={styles.headerStatsContainer}>
          <View style={styles.headerStatCard}>
            <Calendar size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerStatValue}>{activity.age_days || 0}j</Text>
          </View>
          {activity.total_revenue !== undefined && (
            <View style={styles.headerStatCard}>
              <DollarSign size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.headerStatValue}>
                {(activity.total_revenue / 1000).toFixed(0)}K
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Status Card with Gradient */}
        <LinearGradient
          colors={[getSectorColor(activity.sector) + '15', getSectorColor(activity.sector) + '05']}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconWrapper, { backgroundColor: getSectorColor(activity.sector) + '20' }]}>
              <Sparkles size={24} color={getSectorColor(activity.sector)} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Créée le</Text>
              <Text style={styles.statusValue}>{formatDate(activity.creation_date)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Informations générales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrapper}>
              <Building2 size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Informations Générales</Text>
          </View>
          
          {isEditing ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Titre de l'activité <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'title' && styles.inputContainerFocused,
                errors.title && styles.inputContainerError,
                touchedFields.has('title') && !errors.title && styles.inputContainerValid
              ]}>
                <Building2 
                  size={20} 
                  color={errors.title ? '#EF4444' : 
                         touchedFields.has('title') && !errors.title ? Colors.primary : '#94A3B8'} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  value={editableActivity?.title || ''}
                  onChangeText={(text) => handleInputChange('title', text)}
                  placeholder="Ex: Boulangerie Moderne"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  onFocus={() => handleFocus('title')}
                  onBlur={handleBlur}
                />
                {touchedFields.has('title') && !errors.title && (
                  <CheckCircle size={20} color={Colors.primary} style={styles.validationIcon} />
                )}
                {errors.title && (
                  <XCircle size={20} color="#EF4444" style={styles.validationIcon} />
                )}
              </View>
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Titre</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValue}>{activity.title}</Text>
              </View>
            </View>
          )}

          {isEditing ? (
            <DropdownField
              label="sector"
              value={editableActivity?.sector || ''}
              options={sectors}
              onSelect={(value) => handleInputChange('sector', value)}
              isOpen={showSectorDropdown}
              onToggle={() => {
                setShowSectorDropdown(!showSectorDropdown);
                setShowLegalFormDropdown(false);
              }}
              placeholder="Sélectionnez le secteur"
              required={true}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Secteur</Text>
              <View style={styles.fieldValueContainer}>
                <View style={[styles.sectorBadge, { backgroundColor: getSectorColor(activity.sector) + '20' }]}>
                  <Text style={[styles.sectorBadgeText, { color: getSectorColor(activity.sector) }]}>
                    {getSectorLabel(activity.sector)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {isEditing ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={[
                styles.inputContainer,
                styles.textAreaContainer,
                focusedField === 'description' && styles.inputContainerFocused
              ]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editableActivity?.description || ''}
                  onChangeText={(text) => handleInputChange('description', text)}
                  placeholder="Décrivez votre activité..."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  onFocus={() => handleFocus('description')}
                  onBlur={handleBlur}
                />
              </View>
            </View>
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValue}>
                  {activity.description || 'Aucune description'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Informations légales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, { backgroundColor: '#8B5CF615' }]}>
              <Target size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.sectionTitle}>Informations Légales</Text>
          </View>
          
          {isEditing ? (
            <DropdownField
              label="legal_form"
              value={editableActivity?.legal_form || ''}
              options={legalForms}
              onSelect={(value) => handleInputChange('legal_form', value)}
              isOpen={showLegalFormDropdown}
              onToggle={() => {
                setShowLegalFormDropdown(!showLegalFormDropdown);
                setShowSectorDropdown(false);
              }}
              placeholder="Sélectionnez la forme juridique"
              required={true}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Forme juridique</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValue}>
                  {getLegalFormLabel(activity.legal_form || '')}
                </Text>
              </View>
            </View>
          )}

          {isEditing ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Régime fiscal</Text>
              <View style={[
                styles.inputContainer,
                focusedField === 'tax_regime' && styles.inputContainerFocused
              ]}>
                <ClipboardList size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={editableActivity?.tax_regime || ''}
                  onChangeText={(text) => handleInputChange('tax_regime', text)}
                  placeholder="Ex: Régime simplifié"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => handleFocus('tax_regime')}
                  onBlur={handleBlur}
                />
              </View>
            </View>
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Régime fiscal</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValue}>
                  {activity.tax_regime || 'Non spécifié'}
                </Text>
              </View>
            </View>
          )}

          {/* Fréquence d'activité */}
          {isEditing ? (
            <DropdownField
              label="frequency"
              value={editableActivity?.frequency || 'monthly'}
              options={frequencies}
              onSelect={(value) => handleInputChange('frequency', value)}
              isOpen={showLegalFormDropdown} // Reuse the same dropdown state for simplicity
              onToggle={() => {
                setShowLegalFormDropdown(!showLegalFormDropdown);
                setShowSectorDropdown(false);
              }}
              placeholder="Sélectionnez la fréquence"
              required={true}
            />
          ) : (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Fréquence</Text>
              <View style={styles.fieldValueContainer}>
                <View style={[styles.sectorBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.sectorBadgeText, { color: '#F59E0B' }]}>
                    {getFrequencyLabel(activity.frequency || 'monthly')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Jour du mois pour les activités mensuelles */}
          {activity.frequency === 'monthly' && !isEditing && (
            <View style={styles.fieldReadOnly}>
              <Text style={styles.fieldLabel}>Jour du mois</Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.fieldValue}>
                  {activity.frequency_day ? `Le ${activity.frequency_day}` : 'Non spécifié'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Statistiques financières */}
        {(activity.total_revenue !== undefined || activity.total_expenses !== undefined) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: '#10B98115' }]}>
                <DollarSign size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionTitle}>Statistiques Financières</Text>
            </View>
            
            <View style={styles.financialGrid}>
              {activity.total_revenue !== undefined && (
                <View style={styles.financialCard}>
                  <View style={styles.financialIconWrapper}>
                    <TrendingUp size={20} color="#10B981" />
                  </View>
                  <Text style={styles.financialLabel}>Revenus</Text>
                  <Text style={styles.financialValue}>
                    {activity.total_revenue.toLocaleString()} F
                  </Text>
                </View>
              )}
              
              {activity.total_expenses !== undefined && (
                <View style={styles.financialCard}>
                  <View style={[styles.financialIconWrapper, { backgroundColor: '#EF444415' }]}>
                    <TrendingDown size={20} color="#EF4444" />
                  </View>
                  <Text style={styles.financialLabel}>Dépenses</Text>
                  <Text style={styles.financialValue}>
                    {activity.total_expenses.toLocaleString()} F
                  </Text>
                </View>
              )}
            </View>
            
            {activity.profit !== undefined && (
              <LinearGradient
                colors={activity.profit >= 0 ? ['#10B98115', '#10B98105'] : ['#EF444415', '#EF444405']}
                style={styles.profitCard}
              >
                <View style={styles.profitHeader}>
                  <Text style={styles.profitLabel}>Profit Net</Text>
                  {activity.profit >= 0 ? (
                    <TrendingUp size={20} color="#10B981" />
                  ) : (
                    <TrendingDown size={20} color="#EF4444" />
                  )}
                </View>
                <Text style={[
                  styles.profitValue,
                  { color: activity.profit >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {activity.profit.toLocaleString()} FCFA
                </Text>
              </LinearGradient>
            )}
          </View>
        )}

        {/* Localisation */}
        {activity.location && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: '#F59E0B15' }]}>
                <MapPin size={20} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Localisation</Text>
            </View>
            
            <View style={styles.locationCard}>
              <View style={styles.locationItem}>
                <MapPin size={16} color="#94A3B8" />
                <Text style={styles.locationText}>{activity.location.address}</Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locationCity}>{activity.location.city}</Text>
                <Text style={styles.locationDivider}>•</Text>
                <Text style={styles.locationRegion}>{activity.location.region}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {isEditing && (
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButtonWrapper} onPress={handleSave}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary]}
              style={styles.saveButton}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
      <Footer showNavigation />
    </KeyboardAvoidingView>
  );
}

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
  loadingGradient: {
    padding: 40,
    borderRadius: 24,
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
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelIconButton: {
    backgroundColor: '#FEF2F2',
  },
  saveIconButton: {
    backgroundColor: '#F0FDF4',
  },
  headerStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  headerStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  headerStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  field: {
    marginBottom: 20,
  },
  fieldReadOnly: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 10,
  },
  required: {
    color: '#EF4444',
  },
  fieldValueContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputContainerValid: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDF4',
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  validationIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
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
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
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
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 220,
    zIndex: 1000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  sectorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectorBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  financialGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  financialCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  financialIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  financialLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 6,
  },
  financialValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  profitCard: {
    borderRadius: 16,
    padding: 20,
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profitLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  profitValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  locationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationCity: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  locationDivider: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  locationRegion: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});