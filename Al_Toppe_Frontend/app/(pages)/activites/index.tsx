import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  DollarSign,
  MapPin,
  ChevronRight,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Store,
  Package
} from 'lucide-react-native';
import { router } from 'expo-router';
import { ActivityService, Activity } from '@/services/activity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '@/components/ui/Header';
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from '@react-navigation/native';
import Colors from '@/constants/colors';
import Footer from '@/components/ui/Footer';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { useOfflineData } from '@/hooks/useOfflineData';
import { CacheKeys } from '@/services/cacheService';
import { getEntrepreneurId } from '@/contexts/AuthContext';

export default function ActivitiesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    getEntrepreneurId().then(id => setEntrepreneurId(id || null));
  }, []);

  // ✅ Utilisation du hook useOfflineData pour les activités
  const { 
    data: activitiesData, 
    loading, 
    refetch: refetchActivities,
    isFromCache 
  } = useOfflineData<{ results: Activity[] }>({
    cacheKey: entrepreneurId ? `${CacheKeys.ACTIVITIES}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      const id = await getEntrepreneurId();
      if (!id) throw new Error('Entrepreneur ID not found');
      return await ActivityService.listByEntrepreneur(id);
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours
    enabled: !!entrepreneurId,
  });

  const activities = activitiesData?.results ?? [];

  useFocusEffect(
    React.useCallback(() => {
      refetchActivities();
    }, [refetchActivities])
  );

  const sectors = [
    { value: 'commerce', label: 'Commerce', icon: Store },
    { value: 'service', label: 'Service', icon: Sparkles },
    { value: 'artisanat', label: 'Artisanat', icon: Package },
    { value: 'agriculture', label: 'Agriculture', icon: Building2 }
  ];

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    Toast.show({
      type,
      text1: type === 'success' ? 'Succès' : type === 'error' ? 'Erreur' : 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  // ✅ Fonction optimisée avec useMemo pour filtrer les activités
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = !searchQuery || 
        activity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = !filterSector || activity.sector === filterSector;
      return matchesSearch && matchesSector;
    });
  }, [activities, searchQuery, filterSector]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchActivities();
    setRefreshing(false);
  };

  const handleDeleteActivity = (activityId: string, activityTitle: string) => {
    Alert.alert(
      'Supprimer l\'activité',
      `Êtes-vous sûr de vouloir supprimer "${activityTitle}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!entrepreneurId) {
                Alert.alert('Erreur', 'Impossible de supprimer l\'activité');
                return;
              }
              await ActivityService.delete(entrepreneurId, activityId);
              await refetchActivities();
              showToast('success', 'Activité supprimée avec succès');
            } catch (error) {
              showToast('error', 'Impossible de supprimer l\'activité');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const getSectorColor = (sector: string) => {
    const colors = {
      commerce: '#3B82F6',
      service: '#8B5CF6',
      artisanat: '#F59E0B',
      agriculture: '#10B981'
    };
    return colors[sector as keyof typeof colors] || '#6B7280';
  };

  const getSectorLabel = (sector: string) => {
    const sectorObj = sectors.find(s => s.value === sector);
    return sectorObj?.label || sector;
  };

  const getSectorIcon = (sector: string) => {
    const sectorObj = sectors.find(s => s.value === sector);
    return sectorObj?.icon || Store;
  };

  const totalRevenue = activities.reduce((sum, act) => sum + (act.total_revenue || 0), 0);

  // if (loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <LinearGradient
  //         colors={[Colors.primary, Colors.secondary]}
  //         style={styles.loadingGradient}
  //       >
  //         <ActivityIndicator size="large" color="#FFFFFF" />
  //         <Text style={styles.loadingText}>Chargement...</Text>
  //       </LinearGradient>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <Header
        title="Coaching"
        onNotificationPress={() => router.push('alerts' as never)}
        onProfilePress={() => router.push('profile' as never)}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <LinearGradient
        colors={[Colors.primary, Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Mes Activités</Text>
            <Text style={styles.headerSubtitle}>
              {activities.length} {activities.length > 1 ? 'activités' : 'activité'}
            </Text>
          </View>

          {activities.length === 0 && (
            <TouchableOpacity 
              style={styles.addButtonHeader}
              onPress={() => router.push('/activites/add')}
            >
              <Plus size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <Building2 size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{activities.length}</Text>
            <Text style={styles.statLabel}>Activités</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <DollarSign size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>
              {(totalRevenue / 1000).toFixed(0)}K
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconWrapper}>
              <TrendingUp size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>
              {activities.filter(a => a.age_days && a.age_days < 30).length}
            </Text>
            <Text style={styles.statLabel}>Récentes</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une activité..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterChips}
        contentContainerStyle={styles.filterChipsContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, !filterSector && styles.filterChipActive]}
          onPress={() => setFilterSector(null)}
        >
          <Sparkles size={16} color={!filterSector ? '#FFFFFF' : Colors.primary} />
          <Text style={[styles.filterChipText, !filterSector && styles.filterChipTextActive]}>
            Tous
          </Text>
        </TouchableOpacity>
        {sectors.map((sector) => {
          const IconComponent = sector.icon;
          const isActive = filterSector === sector.value;
          return (
            <TouchableOpacity
              key={sector.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilterSector(isActive ? null : sector.value)}
            >
              <IconComponent size={16} color={isActive ? '#FFFFFF' : Colors.primary} />
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {sector.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Activities List */}
      <ScrollView 
        style={styles.activitiesList}
        contentContainerStyle={styles.activitiesContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#F0F9FF', '#FFF7ED']}
              style={styles.emptyGradient}
            >
              <View style={styles.emptyIconWrapper}>
                <Building2 size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || filterSector ? 'Aucun résultat' : 'Démarrez votre aventure'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || filterSector 
                  ? 'Modifiez vos filtres de recherche'
                  : 'Créez votre première activité et développez votre business'
                }
              </Text>
              {!searchQuery && !filterSector && (
                <TouchableOpacity 
                  style={styles.emptyButtonWrapper}
                  onPress={() => router.push('/activites/add')}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.secondary]}
                    style={styles.emptyButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Créer une activité</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        ) : (
          filteredActivities.map((activity) => {
            const SectorIcon = getSectorIcon(activity.sector);
            return (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push(`/activites/${activity.id}`)}
                activeOpacity={0.7}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={[
                    styles.cardIcon,
                    { backgroundColor: getSectorColor(activity.sector) + '15' }
                  ]}>
                    <SectorIcon size={24} color={getSectorColor(activity.sector)} />
                  </View>
                  
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {activity.title}
                    </Text>
                    <View style={styles.cardBadge}>
                      <View style={[
                        styles.badgeDot,
                        { backgroundColor: getSectorColor(activity.sector) }
                      ]} />
                      <Text style={[
                        styles.cardBadgeText,
                        { color: getSectorColor(activity.sector) }
                      ]}>
                        {getSectorLabel(activity.sector)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                {activity.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {activity.description}
                  </Text>
                )}

                {/* Info Row */}
                <View style={styles.cardInfoRow}>
                  <View style={styles.cardInfoItem}>
                    <Calendar size={14} color="#94A3B8" />
                    <Text style={styles.cardInfoText}>
                      {formatDate(activity.creation_date)}
                    </Text>
                  </View>
                  
                  {activity.location && (
                    <View style={styles.cardInfoItem}>
                      <MapPin size={14} color="#94A3B8" />
                      <Text style={styles.cardInfoText}>
                        {activity.location.city}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Revenue Section */}
                {activity.total_revenue !== undefined && (
                  <View style={styles.revenueSection}>
                    <LinearGradient
                      colors={['#10B98115', '#10B98105']}
                      style={styles.revenueGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <DollarSign size={18} color="#10B981" />
                      <Text style={styles.revenueText}>
                        {activity.total_revenue.toLocaleString()} FCFA
                      </Text>
                      {activity.age_days && (
                        <View style={styles.ageBadge}>
                          <Text style={styles.ageBadgeText}>
                            {activity.age_days}j
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                )}

                {/* Actions Row */}
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push(`/activites/${activity.id}`)}
                  >
                    <Eye size={16} color={Colors.primary} />
                    <Text style={styles.actionBtnText}>Voir</Text>
                  </TouchableOpacity>
                  
                  {/* <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => router.push(`/activites/${activity.id}?edit=true`)}
                  >
                    <Edit3 size={16} color="#F59E0B" />
                    <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
                      Modifier
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionBtnDelete}
                    onPress={() => handleDeleteActivity(activity.id, activity.title)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity> */}
                </View>

                {/* Arrow Indicator */}
                <View style={styles.cardArrow}>
                  <ChevronRight size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
        
        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  addButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  clearButton: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  filterChips: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterChipsContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  activitiesList: {
    flex: 1,
  },
  activitiesContent: {
    paddingHorizontal: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
  },
  emptyGradient: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardInfoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  revenueSection: {
    marginBottom: 16,
  },
  revenueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  revenueText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  ageBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ageBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.primary,
  },
  actionBtnDelete: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  cardArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});