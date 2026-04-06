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
  Animated,
  Platform
} from 'react-native';
import {
  ArrowLeft,
  Edit3,
  Save,
  X,
  FileText,
  Target,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  Lightbulb,
  Building2,
  Download,
  Share2,
  CheckCircle,
  TrendingUp,
  Package,
  Zap,
  Clock,
  Send
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { BusinessPlanService } from '@/services/business_plan';
import Footer from '@/components/ui/Footer';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
// Utiliser l'API legacy pour éviter les warnings de dépréciation
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Config from '@/constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface QuestionAnswer {
  question?: string;
  answer?: any;
}

type MarketAnalysis = Record<string, string | QuestionAnswer>;
type Offer = Record<string, string | string[] | QuestionAnswer>;
type BusinessModel = Record<string, string | string[] | QuestionAnswer>;
type FinancialProjections = Record<string, number | QuestionAnswer>;
type ImplementationPlan = Record<string, string | QuestionAnswer>;

interface Comment {
  id: string;
  author: string;
  author_phone: string;
  content: string;
  section: string;
  created_at: string;
}

interface BusinessPlan {
  id: string;
  title: string;
  summary: string;
  market_analysis: MarketAnalysis;
  offer: Offer;
  business_model: BusinessModel;
  financial_projections: FinancialProjections;
  implementation_plan: ImplementationPlan;
  status: string;
  status_display: string;
  sector: string;
  sector_display: string;
  is_validated: boolean;
  comments: Comment[];
  pdf_file_url?: string;
  pdf_generated_at?: string;
  created_at: string;
  updated_at: string;
}

export default function BusinessPlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const [plan, setPlan] = useState<BusinessPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editablePlan, setEditablePlan] = useState<Partial<BusinessPlan> | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fadeAnim = new Animated.Value(0);

  // Fonction helper pour télécharger le PDF directement depuis une URL (Android/iOS)
  const handlePdfDownloadFromUrl = async (url: string, fileName: string, token: string | null) => {
    try {
      console.log('📥 Téléchargement PDF depuis URL:', url);
      
      // Vérifier que FileSystem est disponible
      if (!FileSystem) {
        throw new Error('expo-file-system n\'est pas disponible sur cette plateforme');
      }

      const fileSystemAny = FileSystem as any;
      
      // Essayer plusieurs méthodes pour obtenir un répertoire valide
      let targetDir: string | null = null;
      let fileUri: string;
      
      // Méthode 1: Essayer cacheDirectory
      try {
        targetDir = fileSystemAny.cacheDirectory;
        if (targetDir) {
          console.log('✅ cacheDirectory trouvé:', targetDir);
        }
      } catch (e) {
        console.warn('⚠️ cacheDirectory non accessible:', e);
      }
      
      // Méthode 2: Essayer documentDirectory si cacheDirectory échoue
      if (!targetDir) {
        try {
          targetDir = fileSystemAny.documentDirectory;
          if (targetDir) {
            console.log('✅ documentDirectory trouvé:', targetDir);
          }
        } catch (e) {
          console.warn('⚠️ documentDirectory non accessible:', e);
        }
      }
      
      // Méthode 3: Utiliser un nom de fichier temporaire sans répertoire spécifique
      // FileSystem.downloadAsync peut gérer cela automatiquement
      if (!targetDir) {
        console.warn('⚠️ Aucun répertoire disponible, utilisation du répertoire temporaire système');
        // Utiliser juste le nom de fichier, FileSystem trouvera un emplacement
        fileUri = fileName; // FileSystem trouvera automatiquement un emplacement
      } else {
        fileUri = `${targetDir}${fileName}`;
      }
      
      console.log('📁 Sauvegarde PDF dans:', fileUri);

      // Télécharger directement depuis l'URL avec les headers d'authentification
      // L'API legacy downloadAsync gère automatiquement les répertoires
      let downloadResult;
      try {
        downloadResult = await FileSystem.downloadAsync(
          url,
          fileUri,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': 'application/pdf',
            },
          }
        );
      } catch (downloadError: any) {
        // Si le téléchargement échoue avec le chemin spécifié, essayer avec un nom simple
        console.warn('⚠️ Téléchargement échoué avec chemin spécifié, tentative avec nom simple:', downloadError);
        
        // Utiliser un nom de fichier unique simple
        const tempFileName = `temp_${Date.now()}_${fileName}`;
        
        // Essayer avec cacheDirectory si disponible, sinon laisser FileSystem gérer
        const fallbackUri = targetDir ? `${targetDir}${tempFileName}` : tempFileName;
        
        downloadResult = await FileSystem.downloadAsync(
          url,
          fallbackUri,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': 'application/pdf',
            },
          }
        );
      }

      if (downloadResult.status !== 200) {
        throw new Error(`Erreur de téléchargement: ${downloadResult.status}`);
      }

      console.log('✅ PDF téléchargé avec succès:', downloadResult.uri);

      // Vérifier si le partage est disponible
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Partager le fichier (ouvre le menu de partage natif)
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le plan d\'affaires',
          UTI: 'com.adobe.pdf'
        });
        
        Alert.alert(
          '✅ Succès',
          'PDF téléchargé avec succès. Vous pouvez le partager ou l\'ouvrir.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Fallback si le partage n'est pas disponible
        Alert.alert(
          '✅ Succès',
          `PDF téléchargé avec succès.\n\nEmplacement: ${downloadResult.uri}`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Erreur handlePdfDownloadFromUrl:', error);
      console.error('❌ Détails:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        Platform: Platform.OS,
        FileSystemAvailable: !!FileSystem,
      });
      
      // Message d'erreur plus clair pour l'utilisateur
      const errorMessage = error?.message?.includes('cache') 
        ? 'Impossible d\'accéder au stockage. Vérifiez les permissions de l\'application.'
        : error?.message || 'Erreur lors du téléchargement du PDF';
      
      throw new Error(errorMessage);
    }
  };

  // Fonction helper pour télécharger le PDF depuis un blob (Web uniquement)
  const handlePdfDownload = async (blob: Blob, fileName: string) => {
    if (Platform.OS === 'web') {
      // Pour web, utiliser l'API browser
      if (typeof window !== 'undefined' && window.URL && document) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert('✅ Succès', 'PDF téléchargé avec succès');
      }
    } else {
      // Pour mobile (iOS/Android), utiliser expo-file-system et expo-sharing
      try {
        // Vérifier que FileSystem est disponible
        if (!FileSystem) {
          throw new Error('expo-file-system n\'est pas disponible sur cette plateforme');
        }

        // Méthode 1: Essayer documentDirectory d'abord, puis cacheDirectory en fallback
        let docDir: string | null = null;
        
        // Accès via type assertion (compatible TypeScript)
        const fileSystemAny = FileSystem as any;
        
        // Essayer documentDirectory d'abord
        docDir = fileSystemAny.documentDirectory || null;
        
        // Si documentDirectory n'est pas disponible, utiliser cacheDirectory
        if (!docDir) {
          console.warn('⚠️ documentDirectory non disponible, tentative cacheDirectory');
          docDir = fileSystemAny.cacheDirectory || null;
        }
        
        // Si aucun répertoire disponible, essayer une méthode alternative
        if (!docDir) {
          console.error('❌ Aucun répertoire disponible, tentative alternative...');
          
          // Alternative: Utiliser le blob directement avec expo-sharing via une URL temporaire
          // Créer un objet URL à partir du blob (si disponible)
          const blobUrl = URL.createObjectURL(blob);
          
          try {
            // Télécharger depuis l'URL blob avec FileSystem.downloadAsync
            const tempFileName = `temp_${Date.now()}_${fileName}`;
            const tempDir = Platform.OS === 'ios' 
              ? fileSystemAny.cacheDirectory 
              : fileSystemAny.documentDirectory || fileSystemAny.cacheDirectory;
            
            if (tempDir) {
              const fileUri = `${tempDir}${tempFileName}`;
              const downloadResult = await FileSystem.downloadAsync(blobUrl, fileUri);
              
              // Partager le fichier téléchargé
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(downloadResult.uri, {
                  mimeType: 'application/pdf',
                  dialogTitle: 'Partager le plan d\'affaires',
                  UTI: 'com.adobe.pdf'
                });
                Alert.alert('✅ Succès', 'PDF téléchargé avec succès. Vous pouvez le partager ou l\'ouvrir.');
                URL.revokeObjectURL(blobUrl);
                return;
              }
            }
          } catch (altError: any) {
            console.error('❌ Méthode alternative échouée:', altError?.message);
            URL.revokeObjectURL(blobUrl);
          }
          
          throw new Error('Impossible d\'accéder aux répertoires de fichiers. Vérifiez que expo-file-system est correctement configuré.');
        }

        // Créer le répertoire s'il n'existe pas
        try {
          const dirInfo = await FileSystem.getInfoAsync(docDir);
          if (!dirInfo.exists) {
            console.log('📁 Création du répertoire:', docDir);
            await FileSystem.makeDirectoryAsync(docDir, { intermediates: true });
          }
        } catch (dirError: any) {
          // Si getInfoAsync échoue, essayer quand même de créer le répertoire
          console.warn('⚠️ Impossible de vérifier le répertoire:', dirError?.message);
          try {
            await FileSystem.makeDirectoryAsync(docDir!, { intermediates: true });
          } catch (createError: any) {
            console.warn('⚠️ Impossible de créer le répertoire (peut déjà exister):', createError?.message);
          }
        }

        const fileUri = `${docDir}${fileName}`;
        console.log('📁 Sauvegarde PDF dans:', fileUri);

        // Convertir blob en base64 pour React Native
        // FileReader n'existe pas dans RN, on utilise une méthode alternative
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convertir Uint8Array en base64 (méthode compatible React Native)
        // btoa n'existe pas dans RN, on utilise une conversion manuelle
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let base64data = '';
        let i = 0;
        while (i < uint8Array.length) {
          const a = uint8Array[i++];
          const b = i < uint8Array.length ? uint8Array[i++] : 0;
          const c = i < uint8Array.length ? uint8Array[i++] : 0;
          
          const bitmap = (a << 16) | (b << 8) | c;
          base64data += chars.charAt((bitmap >> 18) & 63);
          base64data += chars.charAt((bitmap >> 12) & 63);
          base64data += i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : '=';
          base64data += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : '=';
        }

        // Écrire le fichier en base64
        const encodingType = fileSystemAny.EncodingType?.Base64 || 'base64';
        await FileSystem.writeAsStringAsync(fileUri, base64data, {
          encoding: encodingType,
        });

        // Vérifier si le partage est disponible
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          // Partager le fichier (ouvre le menu de partage natif)
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Partager le plan d\'affaires',
            UTI: 'com.adobe.pdf'
          });
          
          Alert.alert(
            '✅ Succès',
            'PDF téléchargé avec succès. Vous pouvez le partager ou l\'ouvrir.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          // Fallback si le partage n'est pas disponible
          Alert.alert(
            '✅ Succès',
            `PDF téléchargé avec succès.\n\nEmplacement: ${fileUri}`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      } catch (error: any) {
        console.error('❌ Erreur handlePdfDownload:', error);
        console.error('❌ Détails:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          Platform: Platform.OS,
        });
        throw new Error(`Erreur lors de la sauvegarde du PDF: ${error?.message || error}`);
      }
    }
  };

  useEffect(() => {
    fetchBusinessPlan();
  }, [id]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const fetchBusinessPlan = async () => {
    try {
      setLoading(true);
      const planId = Array.isArray(id) ? id[0] : id;
      const response = await BusinessPlanService.businessPlansDetails(planId) as any;
      setPlan(response);
      setEditablePlan(response);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le plan d\'affaires');
      console.error('Error fetching business plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const planId = Array.isArray(id) ? id[0] : id;
      const response = await BusinessPlanService.updateEntrepreneurPlans(planId, editablePlan as any || {}) as any;
      setPlan(response);
      setEditablePlan(response);
      setIsEditing(false);
      Alert.alert('✅ Succès', 'Plan d\'affaires mis à jour avec succès');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder les modifications');
      console.error('Error updating business plan:', error);
    }
  };

  const handleSubmit = async () => {
    // Confirmer la soumission

    
    Alert.alert(
      'Soumettre le plan d\'affaires',
      'Êtes-vous sûr de vouloir soumettre ce plan d\'affaires pour validation ? Une fois soumis, vous ne pourrez plus le modifier directement.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Soumettre',
          style: 'default',
          onPress: async () => {
            try {
              const planId = Array.isArray(id) ? id[0] : id;
              const response = await BusinessPlanService.updateEntrepreneurPlans(planId, {
                ...editablePlan,
                status: 'submitted'
              } as any) as any;
              setPlan(response);
              setEditablePlan(response);
              Alert.alert(
                '✅ Plan soumis',
                'Votre plan d\'affaires a été soumis avec succès. Il sera examiné par votre coach.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de soumettre le plan d\'affaires');
              console.error('Error submitting business plan:', error);
            }
          },
        },
      ]
    );
  };

  const handleExportPdf = async () => {
    if (downloadingPdf) return; // Éviter les doubles clics

    try {
      setDownloadingPdf(true);
      const planId = Array.isArray(id) ? id[0] : id;

      const token = await AsyncStorage.getItem('authToken');
      
      // Utiliser directement l'endpoint API au lieu de se fier à pdf_file_url
      // Cela évite les problèmes avec localhost sur mobile
      const pdfDownloadUrl = `${Config.API_BASE_URL}/business-plans/${planId}/pdf/`;
      
      // Vérifier si le PDF existe déjà dans le plan
      const hasPdf = plan?.pdf_file_url;
      
      // Si pas de PDF stocké, générer un nouveau PDF d'abord
      if (!hasPdf) {
        console.log('📝 PDF non trouvé, génération...');
        const generateUrl = `${Config.API_BASE_URL}/business-plans/${planId}/export/pdf/`;
        
        try {
          const generateResponse = await fetch(generateUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (!generateResponse.ok) {
            const errorData = await generateResponse.json().catch(() => ({}));
            throw new Error(errorData.error || errorData.message || 'Erreur lors de la génération du PDF');
          }
          
          // Si la réponse est un PDF, le télécharger directement
          const contentType = generateResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/pdf')) {
            // Sur mobile, utiliser downloadAsync directement depuis l'URL
            if (Platform.OS !== 'web') {
              await handlePdfDownloadFromUrl(generateUrl, `plan_affaires_${planId}.pdf`, token);
              return;
            } else {
              const blob = await generateResponse.blob();
              await handlePdfDownload(blob, `plan_affaires_${planId}.pdf`);
              return;
            }
          }
          
          // Sinon, attendre un peu et réessayer le téléchargement
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error('❌ Erreur lors de la génération:', error);
          // Continuer pour essayer de télécharger le PDF existant
        }
      }
      
      console.log('📄 Téléchargement PDF depuis:', pdfDownloadUrl);
      
      // Sur mobile, utiliser downloadAsync directement depuis l'URL (plus fiable)
      if (Platform.OS !== 'web') {
        await handlePdfDownloadFromUrl(pdfDownloadUrl, `plan_affaires_${planId}.pdf`, token);
        return;
      }
      
      // Sur web, utiliser la méthode blob classique
      const response = await fetch(pdfDownloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMessage = 'Erreur lors du téléchargement du PDF';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || `Erreur HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      // Vérifier que c'est bien un PDF
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/pdf')) {
        console.warn('⚠️ Content-Type inattendu:', contentType);
      }

      // Télécharger le PDF
      const blob = await response.blob();
      await handlePdfDownload(blob, `plan_affaires_${planId}.pdf`);
    } catch (error: any) {
      console.error('❌ Error exporting PDF:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      
      // Messages d'erreur plus clairs
      let errorMessage = 'Impossible de générer le PDF. Réessayez plus tard.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'TypeError' && error.message?.includes('Network request failed')) {
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet et que le serveur est accessible.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion et l\'URL du serveur.';
      } else if (error.message?.includes('NetworkError')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
      }
      
      Alert.alert(
        '❌ Erreur',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Réessayer',
            style: 'default',
            onPress: () => handleExportPdf(),
          },
        ]
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleChange = (section: string, field: string, value: any) => {
    setEditablePlan(prev => ({
      ...prev,
      [section]: {
        ...(prev?.[section as keyof typeof prev] as any || {}),
        [field]: value
      }
    }));
  };

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '0 FCFA';
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Fonction utilitaire pour extraire la valeur d'un champ (gère les objets question/answer)
  const extractValue = (value: any): any => {
    if (typeof value === 'object' && value !== null && 'answer' in value) {
      return value.answer;
    }
    return value;
  };

  // Fonction utilitaire pour extraire la question
  const extractQuestion = (key: string, value: any): string => {
    if (typeof value === 'object' && value !== null && 'question' in value) {
      return value.question;
    }
    // Traductions par défaut
    const translations: Record<string, string> = {
      'target_customers': 'Clients cibles',
      'market_size': 'Taille du marché',
      'competition': 'Concurrence',
      'positioning': 'Positionnement',
      'products_services': 'Produits/Services',
      'pricing_strategy': 'Stratégie de prix',
      'unique_value': 'Valeur unique',
      'distribution': 'Distribution',
      'revenue_sources': 'Sources de revenus',
      'cost_structure': 'Structure des coûts',
      'key_partners': 'Partenaires clés',
      'payment_methods': 'Méthodes de paiement',
      'startup_costs': 'Coûts de démarrage',
      'monthly_revenue': 'Revenus mensuels',
      'monthly_expenses': 'Dépenses mensuelles',
      'break_even': 'Point d\'équilibre',
      'break_even_month': 'Mois de rentabilité',
      'year_projection': 'Projection année 1',
      'year_1_revenue': 'Revenus année 1',
      'year_1_expenses': 'Dépenses année 1',
      'year_1_profit': 'Profit année 1',
      'milestones': 'Étapes clés',
      'resources_needed': 'Ressources nécessaires',
      'timeline': 'Calendrier',
      'risks': 'Risques'
    };
    return translations[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Statuts disponibles (correspondent à STATUS_CHOICES du backend)
  const STATUS_CHOICES = {
    'draft': { label: 'Brouillon', color: '#006666', icon: FileText },
    'submitted': { label: 'Soumis', color: '#006666', icon: CheckCircle },
    'under_review': { label: 'En cours de révision', color: '#006666', icon: Clock },
    'approved': { label: 'Approuvé', color: '#006666', icon: CheckCircle },
    'rejected': { label: 'Rejeté', color: '#006666', icon: X },
    'archived': { label: 'Archivé', color: '#006666', icon: FileText },
  };

  const getStatusColor = (status: string) => {
    const statusConfig = STATUS_CHOICES[status as keyof typeof STATUS_CHOICES];
    if (statusConfig) {
      return statusConfig.color;
    }
    // Fallback pour les anciens statuts
    switch (status) {
      case 'completed': return Colors.primary;
      case 'in_progress': return Colors.secondary;
      default: return Colors.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    const statusConfig = STATUS_CHOICES[status as keyof typeof STATUS_CHOICES];
    if (statusConfig) {
      const IconComponent = statusConfig.icon;
      return <IconComponent size={16} color="#FFFFFF" />;
    }
    // Fallback pour les anciens statuts
    switch (status) {
      case 'completed': return <CheckCircle size={16} color="#FFFFFF" />;
      case 'in_progress': return <Clock size={16} color="#FFFFFF" />;
      default: return <Zap size={16} color="#FFFFFF" />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primary]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!plan || !editablePlan) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrapper}>
          <X size={48} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Plan introuvable</Text>
        <Text style={styles.errorText}>Impossible de charger le plan d'affaires</Text>
        <TouchableOpacity style={styles.retryButtonWrapper} onPress={fetchBusinessPlan}>
          <LinearGradient
            colors={[Colors.primary, Colors.primary]}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculer les métriques financières avec extraction sécurisée
  const financials = plan.financial_projections || {};

  const getFinancialValue = (key: string): number => {
    const value = financials[key];
    const extracted = extractValue(value);
    return typeof extracted === 'number' ? extracted :
      typeof extracted === 'string' ? parseFloat(extracted) || 0 : 0;
  };

  const revenue = getFinancialValue('year_1_revenue') || getFinancialValue('year_projection') || getFinancialValue('monthly_revenue') * 12 || 0;
  const expenses = getFinancialValue('year_1_expenses') || getFinancialValue('monthly_expenses') * 12 || 0;
  const profit = getFinancialValue('year_1_profit') || (revenue - expenses);

  return (
    <View style={styles.container}>
      {/* Header avec Gradient */}
      <ScrollView  showsVerticalScrollIndicator={false}>

      <LinearGradient
        colors={[getStatusColor(plan.status), getStatusColor(plan.status)]}
        style={styles.header}
      >
        


          <View style={styles.headerContent}>
            <View style={styles.statusBadgeContainer}>
              {getStatusIcon(plan.status)}
              <Text style={styles.statusBadgeText}>{plan.status_display}</Text>
            </View>
            <Text style={styles.headerTitle}>{plan.title}</Text>
            <Text style={styles.headerSubtitle}>{plan.sector_display}</Text>
          </View>

          {/* Statistiques rapides */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <TrendingUp size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{formatCurrency(revenue)}</Text>
              <Text style={styles.quickStatLabel}>Revenus</Text>
            </View>
            <View style={styles.quickStatItem}>
              <DollarSign size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{formatCurrency(profit)}</Text>
              <Text style={styles.quickStatLabel}>Profit</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Calendar size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>
                {new Date(plan.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.quickStatLabel}>Créé le</Text>
            </View>
          </View>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {isEditing ? (
              <>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.headerIconButton}>
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.headerIconButton}>
                  <Save size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleExportPdf}
                  style={styles.headerIconButton}
                  disabled={downloadingPdf}
                >
                  {downloadingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Download size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
                {/* Bouton Soumettre - visible uniquement si le plan est en brouillon */}
                {plan.status === 'draft' && (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={styles.headerIconButton}
                  >
                    <Send size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {/* <TouchableOpacity style={styles.headerIconButton}>
                  <Share2 size={20} color="#FFFFFF" />
                </TouchableOpacity> */}
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerIconButton}>
                  <Edit3 size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <FileText size={18} color={activeTab === 'overview' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Aperçu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'market' && styles.activeTab]}
            onPress={() => setActiveTab('market')}
          >
            <BarChart3 size={18} color={activeTab === 'market' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'market' && styles.activeTabText]}>
              Marché
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'offer' && styles.activeTab]}
            onPress={() => setActiveTab('offer')}
          >
            <Package size={18} color={activeTab === 'offer' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'offer' && styles.activeTabText]}>
              Offre
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'business' && styles.activeTab]}
            onPress={() => setActiveTab('business')}
          >
            <Building2 size={18} color={activeTab === 'business' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'business' && styles.activeTabText]}>
              Modèle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'finance' && styles.activeTab]}
            onPress={() => setActiveTab('finance')}
          >
            <DollarSign size={18} color={activeTab === 'finance' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'finance' && styles.activeTabText]}>
              Finance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'plan' && styles.activeTab]}
            onPress={() => setActiveTab('plan')}
          >
            <Target size={18} color={activeTab === 'plan' ? Colors.primary : '#64748B'} />
            <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
              Plan
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Résumé */}
              <View style={styles.modernCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconWrapper}>
                    <FileText size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.cardTitle}>Résumé Exécutif</Text>
                </View>
                {isEditing ? (
                  <TextInput
                    style={styles.textArea}
                    value={editablePlan.summary}
                    onChangeText={(text) => setEditablePlan({ ...editablePlan, summary: text })}
                    multiline
                    numberOfLines={6}
                    placeholder="Décrivez votre plan d'affaires..."
                    placeholderTextColor="#94A3B8"
                  />
                ) : (
                  <Text style={styles.cardText}>{plan.summary || 'Aucun résumé disponible'}</Text>
                )}
              </View>

              {/* Métriques clés */}
              <View style={styles.metricsGrid}>
                <LinearGradient
                  colors={['#10B98120', '#10B98110']}
                  style={styles.metricCard}
                >
                  <TrendingUp size={24} color={Colors.primary} />
                  <Text style={styles.metricValue}>{formatCurrency(revenue)}</Text>
                  <Text style={styles.metricLabel}>Revenus An 1</Text>
                </LinearGradient>

                <LinearGradient
                  colors={['#F59E0B20', '#F59E0B10']}
                  style={styles.metricCard}
                >
                  <DollarSign size={24} color="#F59E0B" />
                  <Text style={styles.metricValue}>{formatCurrency(expenses)}</Text>
                  <Text style={styles.metricLabel}>Dépenses An 1</Text>
                </LinearGradient>

                <LinearGradient
                  colors={['#3B82F620', '#3B82F610']}
                  style={styles.metricCard}
                >
                  <Target size={24} color="#3B82F6" />
                  <Text style={styles.metricValue}>{formatCurrency(profit)}</Text>
                  <Text style={styles.metricLabel}>Profit An 1</Text>
                </LinearGradient>

                <LinearGradient
                  colors={['#EC489920', '#EC489910']}
                  style={styles.metricCard}
                >
                  <Calendar size={24} color="#EC4899" />
                  <Text style={styles.metricValue}>
                    {extractValue(financials.break_even) || extractValue(financials.break_even_month) || 'N/A'}
                  </Text>
                  <Text style={styles.metricLabel}>Mois rentabilité</Text>
                </LinearGradient>
              </View>
            </View>
          )}

          {activeTab === 'market' && (
            <View style={styles.tabContent}>
              <RenderSection
                icon={BarChart3}
                iconColor="#8B5CF6"
                title="Analyse du Marché"
                data={editablePlan.market_analysis || {}}
                isEditing={isEditing}
                onEdit={(key: string, value: any) => handleChange('market_analysis', key, value)}
              />
            </View>
          )}

          {activeTab === 'offer' && (
            <View style={styles.tabContent}>
              <RenderSection
                icon={Lightbulb}
                iconColor="#F59E0B"
                title="Offre Commerciale"
                data={editablePlan.offer || {}}
                isEditing={isEditing}
                onEdit={(key: string, value: any) => handleChange('offer', key, value)}
              />
            </View>
          )}

          {activeTab === 'business' && (
            <View style={styles.tabContent}>
              <RenderSection
                icon={Building2}
                iconColor="#06B6D4"
                title="Modèle Économique"
                data={editablePlan.business_model || {}}
                isEditing={isEditing}
                onEdit={(key: string, value: any) => handleChange('business_model', key, value)}
              />
            </View>
          )}

          {activeTab === 'finance' && (
            <View style={styles.tabContent}>
              <RenderFinanceSection
                data={editablePlan.financial_projections || {}}
                isEditing={isEditing}
                onEdit={(key: string, value: any) => handleChange('financial_projections', key, value)}
                formatCurrency={formatCurrency}
              />
            </View>
          )}

          {activeTab === 'plan' && (
            <View style={styles.tabContent}>
              <RenderSection
                icon={Target}
                iconColor="#EC4899"
                title="Plan de Mise en Œuvre"
                data={editablePlan.implementation_plan || {}}
                isEditing={isEditing}
                onEdit={(key: string, value: any) => handleChange('implementation_plan', key, value)}
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {isEditing && (
        <View style={styles.editFooter}>
          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtnWrapper}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary]}
              style={styles.saveBtn}
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Sauvegarder</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
        </ScrollView>

      <Footer showNavigation />
    </View>
  );
}

// Composant pour rendre une section
const RenderSection = ({ icon: Icon, iconColor, title, data, isEditing, onEdit }: any) => (
  <View style={styles.modernCard}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconWrapper, { backgroundColor: iconColor + '20' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>

    {Object.entries(data).map(([key, value]) => {
      // Extraire la valeur et la question de manière sécurisée
      const displayValue = typeof value === 'object' && value !== null && 'answer' in value
        ? (value as any).answer
        : value;
      const questionText = typeof value === 'object' && value !== null && 'question' in value
        ? (value as any).question
        : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Si c'est un tableau
      if (Array.isArray(displayValue)) {
        return (
          <View key={key} style={styles.dataField}>
            <Text style={styles.fieldLabel}>{String(questionText)}</Text>
            {displayValue.map((item, idx) => (
              <Text key={idx} style={styles.listItem}>• {String(item)}</Text>
            ))}
          </View>
        );
      }

      // Si c'est une valeur simple
      return (
        <View key={key} style={styles.dataField}>
          <Text style={styles.fieldLabel}>{String(questionText)}</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={String(displayValue || '')}
              onChangeText={(text) => onEdit(key, text)}
              placeholder="Entrez une valeur..."
              placeholderTextColor="#94A3B8"
              multiline
            />
          ) : (
            <Text style={styles.fieldValue}>
              {displayValue ? String(displayValue) : 'Non renseigné'}
            </Text>
          )}
        </View>
      );
    })}
  </View>
);

// Composant pour la section finance
const RenderFinanceSection = ({ data, isEditing, onEdit, formatCurrency }: any) => (
  <View style={styles.modernCard}>
    <View style={styles.cardHeader}>
      <View style={[styles.cardIconWrapper, { backgroundColor: '#10B98120' }]}>
        <DollarSign size={20} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>Projections Financières</Text>
    </View>

    {Object.entries(data).map(([key, value]) => {
      // Extraire la valeur et la question de manière sécurisée
      const displayValue = typeof value === 'object' && value !== null && 'answer' in value
        ? (value as any).answer
        : value;
      const questionText = typeof value === 'object' && value !== null && 'question' in value
        ? (value as any).question
        : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const numValue = typeof displayValue === 'number' ? displayValue :
        typeof displayValue === 'string' ? parseFloat(displayValue) || 0 : 0;

      return (
        <View key={key} style={styles.dataField}>
          <Text style={styles.fieldLabel}>{String(questionText)}</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={String(numValue)}
              onChangeText={(text) => onEdit(key, parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <Text style={[styles.fieldValue, styles.financialValue]}>
              {(key.includes('revenue') || key.includes('expenses') || key.includes('profit') ||
                key.includes('costs') || key.includes('projection')) && numValue > 0
                ? formatCurrency(numValue)
                : key.includes('break_even') || key.includes('month')
                  ? `${numValue} mois`
                  : displayValue ? String(displayValue) : 'Non renseigné'}
            </Text>
          )}
        </View>
      );
    })}
  </View>
);

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
    backgroundColor: '#F8FAFC',
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
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  quickStats: {
    paddingHorizontal: 20,
    gap: 12,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabs: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  activeTabText: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  modernCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  cardText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  dataField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  financialValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  listItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 22,
    paddingLeft: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  editFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  saveBtnWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});