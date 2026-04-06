import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { NotificationProvider } from './NotificationContext';

interface AppContextType {
  isAppReady: boolean;
  showSplash: boolean;
  onSplashComplete: () => void;
  restartApp: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

SplashScreen.preventAutoHideAsync();

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Préparation optimisée - minimiser le temps d'attente
        const preparationTasks = [
          // Vérifier si c'est le premier lancement
          (async () => {
            const isFirstLaunch = await AsyncStorage.getItem('isFirstLaunch');
            if (isFirstLaunch === null) {
              await AsyncStorage.setItem('isFirstLaunch', 'false');
            }
          })(),
          // Attendre un minimum pour permettre au splash natif de s'afficher
          new Promise(resolve => setTimeout(resolve, 300)),
        ];
        
        await Promise.all(preparationTasks);
        
        setIsAppReady(true);
      } catch (e) {
        console.warn('Error during app preparation:', e);
        // Même en cas d'erreur, permettre le démarrage
        setIsAppReady(true);
      } finally {
        // Cacher le splash natif seulement après que tout soit prêt
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Error hiding native splash:', e);
        }
      }
    }

    prepare();
  }, []);

  const onSplashComplete = () => {
    setShowSplash(false);
  };

  const restartApp = () => {
    setShowSplash(true);
    setIsAppReady(false);
    setTimeout(() => {
      setIsAppReady(true);
    }, 100);
  };

  const value: AppContextType = {
    isAppReady,
    showSplash,
    onSplashComplete,
    restartApp,
  };

  return (
    <AppContext.Provider value={value}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}