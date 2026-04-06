// components/layout/Footer.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  DollarSign, 
  BarChart3, 
  Mic, 
  UserSquare2,
  Phone,
  Mail,
  MapPin,
  ExternalLink
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FooterProps {
  showContactInfo?: boolean;
  showQuickLinks?: boolean;
  compact?: boolean;
  showNavigation?: boolean;
}

export default function Footer({ 
  showContactInfo = false, 
  showQuickLinks = false,
  compact = false,
  showNavigation = false
}: FooterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleContactPress = (type: 'phone' | 'email' | 'map') => {
    switch (type) {
      case 'phone':
        Linking.openURL('tel:+221338690000');
        break;
      case 'email':
        Linking.openURL('mailto:contact@altoppe.sn');
        break;
      case 'map':
        Linking.openURL('https://maps.google.com/?q=Dakar,Senegal');
        break;
    }
  };

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const navigationItems = [
    { 
      name: 'Accueil', 
      icon: Home, 
      route: '/(tabs)',
      path: '/'
    },
    { 
      name: 'Voice AI', 
      icon: Mic, 
      route: '/(tabs)/voice-ai',
      path: '/voice-ai'
    },
    { 
      name: 'Finances', 
      icon: DollarSign, 
      route: '/(tabs)/finances',
      path: '/finances'
    },
   
    { 
      name: 'Coaching', 
      icon: UserSquare2, 
      route: '/(tabs)/coaching',
      path: '/coaching'
    },
  ];

  const isActive = (routePath: string) => {
    return pathname === routePath || pathname.startsWith(routePath + '/');
  };

  // Footer avec navigation (similaire aux tabs)
  if (showNavigation) {
    return (
      <View style={styles.navigationContainer}>
        <View style={styles.navigationContent}>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.navItem}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <Icon 
                  size={24} 
                  color={active ? Colors.primary : Colors.gray500} 
                />
                <Text style={[
                  styles.navText,
                  { color: active ? Colors.primary : Colors.gray500 }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Footer compact
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactContent}>
          <Text style={styles.compactText}>
            © 2024 AL-TOPPE. Tous droits réservés.
          </Text>
          <View style={styles.compactLinks}>
            <TouchableOpacity onPress={() => handleLinkPress('https://altoppe.sn/confidentialite')}>
              <Text style={styles.compactLink}>Confidentialité</Text>
            </TouchableOpacity>
            <Text style={styles.compactSeparator}>•</Text>
            <TouchableOpacity onPress={() => handleLinkPress('https://altoppe.sn/conditions')}>
              <Text style={styles.compactLink}>Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Footer complet
  return (
    <View style={styles.container}>
      {/* Section Contact */}
      {showContactInfo && (
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contactez-nous</Text>
          <View style={styles.contactItems}>
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleContactPress('phone')}
            >
              <Phone size={20} color={Colors.primary} />
              <Text style={styles.contactText}>+221 33 869 00 00</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleContactPress('email')}
            >
              <Mail size={20} color={Colors.primary} />
              <Text style={styles.contactText}>contact@altoppe.sn</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleContactPress('map')}
            >
              <MapPin size={20} color={Colors.primary} />
              <Text style={styles.contactText}>Dakar, Sénégal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Liens rapides */}
      {showQuickLinks && (
        <View style={styles.linksSection}>
          <Text style={styles.sectionTitle}>Liens rapides</Text>
          <View style={styles.linkGrid}>
            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => handleLinkPress('https://altoppe.sn/a-propos')}
            >
              <Text style={styles.linkText}>À propos</Text>
              <ExternalLink size={16} color={Colors.gray500} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => handleLinkPress('https://altoppe.sn/services')}
            >
              <Text style={styles.linkText}>Nos services</Text>
              <ExternalLink size={16} color={Colors.gray500} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => handleLinkPress('https://altoppe.sn/faq')}
            >
              <Text style={styles.linkText}>FAQ</Text>
              <ExternalLink size={16} color={Colors.gray500} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkItem}
              onPress={() => handleLinkPress('https://altoppe.sn/support')}
            >
              <Text style={styles.linkText}>Support</Text>
              <ExternalLink size={16} color={Colors.gray500} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section copyright */}
      <View style={styles.copyrightSection}>
        <Text style={styles.copyrightText}>
          © 2024 AL-TOPPE. Tous droits réservés.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => handleLinkPress('https://altoppe.sn/confidentialite')}>
            <Text style={styles.legalLink}>Politique de confidentialité</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => handleLinkPress('https://altoppe.sn/conditions')}>
            <Text style={styles.legalLink}>Conditions d'utilisation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Navigation Footer (similaire aux tabs)
  navigationContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8, 
    paddingBottom: 30 , // 👈 évite le chevauchement

  },
  navigationContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
    paddingBottom: 10,
  },
  navText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
  },

  // Footer standard
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  compactContainer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.gray500,
  },
  compactLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLink: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  compactSeparator: {
    fontSize: 12,
    color: Colors.gray400,
  },
  contactSection: {
    marginBottom: 24,
  },
  linksSection: {
    marginBottom: 24,
  },
  copyrightSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
    marginBottom: 16,
  },
  contactItems: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
  },
  linkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
    minWidth: 120,
  },
  linkText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
    flex: 1,
  },
  copyrightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.gray500,
    marginBottom: 8,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.primary,
  },
  legalSeparator: {
    fontSize: 12,
    color: Colors.gray400,
  },
});