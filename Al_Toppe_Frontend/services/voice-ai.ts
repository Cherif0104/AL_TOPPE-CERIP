import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '@/constants/config';
import SyncService from '@/services/syncService';
import { Platform } from 'react-native';

// Import conditionnel de FileSystem (peut ne pas être disponible sur web)
// Utiliser l'API legacy pour compatibilité avec Expo 54+
let FileSystem: any;
// Détecter si on est sur web
const isWebPlatform = typeof window !== 'undefined';
if (!isWebPlatform) {
  try {
    // Importer depuis legacy pour éviter les avertissements de dépréciation
    FileSystem = require('expo-file-system/legacy');
  } catch (error) {
    try {
      // Fallback vers l'API standard si legacy n'est pas disponible
      FileSystem = require('expo-file-system');
    } catch (fallbackError) {
      console.warn('expo-file-system not available');
    }
  }
} else {
  console.warn('FileSystem not available on web platform');
}

const API_BASE_URL = Config.API_BASE_URL;

interface VoiceSession {
  id: string;
  session_type: string;
  status: string;
  started_at: string;
  ended_at?: string;
  session_duration?: number;
}

interface VoiceInput {
  id: string;
  input_type: 'audio' | 'text';
  original_text?: string;
  transcribed_text?: string;
  audio_file?: string;
  processing_status: string;
  confidence_score?: number;
  created_at: string;
}

interface VoiceInterpretation {
  id: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  extracted_data: Record<string, any>;
  action_required: string;
  processing_time_ms: number;
}

interface VoiceAction {
  id: string;
  action_type: string;
  status: string;
  result_data: Record<string, any>;
  execution_time_ms?: number;
}

interface VoiceResponse {
  id: string;
  response_type: string;
  text_response: string;
  audio_response?: string;
  language: string;
}

interface VoiceTemplate {
  id: string;
  template_type: string;
  name: string;
  wolof_text: string;
  french_text: string;
  variables: string[];
}

interface WolofDictionaryEntry {
  id: string;
  wolof_word: string;
  french_translation: string;
  english_translation: string;
  category: string;
  frequency: number;
}

interface VoiceDashboard {
  total_sessions: number;
  successful_sessions: number;
  success_rate: number;
  avg_confidence: number;
  sessions_by_type: Record<string, number>;
  most_used_intents: Record<string, number>;
  recent_sessions: VoiceSession[];
}

class VoiceAIService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request(endpoint: string, config: any = {}) {
    const url = `${API_BASE_URL}/ai${endpoint}`;
    const headers = await this.getAuthHeaders();

    const requestConfig: RequestInit = {
      method: config.method || 'GET',
      headers: { ...headers, ...config.headers },
    };

    if (config.body) {
      requestConfig.body = JSON.stringify(config.body);
    }

    if (config.formData) {
      // Pour les fichiers audio
      requestConfig.body = config.formData;
      // Supprimer Content-Type pour laisser le navigateur le définir automatiquement
      const updatedHeaders = { ...requestConfig.headers };
      delete (updatedHeaders as any)['Content-Type'];
      requestConfig.headers = updatedHeaders;
    }

    try {
      const response = await fetch(url, requestConfig);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice AI API Request failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // SESSIONS VOCALES
  // ============================================================================

  /**
   * Démarrer une nouvelle session vocale
   */
  async startVoiceSession(sessionData: {
    session_type: string;
    device_info?: Record<string, any>;
    location?: Record<string, any>;
  }): Promise<{ session_id: string; status: string; message: string }> {
    return this.request('/start-session/', {
      method: 'POST',
      body: sessionData
    });
  }

  /**
   * Analyser une entrée vocale SANS l'exécuter (pour confirmation)
   */
  async analyzeVoiceInput(sessionId: string, inputData: {
    input_type: 'audio' | 'text';
    text?: string;
    audio_file?: any;
    duration?: number;
  }): Promise<{
    success: boolean;
    transcribed_text: string;
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    voice_response: string;
    requires_confirmation: boolean;
    offline?: boolean;
    message?: string;
    transactions?: any[];
  }> {
    if (inputData.input_type === 'text' && inputData.text) {
      return this.analyzeWolofText(inputData.text);
    }
    
    // Vérifier la connectivité - seulement si on a un fichier audio
    // Si on est online, traiter directement sans mettre en queue
    if (inputData.audio_file) {
      const syncStatus = SyncService.getStatus();
      const isOnline = syncStatus.isOnline;
      
      // Si offline et audio, enregistrer en queue
      if (!isOnline) {
        const audioFile = inputData.audio_file as any;
        const audioUri = typeof audioFile === 'object' && 'uri' in audioFile 
        ? audioFile.uri 
        : typeof audioFile === 'string' 
        ? audioFile 
        : null;
        
        if (audioUri) {
          // Copier le fichier vers un emplacement permanent
          const filename = audioFile.name || `recording_${Date.now()}.m4a`;
          const type = audioFile.type || 'audio/m4a';
          
          try {
            // Détecter si on est sur web (Platform.OS peut être 'web' sur certaines versions)
            const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';
            if (!FileSystem || isWeb) {
              // Sur web, stocker l'URI directement dans AsyncStorage
              const audioData = {
                uri: audioUri,
                filename,
                type,
                duration: inputData.duration,
                timestamp: Date.now(),
              };
              const audioKey = `offline_audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await AsyncStorage.setItem(audioKey, JSON.stringify(audioData));
              
              // Ajouter à la queue avec la clé AsyncStorage
              await SyncService.addAudioAction(
                `${API_BASE_URL}/ai/voice/analyze/`,
                audioKey, // Utiliser la clé au lieu de l'URI
                {
                  filename,
                  type,
                  duration: inputData.duration,
                  storageKey: audioKey, // Indiquer que c'est une clé AsyncStorage
                  isWeb: true,
                }
              );
            } else if (FileSystem) {
              // Sur mobile, utiliser FileSystem (API legacy)
              // Créer un dossier pour les audios offline si nécessaire
              const offlineAudioDir = `${FileSystem.documentDirectory}offline_audio/`;
              const dirInfo = await FileSystem.getInfoAsync(offlineAudioDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(offlineAudioDir, { intermediates: true });
              }
              
              // Copier le fichier
              const permanentUri = `${offlineAudioDir}${filename}`;
              await FileSystem.copyAsync({
                from: audioUri,
                to: permanentUri,
              });
              
              // Ajouter à la queue
              await SyncService.addAudioAction(
                `${API_BASE_URL}/ai/voice/analyze/`,
                permanentUri,
                {
                  filename,
                  type,
                  duration: inputData.duration,
                }
              );
            } else {
              throw new Error('FileSystem not available');
            }
            
            // Retourner après avoir mis en queue offline
            return {
              success: true,
              transcribed_text: '',
              intent: 'unknown',
              confidence: 0,
              entities: {},
              voice_response: 'Audio enregistré. Il sera traité automatiquement lorsque la connexion sera rétablie.',
              requires_confirmation: false,
              offline: true,
              message: 'Audio enregistré pour traitement ultérieur',
            };
          } catch (error) {
            console.error('❌ Erreur sauvegarde audio offline:', error);
            throw new Error('Impossible d\'enregistrer l\'audio en mode offline');
          }
        }
      }
      // Si on est online, continuer avec le traitement direct ci-dessous
    }
    
    // audio: call /ai/voice/analyze/
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const form = new FormData();

    if (inputData.audio_file) {
      const f = inputData.audio_file as any;
      console.log('f', f);
      if (typeof f === 'string') {
        const resp = await fetch(f);
        const blob = await resp.blob();
        const file = new File([blob], 'recording.wav', { type: blob.type || 'audio/wav' });
        form.append('audio', file as any);
      } else if (f && typeof f === 'object' && 'uri' in f) {
        try {
          const resp = await fetch(f.uri);
          const blob = await resp.blob();
          const file = new File([blob], f.name || 'recording.wav', { type: f.type || blob.type || 'audio/wav' });
          form.append('audio', file as any);
        } catch {
          form.append('audio', f as any);
        }
      } else {
        form.append('audio', f as any);
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/ai/voice/analyze/`, { method: 'POST', headers, body: form as any });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (error) {
      // Si erreur réseau, essayer de sauvegarder en offline
      if (inputData.audio_file) {
        const audioFile = inputData.audio_file as any;
        const audioUri = typeof audioFile === 'object' && 'uri' in audioFile 
          ? audioFile.uri 
          : typeof audioFile === 'string' 
          ? audioFile 
          : null;
        
        if (audioUri) {
          const filename = audioFile.name || `recording_${Date.now()}.m4a`;
          const type = audioFile.type || 'audio/m4a';
          
          try {
            if (!FileSystem) {
              throw new Error('FileSystem not available');
            }
            
            const offlineAudioDir = `${FileSystem.documentDirectory}offline_audio/`;
            const dirInfo = await FileSystem.getInfoAsync(offlineAudioDir);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(offlineAudioDir, { intermediates: true });
            }
            
            const permanentUri = `${offlineAudioDir}${filename}`;
            await FileSystem.copyAsync({
              from: audioUri,
              to: permanentUri,
            });
            
            await SyncService.addAudioAction(
              `${API_BASE_URL}/ai/voice/analyze/`,
              permanentUri,
              {
                filename,
                type,
                duration: inputData.duration,
              }
            );
            
            return {
              success: true,
              transcribed_text: '',
              intent: 'unknown',
              confidence: 0,
              entities: {},
              voice_response: 'Connexion perdue. Audio enregistré pour traitement ultérieur.',
              requires_confirmation: false,
              offline: true,
              message: 'Audio enregistré pour traitement ultérieur',
            };
          } catch (saveError) {
            console.error('❌ Erreur sauvegarde audio après erreur réseau:', saveError);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Exécuter une action confirmée par l'utilisateur
   */
  async executeVoiceAction(intent: string, entities: Record<string, any>, transactions?: any[]): Promise<{
    success: boolean;
    intent: string;
    result: Record<string, any>;
    voice_response: string;
  }> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    // ✅ NOUVEAU : Passer transactions pour mixed_transactions
    const payload: any = { intent, entities };
    if (intent === 'mixed_transactions' && transactions && transactions.length > 0) {
      payload.transactions = transactions;
    }
    
    const res = await fetch(`${API_BASE_URL}/ai/voice/execute/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Traiter une entrée vocale (audio ou texte) - ANCIEN COMPORTEMENT
   */
  async processVoiceInput(sessionId: string, inputData: {
    input_type: 'audio' | 'text';
    text?: string;
    audio_file?: any; // File | { uri: string; name: string; type: string } | string
    duration?: number;
  }): Promise<{
    success: boolean;
    session_id: string;
    input_id: string;
    interpretation: {
      intent: string;
      confidence: number;
      entities: Record<string, any>;
    };
    action: {
      type: string;
      status: string;
      result: Record<string, any>;
    };
    response: {
      type: string;
      text: string;
      audio_url?: string;
    };
    processing_time_ms: number;
  }> {
    if (inputData.input_type === 'text' && inputData.text) {
      return this.processWolofText(inputData.text);
    }
    // audio: call /ai/voice/
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const form = new FormData();
    
    if (inputData.audio_file) {
      const f = inputData.audio_file as any;
      // Cases:
      // 1) Web: string URL (blob: or data:), fetch to Blob, wrap File
      // 2) Object { uri, name, type }
      // 3) Native File/Blob
      if (typeof f === 'string') {
        const resp = await fetch(f);
        const blob = await resp.blob();
        const file = new File([blob], 'recording.wav', { type: blob.type || 'audio/wav' });
        form.append('audio', file as any);
      } else if (f && typeof f === 'object' && 'uri' in f) {
        // React Native: pass object; on web we need a Blob
        try {
          const resp = await fetch(f.uri);
          const blob = await resp.blob();
          const file = new File([blob], f.name || 'recording.wav', { type: f.type || blob.type || 'audio/wav' });
          form.append('audio', file as any);
        } catch {
          // Fallback: append object directly for React Native native fetch
          form.append('audio', f as any);
        }
      } else {
        form.append('audio', f as any);
      }
    }

    const res = await fetch(`${API_BASE_URL}/ai/voice/`, { method: 'POST', headers, body: form as any });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  /**
   * Analyser du texte wolof SANS l'exécuter (pour confirmation)
   */
  async analyzeWolofText(text: string): Promise<{
    success: boolean;
    transcribed_text: string;
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    voice_response: string;
    requires_confirmation: boolean;
  }> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/ai/text/analyze/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async processWolofText(text: string): Promise<any> {
    const token = await AsyncStorage.getItem('authToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_BASE_URL}/ai/text/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  /**
   * Terminer une session vocale
   */
  async endVoiceSession(sessionId: string, duration?: number): Promise<{
    message: string;
    session_duration: number;
  }> {
    return this.request(`/end-session/${sessionId}/`, {
      method: 'POST',
      body: { duration }
    });
  }

  // ============================================================================
  // TEMPLATES ET DICTIONNAIRE
  // ============================================================================

  /**
   * Récupérer les templates vocaux
   */
  async getVoiceTemplates(templateType?: string): Promise<VoiceTemplate[]> {
    const endpoint = templateType ? `/get-templates/${templateType}/` : '/get-templates/';
    return this.request(endpoint);
  }

  /**
   * Rechercher dans le dictionnaire wolof
   */
  async searchWolofDictionary(query: string): Promise<WolofDictionaryEntry[]> {
    return this.request(`/dictionary/search/?q=${encodeURIComponent(query)}`);
  }

  // ============================================================================
  // TABLEAU DE BORD
  // ============================================================================

  /**
   * Récupérer le tableau de bord vocal
   */
  async getVoiceDashboard(): Promise<VoiceDashboard> {
    return this.request('/dashboard/');
  }

  // ============================================================================
  // GESTION DES SESSIONS
  // ============================================================================

  /**
   * Récupérer les sessions vocales de l'utilisateur
   */
  async getUserSessions(params?: {
    session_type?: string;
    status?: string;
    limit?: number;
  }): Promise<VoiceSession[]> {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return this.request(`/user-sessions/${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Récupérer une session spécifique
   */
  async getVoiceSession(sessionId: string): Promise<VoiceSession> {
    return this.request(`/sessions/${sessionId}/`);
  }

  // ============================================================================
  // GESTION DES ENTRÉES VOCALES
  // ============================================================================

  /**
   * Récupérer les entrées vocales d'une session
   */
  async getVoiceInputs(sessionId: string): Promise<VoiceInput[]> {
    return this.request(`/inputs/?session=${sessionId}`);
  }

  /**
   * Récupérer une entrée vocale spécifique
   */
  async getVoiceInput(inputId: string): Promise<VoiceInput> {
    return this.request(`/inputs/${inputId}/`);
  }

  // ============================================================================
  // GESTION DES INTERPRÉTATIONS
  // ============================================================================

  /**
   * Récupérer les interprétations d'une entrée vocale
   */
  async getVoiceInterpretations(inputId: string): Promise<VoiceInterpretation[]> {
    return this.request(`/interpretations/?voice_input=${inputId}`);
  }

  /**
   * Récupérer une interprétation spécifique
   */
  async getVoiceInterpretation(interpretationId: string): Promise<VoiceInterpretation> {
    return this.request(`/interpretations/${interpretationId}/`);
  }

  // ============================================================================
  // GESTION DES ACTIONS
  // ============================================================================

  /**
   * Récupérer les actions d'une interprétation
   */
  async getVoiceActions(interpretationId: string): Promise<VoiceAction[]> {
    return this.request(`/actions/?interpretation=${interpretationId}`);
  }

  /**
   * Récupérer une action spécifique
   */
  async getVoiceAction(actionId: string): Promise<VoiceAction> {
    return this.request(`/actions/${actionId}/`);
  }

  // ============================================================================
  // GESTION DES RÉPONSES
  // ============================================================================

  /**
   * Récupérer les réponses d'une action
   */
  async getVoiceResponses(actionId: string): Promise<VoiceResponse[]> {
    return this.request(`/responses/?voice_action=${actionId}`);
  }

  /**
   * Récupérer une réponse spécifique
   */
  async getVoiceResponse(responseId: string): Promise<VoiceResponse> {
    return this.request(`/responses/${responseId}/`);
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  /**
   * Vérifier si le service Voice AI est disponible
   */
  async checkVoiceAIService(): Promise<boolean> {
    try {
      await this.request('/dashboard/');
      return true;
    } catch (error) {
      console.error('Voice AI service not available:', error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation vocale
   */
  async getVoiceUsageStats(): Promise<{
    total_sessions: number;
    successful_sessions: number;
    success_rate: number;
    avg_confidence: number;
    most_used_intents: Record<string, number>;
  }> {
    const dashboard = await this.getVoiceDashboard();
    return {
      total_sessions: dashboard.total_sessions,
      successful_sessions: dashboard.successful_sessions,
      success_rate: dashboard.success_rate,
      avg_confidence: dashboard.avg_confidence,
      most_used_intents: dashboard.most_used_intents,
    };
  }

  /**
   * Traiter un texte wolof directement (sans session)
   */
 
}

export default new VoiceAIService();
