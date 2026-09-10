
'use client';

import * as React from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { useViewSettings } from '@/hooks/use-view-settings';
import { useHighlight } from '@/hooks/use-highlight';
import { CalendarMonth } from '@/components/calendar-month';
import { addDays, addYears, subYears, format, isSameYear, startOfYear, getYear, getMonth, parseISO, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
import { formatDateKey, cn } from '@/lib/utils';
import { Schedule } from '@/lib/types';
import { CalendarControls } from './calendar-controls';

export function MainCalendarView() {
    const { activeSchedule, updateSchedule } = useSchedules();
    const { zoomLevel, gridCols, backgroundColors } = useViewSettings();
    const { highlightedItem, setHighlightedItem } = useHighlight();
    const [currentDate] = React.useState(new Date());

    const [viewDate, setViewDate] = React.useState(startOfToday());
    const [isFullYearView, setIsFullYearView] = React.useState(false);
    const [shouldScroll, setShouldScroll] = React.useState(false);
    const [manualYear, setManualYear] = React.useState(String(getYear(viewDate)));

    const startMonthRef = React.useRef<HTMLDivElement>(null);

    const scheduleInitialDate = React.useMemo(() => {
        return startOfToday();
    }, []);

    React.useEffect(() => {
        const handleSetViewDate = (event: CustomEvent<Date>) => {
            const date = event.detail;
            if (date) {
                setViewDate(startOfYear(date));
                setIsFullYearView(true);
                setShouldScroll(true);
            }
        };

        window.addEventListener('setViewDate', handleSetViewDate as EventListener);

        return () => {
            window.removeEventListener('setViewDate', handleSetViewDate as EventListener);
        };
    }, []);

    React.useEffect(() => {
        if (activeSchedule?.startDate) {
            const today = startOfToday();
            setViewDate(today);
            setIsFullYearView(false); 
            setShouldScroll(false);
        }
    }, [activeSchedule?.id, activeSchedule?.startDate]); 

    React.useEffect(() => {
        if (startMonthRef.current && !isFullYearView && shouldScroll) {
            startMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // This effect should NOT run on initial load, only when viewDate/isFullYearView changes later.
        // `shouldScroll` acts as a flag to enable scrolling only after the initial setup.
    }, [viewDate, isFullYearView, shouldScroll]);
  
    React.useEffect(() => {
        if (highlightedItem) {
            setTimeout(() => {
                const element = document.getElementById(`month-${highlightedItem.monthKey}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }
            }, 100);
        }
    }, [highlightedItem]);
  
    const generateMissingDays = React.useCallback((schedule: Schedule, year: number) => {
        const { startDate, days, dayTypes } = schedule;
        if (!startDate || !dayTypes || dayTypes.length === 0) return;
    
        const baseDate = new Date(startDate);
        const cycleDefinition = dayTypes.filter(dt => dt.days > 0);
        const cycleLength = cycleDefinition.reduce((acc, dt) => acc + dt.days, 0);

        if (cycleLength === 0) return;
    
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        const daysInYear = differenceInDays(yearEnd, yearStart) + 1;

        updateSchedule(schedule.id, (prevSchedule) => {
            const newDays = { ...prevSchedule.days };
            let changed = false;
            for (let i = 0; i < daysInYear; i++) {
                const currentDate = addDays(yearStart, i);
                const dateKey = formatDateKey(currentDate);
        
                if (!newDays[dateKey]?.typeId) {
                    const daysDiff = differenceInDays(currentDate, baseDate);
                    let dayInCycle = (daysDiff % cycleLength + cycleLength) % cycleLength;
                    
                    let typeId: string | undefined = undefined;
                    let counter = 0;
                    for (const dayType of cycleDefinition) {
                        if (dayInCycle >= counter && dayInCycle < counter + dayType.days) {
                            typeId = dayType.id;
                            break;
                        }
                        counter += dayType.days;
                    }
                    newDays[dateKey] = { ...newDays[dateKey], typeId };
                    changed = true;
                }
            }
            return changed ? { days: newDays } : {};
        });
    }, [updateSchedule]);

    React.useEffect(() => {
        if (!activeSchedule) return;
        
        const yearInView = getYear(viewDate);
        const firstMonthInView = new Date(yearInView, isFullYearView ? 0 : getMonth(viewDate), 1);
        const daysInFirstMonth = 31;
        let needsGeneration = false;

        for (let i = 0; i < daysInFirstMonth; i++) {
            const dayToCheck = addDays(firstMonthInView, i);
            const dayKey = formatDateKey(dayToCheck);
            if (!activeSchedule.days[dayKey]?.typeId) {
                needsGeneration = true;
                break;
            }
        }

        if (needsGeneration) {
            generateMissingDays(activeSchedule, yearInView);
        }

    }, [viewDate, isFullYearView, activeSchedule, generateMissingDays]);

    const months: Date[] = React.useMemo(() => {
        if (isFullYearView) {
            return Array.from({ length: 12 }, (_, i) => new Date(getYear(viewDate), i, 1));
        } else {
            const startMonthIndex = getMonth(scheduleInitialDate);
            const startYear = getYear(scheduleInitialDate);
            return Array.from({ length: 12 }, (_, i) => {
                const monthIndex = (startMonthIndex + i) % 12;
                const monthYear = startYear + Math.floor((startMonthIndex + i) / 12);
                return new Date(monthYear, monthIndex, 1);
            });
        }
    }, [isFullYearView, viewDate, scheduleInitialDate]);

    const handleReturnToCurrent = () => {
        setViewDate(scheduleInitialDate);
        setIsFullYearView(false);
        setShouldScroll(false); // Disable scrolling on return
    };
  
    const handleYearSelect = (yearStr: string) => {
        const year = parseInt(yearStr, 10);
        if (!isNaN(year) && year > 1900 && year < 2100) {
            setViewDate(new Date(year, getMonth(viewDate), 1));
            setManualYear(String(year));
            setIsFullYearView(true);
            setShouldScroll(true);
        } else {
            setManualYear(String(getYear(viewDate)));
        }
    };

    const handleMonthSelect = (monthIndex: number) => {
        setViewDate(new Date(getYear(viewDate), monthIndex, 1));
        setIsFullYearView(true);
        setShouldScroll(true);
    };

    const gridClasses: { [key: number]: string } = {
        2: 'md:grid-cols-2 lg:grid-cols-2',
        3: 'md:grid-cols-2 lg:grid-cols-3',
        4: 'md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4',
    };

    if (!activeSchedule) {
        return null;
    }

    return (
        <>
            <div 
                id="main-controls" 
                className="sticky top-[65px] z-20 mb-4 flex flex-col items-center justify-center gap-4 backdrop-blur-sm transition-colors duration-300 sm:px-4"
            >
                <CalendarControls
                    viewDate={viewDate}
                    isFullYearView={isFullYearView}
                    manualYear={manualYear}
                    setManualYear={setManualYear}
                    handleYearSelect={handleYearSelect}
                    handleMonthSelect={handleMonthSelect}
                    handleReturnToCurrent={handleReturnToCurrent}
                    scheduleInitialDate={scheduleInitialDate}
                />
            </div>
            <div 
                id="calendar-grid" 
                className="scroll-mt-4 rounded-xl border border-border p-2 shadow-xl transition-colors duration-300 sm:p-4"
                style={{ backgroundColor: backgroundColors.container }}
            >
                <div 
                    id="calendar-container"
                    className={cn(
                        "grid grid-cols-1 gap-4 transition-transform duration-300 origin-top sm:grid-cols-2 sm:gap-6", 
                        gridClasses[gridCols]
                    )}
                    style={{ transform: `scale(${zoomLevel})`}}
                >
                    {months.map((month) => {
                        const isStartMonth = !isFullYearView && isSameYear(month, viewDate) && getMonth(month) === getMonth(viewDate);
                        const monthKey = format(month, 'yyyy-MM');
                        return (
                            <div id={`month-${monthKey}`} key={month.toISOString()} ref={isStartMonth ? startMonthRef : null}>
                                <CalendarMonth 
                                    month={month} 
                                    currentDate={currentDate}
                                    activeSchedule={activeSchedule}
                                    monthKey={monthKey}
                                    isHighlighted={highlightedItem?.monthKey === monthKey}
                                    highlightedDays={highlightedItem?.monthKey === monthKey ? highlightedItem.dayKeys : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
