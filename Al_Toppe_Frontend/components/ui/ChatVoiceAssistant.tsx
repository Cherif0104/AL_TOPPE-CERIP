import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { 
  Mic, 
  CheckCircle, 
  MessageCircle, 
  CornerUpLeft, 
  AlertTriangle,
  Check,
  X,
  Volume2,
  MicOff
} from 'lucide-react-native';
import VoiceRecorder, { VoiceRecorderHandle } from './VoiceRecorder';
import VoiceAIService from '@/services/voice-ai';
import { AppEvents } from '@/services/storage';
import Colors from '@/constants/colors';
import * as Speech from 'expo-speech';
import Toast from 'react-native-toast-message';
import {  useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  wolofText?: string;
  timestamp: Date;
  isProcessing?: boolean;
  success?: boolean;
  intent?: string;
  error?: boolean;
  needsConfirmation?: boolean;
  confirmationData?: any;
}

interface ChatVoiceAssistantProps {
  onTransactionCreated?: (transaction: any) => void;
  onBalanceUpdated?: (balance: number) => void;
}

interface ConfirmationModalData {
  visible: boolean;
  intent: string;
  amount?: number;
  category?: string;
  item?: string;
  wolofText: string;
  breakdown?: Array<{ label: string; amount: number }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ChatVoiceAssistant({ 
  onTransactionCreated, 
  onBalanceUpdated,
}: ChatVoiceAssistantProps) {

  const { user } = useAuth();
  const { isOnline } = useOfflineSync();
  const [messages, setMessages] = useState<Message[]>([
    
    {
      id: '0',
      type: 'assistant',
      content: `👋 Bonjour, ${user?.full_name} 😊 `,
      timestamp: new Date(),
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalData>({
    visible: false,
    intent: '',
    wolofText: '',
    breakdown: [],
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<boolean | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const recorderRef = useRef<VoiceRecorderHandle>(null);
  const pendingActionRef = useRef<any>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // Cette vérification sera faite par VoiceRecorder
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

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const updateLastMessage = (updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map((msg, index) => 
        index === prev.length - 1 ? { ...msg, ...updates } : msg
      )
    );
  };

  // === Gestion micro ===
  const handleRecordingStart = () => {
    setIsListening(true);
    setRecordingError(null);
    setProcessingStep('');
    
    addMessage({
      type: 'system',
      content: '🎙️ J\'écoute... Parlez maintenant',
      isProcessing: true,
    });

    showToast('info', 'Enregistrement démarré');
  };

  const handleRecordingStop = () => {
    setIsListening(false);
    updateLastMessage({
      content: '⏳ Traitement de votre message...',
      isProcessing: true,
    });
    setIsProcessing(true);
    setProcessingStep('Analyse de l\'audio...');
  };

  const handleRecordingError = (error: string) => {
    setIsListening(false);
    setRecordingError(error);
    
    addMessage({
      type: 'system',
      content: `❌ Erreur d'enregistrement: ${error}`,
      error: true,
    });

    showToast('error', `Erreur d'enregistrement: ${error}`);
  };

  function numberToFrenchWords(n: number): string {
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
    return n.toString(); // pour plus de 1M
  }
  

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

      // NOUVEAU: Utiliser analyzeVoiceInput au lieu de processVoiceInput
      const result = await VoiceAIService.analyzeVoiceInput('inline', {
        input_type: 'audio',
        audio_file: { uri: audioUri, name: filename, type } as any,
        duration,
      });

      setProcessingStep('Analyse terminée');

      // ✅ MODE OFFLINE : Gérer le cas où l'audio est enregistré pour traitement ultérieur
      if (result && result.offline) {
        updateLastMessage({
          content: '🎤 Audio enregistré',
          wolofText: '',
          isProcessing: false,
          success: true,
        });

        addMessage({
          type: 'assistant',
          content: result.voice_response || 'Audio enregistré. Il sera traité automatiquement lorsque la connexion sera rétablie.',
        });

        showToast('info', result.message || 'Audio enregistré pour traitement ultérieur');
        return;
      }

      if (result && result.success) {
        // "Vous avez dit" doit refléter la transcription réelle (pas vide)
        // Certains backends/paths peuvent renvoyer des variantes de clé.
        const spokenText =
          (result.transcribed_text ||
            (result as any).transcription ||
            (result as any).transcript ||
            (result as any).text ||
            '')?.toString()?.trim() || '';

        const intent = result.intent || 'unknown';
        const entities = result.entities || {};
        
        // Mise à jour du message utilisateur avec transcription
        updateLastMessage({
          content: getIntentDisplayText(intent, spokenText),
          wolofText: spokenText,
          isProcessing: false,
          success: true,
          intent,
        });

        // Vérifier si c'est une transaction qui nécessite confirmation
        if (result.requires_confirmation) {
          // Stocker l'action en attente
          pendingActionRef.current = {
            intent,
            entities,
            wolofText: spokenText,
            transactions: (result as any).transactions || undefined,  // ✅ NOUVEAU : Stocker transactions
          };

          // Afficher modal de confirmation
          showConfirmationModal(intent, entities, spokenText, result);
        } else {
          // Pour les autres actions (check_balance), exécuter directement
          await executeActionDirectly(intent, entities, result);
        }

      } else {
        updateLastMessage({
          content: '❌ Commande non reconnue',
          isProcessing: false,
          success: false,
          error: true,
        });

        addMessage({
          type: 'assistant',
          content: result?.voice_response || 'Je n\'ai pas compris, peux-tu répéter plus clairement ?',
          error: true,
        });

        showToast('error', 'Commande non reconnue');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      
      updateLastMessage({
        content: '❌ Erreur de traitement',
        isProcessing: false,
        success: false,
        error: true,
      });

      addMessage({
        type: 'assistant',
        content: '⚠️ Une erreur est survenue lors du traitement. Vérifie ta connexion et réessaie.',
        error: true,
      });

      showToast('error', 'Erreur de traitement audio');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const showConfirmationModal = (intent: string, entities: any, wolofText: string, result: any) => {
    // ✅ Gérer les montants multiples (tableaux)
    let amount = entities.amount || result.result?.amount;
    let amountBreakdown: Array<{ label: string; amount: number }> = [];
    if (Array.isArray(amount)) {
      // Si plusieurs montants, garder le détail par item si possible
      const items = entities.item || result.result?.item;
      if (Array.isArray(items)) {
        amountBreakdown = amount.map((val: any, idx: number) => ({
          label: String(items[idx] ?? `Item ${idx + 1}`),
          amount: typeof val === 'number' ? val : Number(val) || 0,
        }));
      }
      // Si plusieurs montants, calculer le total
      amount = amount.reduce((sum: number, val: number) => sum + val, 0);
    }
    
    const category = entities.category || 'divers';
    
    // ✅ Gérer les items multiples
    let item = entities.item;
    if (Array.isArray(item)) {
      // Si plusieurs items, les joindre
      item = item.join(', ');
    }

    setConfirmationModal({
      visible: true,
      intent,
      amount,
      category,
      item,
      wolofText: (wolofText || '').trim(),
      // Nouveau: stocker le détail pour affichage dans le modal
      breakdown: amountBreakdown,
      onConfirm: () => confirmAndExecuteAction(),
      onCancel: () => cancelAction(),
    });
  };

  const confirmAndExecuteAction = async () => {
    setConfirmationModal(prev => ({ ...prev, visible: false }));
    
    if (pendingActionRef.current) {
      const { intent, entities, transactions } = pendingActionRef.current;
      // ✅ NOUVEAU : Passer transactions pour mixed_transactions
      const analysisResult = transactions ? { transactions } : undefined;
      await executeActionDirectly(intent, entities, analysisResult);
      pendingActionRef.current = null;
    }
  };

  const cancelAction = () => {
    setConfirmationModal(prev => ({ ...prev, visible: false }));
    
    addMessage({
      type: 'assistant',
      content: '❌ Action annulée. Tu peux réessayer quand tu veux.',
    });

    showToast('info', 'Action annulée');
    pendingActionRef.current = null;
  };

  const executeActionDirectly = async (intent: string, entities: any, analysisResult?: any) => {
    try {
      // Exécuter l'action via le nouveau endpoint
      // ✅ NOUVEAU : Passer transactions pour mixed_transactions
      const transactions = analysisResult?.transactions || undefined;
      const result = await VoiceAIService.executeVoiceAction(intent, entities, transactions);
      
      if (result && result.success) {
        // Réponse de l'assistant
        const voiceResponse = result.voice_response || '✅ Opération effectuée';
        
        addMessage({
          type: 'assistant',
          content: voiceResponse,
          success: true,
        });

        // Lecture vocale de la réponse
        const amount = result.result?.amount || result.result?.balance;
        if (amount) {
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
        } else if (intent === 'merci') {
          Speech.getAvailableVoicesAsync().then(voices => {
            const frenchVoice = voices.find(voice => voice.language.startsWith('fr'));
            Speech.speak(voiceResponse, {
              voice: frenchVoice?.identifier,
            });
            showToast('success', 'Merci pour votre confiance');
          });
        }

        // Exécuter actions liées
        if (intent === 'declare_income' || intent === 'declare_expense') {
          await handleTransactionCreation(result.result);
          AppEvents.emit('finances:changed');
          showToast('success', `${intent === 'declare_income' ? 'Revenu' : 'Dépense'} enregistré(e)`);
        } else if (intent === 'check_balance') {
          await handleBalanceQuery(result.result);
          showToast('info', 'Solde mis à jour');
        }
        
      } else {
        addMessage({
          type: 'assistant',
          content: '⚠️ Erreur lors de l\'exécution de l\'action.',
          error: true,
        });
        showToast('error', 'Erreur lors de l\'exécution');
      }
      
    } catch (error) {
      console.error('Error executing action:', error);
      addMessage({
        type: 'assistant',
        content: '⚠️ Erreur lors de l\'exécution de l\'action.',
        error: true,
      });
      showToast('error', 'Erreur lors de l\'exécution');
    }
  };

  const getIntentDisplayText = (intent: string, wolofText: string): string => {
    switch (intent) {
      case 'declare_income':
        return `📈 ${wolofText || 'Déclaration de revenu'}`;
      case 'declare_expense':
        return `📉 ${wolofText || 'Déclaration de dépense'}`;
      case 'check_balance':
        return `💰 ${wolofText || 'Vérification du solde'}`;
      default:
        return wolofText || 'Commande vocale';
    }
  };

  const handleTransactionCreation = async (transactionData: any) => {
    try {
      onTransactionCreated?.(transactionData);
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleBalanceQuery = async (balanceData: any) => {
    try {
      const balance = balanceData?.balance || 0;
      onBalanceUpdated?.(balance);
    } catch (error) {
      console.error('Error querying balance:', error);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
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

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    return (
      <View key={message.id} style={styles.messageWrapper}>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
        <View
          style={[
          styles.messageContainer,
            isUser ? styles.userMessage : 
            isSystem ? styles.systemMessage : styles.assistantMessage,
            message.error && styles.errorMessage,
          ]}
        >
          {isUser ? (
            <View>
              <Text style={[styles.messageText, styles.userMessageText]}>
                {message.content}
              </Text>
              {message.wolofText && (
                <Text style={styles.wolofText}>
                  Transcription: "{message.wolofText}"
                </Text>
              )}
              {message.isProcessing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.processingText}>{processingStep}</Text>
                </View>
              )}
            </View>
          ) : isSystem ? (
            <View style={styles.systemMessageContent}>
              <Text style={styles.systemMessageText}>
                {message.content}
              </Text>
              {message.isProcessing && (
                <ActivityIndicator size="small" color="#64748B" style={{ marginLeft: 8 }} />
              )}
            </View>
          ) : (
            <View style={styles.assistantMessageContent}>
              <View style={styles.assistantHeader}>
                {message.error ? (
                  <AlertTriangle size={16} color="#EF4444" />
                ) : (
                <CheckCircle size={16} color="#22C55E" />
                )}
                <Text style={[
                  styles.assistantMessageText,
                  message.error && styles.errorText
                ]}>
                  {message.content}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
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

            {/* ✅ Détail des montants quand plusieurs items (ex: banane 600 + pomme 2000 = total) */}
            {confirmationModal.breakdown && confirmationModal.breakdown.length > 0 && (
              <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Détail:</Text>
                <View style={{ flex: 2, alignItems: 'flex-end' }}>
                  {confirmationModal.breakdown.map((b, idx) => (
                    <Text key={`${b.label}-${idx}`} style={styles.detailValue}>
                      {b.label}: {formatAmount(b.amount)}
                    </Text>
                  ))}
                </View>
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
              <Text style={styles.wolofQuote}>
                "{(confirmationModal.wolofText || '—').trim()}"
              </Text>
            </View>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <MessageCircle size={24} color="#22C55E" />
          <Text style={styles.headerTitle}>Assistant Vocal</Text>
        <Text style={styles.headerSubtitle}>
          Parle-moi en français
        </Text>
      </View>

      {/* Messages */}
      <View style={styles.chatSection}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
        </ScrollView>
      </View>

      {/* Actions + Micro */}
      <View style={styles.actionsBar}>
        {/* Reset conversation */}
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => {
            setMessages([
              {
                id: '0',
                type: 'assistant',
                content: '👋 Conversation réinitialisée. Je suis prêt à t\'aider !',
                timestamp: new Date(),
              },
            ]);
            setIsProcessing(false);
            setIsListening(false);
            setRecordingError(null);
            pendingActionRef.current = null;
            showToast('info', 'Conversation réinitialisée');
          }}
        >
          <CornerUpLeft size={16} color="#334155" />
        </TouchableOpacity>

        {/* Micro Recorder (caché) */}
        <View style={styles.hidden}>
          <VoiceRecorder
            ref={recorderRef}
            onRecordingComplete={handleRecordingComplete}
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onRecordingError={handleRecordingError}
            maxDuration={30}
            disabled={isProcessing || microphonePermission === false}
          />
        </View>

        {/* Bouton micro avec états visuels */}
        <TouchableOpacity
          style={[
            styles.actionButton, 
            styles.primaryButton,
            isListening && styles.listeningButton,
            isProcessing && styles.processingButton,
            recordingError && styles.errorButton,
          ]}
          onPress={() => {
            if (microphonePermission === false) {
              Alert.alert(
                'Permission requise',
                'L\'accès au microphone est nécessaire pour utiliser l\'assistant vocal.',
                [{ text: 'OK' }]
              );
              return;
            }

            if (isProcessing) return;

            if (isListening) {
              recorderRef.current?.stop?.();
            } else {
              recorderRef.current?.start?.();
            }
          }}
          disabled={isProcessing || microphonePermission === false}
        >
          {isProcessing ? (
            <ActivityIndicator size={20} color="#FFFFFF" />
          ) : isListening ? (
            <View style={styles.listeningIndicator}>
              <MicOff size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Arrêter</Text>
            </View>
          ) : recordingError ? (
            <AlertTriangle size={20} color="#FFFFFF" />
          ) : (
            <Mic size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de confirmation */}
      {renderConfirmationModal()}

      {/* Toast container */}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hidden: { display: "none" },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  chatSection: { flex: 1, backgroundColor: '#FFF' },
  messagesContainer: { flex: 1, padding: 12 },
  messageWrapper: { marginBottom: 16 },
  timestamp: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginBottom: 4 },
  messageContainer: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: '#22C55E',
    alignSelf: 'flex-end',
    marginLeft: '15%',
  },
  assistantMessage: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    marginRight: '15%',
  },
  systemMessage: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'center',
    marginHorizontal: '10%',
  },
  errorMessage: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  userMessageText: { color: '#FFF', fontWeight: '500' },
  systemMessageContent: { flexDirection: 'row', alignItems: 'center' },
  systemMessageText: { color: '#92400E', fontSize: 14, fontWeight: '500' },
  wolofText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  assistantMessageContent: { flexDirection: 'row', alignItems: 'flex-start' },
  assistantHeader: { flexDirection: 'row', alignItems: 'center' },
  assistantMessageText: { color: '#374151', fontSize: 14, marginLeft: 8, flex: 1 },
  errorText: { color: '#DC2626' },
  processingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8 
  },
  processingText: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 12, 
    marginLeft: 8 
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  actionButton: { 
    padding: 12, 
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: { backgroundColor: '#F1F5F9' },
  primaryButton: { backgroundColor: Colors.secondary , marginLeft: 12 },
  listeningButton: { 
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  processingButton: { backgroundColor: Colors.primary  },
  errorButton: { backgroundColor: '#DC2626' },
  listeningIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 4,
  },
  primaryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: '600' 
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