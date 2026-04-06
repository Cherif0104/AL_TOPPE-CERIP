import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { Phone, Lock, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '@/services/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // const formatPhoneNumber = (text: string) => {
  //   // Remove all non-digits
  //   const cleaned = text.replace(/\D/g, '');

  //   // Format as +221 XX XXX XX XX
  //   if (cleaned.length <= 3) {
  //     return cleaned;
  //   } else if (cleaned.length <= 5) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  //   } else if (cleaned.length <= 8) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
  //   } else if (cleaned.length <= 10) {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  //   } else {
  //     return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  //   }
  // };

  const handleLogin = async () => {
    if (!phone || !password) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.login(phone, password);

      if (response && response.user && response.access) {
        await AsyncStorage.setItem('authToken', response.access);
        await AsyncStorage.setItem('refreshToken', response.refresh);
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));

        Toast.show({
          type: 'success',
          text1: 'Connexion réussie',
          text2: `Bienvenue ${response.user.role}!`,
        });

        router.replace('/(tabs)');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: 'Vérifiez vos identifiants',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Connexion en cours..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >

      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Sparkles size={32} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.logo}>AL-TOPPE</Text>
              <Text style={styles.logoSubtitle}>BUSINESS</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Votre partenaire business au Sénégal 🇸🇳</Text>
        </View>
      </LinearGradient>
      <View style={styles.content}>

        <View style={styles.form}>
          <Text style={styles.title}>Content de vous revoir !</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Phone size={20} color="#64748B" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Numéro de téléphone"
              value={phone}
              onChangeText={(text) => setPhone(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputIcon}>
              <Lock size={20} color="#64748B" />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ?
                <EyeOff size={20} color="#64748B" /> :
                <Eye size={20} color="#64748B" />
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>

          <Link href="/auth/forgot-password" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>Créer un compte</Text>
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
  },

  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  logoSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
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
  loginButton: {
    backgroundColor:  Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  registerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
});