import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AlertsService from '@/services/alerts';

interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
  alertId?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from storage on app start
  useEffect(() => {
    loadNotifications();
  }, []);

  // Refresh notifications when user changes
  useEffect(() => {
      refreshNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notifications');
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications);
        setNotifications(parsedNotifications);
        updateUnreadCount(parsedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async (notificationsToSave: Notification[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(notificationsToSave));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const updateUnreadCount = (notificationsToUpdate: Notification[]) => {
    const count = notificationsToUpdate.filter(n => !n.read).length;
    setUnreadCount(count);
  };

  const refreshNotifications = async () => {
    
    setLoading(true);
    try {
      // Get unread alerts from the API
      const unreadAlerts = await AlertsService.getUnreadAlerts();
      
      // Convert alerts to notifications
      const newNotifications: Notification[] = unreadAlerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        message: alert.description,
        severity: alert.severity,
        timestamp: alert.triggered_at,
        read: alert.status !== 'active',
        alertId: alert.id,
      }));
      
      // Merge with existing notifications, avoiding duplicates
      const mergedNotifications = [...newNotifications];
      const existingNotificationIds = new Set(newNotifications.map(n => n.id));
      
      notifications.forEach(notification => {
        if (!existingNotificationIds.has(notification.id)) {
          mergedNotifications.push(notification);
        }
      });
      
      // Sort by timestamp (newest first)
      mergedNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setNotifications(mergedNotifications);
      updateUnreadCount(mergedNotifications);
      await saveNotifications(mergedNotifications);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const updatedNotifications = notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      
      setNotifications(updatedNotifications);
      updateUnreadCount(updatedNotifications);
      await saveNotifications(updatedNotifications);
      
      // If this notification is linked to an alert, mark the alert as read
      const notification = notifications.find(n => n.id === id);
      if (notification?.alertId) {
        await AlertsService.acknowledgeAlert(notification.alertId);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      
      setNotifications(updatedNotifications);
      updateUnreadCount(updatedNotifications);
      await saveNotifications(updatedNotifications);
      
      // Mark all alerts as read
      const unreadAlertIds = notifications
        .filter(n => !n.read && n.alertId)
        .map(n => n.alertId) as string[];
      
      if (unreadAlertIds.length > 0) {
        await AlertsService.markAlertsAsRead(unreadAlertIds);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      setNotifications([]);
      setUnreadCount(0);
      await AsyncStorage.removeItem('notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}