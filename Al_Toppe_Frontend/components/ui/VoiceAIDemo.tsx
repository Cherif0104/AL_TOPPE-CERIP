import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Mic, Brain, CheckCircle, XCircle, RotateCcw, Volume2, Play } from 'lucide-react-native';
import VoiceRecorder from './VoiceRecorder';

interface VoiceAIDemoProps {
  onTransactionCreated?: (transaction: any) => void;
  onBalanceUpdated?: (balance: number) => void;
}

interface VoiceResult {
  success: boolean;
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  response: string;
  action?: {
    type: string;
    result: any;
  };
}

export default function VoiceAIDemo({ onTransactionCreated, onBalanceUpdated }: VoiceAIDemoProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VoiceResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');

  // Simuler le démarrage d'une session
  const startVoiceSession = async () => {
    try {
      setIsProcessing(true);
      setProcessingStep('Démarrage de la session...');

      // Simuler un délai
      await new Promise(resolve => setTimeout(resolve, 1500));

      const sessionId = `session_${Date.now()}`;
      setCurrentSession(sessionId);
      setIsListening(true);
      setProcessingStep('Prêt à écouter...');
      setIsProcessing(false);

      Alert.alert('Session démarrée', `Session ID: ${sessionId}`);

    } catch (error) {
      console.error('Error starting voice session:', error);
      Alert.alert('Erreur', 'Impossible de démarrer la session vocale');
      setIsProcessing(false);
    }
  };

  // Simuler le traitement d'un enregistrement
  const handleRecordingComplete = async (audioUri: string, duration: number) => {
    if (!currentSession) return;

    try {
      setIsProcessing(true);
      setProcessingStep('Traitement de l\'audio...');

      // Simuler le traitement
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingStep('Interprétation wolof...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Résultats simulés basés sur la durée
      let result: VoiceResult;
      
      if (duration < 5) {
        result = {
          success: false,
          intent: 'unknown',
          confidence: 25,
          entities: {},
          response: 'Enregistrement trop court. Veuillez parler plus longtemps.',
        };
      } else if (duration < 10) {
        result = {
          success: true,
          intent: 'check_balance',
          confidence: 85,
          entities: { action: 'query' },
          response: 'Votre solde actuel est de 45,250 FCFA',
          action: {
            type: 'query_database',
            result: { balance: 45250 }
          }
        };
      } else {
        result = {
          success: true,
          intent: 'add_income',
          confidence: 92,
          entities: { 
            amount: 2500,
            category: 'alimentation',
            date: new Date().toISOString()
          },
          response: 'Revenu de 2,500 FCFA (alimentation) ajouté avec succès',
          action: {
            type: 'create_transaction',
            result: {
              type: 'income',
              amount: 2500,
              category: 'alimentation',
              date: new Date()
            }
          }
        };
      }

      setLastResult(result);
      setProcessingStep('Traitement terminé');

      // Traiter l'action si nécessaire
      if (result.action?.type === 'create_transaction') {
        await handleTransactionCreation(result.action.result);
      } else if (result.action?.type === 'query_database') {
        await handleBalanceQuery(result.action.result);
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
      setProcessingStep('Erreur');
    } finally {
      setIsProcessing(false);
      setIsListening(false);
    }
  };

  // Traiter la création de transaction
  const handleTransactionCreation = async (transactionData: any) => {
    try {
      onTransactionCreated?.(transactionData);
      Alert.alert('Succès', 'Transaction créée via Voice AI');
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
      Alert.alert('Solde', `Votre solde: ${balance.toLocaleString()} FCFA`);
    } catch (error) {
      console.error('Error querying balance:', error);
    }
  };

  // Terminer la session
  const endVoiceSession = async () => {
    if (!currentSession) return;

    try {
      setProcessingStep('Fermeture de la session...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentSession(null);
      setIsListening(false);
      setProcessingStep('');
      
      Alert.alert('Session terminée', 'Session vocale fermée avec succès');
    } catch (error) {
      console.error('Error ending voice session:', error);
    }
  };

  // Réinitialiser
  const reset = () => {
    setLastResult(null);
    setProcessingStep('');
    if (currentSession) {
      endVoiceSession();
    }
  };

  // Jouer un exemple
  const playExample = (example: string) => {
    Alert.alert('Exemple', `Vous avez dit: "${example}"`);
  };

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'add_income':
        return '#22C55E';
      case 'add_expense':
        return '#EF4444';
      case 'check_balance':
        return '#3B82F6';
      default:
        return '#64748B';
    }
  };

  const getIntentLabel = (intent: string) => {
    switch (intent) {
      case 'add_income':
        return 'Ajout Revenu';
      case 'add_expense':
        return 'Ajout Dépense';
      case 'check_balance':
        return 'Vérification Solde';
      default:
        return 'Intention Inconnue';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Brain size={24} color="#22C55E" />
          <Text style={styles.headerTitle}>Assistant Vocal Wolof (Démo)</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Interface de démonstration - Données simulées
        </Text>
      </View>

      {/* État de traitement */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.processingText}>{processingStep}</Text>
        </View>
      )}

      {/* Enregistreur vocal */}
      {!isProcessing && (
        <View style={styles.recorderContainer}>
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onRecordingStart={() => setIsListening(true)}
            onRecordingStop={() => setIsListening(false)}
            maxDuration={30}
            disabled={!currentSession}
          />
        </View>
      )}

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        {!currentSession ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startVoiceSession}
            disabled={isProcessing}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Démarrer Session</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.endButton}
            onPress={endVoiceSession}
            disabled={isProcessing}
          >
            <XCircle size={20} color="#FFFFFF" />
            <Text style={styles.endButtonText}>Terminer Session</Text>
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
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <View style={styles.intentBadge}>
              <Text style={[styles.intentText, { color: getIntentColor(lastResult.intent) }]}>
                {getIntentLabel(lastResult.intent)}
              </Text>
            </View>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceLabel}>Confiance:</Text>
              <Text style={styles.confidenceValue}>
                {lastResult.confidence.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.responseContainer}>
            <View style={styles.responseHeader}>
              <Volume2 size={16} color="#64748B" />
              <Text style={styles.responseLabel}>Réponse:</Text>
            </View>
            <Text style={styles.responseText}>{lastResult.response}</Text>
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
          {lastResult.action && (
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

      {/* Exemples interactifs */}
      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Exemples interactifs:</Text>
        
        <TouchableOpacity 
          style={styles.exampleButton}
          onPress={() => playExample('jënd na 2500f ceeb tay')}
        >
          <Play size={16} color="#22C55E" />
          <Text style={styles.exampleText}>"jënd na 2500f ceeb tay"</Text>
          <Text style={styles.exampleTranslation}>→ Ajouter revenu 2500 FCFA alimentation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exampleButton}
          onPress={() => playExample('dépense na 1500f transport')}
        >
          <Play size={16} color="#EF4444" />
          <Text style={styles.exampleText}>"dépense na 1500f transport"</Text>
          <Text style={styles.exampleTranslation}>→ Ajouter dépense 1500 FCFA transport</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.exampleButton}
          onPress={() => playExample('fane la sama xaliss')}
        >
          <Play size={16} color="#3B82F6" />
          <Text style={styles.exampleText}>"fane la sama xaliss"</Text>
          <Text style={styles.exampleTranslation}>→ Vérifier mon solde</Text>
        </TouchableOpacity>
      </View>

      {/* Note de démonstration */}
      <View style={styles.demoNote}>
        <Text style={styles.demoNoteTitle}>ℹ️ Mode Démonstration</Text>
        <Text style={styles.demoNoteText}>
          Cette interface simule le comportement de l'IA Voice. En production, 
          elle se connectera au backend pour un traitement réel du wolof.
        </Text>
      </View>
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
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
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
    color: '#22C55E',
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
  exampleButton: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  exampleTranslation: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginLeft: 24,
  },
  demoNote: {
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  demoNoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  demoNoteText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});