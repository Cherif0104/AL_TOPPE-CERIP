import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let withPrefix = cleaned.startsWith("221") ? cleaned : "221" + cleaned;
    withPrefix = withPrefix.slice(0, 12);
  
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
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header avec Gradient */}
        <LinearGradient
          colors={[  Colors.primary, Colors.secondary]}
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

        {/* Formulaire */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.title}>Content de vous revoir !</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
          </View>

          {/* Champ Téléphone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Numéro de téléphone</Text>
            <View style={[
              styles.inputWrapper,
              phoneFocused && styles.inputFocused
            ]}>
              <Phone size={20} color={phoneFocused ? Colors.primary : '#64748B'} />
              <TextInput
                style={styles.input}
                placeholder="221 77 123 45 67"
                value={phone}
                onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                keyboardType="phone-pad"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Champ Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <View style={[
              styles.inputWrapper,
              passwordFocused && styles.inputFocused
            ]}>
              <Lock size={20} color={passwordFocused ? Colors.primary : '#64748B'} />
              <TextInput
                style={styles.input}
                placeholder="Votre mot de passe"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
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
          </View>

          {/* Lien mot de passe oublié */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Link href="/auth/forgot-password" asChild>
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </Link>
          </TouchableOpacity>

          {/* Bouton de connexion */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary]}
              style={styles.loginButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Séparateur */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>ou</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Lien d'inscription */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Créer un compte</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
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
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginLeft: 4,
  },
});