import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { 
  Mic, 
  Volume2, 
  HelpCircle, 
  X,
  PlayCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Typography from '@/constants/typography';

const { width } = Dimensions.get('window');

interface VoiceGuideProps {
  isVisible: boolean;
  onClose: () => void;
  onCommandSelect?: (command: string) => void;
}

export default function VoiceGuide({ isVisible, onClose, onCommandSelect }: VoiceGuideProps) {
  const [activeSection, setActiveSection] = useState('transactions');

  // Commandes basées sur vos mots-clés backend
  const voiceCommands = {
    transactions: [
      {
        command: 'vente 5000 F CFA',
        wolof: 'ma gën a yégal 5000 F CFA ngir bakkan',
        response: 'Revenu de 5000 F CFA enregistré pour la vente',
        keywords: ['vente', 'vendu', 'reçu', 'gagne'],
        type: 'income'
      },
      {
        command: 'j\'ai vendu pour 10000 F CFA',
        wolof: 'ma gën a yégal 10000 F CFA',
        response: 'Revenu de 10000 F CFA enregistré',
        keywords: ['vendu', 'vente'],
        type: 'income'
      },
      {
        command: 'j\'ai gagné 7500 F CFA',
        wolof: 'ma gën a yégal 7500 F CFA',
        response: 'Revenu de 7500 F CFA enregistré',
        keywords: ['gagne', 'reçu'],
        type: 'income'
      },
      {
        command: 'achat 3000 F CFA',
        wolof: 'ma gën a wut 3000 F CFA ngir yar',
        response: 'Dépense de 3000 F CFA enregistrée pour les marchandises',
        keywords: ['achat', 'acheté', 'payé', 'paiement', 'wut'],
        type: 'expense'
      },
      {
        command: 'j\'ai acheté pour 2000 F CFA',
        wolof: 'ma gën a wut 2000 F CFA',
        response: 'Dépense de 2000 F CFA enregistrée',
        keywords: ['acheté', 'achat'],
        type: 'expense'
      },
      {
        command: 'j\'ai payé 1500 F CFA',
        wolof: 'ma gën a wut 1500 F CFA',
        response: 'Dépense de 1500 F CFA enregistrée',
        keywords: ['payé', 'paiement'],
        type: 'expense'
      }
    ],
    balance: [
      {
        command: 'mon solde',
        wolof: 'ma soldé bëgg a xam',
        response: 'Votre solde actuel est de X F CFA',
        keywords: ['solde', 'argent', 'compte', 'balance', 'money', 'xàllis'],
        type: 'balance'
      },
      {
        command: 'combien j\'ai d\'argent',
        wolof: 'xàllis sama ngë déf',
        response: 'Votre solde est de X F CFA',
        keywords: ['argent', 'xàllis', 'money'],
        type: 'balance'
      },
      {
        command: 'mon compte',
        wolof: 'sama compte',
        response: 'Solde du compte : X F CFA',
        keywords: ['compte', 'solde_de_compte'],
        type: 'balance'
      }
    ],
    analytics: [
      {
        command: 'mes dépenses',
        wolof: 'ma wutte yi diis le',
        response: 'Vos dépenses totales : X F CFA',
        keywords: ['dépense', 'mes depanse', 'mes depenses', 'mes dépense', 'mes dépenses', 'combien'],
        type: 'expense_balance'
      },
      {
        command: 'combien j\'ai dépensé',
        wolof: 'ma wutte yi diis le',
        response: 'Total des dépenses : X F CFA',
        keywords: ['combien', 'dépense'],
        type: 'expense_balance'
      },
      {
        command: 'mes revenus',
        wolof: 'ma yégalte yi diis le',
        response: 'Vos revenus totaux : X F CFA',
        keywords: ['revenu', 'revenus', 'revenir'],
        type: 'income_balance'
      },
      {
        command: 'mes ventes',
        wolof: 'ma bakkan yi diis le',
        response: 'Total des ventes : X F CFA',
        keywords: ['vente', 'vendu'],
        type: 'income_balance'
      }
    ],
    examples: [
      {
        command: 'Vente de poisson 8000 F CFA',
        wolof: 'ma gën a yégal 8000 F CFA ngir jën',
        response: 'Revenu de 8000 F CFA enregistré pour la vente de poisson',
        type: 'income_example'
      },
      {
        command: 'Achat de riz 2500 F CFA',
        wolof: 'ma gën a wut 2500 F CFA ngir maalo',
        response: 'Dépense de 2500 F CFA enregistrée pour l\'achat de riz',
        type: 'expense_example'
      },
      {
        command: 'Paiement transport 1000 F CFA',
        wolof: 'ma gën a wut 1000 F CFA ngir tool',
        response: 'Dépense de 1000 F CFA enregistrée pour le transport',
        type: 'expense_example'
      }
    ]
  };

  const CommandCard = ({ command, wolof, response, keywords, type, onUse }: any) => (
    <View style={[styles.commandCard, type.includes('income') && styles.incomeCard, type.includes('expense') && styles.expenseCard]}>
      <View style={styles.commandHeader}>
        <View style={styles.commandInfo}>
          <Text style={styles.commandText}>"{command}"</Text>
          {wolof && (
            <Text style={styles.wolofText}>Wolof: "{wolof}"</Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => onUse(command)} 
          style={styles.useButton}
        >
          <Mic size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.responseText}>→ {response}</Text>
      
      {keywords && (
        <View style={styles.keywordsContainer}>
          <Text style={styles.keywordsLabel}>Mots-clés détectés :</Text>
          <View style={styles.keywordsList}>
            {keywords.map((keyword: string, index: number) => (
              <View key={index} style={styles.keywordTag}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const handleUseCommand = (command: string) => {
    if (onCommandSelect) {
      onCommandSelect(command);
    }
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Volume2 size={24} color={Colors.primary} />
            <Text style={styles.title}>Guide des Commandes Vocales</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.gray500} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎤 Comment parler à l'assistant</Text>
            <Text style={styles.paragraph}>
              Utilisez les mots-clés ci-dessous pour déclarer vos transactions et consulter vos finances. 
              L'assistant comprend le français et le wolof.
            </Text>
            
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Comment formuler :</Text>
              <Text style={styles.tip}>• "vente 5000 F CFA" → Déclare un revenu</Text>
              <Text style={styles.tip}>• "achat 3000 F CFA" → Déclare une dépense</Text>
              <Text style={styles.tip}>• "mon solde" → Vérifie votre argent</Text>
              <Text style={styles.tip}>• "mes dépenses" → Voir le total dépensé</Text>
            </View>
          </View>

          {/* Navigation des sections */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.sectionNav}
          >
            {Object.keys(voiceCommands).map((section) => (
              <TouchableOpacity
                key={section}
                style={[
                  styles.navButton,
                  activeSection === section && styles.navButtonActive
                ]}
                onPress={() => setActiveSection(section)}
              >
                <View style={styles.navIcon}>
                  {section === 'transactions' && <DollarSign size={16} color={activeSection === section ? '#FFFFFF' : Colors.primary} />}
                  {section === 'balance' && <Wallet size={16} color={activeSection === section ? '#FFFFFF' : Colors.primary} />}
                  {section === 'analytics' && <TrendingUp size={16} color={activeSection === section ? '#FFFFFF' : Colors.primary} />}
                  {section === 'examples' && <HelpCircle size={16} color={activeSection === section ? '#FFFFFF' : Colors.primary} />}
                </View>
                <Text style={[
                  styles.navText,
                  activeSection === section && styles.navTextActive
                ]}>
                  {section === 'transactions' && 'Transactions'}
                  {section === 'balance' && 'Solde'}
                  {section === 'analytics' && 'Analytiques'}
                  {section === 'examples' && 'Exemples'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Commandes de la section active */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {activeSection === 'transactions' && '💳 Déclarer Transactions'}
              {activeSection === 'balance' && '💰 Vérifier Solde'}
              {activeSection === 'analytics' && '📊 Consulter Statistiques'}
              {activeSection === 'examples' && '🎯 Exemples Concrets'}
            </Text>

            <Text style={styles.sectionDescription}>
              {activeSection === 'transactions' && 'Déclarez vos revenus et dépenses en utilisant les mots-clés détectés'}
              {activeSection === 'balance' && 'Vérifiez votre solde et votre situation financière'}
              {activeSection === 'analytics' && 'Consultez vos totaux de revenus et dépenses'}
              {activeSection === 'examples' && 'Exemples pratiques de phrases à utiliser'}
            </Text>

            {voiceCommands[activeSection].map((cmd, index) => (
              <CommandCard
                key={index}
                command={cmd.command}
                wolof={cmd.wolof}
                response={cmd.response}
                keywords={cmd.keywords}
                type={cmd.type}
                onUse={handleUseCommand}
              />
            ))}
          </View>

          {/* Légende des mots-clés */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔑 Mots-clés reconnus</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendCategory}>
                <Text style={styles.legendTitle}>Revenus</Text>
                <Text style={styles.legendKeywords}>vente, vendu, reçu, gagne</Text>
              </View>
              <View style={styles.legendCategory}>
                <Text style={styles.legendTitle}>Dépenses</Text>
                <Text style={styles.legendKeywords}>achat, acheté, payé, paiement, wut</Text>
              </View>
              <View style={styles.legendCategory}>
                <Text style={styles.legendTitle}>Solde</Text>
                <Text style={styles.legendKeywords}>solde, argent, compte, balance, xàllis</Text>
              </View>
              <View style={styles.legendCategory}>
                <Text style={styles.legendTitle}>Analytiques</Text>
                <Text style={styles.legendKeywords}>dépense, revenu, mes dépenses, mes revenus</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer avec CTA */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.ctaButton} 
            onPress={() => handleUseCommand('mon solde')}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text style={styles.ctaText}>Essayer "mon solde"</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.heading,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.heading,
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray600,
    marginBottom: 16,
    lineHeight: 20,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray600,
    lineHeight: 24,
    marginBottom: 16,
  },
  tipsContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tipsTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.heading,
    color: Colors.text,
    marginBottom: 8,
  },
  tip: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray600,
    marginBottom: 4,
    lineHeight: 20,
  },
  sectionNav: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.gray100,
    marginRight: 8,
    gap: 6,
  },
  navButtonActive: {
    backgroundColor: Colors.primary,
  },
  navIcon: {
    width: 20,
    alignItems: 'center',
  },
  navText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.gray600,
  },
  navTextActive: {
    color: '#FFFFFF',
  },
  commandCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  commandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commandInfo: {
    flex: 1,
  },
  commandText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  wolofText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  useButton: {
    padding: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    marginLeft: 8,
  },
  responseText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray600,
    marginBottom: 12,
    lineHeight: 20,
  },
  keywordsContainer: {
    marginTop: 8,
  },
  keywordsLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.gray500,
    marginBottom: 6,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
    color: '#8B5CF6',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendCategory: {
    flex: 1,
    minWidth: (width - 64) / 2,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  legendKeywords: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.body,
    color: Colors.gray600,
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.heading,
    color: '#FFFFFF',
  },
});