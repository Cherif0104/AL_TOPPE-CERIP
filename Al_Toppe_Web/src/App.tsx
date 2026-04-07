import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { LoginForm } from './components/LoginForm';
import { WelcomeMessage } from './components/WelcomeMessage';
import { ConnectivityStatus } from './components/ConnectivityStatus';
import { CoachDashboard } from './components/CoachDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { BailleurDashboard } from './components/BailleurDashboard';
import { EntrepreneursManagement } from './components/EntrepreneursManagement';
import { SessionsManagement } from './components/SessionsManagement';
import { UserManagement } from './components/UserManagement';
import { ProgramsManagement } from './components/ProgramsManagement';
import { CoachReports } from './components/CoachReports';
import { CoachSessionsManager } from './components/CoachSessionsManager';
import { AdminAnalytics } from './components/AdminAnalytics';
import { AdminSettings } from './components/AdminSettings';
import { ApplicationsManagement } from './components/ApplicationsManagement';
import { PortfolioManagement } from './components/PortfolioManagement';
import { BusinessPlansManagement } from './components/BusinessPlansManagement';
import { DemoPresentation } from './components/DemoPresentation';
import { apiService, User } from './services/api';
import { NetworkError } from './services/errorHandler';
import { isSupabaseAuthActive } from './config';
import {
  getSupabaseSession,
  sessionToAppUser,
  signOutSupabase,
} from './services/supabaseAuth';


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageAction, setPageAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showDemoPresentation, setShowDemoPresentation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /** Si getSession() ou l’API Django bloque (réseau, bloqueur), on affiche quand même l’UI après ce délai. */
    const maxWaitMs = 10_000;
    const maxWaitTimer = window.setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, maxWaitMs);

    const checkAuth = async () => {
      try {
        if (isSupabaseAuthActive()) {
          const session = await getSupabaseSession();
          if (!cancelled && session?.user) {
            setUser(sessionToAppUser(session));
          }
        } else {
          apiService.syncTokenFromStorage();
          if (!apiService.isAuthenticated()) {
            return;
          }
          const storedUser = apiService.getStoredUser();
          if (!storedUser) {
            return;
          }
          try {
            const profile = await apiService.getProfile();
            if (!cancelled) setUser(profile);
          } catch (e) {
            if (e instanceof NetworkError && e.status === 401) {
              console.warn('Session expirée ou invalide.');
              apiService.logout();
            } else {
              console.warn(
                'Profil API indisponible, utilisation des données de session locales.',
                e,
              );
              if (!cancelled) setUser(storedUser);
            }
          }
        }
      } catch (error) {
        console.error('Erreur auth:', error);
      } finally {
        if (!cancelled) {
          window.clearTimeout(maxWaitTimer);
          setIsLoading(false);
        }
      }
    };
    void checkAuth();
    return () => {
      cancelled = true;
      window.clearTimeout(maxWaitTimer);
    };
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setShowWelcome(true);
  };

  const handleLogout = () => {
    void (async () => {
      if (isSupabaseAuthActive()) {
        await signOutSupabase();
      } else {
        apiService.logout();
      }
      setUser(null);
      setCurrentPage('dashboard');
    })();
  };

  const handlePageChange = (page: string, action?: string) => {
    setCurrentPage(page);
    setPageAction(action || null);
  };

  const renderContent = () => {
    if (!user) return null;

    const roleKey = (user.role || 'entrepreneur').toLowerCase();
    switch (roleKey) {
      case 'entrepreneur':
        switch (currentPage) {
          case 'dashboard': return <CoachDashboard user={user} />;
          case 'activities': return <EntrepreneursManagement user={user} />;
          case 'sessions': return <SessionsManagement user={user} />;
          case 'reports': return <CoachReports user={user} />;
          default: return <CoachDashboard user={user} />;
        }
      case 'coach':
        switch (currentPage) {
          case 'dashboard': return <CoachDashboard user={user} onPageChange={handlePageChange} />;
          case 'entrepreneurs': return <EntrepreneursManagement user={user} initialAction={pageAction} onActionHandled={() => setPageAction(null)} />;
          case 'sessions': return <CoachSessionsManager user={user} initialAction={pageAction} onActionHandled={() => setPageAction(null)} />;
          case 'business-plans': return <BusinessPlansManagement user={user} />;
          case 'reports': return <CoachReports user={user} />;
          default: return <CoachDashboard user={user} onPageChange={handlePageChange} />;
        }
      case 'admin':
      case 'administrateur':
        switch (currentPage) {
          case 'dashboard': return <AdminDashboard user={user} onPageChange={handlePageChange} />;
          case 'users': return <UserManagement user={user} />;
          case 'business-plans': return <BusinessPlansManagement user={user} />;
          case 'analytics': return <AdminAnalytics user={user} />;
          case 'settings': return <AdminSettings user={user} />;
          default: return <AdminDashboard user={user} onPageChange={handlePageChange} />;
        }
      case 'bailleur':
        switch (currentPage) {
          case 'dashboard': return <BailleurDashboard user={user} />;
          case 'programs': return <ProgramsManagement user={user} />;
          case 'applications': return <ApplicationsManagement user={user} />;
          case 'portfolio': return <PortfolioManagement user={user} />;
          default: return <BailleurDashboard user={user} />;
        }
      default:
        return <CoachDashboard user={user} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-[#006666] rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <span className="text-white text-2xl font-bold">AT</span>
          </div>
          <p className="text-gray-600">Chargement d'AL-TOPPE...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showDemoPresentation) {
      return (
        <DemoPresentation onClose={() => setShowDemoPresentation(false)} />
      );
    }
    return (
      <LoginForm
        onLogin={handleLogin}
        onOpenDemo={() => setShowDemoPresentation(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentRole={user.role || 'entrepreneur'}
        currentPage={currentPage}
        user={user}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
      />

      <main className="p-6 max-w-7xl mx-auto">{renderContent()}</main>

      {showWelcome && <WelcomeMessage user={user} onClose={() => setShowWelcome(false)} />}
      <ConnectivityStatus />
    </div>
  );
}
