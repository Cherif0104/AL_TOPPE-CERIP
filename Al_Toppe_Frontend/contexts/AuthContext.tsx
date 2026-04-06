// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '@/services/api';
import { router } from 'expo-router';

interface User {
  id: number;
  name: string;
  phone: string;

  email?: string;
  full_name?: string;
  createdAt: string;
  role: string;
  isVerified: boolean;

  entrepreneur?: {
    id: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
    
    // ✅ Écouter les événements de déconnexion forcée (401)
    const handleUnauthorized = () => {
      console.log('[AuthContext] Événement unauthorized reçu, déconnexion...');
      logout();
    };
    
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('auth:unauthorized' as any, handleUnauthorized);
      return () => {
        window.removeEventListener('auth:unauthorized' as any, handleUnauthorized);
      };
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');

      console.log("[AuthContext] Token présent:", !!token);
      console.log("[AuthContext] User info présent:", !!userInfo);
      
      // ✅ Vérifier la validité du token si présent
      if (token && userInfo) {
        try {
          const userData = JSON.parse(userInfo);
          
          // ✅ Optionnel : Vérifier la validité du token avec une requête légère
          // Si le token est invalide, il sera nettoyé automatiquement par l'intercepteur 401
          setUser(userData);
          console.log("[AuthContext] Utilisateur authentifié:", userData.phone);
        } catch (parseError) {
          console.error('[AuthContext] Erreur parsing userInfo:', parseError);
          // Nettoyer les données corrompues
          await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
          setUser(null);
        }
      } else {
        console.log("[AuthContext] Aucun token ou userInfo trouvé");
        // Nettoyer les données incomplètes
        if (token || userInfo) {
          await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
        }
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext] Erreur vérification auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await ApiService.login(phone, password);

      if (response && response.user && response.access) {
        // Stocker les tokens AVANT de mettre à jour l'état
        await AsyncStorage.setItem('authToken', response.access);
        if (response.refresh) {
          await AsyncStorage.setItem('refreshToken', response.refresh);
        }
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));
        
        // Mettre à jour l'état APRÈS le stockage
        setUser(response.user);
        console.log("[AuthContext] Connexion réussie pour:", response.user.phone);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await ApiService.register(userData);
      
      if (response && response.user) {
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));
        setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AuthContext] Register error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await ApiService.logout();
    } catch (error) {
      console.warn('[AuthContext] Logout API error:', error);
    } finally {
      // Nettoyer le state local
      setUser(null);
      await AsyncStorage.multiRemove([
        'authToken',
        'refreshToken',
        'userInfo',
        'entrepreneur_id'
      ]);
      setIsLoading(false);
      console.log("[AuthContext] Déconnexion complète");
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user, // Dépend uniquement de l'état user
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export async function getEntrepreneurId(): Promise<string | null> {
  try {
    const userInfoString = await AsyncStorage.getItem('userInfo');
    if (!userInfoString) return null;

    const userInfo = JSON.parse(userInfoString);

    return userInfo.entrepreneur?.id || null;
  } catch (error) {
    console.error("Erreur récupération entrepreneur_id:", error);
    return null;
  }
}

