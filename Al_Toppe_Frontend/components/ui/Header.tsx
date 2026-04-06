import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Globe, User, Menu } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showNotifications?: boolean;
  showLanguage?: boolean;
  showProfile?: boolean;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  transparent?: boolean;
}

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export default function Header({
  title,
  showBackButton = false,
  showNotifications = true,
  showLanguage = true,
  showProfile = true,
  onBackPress,
  onNotificationPress,
  onProfilePress,
  transparent = false,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);

  // Refresh notifications when the header is mounted
  useEffect(() => {
    refreshNotifications();
  }, []);

  const handleLanguageSelect = (language: typeof languages[0]) => {
    setSelectedLanguage(language);
    setShowLanguageModal(false);
    // TODO: Implement language change logic
  };

  const headerHeight = Platform.OS === 'ios' ? 44 : 56;
  const totalHeight = insets.top + headerHeight;

  return (
    <>
      <View 
        style={[
          styles.container,
          { 
            paddingTop: insets.top,
            backgroundColor: transparent ? 'transparent' : Colors.surface,
          }
        ]}
      >
        <StatusBar 
          barStyle={transparent ? "light-content" : "dark-content"} 
          backgroundColor={transparent ? 'transparent' : Colors.surface}
          translucent={transparent}
        />
        
        <View style={[styles.header, { height: headerHeight }]}>
          {/* Left Section */}
          <View style={styles.leftSection}>
            {showBackButton ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onBackPress}
                activeOpacity={0.7}
              >
                <Menu size={24} color={transparent ? '#FFFFFF' : Colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={styles.logoSection}>
                <View style={styles.miniLogo}>
                  <Text style={[styles.miniLogoText, { color: transparent ? '#FFFFFF' : Colors.primary }]}>
                    AT
                  </Text>
                </View>
                {title && (
                  <Text style={[styles.title, { color: transparent ? '#FFFFFF' : Colors.text }]}>
                    {title}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Center Section */}
          <View style={styles.centerSection}>
            {!showBackButton && !title && (
              <Text style={[styles.appName, { color: transparent ? '#FFFFFF' : Colors.text }]}>
                AL-TOPPE
              </Text>
            )}
          </View>

          {/* Right Section */}
          <View style={styles.rightSection}>
            {/* {showLanguage && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowLanguageModal(true)}
                activeOpacity={0.7}
              >
                <Globe size={22} color={transparent ? '#FFFFFF' : Colors.text} />
              </TouchableOpacity>
            )} */}

            {showNotifications && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNotificationPress}
                activeOpacity={0.7}
              >
                <Bell size={22} color={transparent ? '#FFFFFF' : Colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {showProfile && (
              <TouchableOpacity
                style={styles.profileButton}
                onPress={onProfilePress}
                activeOpacity={0.7}
              >
                {user?.avatar ? (
                  <View style={styles.avatar}>
                    {/* TODO: Add image support */}
                    <User size={20} color={transparent ? '#FFFFFF' : Colors.primary} />
                  </View>
                ) : (
                  <View style={[styles.avatar, { backgroundColor: transparent ? 'rgba(255,255,255,0.2)' : Colors.primary }]}>
                    <Text style={styles.avatarText}>
                    <User size={20} color={transparent ? '#FFFFFF' : '#FFFFFF'} />
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir la langue</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    selectedLanguage.code === item.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => handleLanguageSelect(item)}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                  {selectedLanguage.code === item.code && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  miniLogoText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.primary,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxHeight: 300,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.gray500,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.text,
  },
  checkMark: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: 'Inter-Bold',
  },
});