import { useState } from 'react';
import { Users, Settings, DollarSign, BarChart3, Bell, User, LogOut, Home, Building, FileText, Menu, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

// Types
interface UserType {
  role: string;
  full_name?: string;
  phone: string;
  role_display?: string;
}

interface NavigationProps {
  currentRole: string;
  currentPage: string;
  user: UserType;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export function Navigation({ currentRole, currentPage, user, onPageChange, onLogout }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Nouvelle session', description: 'Une nouvelle session a été planifiée pour demain.', time: 'il y a 5 min', isRead: false },
    { id: 2, title: 'Rapport mensuel', description: 'Votre rapport de performance mensuel est prêt.', time: 'il y a 2 heures', isRead: false },
    { id: 3, title: 'Message reçu', description: 'Vous avez reçu un nouveau message de votre coach.', time: 'il y a 1 jour', isRead: true },
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const roleConfig = {
    entrepreneur: {
      name: 'Entrepreneur',
      color: 'bg-[#006666]',
      icon: Building,
      menuItems: [
        { id: 'dashboard', label: 'Tableau de bord', icon: Home },
        { id: 'activities', label: 'Mes Activités', icon: Building },
        { id: 'sessions', label: 'Sessions Coach', icon: Users },
        { id: 'reports', label: 'Mes Rapports', icon: FileText },
      ],
    },
    coach: {
      name: 'Coach',
      color: 'bg-[#006666]',
      icon: Users,
      menuItems: [
        { id: 'dashboard', label: 'Tableau de bord', icon: Home },
        { id: 'entrepreneurs', label: 'Entrepreneurs', icon: Users },
        { id: 'sessions', label: 'Sessions', icon: BarChart3 },
        { id: 'business-plans', label: 'Plans d\'affaires', icon: FileText },
        { id: 'reports', label: 'Rapports', icon: BarChart3 },
      ],
    },
    admin: {
      name: 'Administrateur',
      color: 'bg-[#FF9933]',
      icon: Settings,
      menuItems: [
        { id: 'dashboard', label: 'Tableau de bord', icon: Home },
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'business-plans', label: 'Plans d\'affaires', icon: FileText },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ],
    },
    bailleur: {
      name: 'Bailleur',
      color: 'bg-[#006666]',
      icon: DollarSign,
      menuItems: [
        { id: 'dashboard', label: 'Tableau de bord', icon: Home },
        { id: 'programs', label: 'Programmes', icon: DollarSign },
        { id: 'applications', label: 'Candidatures', icon: Users },
        { id: 'portfolio', label: 'Portfolio', icon: BarChart3 },
      ],
    },
  };

  // Map API roles to frontend roles
  const roleMap: Record<string, keyof typeof roleConfig> = {
    entrepreneur: 'entrepreneur',
    coach: 'coach',
    bailleur: 'bailleur',
    administrateur: 'admin',
    admin: 'admin',
  };

  const normalizedRole = currentRole?.toLowerCase();
  const mappedRole = roleMap[normalizedRole] || 'entrepreneur';
  const currentConfig = roleConfig[mappedRole];
  const CurrentIcon = currentConfig.icon;

  const handlePageSelect = (pageId: string) => {
    onPageChange(pageId);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Logo et titre */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#006666] rounded-lg flex items-center justify-center shrink-0">
                {/* <img src="/logo.jpg" alt="AL-TOPPE" width={32} height={32} /> */}
              <span className="text-white font-bold text-sm md:text-base">AT</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-semibold text-gray-900 leading-tight">AL-TOPPE</h1>
              <p className="text-xs text-gray-500">Gestion d'entreprise</p>
            </div>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center space-x-4 xl:space-x-8">
          {currentConfig.menuItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${isActive
                  ? 'text-[#006666] bg-[#006666]/10 font-medium'
                  : 'text-gray-600 hover:text-[#006666] hover:bg-gray-50'
                  }`}
              >
                <ItemIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop User Actions */}
        <div className="hidden lg:flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-2 bg-[#006666]/10 rounded-lg">
            <CurrentIcon className="w-4 h-4 text-[#006666]" />
            <span className="text-sm font-medium text-[#006666]">{currentConfig.name}</span>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 hover:bg-gray-100 rounded-md transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-[#FF9933] text-white rounded-full flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[350] w-80 border border-gray-200 bg-white p-0 shadow-xl" align="end">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-[#006666] hover:underline flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-[#006666]/5' : ''}`}>
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{n.description}</p>
                      <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">{n.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucune notification</p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg">
            <User className="w-4 h-4 text-gray-600" />
            <div className="text-sm">
              <p className="font-medium text-gray-900 leading-none mb-1">{user.full_name || user.phone}</p>
              <p className="text-xs text-gray-500">{user.role_display || user.role}</p>
            </div>
          </div> */}

          <button
            onClick={onLogout}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-red-500"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Actions Right */}
        <div className="flex lg:hidden items-center space-x-2 sm:space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative p-2 hover:bg-gray-100 rounded-md transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] bg-[#FF9933] text-white rounded-full flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="z-[350] w-72 border border-gray-200 bg-white p-0 shadow-xl" align="end">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-[#006666] hover:underline">
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-4 border-b border-gray-50 last:border-0 ${!n.isRead ? 'bg-[#006666]/5' : ''}`}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase">{n.time}</p>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-4">
          <div className="flex items-center space-x-3 px-2 mb-6 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-[#006666] rounded-full flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-gray-900 truncate">{user.full_name || user.phone}</p>
              <p className="text-xs text-gray-500 truncate">{user.role_display || user.role}</p>
            </div>
            <div className="px-2 py-1 bg-[#006666]/10 rounded-md">
              <span className="text-[10px] font-bold text-[#006666] uppercase">{currentConfig.name}</span>
            </div>
          </div>

          <div className="space-y-1">
            {currentConfig.menuItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageSelect(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'text-[#006666] bg-[#006666]/10 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 active:scale-95'
                    }`}
                >
                  <ItemIcon className="w-5 h-5" />
                  <span className="text-base">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all active:scale-95"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-base font-medium">Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
