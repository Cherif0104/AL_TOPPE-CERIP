import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Animated, Modal, TextInput, RefreshControl } from 'react-native';
import { MessageCircle, Calendar, Star, Clock, Users, Award, Video, Phone, CheckCircle, AlertCircle, TrendingUp, Target, Lightbulb, X } from 'lucide-react-native';
import Header from '@/components/ui/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Colors from '@/constants/colors';
import { router } from 'expo-router';
import { Coach, CoachingSession, CoachingService } from '@/services/coaching';
import { getEntrepreneurId, useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useOfflineData } from '@/hooks/useOfflineData';
import { CacheKeys } from '@/services/cacheService';

export default function CoachingScreen() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [completeForm, setCompleteForm] = useState({
    notes: '',
    feedback: '',
    entrepreneur_rating: '',
    coach_rating: ''
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [entrepreneurId, setEntrepreneurId] = useState<string | null>(null);
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    getEntrepreneurId().then(id => setEntrepreneurId(id || null));
  }, []);

  // ✅ Utilisation du hook useOfflineData pour les sessions
  const {
    data: sessionsData,
    loading: sessionsLoading,
    refetch: refetchSessions,
    isFromCache: sessionsFromCache
  } = useOfflineData<{ results: CoachingSession[] }>({
    cacheKey: entrepreneurId ? `${CacheKeys.COACHING_SESSIONS}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      const id = await getEntrepreneurId();
      if (!id) throw new Error('Entrepreneur ID not found');
      return await CoachingService.listSessions({ entrepreneur_id: id });
    },
    cacheExpiry: 24 * 60 * 60 * 1000, // 24h
    enabled: !!entrepreneurId,
  });

  // ✅ Utilisation du hook useOfflineData pour les assignments
  const {
    data: assignmentsData,
    loading: assignmentsLoading
  } = useOfflineData<{ results: any[] }>({
    cacheKey: entrepreneurId ? `${CacheKeys.COACHING_ASSIGNMENTS}_${entrepreneurId}` : '',
    fetchFunction: async () => {
      return await CoachingService.listAssignments({ status: 'active' });
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours
    enabled: !!entrepreneurId,
  });

  // ✅ Utilisation du hook useOfflineData pour le coach
  const {
    data: coachData,
    loading: coachLoading
  } = useOfflineData<Coach>({
    cacheKey: assignmentsData?.results?.[0]?.coach ? `${CacheKeys.COACH}_${assignmentsData.results[0].coach}` : '',
    fetchFunction: async () => {
      if (!assignmentsData?.results?.[0]?.coach) throw new Error('No coach assignment');
      return await CoachingService.getCoach(assignmentsData.results[0].coach);
    },
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 jours
    enabled: !!assignmentsData?.results?.[0]?.coach,
  });

  // ✅ Calcul optimisé des sessions filtrées avec useMemo
  const { sessions, upcomingSessions, overdueSessions, completedSessions, evaluationCompletedByEntrepreneurSessions } = useMemo(() => {
    const allSessions = sessionsData?.results ?? [];
    return {
      sessions: allSessions,
      upcomingSessions: allSessions.filter((session: CoachingSession) =>
        session.status === 'in_progress' && !session.is_overdue
      ),
      overdueSessions: allSessions.filter((session: CoachingSession) =>
        session.status === 'scheduled'
      ),
      completedSessions: allSessions.filter((session: CoachingSession) =>
        session.status === 'completed'
      ),
      evaluationCompletedByEntrepreneurSessions: allSessions.filter((session: CoachingSession) =>
        session.status === 'evaluation_completed'
      ),
    };
  }, [sessionsData]);

  const coach = coachData || null;
  const isLoading = sessionsLoading || assignmentsLoading || coachLoading;
  const error = null; // Géré par le hook

  // Recharger les données quand on revient sur l'écran
  // Recharger les données quand on revient sur l'écran (seulement une fois)
  const hasRefetchedRef = React.useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      // Ne recharger qu'une seule fois par focus pour éviter les boucles
      if (!hasRefetchedRef.current) {
        hasRefetchedRef.current = true;
        refetchSessions();
      }
      return () => {
        hasRefetchedRef.current = false;
      };
    }, [refetchSessions])
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  // Initialiser le formulaire avec les données de la session sélectionnée
  useEffect(() => {
    if (selectedSession) {
      setCompleteForm({
        notes: selectedSession.notes || '',
        feedback: selectedSession.feedback || '',
        entrepreneur_rating: selectedSession.entrepreneur_rating ? String(selectedSession.entrepreneur_rating) : '',
        // Pour l'évaluation du coach par l'entrepreneur, on utilise coach_rating
        coach_rating: selectedSession.coach_rating ? String(selectedSession.coach_rating) : ''
      });
    } else {
      // Réinitialiser le formulaire quand le modal se ferme
      setCompleteForm({ notes: '', feedback: '', entrepreneur_rating: '', coach_rating: '' });
    }
  }, [selectedSession]);

  // Fonction pour recharger après modification
  const loadCoachingData = async () => {
    await refetchSessions();
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      await CoachingService.startSession(sessionId);
      Alert.alert('✅ Succès', 'Session démarrée');
      await refetchSessions();
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de démarrer la session');
    }
  };

  const handleCompleteSession = async () => {
    if (!selectedSession) return;

    try {
      setIsCompleting(true);
      const entrepreneurRating = completeForm.entrepreneur_rating ? parseInt(completeForm.entrepreneur_rating, 10) : undefined;
      const coachRating = completeForm.coach_rating ? parseInt(completeForm.coach_rating, 10) : undefined;
      await CoachingService.completeSession(
        selectedSession.id,
        completeForm.notes || undefined,
        coachRating || undefined,
        completeForm.feedback || undefined,
      );

      Alert.alert('✅ Succès', 'Session terminée avec succès');
      setSelectedSession(null);
      setCompleteForm({ notes: '', feedback: '', entrepreneur_rating: '', coach_rating: '' });
      await refetchSessions();
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de terminer la session');
    } finally {
      setIsCompleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getSessionTypeInfo = (type: string) => {
    const types: Record<string, { label: string; color: string; icon: any }> = {
      'initial': { label: 'Initiale', color: '#3B82F6', icon: Target },
      'follow_up': { label: 'Suivi', color: '#10B981', icon: TrendingUp },
      'review': { label: 'Révision', color: '#F59E0B', icon: CheckCircle },
      'training': { label: 'Formation', color: '#8B5CF6', icon: Lightbulb },
      'consultation': { label: 'Consultation', color: '#EC4899', icon: MessageCircle },
    };
    return types[type] || { label: 'Session', color: '#64748B', icon: Calendar };
  };

  const SessionCard = ({ session }: { session: CoachingSession }) => {
    const typeInfo = getSessionTypeInfo(session.session_type);
    const Icon = typeInfo.icon;

    return (
      <TouchableOpacity style={styles.modernSessionCard} activeOpacity={0.7}>
        <LinearGradient
          colors={[typeInfo.color + '15', typeInfo.color + '08']}
          style={styles.sessionGradient}
        >
          <View style={styles.sessionTopRow}>
            <View style={styles.sessionTypeContainer}>
              <View style={[styles.sessionTypeIcon, { backgroundColor: typeInfo.color + '25' }]}>
                <Icon size={18} color={typeInfo.color} />
              </View>
              <View style={styles.sessionTypeInfo}>
                <Text style={styles.sessionTypeLabel}>{typeInfo.label}</Text>
                <View style={styles.sessionDateTime}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.sessionDateText}>
                    {formatDate(session.scheduled_date)} • {new Date(session.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.modernStatusBadge, {
              backgroundColor: session.is_overdue ? '#FEE2E2' :
                session.status === 'scheduled' ? '#DBEAFE' :
                  session.status === 'in_progress' ? '#FEF3C7' : ''


            }]}>
              <View style={[styles.statusDot, {
                backgroundColor: session.is_overdue ? '#EF4444' :
                  session.status === 'scheduled' ? '#3B82F6' :
                    session.status === 'in_progress' ? '#F59E0B' :
                      session.status === 'completed' ? '#10B981' : ''
              }]} />
              <Text style={[styles.modernStatusText, {
                color: session.is_overdue ? '#DC2626' :
                  session.status === 'scheduled' ? '#2563EB' :
                    session.status === 'in_progress' ? '#D97706' : ''
              }]}>
                {session.is_overdue ? 'Retard' :
                  session.status === 'scheduled' ? 'Planifiée' :
                    session.status === 'in_progress' ? 'En cours' : ''}
              </Text>
            </View>
          </View>

          {session.agenda && session.agenda !== 'string' && session.agenda.trim() !== '' && (
            <View style={styles.agendaSection}>
              <Text style={styles.agendaText}>{session.agenda}</Text>
            </View>
          )}



          <View style={styles.sessionBottomRow}>
            <View style={styles.sessionMetrics}>
              <View style={styles.metricItem}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.metricText}>{session.duration_minutes} min</Text>
              </View>
              {(session.status === 'completed' || session.status === 'evaluation_completed') && (
                <>
                  {/* Note de l'entrepreneur (notation du coach) */}
                  {/* {typeof session.entrepreneur_rating === 'number' && (
                    <View style={styles.metricItem}>
                      <Text style={styles.ratingLabel}>Votre note :</Text>
                      <View style={styles.ratingStars}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={'e' + i}
                            size={12}
                            color={i < session.entrepreneur_rating! ? '#EAB308' : '#E2E8F0'}
                            fill={i < session.entrepreneur_rating! ? '#EAB308' : 'transparent'}
                          />
                        ))}
                      </View>
                    </View>
                  )} */}
                  {/* Note du coach (notation de l'entrepreneur) */}
                  {typeof session.coach_rating === 'number' && (
                    <View style={styles.metricItem}>
                      <Text style={styles.ratingLabel}>Note du coach :</Text>
                      <View style={styles.ratingStars}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={'c' + i}
                            size={12}
                            color={i < session.coach_rating! ? '#2563EB' : '#E2E8F0'}
                            fill={i < session.coach_rating! ? '#2563EB' : 'transparent'}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>




            {session.status === 'scheduled' && (
              <TouchableOpacity
                style={styles.modernActionButton}
                onPress={() => handleStartSession(session.id)}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  style={styles.actionButtonGradient}
                >
                  <Video size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Démarrer</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {session.status === 'completed' && (
              <TouchableOpacity
                style={styles.modernActionButton}
                onPress={() => setSelectedSession(session)}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.actionButtonGradient}
                >
                  <CheckCircle size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Noter le coach</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {session.status === 'evaluation_completed' && (
              <View style={styles.completedBadge}>
                <CheckCircle size={14} color="#10B981" />
                <Text style={styles.completedBadgeText}>Évaluation terminée</Text>
              </View>
            )}
          </View>

          {session.is_overdue && (
            <View style={styles.modernOverdueWarning}>
              <AlertCircle size={14} color="#DC2626" />
              <Text style={styles.overdueWarningText}>Session en retard</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const SessionCardRecommendations = React.memo(({ session }: { session: CoachingSession }) => {
    const typeInfo = getSessionTypeInfo(session.session_type);
    const Icon = typeInfo.icon;

    return (
      <TouchableOpacity style={styles.modernSessionCard} activeOpacity={0.7}>
        <LinearGradient
          colors={[typeInfo.color + '15', typeInfo.color + '08']}
          style={styles.sessionGradient}
        >
          <View style={styles.sessionTopRow}>
            <View style={styles.sessionTypeContainer}>
              <View style={[styles.sessionTypeIcon, { backgroundColor: typeInfo.color + '25' }]}>
                <Icon size={18} color={typeInfo.color} />
              </View>
              <View style={styles.sessionTypeInfo}>
                <Text style={styles.sessionTypeLabel}>{typeInfo.label}</Text>
                <View style={styles.sessionDateTime}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.sessionDateText}>
                    {formatDate(session.scheduled_date)} • {new Date(session.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </View>


          </View>



          <View style={styles.sessionBottomRow}>

            {session.status === 'completed' && (
              <View style={styles.completedSessionDetails}>
                {session.notes && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <MessageCircle size={16} color={Colors.primary} />
                      <Text style={styles.sessionDetailTitle}>Notes de session</Text>
                    </View>
                    <Text style={styles.sessionDetailText}>{session.notes}</Text>
                  </View>
                )}

                {session.feedback && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <Star size={16} color="#EAB308" />
                      <Text style={styles.sessionDetailTitle}>Feedback</Text>
                    </View>
                    <Text style={styles.sessionDetailText}>{session.feedback}</Text>
                  </View>
                )}

                {session.action_items && session.action_items.length > 0 && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.sessionDetailTitle}>Actions à suivre</Text>
                    </View>
                    {session.action_items.map((item, index) => (
                      <View key={index} style={styles.actionItem}>
                        <View style={styles.actionItemBullet} />
                        <Text style={styles.actionItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {session.status === 'evaluation_completed' && (
              <View style={styles.completedSessionDetails}>
                {session.notes && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <MessageCircle size={16} color={Colors.primary} />
                      <Text style={styles.sessionDetailTitle}>Notes de session</Text>
                    </View>
                    <Text style={styles.sessionDetailText}>{session.notes}</Text>
                  </View>
                )}

                {session.feedback && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <Star size={16} color="#EAB308" />
                      <Text style={styles.sessionDetailTitle}>Feedback</Text>
                    </View>
                    <Text style={styles.sessionDetailText}>{session.feedback}</Text>
                  </View>
                )}

                {session.action_items && session.action_items.length > 0 && (
                  <View style={styles.sessionDetailCard}>
                    <View style={styles.sessionDetailHeader}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.sessionDetailTitle}>Actions à suivre</Text>
                    </View>
                    {session.action_items.map((item, index) => (
                      <View key={index} style={styles.actionItem}>
                        <View style={styles.actionItemBullet} />
                        <Text style={styles.actionItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Note de l'entrepreneur (notation du coach) */}
                {typeof session.entrepreneur_rating === 'number' && (
                  <View style={styles.metricItem}>
                    <Text style={styles.ratingLabel}>Votre note :</Text>
                    <View style={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={'e' + i}
                          size={12}
                          color={i < session.entrepreneur_rating! ? '#EAB308' : '#E2E8F0'}
                          fill={i < session.entrepreneur_rating! ? '#EAB308' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {/* Note du coach (notation de l'entrepreneur) */}
                {typeof session.coach_rating === 'number' && (
                  <View style={styles.metricItem}>
                    <Text style={styles.ratingLabel}>Note du coach :</Text>
                    <View style={styles.ratingStars}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={'c' + i}
                          size={12}
                          color={i < session.coach_rating! ? '#2563EB' : '#E2E8F0'}
                          fill={i < session.coach_rating! ? '#2563EB' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  });
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header
          title="Coaching"
          onNotificationPress={() => router.push('alerts' as never)}
          onProfilePress={() => router.push('profile' as never)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Coaching"
        onNotificationPress={() => router.push('alerts' as never)}
        onProfilePress={() => router.push('profile' as never)}
      />
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >

        {/* Hero Section avec Coach Card */}
        <LinearGradient
          colors={[Colors.primary, Colors.primary]}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.coachAvatarContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.coachAvatarGradient}
              >
                <Users size={32} color={Colors.primary} />
              </LinearGradient>
            </View>

            <View style={styles.coachDetails}>
              <Text style={styles.coachName}>
                {coach ? coach.coach_name : 'Chargement...'}
              </Text>
              <Text style={styles.coachSpeciality}>
                {coach?.specialization === 'business_development' ? 'Développement d\'entreprise' :
                  coach?.specialization === 'financial_management' ? 'Gestion financière' :
                    coach?.specialization === 'marketing' ? 'Marketing' :
                      coach?.specialization === 'general' ? 'Accompagnement général' :
                        'Spécialiste'}
              </Text>

              <View style={styles.coachMetrics}>
                <View style={styles.coachMetricItem}>
                  <Star size={14} color="#FCD34D" fill="#FCD34D" />
                  <Text style={styles.coachMetricText}>
                    {coach?.average_rating ? coach.average_rating.toFixed(1) : 'N/A'}
                  </Text>
                </View>
                {/* <View style={styles.coachMetricDivider} />
              <View style={styles.coachMetricItem}>
                <Users size={14} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.coachMetricText}>
                  {coach?.total_sessions || 0} sessions
                </Text>
              </View> */}
                <View style={styles.coachMetricDivider} />
                <View style={styles.coachMetricItem}>
                  <Award size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.coachMetricText}>
                    {coach?.years_experience || 0} ans
                  </Text>
                </View>
              </View>
            </View>

            {/* <TouchableOpacity style={styles.messageButton}>
            <MessageCircle size={20} color="#FFFFFF" />
          </TouchableOpacity> */}
          </View>

          {/* Stats rapides */}
          <View style={styles.quickStatsContainer}>
            <View style={styles.quickStatCard}>
              <AlertCircle size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{overdueSessions.length}</Text>
              <Text style={styles.quickStatLabel}>Planifiées</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Calendar size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{upcomingSessions.length}</Text>
              <Text style={styles.quickStatLabel}>En cours</Text>
            </View>
            <View style={styles.quickStatCard}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.quickStatValue}>{completedSessions.length + evaluationCompletedByEntrepreneurSessions.length}</Text>
              <Text style={styles.quickStatLabel}>Complétées</Text>
            </View>


          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.modernTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            <TouchableOpacity
              style={[styles.modernTab, activeTab === 'sessions' && styles.modernTabActive]}
              onPress={() => setActiveTab('sessions')}
            >
              <Calendar size={18} color={activeTab === 'sessions' ? Colors.primary : '#64748B'} />
              <Text style={[styles.modernTabText, activeTab === 'sessions' && styles.modernTabTextActive]}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modernTab, activeTab === 'recommendations' && styles.modernTabActive]}
              onPress={() => setActiveTab('recommendations')}
            >
              <Lightbulb size={18} color={activeTab === 'recommendations' ? Colors.primary : '#64748B'} />
              <Text style={[styles.modernTabText, activeTab === 'recommendations' && styles.modernTabTextActive]}>
                Conseils
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'sessions' ? (
              <View>
                {overdueSessions.length > 0 && (
                  <View style={styles.sessionSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.chartIconWrapper, { backgroundColor: '#FEE2E220' }]}>
                        <AlertCircle size={20} color="#EF4444" />
                      </View>
                      <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                        Planifiées
                      </Text>
                    </View>
                    {overdueSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </View>
                )}

                {upcomingSessions.length > 0 && (
                  <View style={styles.sessionSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.chartIconWrapper, { backgroundColor: Colors.primary + '20' }]}>
                        <Calendar size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.sectionTitle}>En cours</Text>
                    </View>
                    {upcomingSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </View>
                )}
                
                {overdueSessions.length > 0 && (
                  <View style={styles.sessionSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.chartIconWrapper, { backgroundColor: '#FEE2E220' }]}>
                        <AlertCircle size={20} color="#EF4444" />
                      </View>
                      <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>
                        Planifiées
                      </Text>
                    </View>
                    {overdueSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </View>
                )}
                {completedSessions.length > 0 && (
                  <View style={styles.sessionSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.chartIconWrapper, { backgroundColor: '#10B98120' }]}>
                        <CheckCircle size={20} color="#10B981" />
                      </View>
                      <Text style={styles.sectionTitle}>Historique</Text>
                    </View>
                    {completedSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </View>
                )}
                {evaluationCompletedByEntrepreneurSessions.length > 0 && (
                  <View style={styles.sessionSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.chartIconWrapper, { backgroundColor: '#10B98120' }]}>
                        <CheckCircle size={20} color="#10B981" />
                      </View>
                      <Text style={styles.sectionTitle}>Évaluations terminées</Text>
                    </View>
                    {evaluationCompletedByEntrepreneurSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </View>
                )}

                {sessions.length === 0 && (
                  <View style={styles.modernEmptyState}>
                    <LinearGradient
                      colors={['#F0F9FF', '#FFF7ED']}
                      style={styles.emptyStateGradient}
                    >
                      <View style={styles.emptyIconWrapper}>
                        <Calendar size={48} color={Colors.primary} />
                      </View>
                      <Text style={styles.emptyStateTitle}>Aucune session</Text>
                      <Text style={styles.emptyStateText}>
                        Votre coach vous contactera bientôt pour planifier vos premières sessions.
                      </Text>
                    </LinearGradient>
                  </View>
                )}
              </View>
            ) : (
              <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView
                  style={styles.content}
                  contentContainerStyle={styles.contentContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {completedSessions.length > 0 && (
                    <View style={styles.sessionSection}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={[styles.chartIconWrapper, { backgroundColor: '#10B98120' }]}>
                          <CheckCircle size={20} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Historique</Text>
                      </View>
                      {completedSessions.map((session) => (
                        <SessionCardRecommendations key={session.id} session={session} />
                      ))}
                    </View>
                  )}

                  {evaluationCompletedByEntrepreneurSessions.length > 0 && (
                    <View style={styles.sessionSection}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={[styles.chartIconWrapper, { backgroundColor: '#10B98120' }]}>
                          <CheckCircle size={20} color="#10B981" />
                        </View>
                        <Text style={styles.sectionTitle}>Évaluations terminées</Text>
                      </View>
                      {evaluationCompletedByEntrepreneurSessions.map((session) => (
                        <SessionCardRecommendations key={session.id} session={session} />
                      ))}
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </Animated.View>

        {/* Floating Action Button */}
        {/* <TouchableOpacity style={styles.fab}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.fabGradient}
        >
          <Calendar size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity> */}
      </ScrollView>
      {/* Modal pour terminer une session */}
      <Modal
        visible={!!selectedSession}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSelectedSession(null);
          setCompleteForm({ notes: '', feedback: '', entrepreneur_rating: '', coach_rating: '' });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.modalGradient}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>notes de la session</Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSession(null);
                    setCompleteForm({ notes: '', feedback: '', entrepreneur_rating: '', coach_rating: '' });
                  }}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Notes */}


                {/* Évaluation du coach par l'entrepreneur */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Votre évaluation du coach</Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        onPress={() => setCompleteForm(prev => ({ ...prev, coach_rating: String(rating) }))}
                        style={styles.ratingButton}
                      >
                        <Star
                          size={32}
                          color={Number(completeForm.coach_rating) >= rating ? '#EAB308' : '#E2E8F0'}
                          fill={Number(completeForm.coach_rating) >= rating ? '#EAB308' : 'transparent'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Afficher l'évaluation existante de la session si elle existe */}
                  {selectedSession?.coach_rating && !completeForm.coach_rating && (
                    <Text style={styles.ratingText}>
                      Évaluation actuelle: {
                        selectedSession.coach_rating === 5 ? 'Excellente' :
                          selectedSession.coach_rating === 4 ? 'Très bonne' :
                            selectedSession.coach_rating === 3 ? 'Bonne' :
                              selectedSession.coach_rating === 2 ? 'Moyenne' :
                                'Décevante'
                      }
                    </Text>
                  )}
                  {/* Afficher la nouvelle évaluation si elle est sélectionnée */}
                  {completeForm.coach_rating && (
                    <Text style={styles.ratingText}>
                      {completeForm.coach_rating === '5' ? 'Excellente' :
                        completeForm.coach_rating === '4' ? 'Très bonne' :
                          completeForm.coach_rating === '3' ? 'Bonne' :
                            completeForm.coach_rating === '2' ? 'Moyenne' :
                              'Décevante'}
                    </Text>
                  )}
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setSelectedSession(null);
                    setCompleteForm({ notes: '', feedback: '', entrepreneur_rating: '', coach_rating: '' });
                  }}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitButton, isCompleting && styles.modalSubmitButtonDisabled]}
                  onPress={handleCompleteSession}
                  disabled={isCompleting}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.modalSubmitGradient}
                  >
                    {isCompleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#FFFFFF" />
                        <Text style={styles.modalSubmitText}>Terminer la session</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  heroSection: {
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  coachAvatarContainer: {
    marginRight: 16,
  },
  coachAvatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  coachSpeciality: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  coachMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachMetricText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  coachMetricDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 8,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.2,
  },
  modernTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  modernTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    gap: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modernTabActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '30',
  },
  modernTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  modernTabTextActive: {
    color: Colors.primary,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },

  sessionSection: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modernSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  sessionGradient: {
    padding: 18,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionTypeInfo: {
    flex: 1,
  },
  sessionTypeLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sessionDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDateText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modernStatusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.1,
  },
  agendaSection: {
    marginBottom: 14,
    marginTop: 8,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary + '40',
  },
  agendaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 22,
  },
  sessionBottomRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginRight: 6,
  },
  modernActionButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 7,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  modernOverdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  overdueWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    letterSpacing: 0.1,
  },
  modernEmptyState: {
    marginTop: 40,
    marginHorizontal: 20,
  },
  emptyStateGradient: {
    borderRadius: 24,
    padding: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  ratingButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  modalSubmitButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSubmitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  modalSubmitText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  completedSessionDetails: {
    marginTop: 12,
    gap: 12,
  },
  sessionDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sessionDetailTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  sessionDetailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  actionItemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  actionItemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
  },
  chartIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  completedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    letterSpacing: 0.1,
  },
});