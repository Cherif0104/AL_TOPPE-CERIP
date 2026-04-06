import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react-native';
import ApiService from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function ResetPasswordScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { otpCode } = useLocalSearchParams<{ otpCode: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);
  const passwordConfirmInputRef = useRef<TextInput>(null);

  const handleResetPassword = async () => {
    // Validations
    if (!otpCode.trim() || otpCode.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Code OTP invalide',
        text2: 'Veuillez entrer le code à 6 chiffres reçu par SMS',
      });
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Mot de passe invalide',
        text2: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      Toast.show({
        type: 'error',
        text1: 'Mots de passe différents',
        text2: 'Les deux mots de passe doivent être identiques',
      });
      return;
    }

    if (!phone) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Numéro de téléphone manquant',
      });
      router.back();
      return;
    }

    setLoading(true);
    try {
      await ApiService.confirmPasswordReset(
        phone,
        otpCode.trim(),
        newPassword,
        newPasswordConfirm
      );

      setSuccess(true);
      Toast.show({
        type: 'success',
        text1: 'Succès',
        text2: 'Votre mot de passe a été réinitialisé avec succès',
      });

      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
    } catch (error: any) {
      console.error('Erreur réinitialisation mot de passe:', error);
      
      let errorMessage = 'Impossible de réinitialiser le mot de passe. Réessayez plus tard.';
      
      if (error?.message?.includes('OTP') || error?.message?.includes('code')) {
        errorMessage = 'Code OTP invalide ou expiré. Demandez un nouveau code.';
      } else if (error?.message?.includes('404') || error?.message?.includes('trouvé')) {
        errorMessage = 'Aucun compte trouvé avec ce numéro de téléphone';
      } else if (error?.message?.includes('correspondent')) {
        errorMessage = 'Les mots de passe ne correspondent pas';
      }

      Alert.alert(
        'Erreur',
        errorMessage,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Demander un nouveau code',
            style: 'default',
            onPress: () => router.replace('/auth/forgot-password'),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Réinitialisation en cours..." />;
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <CheckCircle size={64} color="#22C55E" />
          </View>
          <Text style={styles.successTitle}>Mot de passe réinitialisé !</Text>
          <Text style={styles.successMessage}>
            Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Entrez le code OTP reçu par SMS et votre nouveau mot de passe
          </Text>
        </View>

        <View style={styles.form}>
          {/* Code OTP */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#64748B" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Code OTP (6 chiffres)"
              value={otpCode}
              onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#94A3B8"
              autoFocus
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </View>

          {/* Nouveau mot de passe */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#64748B" />
            </View>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#94A3B8"
              onSubmitEditing={() => passwordConfirmInputRef.current?.focus()}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirmation mot de passe */}
          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#64748B" />
            </View>
            <TextInput
              ref={passwordConfirmInputRef}
              style={styles.input}
              placeholder="Confirmer le mot de passe"
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
              secureTextEntry={!showPasswordConfirm}
              placeholderTextColor="#94A3B8"
              onSubmitEditing={handleResetPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
            >
              {showPasswordConfirm ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>

          {/* Info téléphone */}
          {phone && (
            <Text style={styles.phoneInfo}>
              Code OTP envoyé au : {phone} 
            </Text>
          )}

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetPassword}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary]}
              style={styles.resetButtonGradient}
            >
              <Text style={styles.resetButtonText}>Réinitialiser le mot de passe</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resendButton}
            onPress={() => router.replace('/auth/forgot-password')}
          >
            <Text style={styles.resendButtonText}>
              Je n'ai pas reçu le code • Renvoyer
            </Text>
          </TouchableOpacity>
        </View>

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
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 4,
  },
  phoneInfo: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  resetButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  resetButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  resendButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
    flexWrap: 'wrap',
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#22C55E15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
});
