
"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Schedule, DayData, FullExport, DayTypeDefinition } from '@/lib/types';
import { useLocalStorage } from './use-local-storage';
import { uuidv4, formatDateKey } from '@/lib/utils';
import { useViewSettings } from './use-view-settings';
import { format, getYear } from 'date-fns';

import { isOmanOfficialHoliday } from '@/lib/holiday-translator';

interface SchedulesContextType {
  schedules: Schedule[];
  setSchedules: (schedules: Schedule[]) => void,
  activeSchedule: Schedule | null;
  activeScheduleId: string | null;
  isLoaded: boolean;
  addSchedule: (name: string, startDayOfWeek: 0 | 1 | 6, monthsToShow: number, startDate: string, dayTypes: DayTypeDefinition[]) => Schedule;
  updateSchedule: (id: string, updates: Partial<Schedule> | ((prev: Schedule) => Partial<Schedule>)) => void;
  deleteSchedule: (id: string) => void;
  setActiveScheduleId: (id: string | null) => void;
  updateDay: (date: string, data: Partial<DayData> | undefined) => void;
  duplicateSchedule: (id: string) => void;
  importFullData: (data: FullExport) => void;
  deleteYearData: (year: string) => void;
  deleteAllEvents: () => void;
  deleteAllData: () => void;
  purgeInvalidHolidays: () => number;
}

const SchedulesContext = createContext<SchedulesContextType | undefined>(undefined);

const defaultDayTypes: DayTypeDefinition[] = [
    { id: uuidv4(), name: 'عمل', type: 'work', days: 1, color: '#10B981' },
    { id: uuidv4(), name: 'إجازة', type: 'holiday', days: 3, color: '#FFFFFF' }
];

const CURRENT_HOLIDAY_MIGRATION_KEY = 'gdwl_oman_holidays_sync_version';
const CURRENT_HOLIDAY_VERSION = 'v2026.3';

function checkAndPurgeSchedules(schedulesList: Schedule[]): { cleaned: Schedule[]; count: number } {
  let count = 0;
  const cleaned = schedulesList.map((s) => {
    let scheduleModified = false;
    const newDays = { ...s.days };
    for (const dateKey in newDays) {
      const day = newDays[dateKey];
      if (day) {
        const hTitle = day.holidayInfo?.title || '';
        const hNote = day.holidayInfo?.note || '';
        const ev = day.event || '';

        const hasDisallowedWord =
          hTitle.includes('الميلادية') ||
          hTitle.includes('الميلادي') ||
          hTitle.includes('New Year') ||
          hTitle.includes('Public Holiday') ||
          hTitle.includes('نهضة') ||
          hTitle.includes('النهضة') ||
          hTitle.includes('renaissance') ||
          hNote.includes('الميلادية') ||
          hNote.includes('الميلادي') ||
          hNote.includes('نهضة') ||
          hNote.includes('النهضة') ||
          hNote.includes('renaissance') ||
          ev.includes('الميلادية') ||
          ev.includes('الميلادي') ||
          ev.includes('New Year') ||
          ev.includes('Public Holiday') ||
          ev.includes('نهضة') ||
          ev.includes('renaissance');

        const isUnverifiedHoliday = Boolean(day.holidayInfo && !isOmanOfficialHoliday(hTitle));

        if (hasDisallowedWord || isUnverifiedHoliday) {
          scheduleModified = true;
          count++;
          const { holidayInfo, ...rest } = day;
          if (
            rest.event &&
            (rest.event.includes('الميلادية') ||
              rest.event.includes('الميلادي') ||
              rest.event.includes('New Year') ||
              rest.event.includes('Public Holiday') ||
              rest.event.includes('نهضة') ||
              rest.event.includes('renaissance'))
          ) {
            delete rest.event;
          }
          if (!rest.typeId && !rest.title && !rest.note && !rest.pinned && !rest.event) {
            delete newDays[dateKey];
          } else {
            newDays[dateKey] = rest;
          }
        }
      }
    }
    if (scheduleModified) {
      return { ...s, days: newDays };
    }
    return s;
  });
  return { cleaned, count };
}

function applyEmergencyHolidays(schedulesList: Schedule[], emergencyHolidays: any[]): { updated: Schedule[]; appliedCount: number } {
  if (!emergencyHolidays || emergencyHolidays.length === 0) return { updated: schedulesList, appliedCount: 0 };
  let appliedCount = 0;
  const updated = schedulesList.map(s => {
    let modified = false;
    const newDays = { ...s.days };
    for (const emg of emergencyHolidays) {
      if (!emg.startDate) continue;
      const start = new Date(emg.startDate);
      const end = new Date(emg.endDate || emg.startDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

      const curr = new Date(start);
      while (curr <= end) {
        const dateKey = curr.toISOString().split('T')[0];
        const existingDay = newDays[dateKey] || {};
        if (!existingDay.holidayInfo || existingDay.holidayInfo.title !== emg.title) {
          newDays[dateKey] = {
            ...existingDay,
            holidayInfo: {
              title: emg.title,
              note: emg.note || 'إجازة رسمية استثنائية (أمر سلطاني / طوارئ)',
            },
            event: existingDay.event || emg.title,
          };
          modified = true;
          appliedCount++;
        }
        curr.setDate(curr.getDate() + 1);
      }
    }
    return modified ? { ...s, days: newDays } : s;
  });
  return { updated, appliedCount };
}

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useLocalStorage<Schedule[]>('schedules', []);
  const [activeScheduleId, setActiveScheduleId] = useLocalStorage<string | null>('activeScheduleId', null);
  const { importViewSettingsData, resetViewSettings } = useViewSettings();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect ensures that the component is considered "loaded" only on the client-side,
    // preventing hydration mismatches and issues with localStorage.
    setIsLoaded(true);
  }, []);
  
  useEffect(() => {
    // This effect runs only on the client after the initial load.
    if (isLoaded) {
      // Auto-purge any invalid or outdated non-Oman holidays from all schedules
      const storedVersion = typeof window !== 'undefined' ? localStorage.getItem(CURRENT_HOLIDAY_MIGRATION_KEY) : null;
      if (storedVersion !== CURRENT_HOLIDAY_VERSION) {
        const { cleaned, count } = checkAndPurgeSchedules(schedules);
        if (count > 0) {
          setSchedules(cleaned);
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENT_HOLIDAY_MIGRATION_KEY, CURRENT_HOLIDAY_VERSION);
        }
      }

      if (schedules.length > 0 && (!activeScheduleId || !schedules.some(s => s.id === activeScheduleId))) {
        // If activeScheduleId is invalid or not in the list, set it to the first schedule.
        setActiveScheduleId(schedules[0].id);
      } else if (schedules.length === 0) {
        // If there are no schedules, clear the active ID.
        setActiveScheduleId(null);
      }

      // Real Live Telemetry & Remote Cache Sync
      const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const platform = /iPhone|iPad|iPod/.test(userAgent) ? 'iphone' :
                       /Android/.test(userAgent) ? 'android' :
                       /Windows/.test(userAgent) ? 'windows' :
                       /Macintosh/.test(userAgent) ? 'mac' : 'other';

      // Unique session / client fingerprint
      let sessionId = '';
      if (typeof window !== 'undefined') {
        sessionId = sessionStorage.getItem('gdwl_session_id') || '';
        if (!sessionId) {
          sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
          sessionStorage.setItem('gdwl_session_id', sessionId);
        }
      }

      const screenRes = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '';

      fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'client_telemetry',
          isPwa,
          platform,
          sessionId,
          screen: screenRes,
          language: typeof navigator !== 'undefined' ? navigator.language : 'ar',
          localHour: new Date().getHours(),
        }),
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.success) {
            const remoteVer = data.globalDataVersion || 1;
            const localRemoteVer = typeof window !== 'undefined' ? Number(localStorage.getItem('gdwl_remote_data_version') || '0') : 0;

            if (remoteVer > localRemoteVer) {
              const { cleaned } = checkAndPurgeSchedules(schedules);
              let finalSchedules = cleaned;
              if (data.emergencyHolidays && data.emergencyHolidays.length > 0) {
                const { updated } = applyEmergencyHolidays(finalSchedules, data.emergencyHolidays);
                finalSchedules = updated;
              }
              setSchedules(finalSchedules);
              if (typeof window !== 'undefined') {
                localStorage.setItem('gdwl_remote_data_version', String(remoteVer));
              }
            } else if (data.emergencyHolidays && data.emergencyHolidays.length > 0) {
              const { updated, appliedCount } = applyEmergencyHolidays(schedules, data.emergencyHolidays);
              if (appliedCount > 0) {
                setSchedules(updated);
              }
            }

            // Sync announcement to user's notifications center if new
            if (data.announcement?.enabled && data.announcement.message) {
              if (typeof window !== 'undefined') {
                const seenKey = 'gdwl_seen_ann_' + (data.announcement.updatedAt || 'v1');
                if (!localStorage.getItem(seenKey)) {
                  try {
                    const rawNotifs = localStorage.getItem('gdwl_notifications_v3');
                    const notifs = rawNotifs ? JSON.parse(rawNotifs) : [];
                    const alreadyExists = notifs.some((n: any) => n.message === data.announcement.message);
                    if (!alreadyExists) {
                      notifs.unshift({
                        id: 'ann_' + Date.now(),
                        title: '📢 إشعار رسمي من إدارة التطبيق',
                        message: data.announcement.message,
                        date: new Date().toISOString().split('T')[0],
                        countryCode: 'om',
                        countryName: 'سلطنة عُمان',
                        type: 'broadcast',
                        read: false,
                        createdAt: new Date().toISOString(),
                      });
                      localStorage.setItem('gdwl_notifications_v3', JSON.stringify(notifs.slice(0, 50)));
                      localStorage.setItem(seenKey, 'true');
                    }
                  } catch {}
                }
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [isLoaded]);


  const addSchedule = useCallback((
    name: string, 
    startDayOfWeek: 0 | 1 | 6,
    monthsToShow: number,
    startDate: string,
    dayTypes: DayTypeDefinition[]
  ): Schedule => {
    const newSchedule: Schedule = {
      id: uuidv4(),
      name,
      startDayOfWeek,
      days: {},
      monthsToShow: monthsToShow || 12,
      startDate: startDate,
      monthBackgrounds: {},
      dayTypes: dayTypes,
    };
    setSchedules(prev => {
        const newSchedules = [...prev, newSchedule];
        // Ensure the newly added schedule is set as active
        setActiveScheduleId(newSchedule.id);
        return newSchedules;
    });
    return newSchedule;
  }, [setSchedules, setActiveScheduleId]);

  const updateSchedule = useCallback((id: string, updates: Partial<Schedule> | ((prev: Schedule) => Partial<Schedule>)) => {
    setSchedules(prevSchedules => prevSchedules.map(s => {
        if (s.id === id) {
            const newUpdates = typeof updates === 'function' ? updates(s) : updates;
            return { ...s, ...newUpdates };
        }
        return s;
    }));
  }, [setSchedules]);

  const deleteSchedule = useCallback((id: string) => {
    setSchedules(prevSchedules => {
      const newSchedules = prevSchedules.filter(s => s.id !== id);
      if (activeScheduleId === id) {
        setActiveScheduleId(newSchedules.length > 0 ? newSchedules[0].id : null);
      }
      return newSchedules;
    });
  }, [activeScheduleId, setSchedules, setActiveScheduleId]);
  
  const duplicateSchedule = useCallback((id: string) => {
    const scheduleToCopy = schedules.find(s => s.id === id);
    if (scheduleToCopy) {
      const newSchedule = {
        ...JSON.parse(JSON.stringify(scheduleToCopy)),
        id: uuidv4(),
        name: `${scheduleToCopy.name} (نسخة)`,
      };
      // Remove schedule-specific properties that shouldn't be copied or are obsolete
      if ((newSchedule as any).colors) delete (newSchedule as any).colors;
      
      // Ensure dayTypes exists for older schedules
      if (!newSchedule.dayTypes || !Array.isArray(newSchedule.dayTypes)) {
        newSchedule.dayTypes = defaultDayTypes.map(dt => ({...dt, id: uuidv4()}));
      }
      
      setSchedules(prev => {
        const newSchedules = [...prev, newSchedule];
        setActiveScheduleId(newSchedule.id); // Directly set the new one as active
        return newSchedules;
      });
    }
  }, [schedules, setSchedules, setActiveScheduleId]);
  
  const importFullData = useCallback((data: FullExport) => {
    if (data.schedules) {
      // Clean old/obsolete color data from imported schedules
      const cleanedSchedules = data.schedules.map(s => {
        const newS = {...s};
        if ((newS as any).colors) delete (newS as any).colors;
        if (!(newS as any).monthBackgrounds) (newS as any).monthBackgrounds = {};
        // Migrate old day type structure
        if ((s as any).workDays !== undefined || (s as any).holidayDays !== undefined) {
          newS.dayTypes = [
            { id: uuidv4(), name: 'عمل', type: 'work', days: (s as any).workDays || 1, color: '#10B981'},
            { id: uuidv4(), name: 'إجازة', type: 'holiday', days: (s as any).holidayDays || 3, color: '#FFFFFF' }
          ];
        }
        return newS;
      });
      setSchedules(cleanedSchedules);

      if(cleanedSchedules.length > 0){
        setActiveScheduleId(cleanedSchedules[0].id);
      }
    }
    if (data.viewSettings) {
      importViewSettingsData(data.viewSettings);
    }
  }, [setSchedules, setActiveScheduleId, importViewSettingsData]);

  const updateDay = useCallback((date: string, data: Partial<DayData> | undefined) => {
    if (!activeScheduleId) return;

    updateSchedule(activeScheduleId, (prevSchedule) => {
      const newDays = { ...prevSchedule.days };

      if (data === undefined) {
        // If data is undefined, completely remove the day entry
        delete newDays[date];
      } else {
        // Correctly merge existing data with new data
        const existingDayData = newDays[date] || { };
        const newDayData = { ...existingDayData, ...data };

        // Clean up empty notes and titles
        if (newDayData.title === '' || newDayData.title === null || newDayData.title === undefined) {
            delete newDayData.title;
        }
        if (newDayData.note === '' || newDayData.note === null || newDayData.note === undefined) {
          delete newDayData.note;
        }

        // If the day has no specific data, remove it to save space
        if (!newDayData.typeId && !newDayData.title && !newDayData.note && !newDayData.pinned) {
          delete newDays[date];
        } else {
          newDays[date] = newDayData;
        }
      }
      
      return { days: newDays };
    });
  }, [activeScheduleId, updateSchedule]);
  
  const deleteYearData = useCallback((year: string) => {
    if (!activeScheduleId) return;
    const yearNumber = parseInt(year, 10);
    updateSchedule(activeScheduleId, (prevSchedule) => {
        const newDays = { ...prevSchedule.days };
        for (const dateKey in newDays) {
            if (getYear(new Date(dateKey)) === yearNumber) {
                delete newDays[dateKey].title;
                delete newDays[dateKey].note;
                delete newDays[dateKey].pinned;
                // If day becomes default with no data, remove it
                if (!newDays[dateKey].typeId && !newDays[dateKey].note && !newDays[dateKey].pinned && !newDays[dateKey].title) {
                    delete newDays[dateKey];
                }
            }
        }
        return { days: newDays };
    });
  }, [activeScheduleId, updateSchedule]);

  const deleteAllEvents = useCallback(() => {
    if (!activeScheduleId) return;
    updateSchedule(activeScheduleId, (prevSchedule) => {
        const newDays = { ...prevSchedule.days };
        for (const dateKey in newDays) {
           delete newDays[dateKey].title;
           delete newDays[dateKey].note;
           delete newDays[dateKey].pinned;
           if (!newDays[dateKey].typeId) {
              delete newDays[dateKey];
           }
        }
        return { days: newDays };
    });
  }, [activeScheduleId, updateSchedule]);

  const deleteAllData = useCallback(() => {
    // This is the most robust way to ensure everything is cleared.
    if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.reload();
    }
  }, []);


  const purgeInvalidHolidays = useCallback(() => {
    const { cleaned, count } = checkAndPurgeSchedules(schedules);
    if (count > 0) {
      setSchedules(cleaned);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_HOLIDAY_MIGRATION_KEY, CURRENT_HOLIDAY_VERSION);
    }
    return count;
  }, [schedules, setSchedules]);

  const activeSchedule = isLoaded ? (schedules.find(s => s.id === activeScheduleId) || null) : null;

  const value = { 
    schedules, 
    setSchedules,
    activeSchedule,
    activeScheduleId, 
    isLoaded,
    addSchedule, 
    updateSchedule,
    deleteSchedule,
    setActiveScheduleId,
    updateDay,
    duplicateSchedule,
    importFullData,
    deleteYearData,
    deleteAllEvents,
    deleteAllData,
    purgeInvalidHolidays,
  };

  return (
    <SchedulesContext.Provider value={value}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useSchedules() {
  const context = useContext(SchedulesContext);
  if (context === undefined) {
    throw new Error('useSchedules must be used within a SchedulesProvider');
  }
  return context;
}

    