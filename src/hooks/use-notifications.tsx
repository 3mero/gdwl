"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocalStorage } from './use-local-storage';
import { useViewSettings } from './use-view-settings';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  countryCode: string; // 'om', 'sa', 'ae', 'kw', 'all', etc.
  countryName: string;
  date: string;
  type: 'holiday_update' | 'system' | 'ai_sync' | 'broadcast';
  read: boolean;
  timestamp: string;
}

interface NotificationsContextType {
  notifications: SystemNotification[];
  filteredNotifications: SystemNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<SystemNotification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useLocalStorage<SystemNotification[]>('gdwl_notifications', []);
  const [deletedIds, setDeletedIds] = useLocalStorage<string[]>('gdwl_deleted_notif_ids', []);
  const { lastHolidayCountry } = useViewSettings();

  const userCountry = (lastHolidayCountry || 'om').toLowerCase();

  // Filter out permanently deleted notification IDs and filter by country
  const filteredNotifications = React.useMemo(() => {
    return notifications
      .filter(n => !deletedIds.includes(n.id))
      .filter(n => 
        n.countryCode === 'all' || 
        n.countryCode.toLowerCase() === userCountry ||
        !n.countryCode
      );
  }, [notifications, deletedIds, userCountry]);

  const unreadCount = React.useMemo(() => {
    return filteredNotifications.filter(n => !n.read).length;
  }, [filteredNotifications]);

  const addNotification = useCallback((data: Omit<SystemNotification, 'id' | 'read' | 'timestamp'>) => {
    // Clean any "Ollama" or "مدفوعة الأجر" from test/automated messages
    const cleanMessage = data.message
      .replace(/Ollama/gi, '')
      .replace(/مدفوعة الأجر/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const newNotification: SystemNotification = {
      ...data,
      message: cleanMessage,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      read: false,
      timestamp: new Date().toISOString(),
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev.filter(n => n.id !== newNotification.id)];
      return updated.slice(0, 100);
    });
  }, [setNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [setNotifications]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [setNotifications]);

  const deleteNotification = useCallback((id: string) => {
    setDeletedIds(prev => [...prev, id]);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [setDeletedIds, setNotifications]);

  const clearNotifications = useCallback(() => {
    // Store all current IDs as permanently deleted so they NEVER return!
    setNotifications(prev => {
      const allIds = prev.map(n => n.id);
      setDeletedIds(old => Array.from(new Set([...old, ...allIds])));
      return [];
    });
  }, [setNotifications, setDeletedIds]);

  const value = {
    notifications,
    filteredNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
