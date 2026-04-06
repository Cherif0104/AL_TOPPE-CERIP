import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple event bus for app-wide updates
type EventHandler = (payload?: any) => void;
const events: Record<string, Set<EventHandler>> = {};

export const AppEvents = {
  on(event: string, handler: EventHandler) {
    if (!events[event]) events[event] = new Set();
    events[event].add(handler);
    return () => events[event].delete(handler);
  },
  emit(event: string, payload?: any) {
    if (!events[event]) return;
    for (const h of events[event]) {
      try { h(payload); } catch {}
    }
  },
};

class StorageService {
  // Auth related storage
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('authToken', token);
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem('authToken');
  }

  async setUserInfo(userInfo: any): Promise<void> {
    await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  async getUserInfo(): Promise<any | null> {
    const userInfo = await AsyncStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  async removeUserInfo(): Promise<void> {
    await AsyncStorage.removeItem('userInfo');
  }

  // App settings
  async setLanguage(language: string): Promise<void> {
    await AsyncStorage.setItem('appLanguage', language);
  }

  async getLanguage(): Promise<string> {
    const language = await AsyncStorage.getItem('appLanguage');
    return language || 'fr';
  }

  async setTheme(theme: string): Promise<void> {
    await AsyncStorage.setItem('appTheme', theme);
  }

  async getTheme(): Promise<string> {
    const theme = await AsyncStorage.getItem('appTheme');
    return theme || 'light';
  }

  // Offline data storage
  async storeOfflineData(key: string, data: any): Promise<void> {
    await AsyncStorage.setItem(`offline_${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  }

  async getOfflineData(key: string): Promise<any | null> {
    const stored = await AsyncStorage.getItem(`offline_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if data is less than 24 hours old
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    }
    return null;
  }

  async removeOfflineData(key: string): Promise<void> {
    await AsyncStorage.removeItem(`offline_${key}`);
  }

  // Clear all app data
  async clearAllData(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
  }

  // Backup and restore
  async createBackup(): Promise<string> {
    const keys = await AsyncStorage.getAllKeys();
    const data = await AsyncStorage.multiGet(keys);
    return JSON.stringify(Object.fromEntries(data));
  }

  async restoreFromBackup(backupData: string): Promise<void> {
    const data = JSON.parse(backupData);
    const pairs = Object.entries(data);
    await AsyncStorage.multiSet(pairs);
  }
}

export default new StorageService();