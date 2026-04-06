// components/ui/ProtectedRoute.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth, getEntrepreneurId } from '@/contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { ActivityService } from '@/services/activity';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const redirectingRef = useRef(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const handleAuthAndActivities = async () => {
      console.log('[ProtectedRoute] Statut:', {
        isLoading,
        isAuthenticated,
        redirecting: redirectingRef.current,
      });

      // 1️⃣ Vérifie l'authentification
      if (!isLoading && !isAuthenticated && !redirectingRef.current) {
        console.log('[ProtectedRoute] Redirection vers login - non authentifié');
        redirectingRef.current = true;

        try {
          await logout();
        } catch (error) {
          console.warn('[ProtectedRoute] Erreur lors de la déconnexion:', error);
        } finally {
          router.replace('/auth/login');
        }
        return;
      }

      // 2️⃣ Si authentifié, charge les activités
      if (!isLoading && isAuthenticated) {
        try {
          const entrepreneurId = await getEntrepreneurId();
          if (!entrepreneurId) {
            console.warn('[ProtectedRoute] Aucun entrepreneur ID trouvé');
            setLoadingActivities(false);
            // Ne pas rediriger immédiatement, permettre l'accès au dashboard
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
            return;
          }

          const data = await ActivityService.listByEntrepreneur(entrepreneurId);
          setActivities(data || []);
          setLoadingActivities(false);

          if (!data || (data.count !== undefined && data.count === 0)) {
            console.log('[ProtectedRoute] Aucune activité trouvée');
            // Ne pas rediriger automatiquement, permettre l'accès
          }
          
          // 3️⃣ Animation d'apparition
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        } catch (error: any) {
          console.error('[ProtectedRoute] Erreur chargement activités:', error);
          setLoadingActivities(false);
          
          // ✅ Si erreur 401, déconnecter et rediriger
          if (error.message?.includes('401') || error.status === 401 || error.message?.includes('Unauthorized')) {
            console.log('[ProtectedRoute] Erreur 401 détectée, déconnexion...');
            try {
              await logout();
              router.replace('/auth/login');
            } catch (logoutError) {
              console.error('[ProtectedRoute] Erreur lors de la déconnexion:', logoutError);
              router.replace('/auth/login');
            }
            return;
          }
          
          // Pour les autres erreurs, permettre l'accès quand même (mode offline)
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    handleAuthAndActivities();
  }, [isAuthenticated, isLoading]);

  // États de chargement
  if (isLoading || loadingActivities) {
    return <LoadingSpinner message="Chargement en cours..." />;
  }

  // Redirection ou non authentifié
  if (redirectingRef.current || !isAuthenticated) {
    return <LoadingSpinner message="Redirection vers la connexion..." />;
  }

  // ✅ Contenu protégé
  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
}
