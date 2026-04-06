import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Send, Brain } from 'lucide-react-native';
import VoiceAIService from '@/services/voice-ai';
import Colors from '@/constants/colors';
import Toast from 'react-native-toast-message';

interface WolofTextInputProps {
  onResult?: (result: any) => void;
}

export default function WolofTextInput({ onResult }: WolofTextInputProps) {
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
      showToast('error', `Veuillez saisir du texte: `);
      setIsProcessing(false);
      return;
    }

    try {
      setIsProcessing(true);
      const result = await VoiceAIService.processWolofText(text);
      showToast(result.success ? 'success' : 'error', result.voice_response);
      onResult?.(result);
      setText('');
      
    } catch (error) {
      console.error('Error processing wolof text:', error);
      showToast('error', 'Impossible de traiter le texte ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="vente des fruits pour 7500 F CFA."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={isProcessing || !text.trim()}
        >
          {isProcessing ? (
            <Brain size={20} color={Colors.primary}  />
          ) : (
            <Send size={20} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Exemples: "J'ai vendu des fruits pour 7500 F CFA", "Achat de légumes 2500 F CFA"
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    marginTop: 10,

    padding: 16,
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
  inputContainer: {
    flexDirection: 'row',
    color: '#FFFF',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFFF',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#FFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#FFFF',
    padding: 12,
    borderRadius: 8,
    color: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  hint: {
    fontSize: 12,
    color: '#FFFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
});


