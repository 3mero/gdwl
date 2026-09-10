"use client";

import { SchedulesProvider } from '@/hooks/use-schedules';
import { ViewSettingsProvider } from '@/hooks/use-view-settings';
import { HighlightProvider } from '@/hooks/use-highlight';
import { GoogleSyncProvider } from '@/hooks/use-google-sync';
import { NotificationsProvider } from '@/hooks/use-notifications';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ViewSettingsProvider>
      <GoogleSyncProvider>
        <SchedulesProvider>
          <NotificationsProvider>
            <HighlightProvider>
              {children}
            </HighlightProvider>
          </NotificationsProvider>
        </SchedulesProvider>
      </GoogleSyncProvider>
    </ViewSettingsProvider>
  );
}


    