import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { Phone, ArrowLeft, Mail } from 'lucide-react-native';
import ApiService from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from 'react-native-toast-message';
import Colors from '@/constants/colors';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // const formatPhoneNumber = (text: string) => {
  //   const cleaned = text.replace(/\D/g, '');
  //   if (cleaned.length <= 3) {
  //     return cleaned;
  //   } else if (cleaned.length <= 5) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  //   } else if (cleaned.length <= 8) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
  //   } else if (cleaned.length <= 10) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  //   } else {
  //     return `${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  //   }
  // };

  const formatPhoneNumber = (text: string) => {
    // Garde uniquement les chiffres
    const cleaned = text.replace(/\D/g, '');

    // Si l’utilisateur n’a pas encore tapé "221", on l’ajoute automatiquement
    let withPrefix = cleaned.startsWith("221") ? cleaned : "221" + cleaned;

    // Coupe au max 12 chiffres (221 + 9 numéros)
    withPrefix = withPrefix.slice(0, 12);

    // Formater en 221 XX XXX XX XX
    if (withPrefix.length <= 3) {
      return withPrefix;
    } else if (withPrefix.length <= 5) {
      return `${withPrefix.slice(0, 3)} ${withPrefix.slice(3)}`;
    } else if (withPrefix.length <= 8) {
      return `${withPrefix.slice(0, 3)} ${withPrefix.slice(3, 5)} ${withPrefix.slice(5)}`;
    } else if (withPrefix.length <= 10) {
      return `${withPrefix.slice(0, 3)} ${withPrefix.slice(3, 5)} ${withPrefix.slice(5, 8)} ${withPrefix.slice(8)}`;
    } else {
      return `${withPrefix.slice(0, 3)} ${withPrefix.slice(3, 5)} ${withPrefix.slice(5, 8)} ${withPrefix.slice(8, 10)} ${withPrefix.slice(10, 12)}`;
    }
  };

  const handleResetPassword = async () => {
    if (!phone.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez entrer votre numéro de téléphone',
      });
      return;
    }

    // Formater le numéro au format +221XXXXXXXXX
    const formattedPhone = formatPhoneNumber(phone);

    // Vérifier le format
    if (!formattedPhone.match(/^221\s(77|76|71|70|75|78)\s\d{3}\s\d{2}\s\d{2}$/)) {
      Toast.show({
        type: 'error',
        text1: 'Format invalide',
        text2: 'Le numéro doit être au format +221 XX XXX XX XX',
      });
      return;
    }

    setLoading(true);
    try {
      // Appel API réel pour demander la réinitialisation
      const response = await ApiService.requestPasswordReset(formattedPhone);
      
      setEmailSent(true);
      Toast.show({
        type: 'success',
        text1: 'SMS envoyé',
        text2: `Code OTP envoyé au ${formattedPhone}. Vérifiez vos messages.`,
      });
      
      // Rediriger vers la page de confirmation après 2 secondes
      setTimeout(() => {
        router.push({
          pathname: '/auth/reset-password' as any,
          params: { phone: formattedPhone, otpCode: response.otp_code }
        });
      }, 1000);
    } catch (error: any) {
      console.error('Erreur réinitialisation mot de passe:', error);
      const errorMessage = error?.message?.includes('404') || error?.message?.includes('trouvé')
        ? 'Aucun compte trouvé avec ce numéro de téléphone'
        : 'Impossible d\'envoyer le SMS de réinitialisation. Réessayez plus tard.';
      
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Envoi du SMS..." />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.backButton}>
              <ArrowLeft size={24} color="#64748B" />
            </TouchableOpacity>
          </Link>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            {emailSent 
              ? 'Un SMS avec les instructions a été envoyé'
              : 'Entrez votre numéro pour recevoir un SMS de réinitialisation'
            }
          </Text>
        </View>

        {!emailSent ? (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Phone size={20} color="#64748B" />
              </View>
              {/* draw icon Senegal */}
              <Text style={styles.countryCode}>SN</Text>
              <TextInput
                style={styles.input}
                placeholder="221 77 123 45 67"
                value={phone}
                onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                keyboardType="phone-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
              <Text style={styles.resetButtonText}>Envoyer SMS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Mail size={48} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>SMS envoyé!</Text>
            <Text style={styles.successMessage}>
              Vérifiez vos messages SMS et suivez les instructions pour réinitialiser votre mot de passe.
            </Text>
            
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={() => setEmailSent(false)}
            >
              <Text style={styles.resendButtonText}>Renvoyer le SMS</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous vous souvenez de votre mot de passe ?</Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  resetButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resendButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginRight: 4,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});