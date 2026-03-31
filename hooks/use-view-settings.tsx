
"use client";

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useLocalStorage } from './use-local-storage';
import { ViewSettings, BackgroundColors, ColorPreset, CalendarSource } from '@/lib/types';
import { uuidv4 } from '@/lib/utils';


interface ViewSettingsContextType {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  gridCols: number;
  setGridCols: (cols: number) => void;
  backgroundColors: BackgroundColors;
  setBackgroundColors: (colors: BackgroundColors | ((prev: BackgroundColors) => BackgroundColors)) => void;
  tickerSpeed: number;
  setTickerSpeed: (speed: number) => void;
  showTicker: boolean;
  setShowTicker: (show: boolean) => void;
  viewSettings: ViewSettings;
  importViewSettingsData: (data: Partial<ViewSettings>) => void;
  colorPresets: ColorPreset[];
  saveColorPreset: (name: string, colors: BackgroundColors) => void;
  deleteColorPreset: (id: string) => void;
  applyColorPreset: (colors: BackgroundColors) => void;
  customHolidayCalendars: { [countryCode: string]: string };
  saveCustomHolidayCalendar: (key: string, url: string) => void;
  deleteCustomHolidayCalendar: (key: string) => void;
  lastHolidaySource: CalendarSource | null;
  setLastHolidaySource: (source: CalendarSource | null) => void;
  lastHolidayCountry: string | null;
  setLastHolidayCountry: (country: string | null) => void;
  customHolidayNames: Record<string, string>;
  saveCustomHolidayName: (key: string, name: string) => void;
  hiddenHolidays: string[];
  addHiddenHoliday: (key: string) => void;
  removeHiddenHoliday: (key: string) => void;
  holidayTranslations: Record<string, string>;
  setHolidayTranslations: (translations: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  hasSeenRotationTip: boolean;
  setHasSeenRotationTip: (seen: boolean) => void;
  resetViewSettings: () => void;
}

const ViewSettingsContext = createContext<ViewSettingsContextType | undefined>(undefined);

export const defaultViewSettings: ViewSettings = {
    zoomLevel: 1,
    gridCols: 4,
    backgroundColors: {
      page: 'hsl(220 14% 10%)',
      container: 'hsl(220 14% 12%)',
      monthCard: 'transparent',
      monthName: 'hsl(var(--primary))',
      monthNameBackground: 'hsl(var(--accent) / 0.5)',
      monthNumber: 'hsl(var(--muted-foreground))',
    },
    tickerSpeed: 8,
    showTicker: true,
    colorPresets: [],
    customHolidayCalendars: {},
    lastHolidaySource: null,
    lastHolidayCountry: null,
    customHolidayNames: {},
    hiddenHolidays: [],
    holidayTranslations: {},
    hasSeenRotationTip: false,
}

const mergeDeep = (target: any, source: any) => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item: any) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
};


export function ViewSettingsProvider({ children }: { children: ReactNode }) {
  const [storedSettings, setStoredSettings] = useLocalStorage<Partial<ViewSettings>>('viewSettings', {});

  const viewSettings = useMemo(() => {
    const merged = mergeDeep(defaultViewSettings, storedSettings);
    // Auto-upgrade existing 3 columns preference to 4 columns
    if (merged.gridCols === 3) {
      merged.gridCols = 4;
    }
    return merged;
  }, [storedSettings]);

  const updateSettings = useCallback((updater: (prev: ViewSettings) => Partial<ViewSettings>) => {
    setStoredSettings(prev => {
        const mergedPrev = mergeDeep(defaultViewSettings, prev);
        const newPartial = updater(mergedPrev);
        return { ...prev, ...newPartial};
    });
  }, [setStoredSettings]);

  const setZoomLevel = useCallback((zoomLevel: number) => {
    updateSettings(() => ({ zoomLevel }));
  }, [updateSettings]);

  const setGridCols = useCallback((gridCols: number) => {
    updateSettings(() => ({ gridCols }));
  }, [updateSettings]);

  const setBackgroundColors = useCallback((newColors: BackgroundColors | ((prev: BackgroundColors) => BackgroundColors)) => {
    updateSettings(prev => {
        const resolvedColors = typeof newColors === 'function' ? newColors(prev.backgroundColors) : newColors;
        return { backgroundColors: resolvedColors };
    });
  }, [updateSettings]);
  
  const setTickerSpeed = useCallback((tickerSpeed: number) => {
    updateSettings(() => ({ tickerSpeed }));
  }, [updateSettings]);

  const setShowTicker = useCallback((showTicker: boolean) => {
    updateSettings(() => ({ showTicker }));
  }, [updateSettings]);
  
  const setLastHolidaySource = useCallback((source: CalendarSource | null) => {
    updateSettings(() => ({ lastHolidaySource: source }));
  }, [updateSettings]);

  const setLastHolidayCountry = useCallback((country: string | null) => {
      updateSettings(() => ({ lastHolidayCountry: country }));
  }, [updateSettings]);

  const importViewSettingsData = useCallback((data: Partial<ViewSettings>) => {
    updateSettings(() => data);
  }, [updateSettings]);

  const saveColorPreset = useCallback((name: string, colors: BackgroundColors) => {
    updateSettings(prev => {
        const newPreset: ColorPreset = { id: uuidv4(), name, colors };
        const updatedPresets = [newPreset, ...(prev.colorPresets ?? [])].slice(0, 3);
        return { colorPresets: updatedPresets };
    });
  }, [updateSettings]);

  const deleteColorPreset = useCallback((id: string) => {
      updateSettings(prev => {
          const updatedPresets = (prev.colorPresets ?? []).filter(p => p.id !== id);
          return { colorPresets: updatedPresets };
      });
  }, [updateSettings]);

  const applyColorPreset = useCallback((colors: BackgroundColors) => {
      setBackgroundColors(colors);
  }, [setBackgroundColors]);

  const saveCustomHolidayCalendar = useCallback((key: string, url: string) => {
    updateSettings(prev => {
        const newCustomCalendars = { ...(prev.customHolidayCalendars || {}), [key]: url };
        return { customHolidayCalendars: newCustomCalendars };
    });
  }, [updateSettings]);

  const deleteCustomHolidayCalendar = useCallback((key: string) => {
    updateSettings(prev => {
      const newCustomCalendars = { ...(prev.customHolidayCalendars || {}) };
      delete newCustomCalendars[key];
      return { ...prev, customHolidayCalendars: newCustomCalendars };
    });
  }, [updateSettings]);

  const saveCustomHolidayName = useCallback((key: string, name: string) => {
    updateSettings(prev => {
        const newCustomNames = { ...prev.customHolidayNames, [key]: name };
        return { ...prev, customHolidayNames: newCustomNames };
    });
  }, [updateSettings]);

  const addHiddenHoliday = useCallback((key: string) => {
    updateSettings(prev => {
        const hiddenHolidays = prev.hiddenHolidays ?? [];
        if (hiddenHolidays.includes(key)) return {};
        return { hiddenHolidays: [...hiddenHolidays, key] };
    });
  }, [updateSettings]);

  const removeHiddenHoliday = useCallback((key: string) => {
    updateSettings(prev => {
        const newHiddenHolidays = (prev.hiddenHolidays ?? []).filter(hKey => hKey !== key);
        return { hiddenHolidays: newHiddenHolidays };
    });
  }, [updateSettings]);

  const setHolidayTranslations = useCallback((translations: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
     updateSettings(prev => {
        const resolvedTranslations = typeof translations === 'function' ? translations(prev.holidayTranslations) : translations;
        return { holidayTranslations: resolvedTranslations };
    });
  }, [updateSettings]);
  
  const setHasSeenRotationTip = useCallback((seen: boolean) => {
    updateSettings(() => ({ hasSeenRotationTip: seen }));
  }, [updateSettings]);

  const resetViewSettings = useCallback(() => {
    setStoredSettings(defaultViewSettings);
  }, [setStoredSettings]);

  const value = {
    zoomLevel: viewSettings.zoomLevel,
    gridCols: viewSettings.gridCols,
    backgroundColors: viewSettings.backgroundColors,
    tickerSpeed: viewSettings.tickerSpeed,
    showTicker: viewSettings.showTicker,
    setZoomLevel,
    setGridCols,
    setBackgroundColors,
    setTickerSpeed,
    setShowTicker,
    viewSettings,
    importViewSettingsData,
    colorPresets: viewSettings.colorPresets,
    saveColorPreset,
    deleteColorPreset,
    applyColorPreset,
    customHolidayCalendars: viewSettings.customHolidayCalendars || {},
    saveCustomHolidayCalendar,
    deleteCustomHolidayCalendar,
    lastHolidaySource: viewSettings.lastHolidaySource,
    setLastHolidaySource,
    lastHolidayCountry: viewSettings.lastHolidayCountry,
    setLastHolidayCountry,
    customHolidayNames: viewSettings.customHolidayNames,
    saveCustomHolidayName,
    hiddenHolidays: viewSettings.hiddenHolidays,
    addHiddenHoliday,
    removeHiddenHoliday,
    holidayTranslations: viewSettings.holidayTranslations,
    setHolidayTranslations,
    hasSeenRotationTip: viewSettings.hasSeenRotationTip,
    setHasSeenRotationTip,
    resetViewSettings,
  };

  return (
    <ViewSettingsContext.Provider value={value}>
      {children}
    </ViewSettingsContext.Provider>
  );
}

export function useViewSettings() {
  const context = useContext(ViewSettingsContext);
  if (context === undefined) {
    throw new Error('useViewSettings must be used within a ViewSettingsProvider');
  }
  return context;
}
