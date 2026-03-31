
"use client";

import * as React from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { useViewSettings } from '@/hooks/use-view-settings';
import { useHighlight } from '@/hooks/use-highlight';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/app-header';
import { InitialSetup } from '@/components/initial-setup';
import { MainCalendarView } from '@/components/main-calendar-view';
import { NewsTicker, TickerItemData } from '@/components/news-ticker';
import { ScheduleManager } from '@/components/schedule-manager';
import { EventDetailDialog } from '@/components/event-detail-dialog';
import { OfficialHolidaysDialog } from '@/components/official-holidays-dialog';
import { format, parseISO, differenceInDays } from 'date-fns';
import { DayData } from '@/lib/types';
import { formatDateKey } from '@/lib/utils';
import { generateTickerItems } from '@/lib/ticker-utils.tsx';


export default function Home() {
  const { schedules, activeSchedule, isLoaded, updateDay, updateSchedule } = useSchedules();
  const { 
    zoomLevel, setZoomLevel, 
    gridCols, setGridCols, 
    tickerSpeed, showTicker,
    backgroundColors,
  } = useViewSettings();
  
  const { setHighlightedItem } = useHighlight();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [isManagerOpen, setIsManagerOpen] = React.useState(false);
  const [isHolidaysOpen, setIsHolidaysOpen] = React.useState(false);
  
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = React.useState(false);
  
  const [selectedEventIndex, setSelectedEventIndex] = React.useState<number | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = React.useState(false);
  
  const [captureStatus, setCaptureStatus] = React.useState<'idle' | 'capturing' | 'success'>('idle');
  
  React.useEffect(() => {
    if (isLoaded && schedules.length > 0 && !activeSchedule?.startDate) {
        setIsManagerOpen(true);
    }
  }, [isLoaded, schedules, activeSchedule]);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const checkInstalled = async () => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(true);
        }
    };
    checkInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const tickerItems = React.useMemo(() => generateTickerItems(activeSchedule, currentDate), [activeSchedule, currentDate]);
  
  const tickerSeparator = React.useMemo(() => (
    <div className="text-primary font-semibold text-lg">
        سبحان الله وبحمده سبحان الله العظيم
    </div>
  ), []);

  const performCapture = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const elementToCapture = document.body;
    if (!elementToCapture) return;

    setCaptureStatus('capturing');
    let styleEl: HTMLStyleElement | null = null;
    
    try {
        // Embed Google Fonts CSS
        const fontResponse = await fetch(
            'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap'
        );
        const fontCss = await fontResponse.text();
        styleEl = document.createElement('style');
        styleEl.textContent = fontCss;
        document.head.appendChild(styleEl);
        
        // Give the browser a moment to apply the font styles
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = await html2canvas(elementToCapture, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            imageTimeout: 15000,
            backgroundColor: null, // Use body background
            onclone: (clonedDoc) => {
                // Re-apply font styles in the cloned document
                if (styleEl) {
                    clonedDoc.head.appendChild(styleEl.cloneNode(true));
                }
                // Hide capture button in the cloned document
                const header = clonedDoc.querySelector('header');
                if (header) {
                    const captureButton = header.querySelector('[data-capture-btn="true"]');
                    if (captureButton && (captureButton as HTMLElement).style.display !== 'none') {
                      (captureButton.parentElement as HTMLElement).style.display = 'none';
                    }
                }
            },
        });

        const link = document.createElement('a');
        const now = new Date();
        const timestamp = format(now, 'yyyy-MM-dd_HH-mm-ss');
        link.download = `my-planner_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setCaptureStatus('success');

    } catch (err) {
        console.error("Oops, something went wrong during capture!", err);
        setCaptureStatus('idle');
         toast({
            variant: "destructive",
            title: "حدث خطأ!",
            description: "لم نتمكن من حفظ الصورة. يرجى المحاولة مرة أخرى.",
        });
    } finally {
        if (styleEl && document.head.contains(styleEl)) {
            document.head.removeChild(styleEl);
        }
        setTimeout(() => setCaptureStatus('idle'), 2000);
    }
  };


  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoomLevel(Math.min(zoomLevel + 0.1, 1.5));
    } else {
      setZoomLevel(Math.max(zoomLevel - 0.1, 0.5));
    }
  };
  
  const handleTickerItemClick = (item: TickerItemData) => {
      if (item.type === 'info') return;
      
      const index = tickerItems.findIndex(i => i.id === item.id);
      if (index !== -1) {
        setSelectedEventIndex(index);
        setIsEventDetailOpen(true);
      }
  }

  const handleLocateEvent = (event: TickerItemData) => {
    const eventDate = parseISO(event.date);
    // This is a bit of a hack to communicate with MainCalendarView
    // A more robust solution might use a shared state/context for view control
    const yearSelectEvent = new CustomEvent('setViewDate', { detail: eventDate });
    window.dispatchEvent(yearSelectEvent);

    setHighlightedItem({
      monthKey: format(eventDate, 'yyyy-MM'),
      dayKeys: event.relatedDays || [format(eventDate, 'yyyy-MM-dd')],
    });
    setIsEventDetailOpen(false);
  };
  
  const handleUpdateEvent = (dateStr: string, data: Partial<DayData>) => {
      updateDay(format(parseISO(dateStr), 'yyyy-MM-dd'), data);
  };

  const handleDeleteEvent = (item: TickerItemData) => {
      const dateKey = format(parseISO(item.date), 'yyyy-MM-dd');
      if (item.type === 'pin') {
          updateDay(dateKey, { pinned: false });
      } else if (item.type === 'note') {
          updateDay(dateKey, { title: undefined, note: undefined });
      }
      toast({ title: 'تم حذف الحدث' });
  };
  
  const handleAddHolidays = (holidays: { date: string; title: string, note: string }[]) => {
    if (!activeSchedule || !activeSchedule.startDate) return;

    const baseDate = parseISO(activeSchedule.startDate);
    const cycleDefinition = activeSchedule.dayTypes?.filter(dt => dt.days > 0) ?? [];
    const cycleLength = cycleDefinition.reduce((acc, dt) => acc + dt.days, 0);

    const updates: { [date: string]: DayData } = {};

    holidays.forEach(holiday => {
      const existingData = activeSchedule.days[holiday.date] || {};
      let typeId = existingData.typeId;

      // If day type doesn't exist, generate it
      if (!typeId && cycleLength > 0) {
        const holidayDate = parseISO(holiday.date);
        const daysDiff = differenceInDays(holidayDate, baseDate);
        let dayInCycle = (daysDiff % cycleLength + cycleLength) % cycleLength;
        
        let counter = 0;
        for (const dayType of cycleDefinition) {
            if (dayInCycle >= counter && dayInCycle < counter + dayType.days) {
                typeId = dayType.id;
                break;
            }
            counter += dayType.days;
        }
      }
      
      const newEvent = holiday.title + (holiday.note ? `\n${holiday.note}` : '');

      updates[holiday.date] = {
        ...existingData,
        typeId,
        event: existingData.event ? `${existingData.event}\n\n${newEvent}` : newEvent,
      };
    });

    updateSchedule(activeSchedule.id, (prev) => ({
      days: { ...prev.days, ...updates }
    }));

    toast({
      title: "تم إضافة المناسبات",
      description: `تم تحديث ${holidays.length} يومًا في جدولك.`,
    });
  };
  
   const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({ title: 'تم تثبيت التطبيق بنجاح!' });
        setIsAppInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-lg">جار تحميل المخطط ...</div>
      </div>
    );
  }

  if (schedules.length === 0 || !activeSchedule?.startDate) {
    return <InitialSetup />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col transition-colors duration-300" style={{ backgroundColor: backgroundColors.page }}>
       <AppHeader 
        onCapture={performCapture}
        captureStatus={captureStatus}
        onOpenSettings={() => setIsManagerOpen(true)}
        onOpenHolidays={() => setIsHolidaysOpen(true)}
        installPrompt={installPrompt}
        isAppInstalled={isAppInstalled}
        onInstallClick={handleInstallClick}
      />
      <main className="flex-1 p-2 sm:p-4 lg:p-6" dir="rtl">
        
        {showTicker && tickerItems.length > 0 && (
            <div 
              className="w-full overflow-hidden py-3 sticky top-[65px] z-20"
            >
                 <NewsTicker 
                    items={tickerItems} 
                    separator={tickerSeparator}
                    duration={tickerSpeed}
                    onItemClick={handleTickerItemClick}
                />
            </div>
        )}

        <MainCalendarView />

      </main>
       <ScheduleManager 
            open={isManagerOpen} 
            onOpenChange={setIsManagerOpen}
            onZoomIn={() => handleZoom('in')}
            onZoomOut={() => handleZoom('out')}
            onSetGridCols={setGridCols}
            currentGridCols={gridCols}
            installPrompt={installPrompt}
            isAppInstalled={isAppInstalled}
            onInstallClick={handleInstallClick}
        />
        {(selectedEventIndex !== null) && (
            <EventDetailDialog
                isOpen={isEventDetailOpen}
                onOpenChange={setIsEventDetailOpen}
                items={tickerItems}
                currentIndex={selectedEventIndex}
                onNavigate={(newIndex) => setSelectedEventIndex(newIndex)}
                onLocate={handleLocateEvent}
                onUpdate={handleUpdateEvent}
                onDelete={handleDeleteEvent}
            />
        )}
        <OfficialHolidaysDialog 
            isOpen={isHolidaysOpen}
            onOpenChange={setIsHolidaysOpen}
            onAddHolidays={handleAddHolidays}
        />
    </div>
  );
}
