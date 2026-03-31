"use client";

import { SchedulesProvider } from '@/hooks/use-schedules';
import { ViewSettingsProvider } from '@/hooks/use-view-settings';
import { HighlightProvider } from '@/hooks/use-highlight';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ViewSettingsProvider>
      <SchedulesProvider>
        <HighlightProvider>
          {children}
        </HighlightProvider>
      </SchedulesProvider>
    </ViewSettingsProvider>
  );
}

    