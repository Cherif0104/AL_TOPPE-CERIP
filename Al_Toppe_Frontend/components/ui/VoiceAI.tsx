import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { 
  Mic, 
  Brain, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Volume2, 
  AlertTriangle,
  Check,
  X,
  MicOff,
  Play
} from 'lucide-react-native';
import VoiceRecorder, { VoiceRecorderHandle } from './VoiceRecorder';
import VoiceAIService from '@/services/voice-ai';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { AppEvents } from '@/services/storage';
import Toast from 'react-native-toast-message';
import * as Speech from 'expo-speech';

interface VoiceAIProps {
  onTransactionCreated?: (transaction: any) => void;
  onBalanceUpdated?: (balance: number) => void;
}

interface VoiceResult {
  success: boolean;
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  response: string;
  transcribedText?: string;
  action?: {
    type: string;
    result: any;
  };
}

interface ConfirmationModalData {
  visible: boolean;
  intent: string;
  amount?: number;
  category?: string;
  item?: string;
  transcribedText: string;
  confidence: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VoiceAI({ onTransactionCreated, onBalanceUpdated }: VoiceAIProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalData>({
    visible: false,
    intent: '',
    transcribedText: '',
    confidence: 0,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const recorderRef = useRef<VoiceRecorderHandle>(null);
  const pendingActionRef = useRef<any>(null);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      setMicrophonePermission(true);
    } catch (error) {
      setMicrophonePermission(false);
      showToast('error', 'Permission microphone requise');
    }
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

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const numberToFrenchWords = (n: number): string => {
    const units = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf"];
    const tens = ["","dix","vingt","trente","quarante","cinquante","soixante","soixante-dix","quatre-vingt","quatre-vingt-dix"];
    
    if(n < 10) return units[n];
    if(n < 20){
      const teens = ["dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
      return teens[n-10];
    }
    if(n < 100){
      let unit = n % 10;
      let ten = Math.floor(n / 10);
      if(ten === 7 || ten === 9) {
        return tens[ten-1] + "-" + numberToFrenchWords(n % 10 + 10);
      }
      return tens[ten] + (unit > 0 ? "-" + units[unit] : "");
    }
    if(n < 1000){
      let remainder = n % 100;
      let hundreds = Math.floor(n/100);
      return (hundreds > 1 ? units[hundreds]+" " : "") + "cent" + (remainder > 0 ? " " + numberToFrenchWords(remainder) : "");
    }
    if(n < 1000000){
      let remainder = n % 1000;
      let thousands = Math.floor(n/1000);
      return (thousands > 1 ? numberToFrenchWords(thousands) + " " : "") + "mille" + (remainder > 0 ? " " + numberToFrenchWords(remainder) : "");
    }
    return n.toString();
  };

  // Démarrer une session vocale
  const startVoiceSession = async () => {
    setCurrentSession('inline');
    setRecordingError(null);
    showToast('info', 'Session vocale démarrée');
  };

  const handleRecordingStart = () => {
    setIsListening(true);
    setRecordingError(null);
    setProcessingStep('');
    showToast('info', 'Enregistrement en cours...');
  };

  const handleRecordingStop = () => {
    setIsListening(false);
      setIsProcessing(true);
      setProcessingStep('Traitement de l\'audio...');
  };

  const handleRecordingError = (error: string) => {
    setIsListening(false);
    setRecordingError(error);
    showToast('error', `Erreur d'enregistrement: ${error}`);
  };

  // Traiter l'enregistrement vocal
  const handleRecordingComplete = async (audioUri: string, duration: number) => {
    try {
      setProcessingStep('Envoi vers le serveur...');

      const filename = audioUri.split('/').pop() || 'recording.m4a';
      const ext = filename.split('.').pop()?.toLowerCase() || 'm4a';
      const mimeByExt: Record<string, string> = {
        wav: 'audio/wav',
        m4a: 'audio/m4a',
        mp4: 'audio/mp4',
        aac: 'audio/aac',
        mp3: 'audio/mpeg',
        caf: 'audio/x-caf',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
      };
      const type = mimeByExt[ext] || 'application/octet-stream';

      const result = await VoiceAIService.processVoiceInput('inline', {
        input_type: 'audio',
        audio_file: { uri: audioUri, name: filename, type } as any,
        duration,
      });

      setProcessingStep('Analyse terminée');

      if (result && result.success) {
        const intent = result.intent || 'unknown';
        const entities = result.entities || {};
        const transcribedText = result.transcribed_text || '';
        const confidence = result.confidence || 0;

        const voiceResult: VoiceResult = {
          success: true,
          intent,
          confidence,
          entities,
          response: result.voice_response || 'Traitement terminé',
          transcribedText,
          action: {
            type: intent === 'check_balance' ? 'query_database' : 
                  (intent === 'declare_income' || intent === 'declare_expense') ? 'create_transaction' : 'none',
            result: result.result,
          },
        };

        setLastResult(voiceResult);

        // Vérifier si c'est une transaction qui nécessite confirmation
        if (intent === 'declare_income' || intent === 'declare_expense') {
          pendingActionRef.current = { result, intent, entities };
          showConfirmationModal(intent, entities, transcribedText, confidence, result);
        } else {
          // Pour les autres actions (check_balance), exécuter directement
          await executeAction(result, intent);
        }

      } else {
        setLastResult({
          success: false,
          intent: 'unknown',
          confidence: 0,
          entities: {},
          response: result?.voice_response || 'Je n\'ai pas compris votre demande. Pouvez-vous répéter ?',
        });
        showToast('error', 'Commande non reconnue');
      }

    } catch (error) {
      console.error('Error processing voice input:', error);
      setLastResult({
        success: false,
        intent: 'error',
        confidence: 0,
        entities: {},
        response: 'Erreur lors du traitement. Veuillez réessayer.',
      });
      showToast('error', 'Erreur de traitement');
    } finally {
      setIsProcessing(false);
      setIsListening(false);
      setProcessingStep('');
    }
  };

  const showConfirmationModal = (intent: string, entities: any, transcribedText: string, confidence: number, result: any) => {
    const amount = entities.amount || result.result?.amount;
    const category = entities.category || 'divers';
    const item = entities.item;

    setConfirmationModal({
      visible: true,
      intent,
      amount,
      category,
      item,
      transcribedText,
      confidence,
      onConfirm: () => confirmAndExecuteAction(),
      onCancel: () => cancelAction(),
    });
  };

  const confirmAndExecuteAction = async () => {
    setConfirmationModal(prev => ({ ...prev, visible: false }));
    
    if (pendingActionRef.current) {
      const { result, intent } = pendingActionRef.current;
      await executeAction(result, intent);
      pendingActionRef.current = null;
    }
  };

  const cancelAction = () => {
    setConfirmationModal(prev => ({ ...prev, visible: false }));
    showToast('info', 'Action annulée');
    pendingActionRef.current = null;
  };

  const executeAction = async (result: any, intent: string) => {
    try {
      if (intent === 'declare_income' || intent === 'declare_expense') {
        await handleTransactionCreation(result.result);
        AppEvents.emit('finances:changed');
        showToast('success', `${intent === 'declare_income' ? 'Revenu' : 'Dépense'} enregistré(e)`);
      } else if (intent === 'check_balance') {
        await handleBalanceQuery(result.result);
        showToast('info', 'Solde mis à jour');
      }

      // Lecture vocale de la réponse
      const voiceResponse = result.voice_response || '';
      const amount = result.result?.amount || result.result?.balance;
      
      if (amount && voiceResponse) {
        const amountInWords = numberToFrenchWords(amount);
        const message = voiceResponse.replace(/\d+(\.\d+)?/, amountInWords);
        
        Speech.getAvailableVoicesAsync().then(voices => {
          const frenchVoice = voices.find(voice => voice.language.startsWith('fr'));
          Speech.speak(message, {
            voice: frenchVoice?.identifier,
            rate: 1.0,
            pitch: 1.0,
            language: 'fr-FR',
          });
        });
      }

    } catch (error) {
      console.error('Error executing action:', error);
      showToast('error', 'Erreur lors de l\'exécution');
    }
  };

  // Traiter la création de transaction
  const handleTransactionCreation = async (transactionData: any) => {
    try {
      const entrepreneurId = await getEntrepreneurId();
      if (!entrepreneurId) {
        Alert.alert('Erreur', 'ID entrepreneur non trouvé');
        return;
      }
      
      onTransactionCreated?.(transactionData);
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Erreur', 'Impossible de créer la transaction');
    }
  };

  // Traiter la requête de solde
  const handleBalanceQuery = async (balanceData: any) => {
    try {
      const balance = balanceData.balance || 0;
      onBalanceUpdated?.(balance);
    } catch (error) {
      console.error('Error querying balance:', error);
    }
  };

  // Traiter du texte wolof directement
  const handleTextInput = async (text: string) => {
    try {
      setIsProcessing(true);
      setProcessingStep('Analyse du texte...');

      const result = await VoiceAIService.processWolofText(text);

      const intent = result.intent || 'unknown';
      setLastResult({
        success: !!result.success,
        intent,
        confidence: 0,
        entities: result.entities || {},
        response: result.voice_response || `Intention détectée: ${intent}`,
        transcribedText: text,
        action: {
          type: intent === 'check_balance' ? 'query_database' : (intent === 'declare_income' || intent === 'declare_expense') ? 'create_transaction' : 'none',
          result: result.result,
        },
      });

      if (intent === 'declare_income' || intent === 'declare_expense') {
        pendingActionRef.current = { result, intent, entities: result.entities || {} };
        showConfirmationModal(intent, result.entities || {}, text, 0, result);
      } else {
        await executeAction(result, intent);
      }

      setProcessingStep('Analyse terminée');

    } catch (error) {
      console.error('Error processing text:', error);
      setLastResult({
        success: false,
        intent: 'error',
        confidence: 0,
        entities: {},
        response: 'Erreur lors de l\'analyse du texte',
      });
      showToast('error', 'Erreur d\'analyse du texte');
    } finally {
      setIsProcessing(false);
    }
  };

  // Terminer la session
  const endVoiceSession = async () => {
      setCurrentSession(null);
      setIsListening(false);
    showToast('info', 'Session terminée');
  };

  // Réinitialiser
  const reset = () => {
    setLastResult(null);
    setProcessingStep('');
    setRecordingError(null);
    if (currentSession) {
      endVoiceSession();
    }
    showToast('info', 'Interface réinitialisée');
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'declare_income':
        return '#22C55E';
      case 'declare_expense':
        return '#EF4444';
      case 'check_balance':
        return '#3B82F6';
      case 'error':
        return '#DC2626';
      default:
        return '#64748B';
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'declare_income':
        return 'Ajout Revenu (vocal)';
      case 'declare_expense':
        return 'Ajout Dépense (vocal)';
      case 'check_balance':
        return 'Vérification Solde';
      case 'error':
        return 'Erreur';
      default:
        return 'Intention Inconnue';
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'declare_income':
        return '📈';
      case 'declare_expense':
        return '📉';
      case 'check_balance':
        return '💰';
      default:
        return '🤖';
    }
  };

  const renderConfirmationModal = () => (
    <Modal
      visible={confirmationModal.visible}
      transparent
      animationType="slide"
      onRequestClose={cancelAction}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirmer l'action</Text>
            <Text style={styles.modalSubtitle}>
              Vérifiez que les informations sont correctes
            </Text>
          </View>

          <View style={styles.confirmationDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Action:</Text>
              <Text style={styles.detailValue}>
                {getIntentIcon(confirmationModal.intent)} {
                  confirmationModal.intent === 'declare_income' ? 'Ajouter un revenu' :
                  confirmationModal.intent === 'declare_expense' ? 'Ajouter une dépense' :
                  'Action inconnue'
                }
              </Text>
            </View>

            {confirmationModal.amount && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Montant:</Text>
                <Text style={[styles.detailValue, styles.amountText]}>
                  {formatAmount(confirmationModal.amount)}
                </Text>
              </View>
            )}

            {confirmationModal.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Catégorie:</Text>
                <Text style={styles.detailValue}>{confirmationModal.category}</Text>
              </View>
            )}

            {confirmationModal.item && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Article:</Text>
                <Text style={styles.detailValue}>{confirmationModal.item}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vous avez dit:</Text>
              <Text style={styles.wolofQuote}>"{confirmationModal.transcribedText}"</Text>
            </View>

            {confirmationModal.confidence > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confiance:</Text>
                <Text style={[styles.detailValue, { color: confirmationModal.confidence > 70 ? '#22C55E' : '#F59E0B' }]}>
                  {confirmationModal.confidence.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={cancelAction}
            >
              <X size={16} color="#64748B" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={confirmAndExecuteAction}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Brain size={24} color="#22C55E" />
          <Text style={styles.headerTitle}>Assistant Vocal Wolof</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Parlez en wolof pour gérer vos finances
        </Text>
      </View>

      {/* État de traitement */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.processingText}>{processingStep}</Text>
        </View>
      )}

      {/* Erreur d'enregistrement */}
      {recordingError && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={20} color="#EF4444" />
          <Text style={styles.errorText}>{recordingError}</Text>
        </View>
      )}

      {/* Enregistreur vocal */}
      {!isProcessing && (
        <View style={styles.recorderContainer}>
          <VoiceRecorder
            ref={recorderRef}
            onRecordingComplete={handleRecordingComplete}
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onRecordingError={handleRecordingError}
            maxDuration={30}
            disabled={!currentSession}
          />
        </View>
      )}

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        {!currentSession ? (
          <TouchableOpacity
            style={[styles.startButton, microphonePermission === false && styles.disabledButton]}
            onPress={startVoiceSession}
            disabled={isProcessing || microphonePermission === false}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Démarrer Session</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.endButton,
              isListening && styles.listeningButton
            ]}
            onPress={() => {
              if (isListening) {
                recorderRef.current?.stop?.();
              } else {
                endVoiceSession();
              }
            }}
            disabled={isProcessing}
          >
            {isListening ? (
              <>
                <MicOff size={20} color="#FFFFFF" />
                <Text style={styles.endButtonText}>Arrêter</Text>
              </>
            ) : (
              <>
            <XCircle size={20} color="#FFFFFF" />
            <Text style={styles.endButtonText}>Terminer Session</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {lastResult && (
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <RotateCcw size={20} color="#64748B" />
            <Text style={styles.resetButtonText}>Nouveau</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Résultat de l'interprétation */}
      {lastResult && (
        <View style={[
          styles.resultContainer,
          !lastResult.success && styles.errorResultContainer
        ]}>
          <View style={styles.resultHeader}>
            <View style={[
              styles.intentBadge,
              { backgroundColor: lastResult.success ? '#F0FDF4' : '#FEF2F2' }
            ]}>
              <Text style={[styles.intentText, { color: getIntentColor(lastResult.intent) }]}>
                {getIntentLabel(lastResult.intent)}
              </Text>
            </View>
            {lastResult.confidence > 0 && (
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confiance:</Text>
                <Text style={[
                  styles.confidenceValue,
                  { color: lastResult.confidence > 70 ? '#22C55E' : '#F59E0B' }
                ]}>
                {lastResult.confidence.toFixed(1)}%
              </Text>
            </View>
            )}
          </View>

          {lastResult.transcribedText && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>Transcription:</Text>
              <Text style={styles.transcriptionText}>"{lastResult.transcribedText}"</Text>
            </View>
          )}

          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Volume2 size={16} color="#64748B" />
              <Text style={styles.responseLabel}>Réponse:</Text>
            </View>
            <Text style={[
              styles.responseText,
              !lastResult.success && styles.errorResponseText
            ]}>
              {lastResult.response}
            </Text>
          </View>

          {/* Entités détectées */}
          {Object.keys(lastResult.entities).length > 0 && (
            <View style={styles.entitiesContainer}>
              <Text style={styles.entitiesLabel}>Données détectées:</Text>
              {Object.entries(lastResult.entities).map(([key, value]) => (
                <View key={key} style={styles.entityItem}>
                  <Text style={styles.entityKey}>{key}:</Text>
                  <Text style={styles.entityValue}>{JSON.stringify(value)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Statut de l'action */}
          {lastResult.action && lastResult.success && (
            <View style={styles.actionContainer}>
              <View style={styles.actionHeader}>
                {lastResult.action.type === 'create_transaction' ? (
                  <CheckCircle size={16} color="#22C55E" />
                ) : (
                  <Brain size={16} color="#3B82F6" />
                )}
                <Text style={styles.actionLabel}>
                  {lastResult.action.type === 'create_transaction' ? 'Transaction créée' : 'Requête exécutée'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Exemples d'utilisation */}
      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Exemples d'utilisation:</Text>
        <View style={styles.exampleItem}>
          <Text style={styles.exampleText}>"jënd na 2500f ceeb tay"</Text>
          <Text style={styles.exampleTranslation}>→ Ajouter dépense 2500 FCFA alimentation</Text>
        </View>
        <View style={styles.exampleItem}>
          <Text style={styles.exampleText}>"dépense na 1500f transport"</Text>
          <Text style={styles.exampleTranslation}>→ Ajouter dépense 1500 FCFA transport</Text>
        </View>
        <View style={styles.exampleItem}>
          <Text style={styles.exampleText}>"fane la sama xaliss"</Text>
          <Text style={styles.exampleTranslation}>→ Vérifier mon solde</Text>
        </View>
      </View>

      {/* Modal de confirmation */}
      {renderConfirmationModal()}

      {/* Toast container */}
      <Toast />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 36,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  recorderContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  listeningButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  resetButtonText: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: 14,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  errorResultContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  intentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  intentText: {
    fontWeight: '600',
    fontSize: 14,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  confidenceValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptionContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
  },
  responseContainer: {
    marginBottom: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  responseText: {
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
  },
  errorResponseText: {
    color: '#DC2626',
  },
  entitiesContainer: {
    marginBottom: 16,
  },
  entitiesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  entityItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  entityKey: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    width: 80,
  },
  entityValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  examplesContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  exampleItem: {
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    fontStyle: 'italic',
  },
  exampleTranslation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Modal styles
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  confirmationDetails: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  amountText: {
    color: '#22C55E',
    fontSize: 16,
  },
  wolofQuote: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
    flex: 2,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: '#22C55E',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});