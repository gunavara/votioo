import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  AppNotification,
  fetchNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '../lib/notifications';
import { devError } from '../lib/devLog';
import { supabase } from '../lib/supabase';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markOneRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAllRead: async () => {},
  markOneRead: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchNotificationsForUser(user.id);
      setNotifications(data);
    } catch (error) {
      devError('Notifications fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;

    try {
      await markAllNotificationsRead(user.id);
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (error) {
      devError('Notifications mark-all-read error:', error);
    }
  }, [user]);

  const markOneRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      devError('Notification mark-read error:', error);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshNotifications, user]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.is_read).length,
      loading,
      refreshNotifications,
      markAllRead,
      markOneRead,
    }),
    [loading, markAllRead, markOneRead, notifications, refreshNotifications]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
