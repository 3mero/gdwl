"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { GoogleUser, GoogleSyncStatus, FullExport } from '@/lib/types';
import { useLocalStorage } from './use-local-storage';
import {
  fetchGoogleUserProfile,
  uploadToDriveAppData,
  downloadFromDriveAppData,
  getDriveBackupMetadata,
} from '@/lib/google-drive';

// Standard Google Drive AppData OAuth Client Scope (Minimal & Transparent)
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.appdata'
].join(' ');

interface GoogleSyncContextType {
  user: GoogleUser | null;
  status: GoogleSyncStatus;
  lastSynced: string | null;
  error: string | null;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  requestGoogleLogin: (options?: { silent?: boolean; prompt?: string }) => Promise<string | null>;
  loginWithAccessToken: (accessToken: string, expiresIn?: number) => Promise<void>;
  logout: () => void;
  syncNow: (exportData: FullExport) => Promise<boolean>;
  restoreFromCloud: () => Promise<FullExport | null>;
  isDriveConnected: boolean;
  updateCustomAvatar: (avatarUrl: string | undefined) => void;
  refreshLastSyncTime: (token?: string) => Promise<void>;
}

const GoogleSyncContext = createContext<GoogleSyncContextType | undefined>(undefined);

export function GoogleSyncProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useLocalStorage<string | null>('gdwl_google_token', null);
  const [tokenExpiresAt, setTokenExpiresAt] = useLocalStorage<number | null>('gdwl_google_token_expiry', null);
  const [user, setUser] = useLocalStorage<GoogleUser | null>('gdwl_google_user', null);
  const [lastSynced, setLastSynced] = useLocalStorage<string | null>('gdwl_last_synced', null);
  const [autoSync, setAutoSync] = useLocalStorage<boolean>('gdwl_auto_sync', true);
  
  const [status, setStatus] = useState<GoogleSyncStatus>(user ? 'synced' : 'unauthenticated');
  const [error, setError] = useState<string | null>(null);

  // Send anonymous ping to increase usage analytics counter
  const pingAnalyticsCounter = useCallback(async () => {
    try {
      await fetch('/api/stats/ping', { method: 'POST' });
    } catch {
      // Ignore ping errors silently
    }
  }, []);

  // Ensure Google Identity Services script is loaded
  const loadGoogleGsiScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if ((window as any).google?.accounts?.oauth2) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById('google-gsi-client');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, []);

  // Fetch real modifiedTime of backup file from Google Drive
  const refreshLastSyncTime = useCallback(async (token?: string) => {
    const activeToken = token || accessToken;
    if (!activeToken) return;
    try {
      const meta = await getDriveBackupMetadata(activeToken);
      if (meta && meta.modifiedTime) {
        setLastSynced(new Date(meta.modifiedTime).toISOString());
      }
    } catch (e) {
      console.error('Failed to fetch Drive metadata timestamp:', e);
    }
  }, [accessToken, setLastSynced]);

  // Request Google OAuth Token (handles interactive login and background silent refresh)
  const requestGoogleLogin = useCallback(async (options?: { silent?: boolean; prompt?: string }): Promise<string | null> => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      setError('يرجى ضبط NEXT_PUBLIC_GOOGLE_CLIENT_ID في متغيرات البيئة.');
      return null;
    }

    const scriptLoaded = await loadGoogleGsiScript();
    if (!scriptLoaded || !(window as any).google?.accounts?.oauth2) {
      setError('تعذر تحميل خدمة Google Identity.');
      return null;
    }

    return new Promise((resolve) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.access_token) {
              const expiresIn = Number(response.expires_in) || 3599;
              const newExpiry = Date.now() + (expiresIn * 1000);
              setAccessToken(response.access_token);
              setTokenExpiresAt(newExpiry);
              
              try {
                const userProfile = await fetchGoogleUserProfile(response.access_token);
                setUser((prev) => ({
                  ...userProfile,
                  customAvatar: prev?.customAvatar || userProfile.customAvatar,
                }));
                setStatus('synced');
                setError(null);
                pingAnalyticsCounter();
                await refreshLastSyncTime(response.access_token);
              } catch (profileErr: any) {
                console.error('Failed to fetch profile during token callback:', profileErr);
              }
              resolve(response.access_token);
            } else {
              if (response.error && !options?.silent) {
                setError(`فشل تسجيل الدخول بـ Google (${response.error})`);
              }
              resolve(null);
            }
          },
          error_callback: (err: any) => {
            console.warn('Google OAuth Token Client Error:', err);
            if (!options?.silent) {
              setError(err.message || 'حدث خطأ أثناء الاتصال بحساب Google');
            }
            resolve(null);
          }
        });

        // If silent refresh requested, use prompt: '' to avoid popping up consent if already granted
        if (options?.silent) {
          client.requestAccessToken({ prompt: '' });
        } else if (options?.prompt !== undefined) {
          client.requestAccessToken({ prompt: options.prompt });
        } else {
          client.requestAccessToken();
        }
      } catch (err: any) {
        console.error('Google OAuth init error:', err);
        if (!options?.silent) {
          setError(err.message || 'فشل تهيئة خدمة Google OAuth');
        }
        resolve(null);
      }
    });
  }, [loadGoogleGsiScript, setAccessToken, setTokenExpiresAt, setUser, pingAnalyticsCounter, refreshLastSyncTime]);

  // Ensure we have a valid non-expired access token (attempts silent refresh if expired)
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    // If we have a valid token that doesn't expire within the next 60 seconds
    if (accessToken && tokenExpiresAt && Date.now() < (tokenExpiresAt - 60000)) {
      return accessToken;
    }

    // Token is expired or missing, but user is logged in: try silent refresh
    if (user) {
      try {
        const freshToken = await requestGoogleLogin({ silent: true });
        if (freshToken) {
          return freshToken;
        }
      } catch {
        // Silent refresh failed (e.g. requires re-consent)
      }
    }

    // Fall back to existing token if present
    return accessToken;
  }, [accessToken, tokenExpiresAt, user, requestGoogleLogin]);

  const loginWithAccessToken = useCallback(async (token: string, expiresIn: number = 3599) => {
    setStatus('syncing');
    setError(null);
    try {
      const userProfile = await fetchGoogleUserProfile(token);
      setAccessToken(token);
      setTokenExpiresAt(Date.now() + (expiresIn * 1000));
      setUser((prev) => ({
        ...userProfile,
        customAvatar: prev?.customAvatar || userProfile.customAvatar,
      }));
      setStatus('synced');
      pingAnalyticsCounter();
      await refreshLastSyncTime(token);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'فشل تسجيل الدخول باستخدام Google');
      setStatus('error');
    }
  }, [setAccessToken, setTokenExpiresAt, setUser, pingAnalyticsCounter, refreshLastSyncTime]);

  const logout = useCallback(() => {
    setAccessToken(null);
    setTokenExpiresAt(null);
    setUser(null);
    setLastSynced(null);
    setStatus('unauthenticated');
    setError(null);
  }, [setAccessToken, setTokenExpiresAt, setUser, setLastSynced]);

  const syncNow = useCallback(async (exportData: FullExport): Promise<boolean> => {
    const token = await getValidAccessToken();
    if (!token) {
      if (!user) setStatus('unauthenticated');
      return false;
    }

    setStatus('syncing');
    setError(null);

    try {
      const { modifiedTime } = await uploadToDriveAppData(token, exportData);
      const timeStr = new Date(modifiedTime).toISOString();
      setLastSynced(timeStr);
      setStatus('synced');
      pingAnalyticsCounter();
      return true;
    } catch (err: any) {
      // If token expired on Google side (401), try refreshing token once and retrying
      if (err.message === 'SESSION_EXPIRED' || err.message?.includes('401') || err.message?.includes('الجلسة المؤقتة')) {
        const refreshedToken = await requestGoogleLogin({ silent: true });
        if (refreshedToken) {
          try {
            const { modifiedTime } = await uploadToDriveAppData(refreshedToken, exportData);
            const timeStr = new Date(modifiedTime).toISOString();
            setLastSynced(timeStr);
            setStatus('synced');
            pingAnalyticsCounter();
            return true;
          } catch (retryErr: any) {
            console.error('Drive Sync retry failed:', retryErr);
          }
        }
        // Invalidate expired token but DO NOT delete user profile!
        setAccessToken(null);
        setError('انتهت صلاحية جلسة Google المؤقتة. انقر على زر المزامنة لتجديد الاتصال السحابي.');
        setStatus('error');
      } else {
        console.error('Drive Sync Error:', err);
        setError(err.message || 'حدث خطأ أثناء المزامنة مع Google Drive');
        setStatus('error');
      }
      return false;
    }
  }, [getValidAccessToken, user, setLastSynced, pingAnalyticsCounter, requestGoogleLogin, setAccessToken]);

  const restoreFromCloud = useCallback(async (): Promise<FullExport | null> => {
    const token = await getValidAccessToken();
    if (!token) {
      if (!user) setStatus('unauthenticated');
      return null;
    }

    setStatus('syncing');
    setError(null);

    try {
      const cloudData = await downloadFromDriveAppData(token);
      if (cloudData) {
        setLastSynced(new Date().toISOString());
        setStatus('synced');
      }
      return cloudData;
    } catch (err: any) {
      // If token expired (401), try refreshing once
      if (err.message?.includes('401') || err.message?.includes('الجلسة المؤقتة')) {
        const refreshedToken = await requestGoogleLogin({ silent: true });
        if (refreshedToken) {
          try {
            const cloudData = await downloadFromDriveAppData(refreshedToken);
            if (cloudData) {
              setLastSynced(new Date().toISOString());
              setStatus('synced');
              return cloudData;
            }
          } catch (retryErr: any) {
            console.error('Drive restore retry error:', retryErr);
          }
        }
      }
      console.error('Drive Restore Error:', err);
      setError(err.message || 'حدث خطأ أثناء جلب البيانات من Google Drive');
      setStatus('error');
      return null;
    }
  }, [getValidAccessToken, user, setLastSynced, requestGoogleLogin]);

  const updateCustomAvatar = useCallback((avatarUrl: string | undefined) => {
    setUser(prev => prev ? { ...prev, customAvatar: avatarUrl } : null);
  }, [setUser]);

  // Preload Google script on mount so login is instant
  useEffect(() => {
    loadGoogleGsiScript();
  }, [loadGoogleGsiScript]);

  // Refresh timestamp on mount if token is valid
  useEffect(() => {
    if (accessToken) {
      refreshLastSyncTime(accessToken);
    }
  }, [accessToken, refreshLastSyncTime]);

  const value = {
    user,
    status,
    lastSynced,
    error,
    autoSync,
    setAutoSync,
    requestGoogleLogin,
    loginWithAccessToken,
    logout,
    syncNow,
    restoreFromCloud,
    isDriveConnected: !!user,
    updateCustomAvatar,
    refreshLastSyncTime,
  };

  return (
    <GoogleSyncContext.Provider value={value}>
      {children}
    </GoogleSyncContext.Provider>
  );
}

export function useGoogleSync() {
  const context = useContext(GoogleSyncContext);
  if (context === undefined) {
    throw new Error('useGoogleSync must be used within a GoogleSyncProvider');
  }
  return context;
}
