import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  TextInput
} from 'react-native';
import WolofTextInput from '@/components/ui/WolofTextInput';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import ChatVoiceAssistant from '@/components/ui/ChatVoiceAssistant';
import FinancesToDay from '@/components/ui/FinancesToDay';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import Header from '@/components/ui/Header';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import VoiceAIService from '@/services/voice-ai';

import {
  HelpCircle,
  Mic,
  Volume2,
  X,
  Send,
  Brain,
  Sparkles,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Voice Guide Modal Component
const VoiceGuideModal = ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void }) => {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.guideModalContent}>
          {/* Header */}
          <LinearGradient
            colors={[Colors.primary, Colors.primary]}
            style={styles.guideHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.guideHeaderContent}>
              <View style={styles.guideHeaderLeft}>
                <Volume2 size={24} color="#FFFFFF" />
                <Text style={styles.guideTitle}>Guide Vocal</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.guideContent} showsVerticalScrollIndicator={false}>
            {/* Commandes de Base */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Mic size={20} color={Colors.primary} />
                <Text style={styles.guideSectionTitle}>Commandes de Base</Text>
              </View>

              <View style={styles.commandCard}>
                <View style={styles.commandIcon}>
                  <Text style={styles.commandEmoji}>💰</Text>
                </View>
                <View style={styles.commandContent}>
                  <Text style={styles.commandText}>"mon solde"</Text>
                  <Text style={styles.commandDesc}>Vérifier votre solde</Text>
                </View>
              </View>

              <View style={styles.commandCard}>
                <View style={styles.commandIcon}>
                  <Text style={styles.commandEmoji}>📈</Text>
                </View>
                <View style={styles.commandContent}>
                  <Text style={styles.commandText}>"vente légumes 5000 F CFA"</Text>
                  <Text style={styles.commandDesc}>Déclarer un revenu</Text>
                </View>
              </View>

              <View style={styles.commandCard}>
                <View style={styles.commandIcon}>
                  <Text style={styles.commandEmoji}>📉</Text>
                </View>
                <View style={styles.commandContent}>
                  <Text style={styles.commandText}>"achat légumes  3000 F CFA"</Text>
                  <Text style={styles.commandDesc}>Déclarer une dépense</Text>
                </View>
              </View>
            </View>

            {/* Commandes Financières */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <DollarSign size={20} color="#F59E0B" />
                <Text style={styles.guideSectionTitle}>Commandes Financières</Text>
              </View>

              <View style={styles.tipCard}>
                <Text style={styles.tipText}>• "mes revenus" → Voir vos revenus</Text>
                <Text style={styles.tipText}>• "mes dépenses" → Voir vos dépenses</Text>
                <Text style={styles.tipText}>• "combien j'ai dépensé" → Total</Text>
              </View>
            </View>

            {/* Conseils */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Sparkles size={20} color="#8B5CF6" />
                <Text style={styles.guideSectionTitle}>Conseils Pratiques</Text>
              </View>

              <LinearGradient
                colors={['#8B5CF620', '#8B5CF610']}
                style={styles.tipsGradient}
              >
                <Text style={styles.tipItem}>✓ Parlez clairement et naturellement</Text>
                <Text style={styles.tipItem}>✓ Mentionnez toujours "F CFA"</Text>
                <Text style={styles.tipItem}>✓ Utilisez le français</Text>
              </LinearGradient>
            </View>

            {/* Exemples */}
            <View style={styles.guideSection}>
              <View style={styles.guideSectionHeader}>
                <Brain size={20} color="#3B82F6" />
                <Text style={styles.guideSectionTitle}>Exemples</Text>
              </View>

              <View style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>Exemple 1</Text>
                <Text style={styles.exampleText}>
                  "J'ai vendu des fruits pour 7500 F CFA"
                </Text>
              </View>

              <View style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>Exemple 2</Text>
                <Text style={styles.exampleText}>
                  "Achat de légumes 2500 F CFA"
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.guideFooter}>
            <TouchableOpacity
              style={styles.guideCtaWrapper}
              onPress={onClose}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primary]}
                style={styles.guideCta}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Mic size={20} color="#FFFFFF" />
                <Text style={styles.guideCtaText}>Commencer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styled WolofTextInput Component
const StyledWolofTextInput = ({ onResult }: { onResult?: (result: any) => void }) => {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type,
      text1: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      showToast('error', 'Veuillez saisir du texte');
      return;
    }
    setIsProcessing(true);
    const result = await VoiceAIService.processWolofText(text);
    onResult && onResult(result);
    setTimeout(() => {
      showToast('success', text);
      setText('');
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <View style={styles.textInputCard}>
      <LinearGradient
        colors={[Colors.primary + '15', Colors.secondary + '10']}
        style={styles.textInputGradient}
      >
        <View style={styles.textInputHeader}>
          <Brain size={20} color={Colors.primary} />
          <Text style={styles.textInputTitle}>Saisie Texte</Text>
        </View>

        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Ex: vente des fruits pour 7500 F CFA"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]}
            onPress={handleSubmit}
            disabled={isProcessing || !text.trim()}
          >
            <LinearGradient
              colors={isProcessing ? ['#94A3B8', '#94A3B8'] : [Colors.primary, Colors.primary]}
              style={styles.sendButtonGradient}
            >
              {isProcessing ? (
                <Brain size={20} color="#FFFFFF" />
              ) : (
                <Send size={20} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.textInputHint}>
          💡 "vente légumes 5000 F"

        </Text>
        {/* result */}
       
      </LinearGradient>
    </View>
  );
};

export default function VoiceAIScreen() {
  const { user } = useAuth();
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [showGuide, setShowGuide] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const [showFinances, setShowFinances] = useState(false);

  const handleTransactionCreated = (transaction: any) => {
    console.log('Transaction créée via Voice AI:', transaction);
  };

  const handleBalanceUpdated = (balance: number) => {
    setCurrentBalance(balance);
  };

  const handleTextResult = (result: any) => {
    console.log('Résultat du texte:', result);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Voice AI"
        onNotificationPress={() => router.push('alerts' as never)}
        onProfilePress={() => router.push('profile' as never)}
      />

      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
            colors={[Colors.primary, Colors.primary]}
            style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconWrapper}>
              <Mic size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>Assistant Vocal IA</Text>
            <Text style={styles.heroSubtitle}>
              Gérez vos finances par la voix
            </Text>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowGuide(true)}
            >
              <HelpCircle size={18} color="#FFFFFF" />
              <Text style={styles.helpButtonText}>Guide d'utilisation</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>


        <ProtectedRoute>
          {/* Quick Intro Card */}
          <View style={styles.quickIntroCard}>
            <View style={styles.quickIntroHeader}>
              <Sparkles size={20} color={Colors.primary} />
              <Text style={styles.quickIntroTitle}>Commandes Rapides</Text>
            </View>
            <View style={styles.quickCommandsGrid}>
              <View style={styles.quickCommandChip}>
                <Text style={styles.quickCommandText}>💰 "mon solde"</Text>
              </View>
              <View style={styles.quickCommandChip}>
                <Text style={styles.quickCommandText}>📈 "vente fruits 5000"</Text>
              </View>
              <View style={styles.quickCommandChip}>
                <Text style={styles.quickCommandText}>📉 "achat fruits 3000"</Text>
              </View>
            </View>
          </View>

          {/* Assistant Section */}
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowAssistant(!showAssistant)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[Colors.primary + '20', Colors.secondary + '10']}
              style={styles.sectionHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconWrapper}>
                  <Mic size={20} color={Colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Assistance Vocale</Text>
              </View>
              {showAssistant ? (
                <ChevronUp size={24} color={Colors.primary} />
              ) : (
                <ChevronDown size={24} color={Colors.primary} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {showAssistant && (
            <View style={styles.sectionContent}>
              <ChatVoiceAssistant
                onTransactionCreated={handleTransactionCreated}
                onBalanceUpdated={handleBalanceUpdated}
              />
              <StyledWolofTextInput onResult={handleTextResult} />
            </View>
          )}

          {/* Finances Section */}
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowFinances(!showFinances)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#F59E0B20', '#F59E0B10']}
              style={styles.sectionHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: '#F59E0B20' }]}>
                  <TrendingUp size={20} color="#F59E0B" />
                </View>
                <Text style={styles.sectionTitle}>Finances Aujourd'hui</Text>
              </View>
              {showFinances ? (
                <ChevronUp size={24} color="#F59E0B" />
              ) : (
                <ChevronDown size={24} color="#F59E0B" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {showFinances && (
            <View style={styles.sectionContent}>
              <FinancesToDay />
            </View>
          )}

          <View style={{ height: 100 }} />
        </ProtectedRoute>
      </ScrollView>

      {/* Guide Modal */}
      <VoiceGuideModal
        isVisible={showGuide}
        onClose={() => setShowGuide(false)}
      />

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    paddingVertical: 7,
    paddingHorizontal: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 2,
  },
  quickIntroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  quickIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  quickIntroTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  quickCommandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCommandChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickCommandText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#475569',
  },
  sectionHeader: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textInputCard: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  textInputGradient: {
    padding: 16,
  },
  textInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  textInputTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  textInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  textInputHint: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  guideModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '95%',
  },
  guideHeader: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  guideHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    height: '100%',
  },
  guideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guideTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  guideContent: {
    flex: 1,
    padding: 20,
    
  },
  guideSection: {
    marginBottom: 24,
  },
  guideSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  guideSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  commandCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commandEmoji: {
    fontSize: 20,
  },
  commandContent: {
    flex: 1,
    justifyContent: 'center',
  },
  commandText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  commandDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  tipCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E40AF',
    marginBottom: 8,
  },
  tipsGradient: {
    borderRadius: 14,
    padding: 16,
  },
  tipItem: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6D28D9',
    marginBottom: 10,
  },
  exampleCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  exampleLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#78350F',
    fontStyle: 'italic',
  },
  guideFooter: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  guideCtaWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  guideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  guideCtaText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});