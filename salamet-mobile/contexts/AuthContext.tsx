import { router, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMedecin: boolean;
  isPatiente: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    checkAuth();
  }, []);

  // Gérer la navigation selon l'état d'authentification
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('🛡️ [AuthContext] Auth:', !!user, 'Segments:', segments);

    if (!user && !inAuthGroup) {
      // Non authentifié et pas sur la page de login
      console.log('🔒 [AuthContext] Non authentifié, redirection vers login');
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Authentifié mais sur la page de login
      console.log('✅ [AuthContext] Authentifié, redirection selon le rôle');
      redirectToDashboard(user.role);
    }
  }, [user, segments, isLoading]);

  /**
   * 🎯 Rediriger vers le dashboard approprié selon le rôle
   */
  const redirectToDashboard = (role: 'medecin' | 'patiente' | 'admin') => {
    console.log('🎯 [AuthContext] Redirection dashboard pour rôle:', role);
    
    // Toujours rediriger vers /(tabs)/dashboard
    // Le composant DashboardScreen affichera le bon dashboard selon le rôle
    router.replace('/(tabs)/dashboard');
  };

  /**
   * ✅ Vérifier l'authentification
   */
  const checkAuth = async () => {
    try {
      console.log('🔍 [AuthContext] Vérification authentification...');
      
      const isAuth = await authService.isAuthenticated();
      
      if (isAuth) {
        const currentUser = await authService.getCurrentUser();
        console.log('✅ [AuthContext] Utilisateur trouvé:', currentUser);
        setUser(currentUser);
      } else {
        console.log('❌ [AuthContext] Non authentifié');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Erreur vérification auth:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔐 Connexion
   */
  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 [AuthContext] Connexion...');
      
      const loggedUser = await authService.login(email, password);
      console.log('✅ [AuthContext] Connexion réussie:', loggedUser);
      
      setUser(loggedUser);
      
      // Rediriger vers le dashboard approprié
      redirectToDashboard(loggedUser.role);
    } catch (error) {
      console.error('❌ [AuthContext] Erreur connexion:', error);
      throw error;
    }
  };

  /**
   * 🚪 Déconnexion
   */
  const logout = async () => {
    try {
      console.log('🚪 [AuthContext] Déconnexion...');
      
      await authService.logout();
      setUser(null);
      
      console.log('✅ [AuthContext] Déconnexion réussie');
      router.replace('/auth/login');
    } catch (error) {
      console.error('❌ [AuthContext] Erreur déconnexion:', error);
      throw error;
    }
  };

  /**
   * 🔄 Rafraîchir l'utilisateur
   */
  const refreshUser = async () => {
    try {
      console.log('🔄 [AuthContext] Rafraîchissement utilisateur...');
      
      const refreshedUser = await authService.refreshUser();
      
      if (refreshedUser) {
        console.log('✅ [AuthContext] Utilisateur rafraîchi:', refreshedUser);
        setUser(refreshedUser);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Erreur rafraîchissement:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isMedecin: user?.role === 'medecin',
    isPatiente: user?.role === 'patiente',
    isAdmin: user?.role === 'admin',
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  
  return context;
}
