import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Settings,
  Shield,
  LogOut,
  Edit3,
  Camera,
  Star,
  ArrowLeft,
  Building,
  Activity,
  Package,
  TrendingUp,
  Award,
  ChevronRight,
  Save,
  X,
  Wallet,
  TrendingDown,
  EyeOff,
  Eye
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '@/services/api';
import { router } from 'expo-router';
import { EntrepreneurService, UserProfile, Entrepreneur } from '@/services/entrepreneur';
import Header from '@/components/ui/Header';
import Colors from '@/constants/colors';
import Footer from '@/components/ui/Footer';
import { LinearGradient } from 'expo-linear-gradient';
import { getEntrepreneurId } from '@/contexts/AuthContext';
import { FinanceService } from '@/services/finance';
import { useOfflineData } from '@/hooks/useOfflineData';
import { CacheKeys } from '@/services/cacheService';

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
}

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const [editingUserInfo, setEditingUserInfo] = useState<UserProfile | null>(null);

  useEffect(() => {
    getEntrepreneurId().then(id => setEntrepreneurId(id || null));
  }, []);

  // ✅ Utilisation du hook useOfflineData pour le profil utilisateur
  const { 
    data: userInfo, 
    loading: profileLoading, 
    refetch: refetchProfile 
  } = useOfflineData<UserProfile>({
    cacheKey: CacheKeys.USER_PROFILE,
    fetchFunction: async () => {
      return await EntrepreneurService.profile();
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours (profil change rarement)
    enabled: true,
    onError: (error) => {
      console.error('Error fetching user profile:', error);
      Alert.alert('Erreur', 'Impossible de charger le profil');
    },
  });

  // Initialiser editingUserInfo quand userInfo change
  useEffect(() => {
    if (userInfo) {
      setEditingUserInfo(userInfo);
    }
  }, [userInfo]);

  // ✅ Utilisation du hook useOfflineData pour le dashboard
  const { 
    data: dashboardData, 
    loading: dashboardLoading 
  } = useOfflineData<any>({
    cacheKey: entrepreneurId ? `${CacheKeys.DASHBOARD}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      const id = await getEntrepreneurId();
      if (!id) throw new Error('Entrepreneur ID not found');
      return await FinanceService.dashboard(id);
    },
    cacheExpiry: 24 * 60 * 60 * 1000, // 24h
    enabled: !!entrepreneurId,
  });

  // ✅ Calcul optimisé des stats avec useMemo
  const stats = useMemo<StatItem[]>(() => {
    if (!dashboardData) {
      return [
        { label: 'Solde', value: '0 FCFA', icon: TrendingUp, color: '#3B82F6' },
        { label: 'Marge', value: '0%', icon: Award, color: '#10B981' },
      ];
    }

    // Formatage des valeurs pour éviter le débordement
    const formatCompact = (amount: number) => {
      if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
      if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
      return amount.toString();
    };

    return [
      {
        label: 'Solde',
        value: formatCompact(parseFloat(dashboardData.net_result || '0')) + ' F',
        icon: Wallet,
        color: '#3B82F6'
      },
      {
        label: 'Marge',
        value: Math.round(dashboardData.profit_margin || 0) + '%',
        icon: Award,
        color: '#10B981'
      },
    ];
  }, [dashboardData]);

  const loading = profileLoading || dashboardLoading;

  const quickActions = [
    { icon: Building, title: 'Business Plans', color: Colors.primary, route: 'business_plans' },
    { icon: Activity, title: 'Activités', color: '#3B82F6', route: 'activites' },
    { icon: Package, title: 'Productions', color: '#8B5CF6', route: 'productions' },
    { icon: Settings, title: 'Paramètres', color: '#F59E0B', route: 'profile' },
  ];

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userInfo');
      await AsyncStorage.removeItem('entrepreneur_id');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUserProfile = async () => {
    if (!editingUserInfo) return;
    try {
      await EntrepreneurService.updateUserProfile(editingUserInfo);
      setIsEditing(false);
      setEditingUserInfo(null);
      // Recharger le profil après mise à jour
      await refetchProfile();
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating user profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleInputChange = (field: string, value: string, isEntrepreneurField = false) => {
    if (!editingUserInfo) return;
    if (isEntrepreneurField) {
      setEditingUserInfo({
        ...editingUserInfo,
        entrepreneur: {
          ...editingUserInfo.entrepreneur,
          [field]: value
        } as Entrepreneur
      });
    } else {
      setEditingUserInfo({
        ...editingUserInfo,
        [field]: value
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={styles.container}>
        <Header
          title="Mon Profil"
          showNotifications={true}
          onNotificationPress={() => router.push('alerts' as never)}
          showLanguage={true}
          showProfile={false}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <X size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>Impossible de charger le profil</Text>
          <TouchableOpacity style={styles.logoutButtonWrapper} onPress={logout}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.logoutButtonGradient}
            >
              <LogOut size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>Se déconnecter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Mon Profil"
        showNotifications={true}
        onNotificationPress={() => router.push('alerts' as never)}
        showLanguage={true}
        showProfile={false}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header with Gradient */}
        <LinearGradient
          colors={[Colors.primary, Colors.primary]}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.profileHeaderContent}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.avatar}
              >
                <User size={48} color={Colors.primary} />
              </LinearGradient>
              <TouchableOpacity style={styles.cameraButton}>
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.editingHeader}>
                <TextInput
                  style={styles.editNameInput}
                  value={userInfo?.entrepreneur?.first_name || ''}
                  onChangeText={(text) => handleInputChange('first_name', text, true)}
                  placeholder="Prénom"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <TextInput
                  style={styles.editNameInput}
                  value={userInfo?.entrepreneur?.last_name || ''}
                  onChangeText={(text) => handleInputChange('last_name', text, true)}
                  placeholder="Nom"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
              </View>
            ) : (
              <>
                <Text style={styles.profileName}>{userInfo.full_name}</Text>
                <View style={styles.businessBadge}>
                  <Building size={14} color="#FFFFFF" />
                  <Text style={styles.businessName}>
                    {Array.isArray(userInfo.entrepreneur?.activities) && userInfo.entrepreneur.activities.length > 0
                      ? userInfo.entrepreneur.activities[0].title
                      : 'Entrepreneur'
                    }
                  </Text>
                </View>
              </>
            )}

            <View style={styles.verifiedBadge}>
              <Shield size={14} color="#10B981" />
              <Text style={styles.verifiedText}>Profil vérifié</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editHeaderButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X size={20} color="#FFFFFF" />
            ) : (
              <Edit3 size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {stats.map((stat: StatItem, index: number) => {
              const IconComponent = stat.icon;
              return (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIconWrapper, { backgroundColor: stat.color + '20' }]}>
                    <IconComponent size={20} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action: any, index: number) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.quickActionCard}
                  onPress={() => router.push(action.route as never)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[action.color + '20', action.color + '10']}
                    style={styles.quickActionGradient}
                  >
                    <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                      <IconComponent size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.quickActionText}>{action.title}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Phone size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editingUserInfo?.phone || ''}
                    onChangeText={(text) => handleInputChange('phone', text)}
                  />
                ) : (
                  <Text style={styles.infoValue}>{userInfo?.phone || ''}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Mail size={20} color="#3B82F6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.infoInput}
                    value={editingUserInfo?.email || ''}
                    onChangeText={(text) => handleInputChange('email', text)}
                  />
                ) : (
                  <Text style={styles.infoValue}>{userInfo?.email || 'Non renseigné'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <MapPin size={20} color="#F59E0B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Adresse</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.infoInput, styles.multilineInput]}
                    value={editingUserInfo?.entrepreneur?.address || ''}
                    onChangeText={(text) => handleInputChange('address', text, true)}
                    multiline
                  />
                ) : (
                  <Text style={styles.infoValue}>{userInfo?.entrepreneur?.address || 'Non renseignée'}</Text>
                )}
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <Calendar size={20} color="#8B5CF6" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Membre depuis</Text>
                <Text style={styles.infoValue}>
                  {userInfo?.created_at ? new Date(userInfo.created_at).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long'
                  }) : 'Non renseigné'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.businessSection}>
          <Text style={styles.sectionTitle}>Statut professionnel</Text>

          <LinearGradient
            colors={[Colors.primary, Colors.primary]}
            style={styles.businessCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.businessCardHeader}>
              <View style={styles.starIconWrapper}>
                <Star size={24} color="#FFFFF" fill="#F59E0B" />
              </View>
              <View style={styles.businessCardInfo}>
                <Text style={styles.businessCardTitle}>Entrepreneur vérifié</Text>
                <Text style={styles.businessCardSubtitle}>Statut informel actif</Text>
              </View>
            </View>
            <View style={styles.businessCardFooter}>

              <Text style={styles.businessCardId}>
                ID:
                {showBalance ? userInfo?.entrepreneur?.cni_number || 'Non renseigné' : '*************'}
              </Text>

              <TouchableOpacity
                onPress={() => setShowBalance(!showBalance)}
                style={styles.eyeButton}
              >
                {showBalance ?
                 <Eye size={20} color={Colors.secondary} /> :
                <EyeOff size={20} color={Colors.secondary} /> 
                }
              </TouchableOpacity>

            </View>
          </LinearGradient>
        </View>

        {/* Edit Actions */}
        {isEditing && (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={() => {
                setIsEditing(false);
                setEditingUserInfo(userInfo);
                refetchProfile();
              }}
            >
              <X size={20} color="#64748B" />
              <Text style={styles.cancelEditText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButtonWrapper}
              onPress={updateUserProfile}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.secondary]}
                style={styles.saveButtonGradient}
              >
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutCard} onPress={logout}>
          <View style={styles.logoutIconWrapper}>
            <LogOut size={20} color="#EF4444" />
          </View>
          <Text style={styles.logoutCardText}>Se déconnecter</Text>
          <ChevronRight size={20} color="#EF4444" />
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.appVersion}>AL-TOPPE v1.0.0</Text>
          <Text style={styles.footerText}>Développé avec ❤️ au Sénégal 🇸🇳</Text>
        </View>

      </ScrollView>

      <Footer showNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  eyeButton: {
    padding: 4,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 24,
  },
  logoutButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  editingHeader: {
    width: '100%',
    gap: 8,
  },
  editNameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  profileName: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  businessName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  editHeaderButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  infoInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  businessSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  businessCard: {
    borderRadius: 20,
    padding: 20,
  },
  businessCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  businessCardInfo: {
    flex: 1,
  },
  businessCardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  businessCardSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  businessCardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopColor: '#FFFFFF',
  },
  businessCardId: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  cancelEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  cancelEditText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  saveButtonWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoutCardText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  appVersion: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
});