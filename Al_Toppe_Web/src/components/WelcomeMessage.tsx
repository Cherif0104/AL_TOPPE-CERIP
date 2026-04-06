import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { CheckCircle, X } from 'lucide-react';
import { User } from '../services/api';

interface WelcomeMessageProps {
  user: User;
  onClose: () => void;
}

export function WelcomeMessage({ user, onClose }: WelcomeMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  const getRoleWelcomeMessage = () => {
    switch (user.role) {
      case 'entrepreneur':
        return {
          title: `Bienvenue ${user.entrepreneur?.first_name || 'Entrepreneur'} ! 🎉`,
          message: 'Votre compte entrepreneur est maintenant connecté à l\'API AL-TOPPE. Explorez vos activités et suivez votre croissance.',
          color: 'border-[#006666] bg-[#006666]/5'
        };
      case 'coach':
        return {
          title: 'Bienvenue Coach ! 👥',
          message: 'Accédez à vos entrepreneurs et gérez vos sessions d\'accompagnement.',
          color: 'border-[#006666] bg-[#006666]/5'
        };
      case 'admin':
        return {
          title: 'Bienvenue Administrateur ! ⚙️',
          message: 'Gérez la plateforme et accédez aux analytics complètes.',
          color: 'border-[#FF9933] bg-[#FF9933]/5'
        };
      case 'bailleur':
        return {
          title: 'Bienvenue Bailleur de fonds ! 💰',
          message: 'Gérez vos programmes de financement et suivez votre portfolio.',
          color: 'border-[#006666] bg-[#006666]/5'
        };
      default:
        return {
          title: 'Bienvenue ! 👋',
          message: 'Vous êtes maintenant connecté à AL-TOPPE.',
          color: 'border-green-500 bg-green-50'
        };
    }
  };

  const welcomeData = getRoleWelcomeMessage();

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
      <Card className={`p-4 w-80 shadow-lg ${welcomeData.color} border-2`}>
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              {welcomeData.title}
            </h3>
            <p className="text-sm text-gray-700">
              {welcomeData.message}
            </p>
            {user.entrepreneur && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  {user.entrepreneur.activities_count ?? 0} activité(s) •{' '}
                  {(user.entrepreneur.locations ?? []).length} localisation(s)
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}