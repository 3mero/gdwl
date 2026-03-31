

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ICAL from 'ical.js';
import { format, parseISO, isSameMonth, isSameYear, startOfToday } from 'date-fns';
import { arSA } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CalendarX2, Check, Plus, Link, Trash2, Globe, Building, Pencil, Eye, Save, X, RotateCw, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { useViewSettings } from '@/hooks/use-view-settings';
import { Input } from './ui/input';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import type { CalendarSource, HolidayEvent } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { cn } from '@/lib/utils';
import { uuidv4 } from '@/lib/utils';


const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

const GOOGLE_CALENDARS: Record<string, { name: string; url: string | null }> = {
    om: { name: 'سلطنة عُمان', url: 'https://calendar.google.com/calendar/ical/en.om%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    sa: { name: 'المملكة العربية السعودية', url: 'https://calendar.google.com/calendar/ical/en.sa%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    ae: { name: 'الإمارات العربية المتحدة', url: 'https://calendar.google.com/calendar/ical/en.ae%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    kw: { name: 'الكويت', url: 'https://calendar.google.com/calendar/ical/en.kw%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    qa: { name: 'قطر', url: 'https://calendar.google.com/calendar/ical/en.qa%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    bh: { name: 'البحرين', url: 'https://calendar.google.com/calendar/ical/en.bh%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    eg: { name: 'مصر', url: 'https://calendar.google.com/calendar/ical/en.eg%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    jo: { name: 'الأردن', url: 'https://calendar.google.com/calendar/ical/en.jo%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    lb: { name: 'لبنان', url: 'https://calendar.google.com/calendar/ical/en.lb%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    sy: { name: 'سوريا', url: 'https://calendar.google.com/calendar/ical/en.sy%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    iq: { name: 'العراق', url: 'https://calendar.google.com/calendar/ical/en.iq%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    ye: { name: 'اليمن', url: 'https://calendar.google.com/calendar/ical/en.ye%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    ps: { name: 'فلسطين', url: 'https://www.officeholidays.com/ics/palestine' },
    ma: { name: 'المغرب', url: 'https://calendar.google.com/calendar/ical/en.ma%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    dz: { name: 'الجزائر', url: 'https://calendar.google.com/calendar/ical/en.dz%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    tn: { name: 'تونس', url: 'https://calendar.google.com/calendar/ical/en.tn%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    ly: { name: 'ليبيا', url: 'https://calendar.google.com/calendar/ical/en.ly%23holiday%40group.v.calendar.google.com/public/basic.ics' },
    sd: { name: 'السودان', url: 'https://calendar.google.com/calendar/ical/en.sd%23holiday%40group.v.calendar.google.com/public/basic.ics' },
};

const OFFICE_HOLIDAYS: Record<string, { name: string; url: string | null }> = {
    om: { name: 'سلطنة عُمان', url: 'https://www.officeholidays.com/ics/oman' },
    sa: { name: 'المملكة العربية السعودية', url: 'https://www.officeholidays.com/ics/saudi-arabia' },
    ae: { name: 'الإمارات العربية المتحدة', url: 'https://www.officeholidays.com/ics/uae' },
    kw: { name: 'الكويت', url: 'https://www.officeholidays.com/ics/kuwait' },
    qa: { name: 'قطر', url: 'https://www.officeholidays.com/ics/qatar' },
    bh: { name: 'البحرين', url: 'https://www.officeholidays.com/ics/bahrain' },
    eg: { name: 'مصر', url: 'https://www.officeholidays.com/ics/egypt' },
    jo: { name: 'الأردن', url: 'https://www.officeholidays.com/ics/jordan' },
    lb: { name: 'لبنان', url: 'https://www.officeholidays.com/ics/lebanon' },
    sy: { name: 'سوريا', url: 'https://www.officeholidays.com/ics/syria' },
    iq: { name: 'العراق', url: 'https://www.officeholidays.com/ics/iraq' },
    ye: { name: 'اليمن', url: 'https://www.officeholidays.com/ics/yemen' },
    ps: { name: 'فلسطين', url: 'https://www.officeholidays.com/ics/palestine' },
    ma: { name: 'المغرب', url: 'https://www.officeholidays.com/ics/morocco' },
    dz: { name: 'الجزائر', url: 'https://www.officeholidays.com/ics/algeria' },
    tn: { name: 'تونس', url: 'https://www.officeholidays.com/ics/tunisia' },
    ly: { name: 'ليبيا', url: 'https://www.officeholidays.com/ics/libya' },
    sd: { name: 'السودان', url: 'https://www.officeholidays.com/ics/sudan' },
};

const COUNTRIES = GOOGLE_CALENDARS;

function EditUrlDialog({
    countryCode,
    source,
    isOpen,
    onOpenChange,
    onSave
}: {
    countryCode: string,
    source: CalendarSource,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onSave: () => void
}) {
    const { customHolidayCalendars, saveCustomHolidayCalendar, deleteCustomHolidayCalendar } = useViewSettings();
    const [url, setUrl] = useState('');
    const { toast } = useToast();
    const countryName = COUNTRIES[countryCode]?.name;
    const key = `${source}:${countryCode}`;

    useEffect(() => {
        if (isOpen) {
            let defaultUrl = '';
            if (source === 'google') defaultUrl = GOOGLE_CALENDARS[countryCode]?.url || '';
            else if (source === 'officeholidays') defaultUrl = OFFICE_HOLIDAYS[countryCode]?.url || '';
            
            const currentUrl = customHolidayCalendars[key] || defaultUrl;
            setUrl(currentUrl);
        }
    }, [isOpen, source, countryCode, customHolidayCalendars]);
    
    const handleSave = () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl || !(trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://'))) {
            toast({
                variant: "destructive",
                title: "رابط غير صالح",
                description: "الرجاء إدخال رابط ICS صالح يبدأ بـ http:// أو https://",
            });
            return;
        }
        saveCustomHolidayCalendar(key, url);
        toast({
            title: "تم حفظ الرابط",
            description: `سيتم استخدام هذا الرابط لجلب إجازات ${countryName}.`,
        });
        onSave();
        onOpenChange(false);
    };

    const handleReset = () => {
        deleteCustomHolidayCalendar(key);
        toast({
            title: "تمت استعادة الرابط الافتراضي",
        });
        onSave();
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent dir="rtl">
                <DialogHeader>
                    <DialogTitle>تعديل رابط التقويم لـ {countryName}</DialogTitle>
                    <DialogDescription>
                        يمكنك استبدال الرابط الافتراضي برابط تقويم ICS مخصص من اختيارك.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="custom-url-input">رابط تقويم ICS</Label>
                        <Input 
                            id="custom-url-input"
                            dir="ltr"
                            placeholder="https://www.example.com/calendar.ics"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="justify-between w-full flex-row-reverse sm:flex-row-reverse">
                    <div className="flex gap-2">
                         <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                         <Button onClick={handleSave}>حفظ الرابط</Button>
                    </div>
                    {customHolidayCalendars[key] && (
                         <Button variant="destructive" onClick={handleReset}>
                            <Trash2 className="ml-2 h-4 w-4"/>
                            استعادة الافتراضي
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface OfficialHolidaysDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddHolidays: (holidays: { date: string; title: string; note: string }[]) => void;
}

export function OfficialHolidaysDialog({
  isOpen,
  onOpenChange,
  onAddHolidays,
}: OfficialHolidaysDialogProps) {
  const [holidays, setHolidays] = useState<HolidayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [editingHolidayKey, setEditingHolidayKey] = useState<string | null>(null);
  const [editingHolidayName, setEditingHolidayName] = useState('');
  const [filter, setFilter] = useState<'all' | 'month' | 'year'>('all');


  const {
    customHolidayCalendars,
    lastHolidaySource, setLastHolidaySource,
    lastHolidayCountry, setLastHolidayCountry,
    customHolidayNames, saveCustomHolidayName,
    hiddenHolidays, addHiddenHoliday, removeHiddenHoliday,
  } = useViewSettings();
  
  const [isEditUrlOpen, setIsEditUrlOpen] = useState(false);
  
  const [activeSource, setActiveSource] = useState<CalendarSource>('officeholidays');
  const [selectedCountry, setSelectedCountry] = useState(lastHolidayCountry || 'om');

  const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set());

  const getHolidayDisplayName = useCallback((holiday: HolidayEvent) => {
    const key = `${activeSource}:${selectedCountry}:${holiday.originalSummary}`;
    if (customHolidayNames[key]) {
      return customHolidayNames[key];
    }
    return holiday.originalSummary;
  }, [activeSource, selectedCountry, customHolidayNames]);

  
  const fetchHolidays = useCallback(async (source: CalendarSource, countryCode: string) => {
    setLoading(true);
    setError(null);
    setHolidays([]);
    setSelectedHolidays(new Set());
    
    await new Promise(resolve => setTimeout(resolve, 300));

    let calendarUrl: string | null | undefined = '';
    const customKey = `${source}:${countryCode}`;

    if (customHolidayCalendars[customKey]) {
        calendarUrl = customHolidayCalendars[customKey];
    } else if (source === 'google') {
        calendarUrl = GOOGLE_CALENDARS[countryCode]?.url;
    } else if (source === 'officeholidays') {
        calendarUrl = OFFICE_HOLIDAYS[countryCode]?.url;
    }

    if (!calendarUrl) {
      setError(`لا يوجد رابط تقويم افتراضي لـ ${COUNTRIES[countryCode]?.name || 'هذه الدولة'}.`);
      setLoading(false);
      return;
    }

    let lastError: string = 'حدث خطأ أثناء جلب البيانات. تأكد من اتصالك بالإنترنت وحاول مجددًا.';
    let succeeded = false;

    for (let proxyIndex = 0; proxyIndex < CORS_PROXIES.length; proxyIndex++) {
      try {
        const proxyUrl = CORS_PROXIES[proxyIndex](calendarUrl);
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
        
        if (!response.ok) {
          lastError = `فشل جلب البيانات (${response.status}). جاري تجربة خادم وسيط آخر...`;
          continue; // Try next proxy
        }
        
        const icsData = await response.text();
        
        // Basic validation: ICS files must start with BEGIN:VCALENDAR
        if (!icsData.includes('BEGIN:VCALENDAR')) {
          lastError = 'محتوى ملف التقويم غير صالح. جاري تجربة خادم وسيط آخر...';
          continue;
        }
        
        let jcalData;
        try {
          jcalData = ICAL.parse(icsData);
        } catch (parseError) {
          console.error("ICAL.parse error:", parseError);
          lastError = 'محتوى ملف التقويم تالف أو بصيغة غير مدعومة.';
          continue;
        }
        
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');
        
        const today = new Date();
        const parsedHolidays = vevents
          .map((vevent: any) => {
            try {
              const event = new ICAL.Event(vevent);
              if (event.startDate) {
                const startDate = event.startDate.toJSDate();
                if (isNaN(startDate.getTime())) return null;

                if (startDate.getFullYear() >= today.getFullYear()) { 
                    return {
                      uid: event.uid || uuidv4(),
                      date: format(startDate, 'yyyy-MM-dd'),
                      originalSummary: event.summary || 'مناسبة بدون عنوان',
                      description: event.description || ''
                    };
                }
              }
            } catch(e) {
              console.warn('Skipping invalid VEVENT:', e);
            }
            return null;
          })
          .filter((event): event is HolidayEvent => event !== null);
        
        parsedHolidays.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        setHolidays(parsedHolidays);
        if (parsedHolidays.length === 0) {
          setError(`لم يتم العثور على إجازات قادمة لـ ${COUNTRIES[countryCode]?.name}.`);
        }
        
        succeeded = true;
        break; // Success, stop trying proxies
        
      } catch (err: any) {
        console.error(`Proxy ${proxyIndex} failed:`, err);
        if (err.name === 'TimeoutError') {
          lastError = 'انتهت مهلة الاتصال. تأكد من اتصالك بالإنترنت وحاول مجددًا.';
        } else {
          lastError = err.message || lastError;
        }
        // Continue to next proxy
      }
    }
    
    if (!succeeded) {
      setError(lastError);
    }
    setLoading(false);
  }, [customHolidayCalendars]);

  useEffect(() => {
    if (isOpen) {
      const sourceToLoad = lastHolidaySource || 'officeholidays';
      const countryToLoad = lastHolidayCountry || 'om';

      setActiveSource(sourceToLoad);
      setSelectedCountry(countryToLoad);
      
      fetchHolidays(sourceToLoad, countryToLoad);
    } else {
      // Reset state when dialog closes
      setHolidays([]);
      setError(null);
      setFilter('all');
    }
  }, [isOpen, fetchHolidays, lastHolidayCountry, lastHolidaySource]);


  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setLastHolidayCountry(countryCode);
    fetchHolidays(activeSource, countryCode);
  };
  
  const handleSourceChange = (source: CalendarSource) => {
      if (source === 'custom') {
          setIsEditUrlOpen(true);
          return;
      }
      setActiveSource(source);
      setLastHolidaySource(source);
      fetchHolidays(source, selectedCountry);
  };
  
  const handleHideHoliday = (holidayKey: string) => {
    addHiddenHoliday(holidayKey);
  }
  
  const handleRestoreHoliday = (holidayKey: string) => {
    removeHiddenHoliday(holidayKey);
  }

  const startEditing = (holiday: HolidayEvent, currentDisplayName: string) => {
    const key = `${activeSource}:${selectedCountry}:${holiday.originalSummary}`;
    setEditingHolidayKey(key);
    setEditingHolidayName(currentDisplayName);
  };
  
  const cancelEditing = () => {
    setEditingHolidayKey(null);
    setEditingHolidayName('');
  };
  
  const commitSaveEditing = () => {
    if (editingHolidayKey && editingHolidayName.trim()) {
      saveCustomHolidayName(editingHolidayKey, editingHolidayName.trim());
      toast({title: "تم حفظ الاسم الجديد."});
    }
    cancelEditing();
  };

  const toggleHolidaySelection = (holidayKey: string) => {
    setSelectedHolidays(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(holidayKey)) newSelection.delete(holidayKey);
      else newSelection.add(holidayKey);
      return newSelection;
    });
  };

  const handleAddSelected = () => {
    const holidaysToAdd = holidays
        .filter(h => selectedHolidays.has(getHolidayKey(h)))
        .map(h => ({ date: h.date, title: getHolidayDisplayName(h), note: h.description }));

    if (holidaysToAdd.length > 0) {
      onAddHolidays(holidaysToAdd);
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "لا توجد إجازات محددة" });
    }
  };
  
  const handleAddAll = () => {
    const holidaysToAdd = filteredHolidays.map(h => ({ date: h.date, title: getHolidayDisplayName(h), note: h.description }));
    if (holidaysToAdd.length > 0) {
      onAddHolidays(holidaysToAdd);
      onOpenChange(false);
    } else {
      toast({ variant: "destructive", title: "لا توجد إجازات لإضافتها" });
    }
  };
  
  const getHolidayKey = (holiday: HolidayEvent) => holiday.uid;
  const isSelected = (holiday: HolidayEvent) => selectedHolidays.has(getHolidayKey(holiday));

  const filteredHolidays = useMemo(() => {
    const now = startOfToday();
    let holidaysToFilter = holidays.filter(h => new Date(h.date) >= now);

    if (filter === 'month') {
        return holidaysToFilter.filter(h => isSameMonth(parseISO(h.date), now));
    }
    if (filter === 'year') {
        return holidaysToFilter.filter(h => isSameYear(parseISO(h.date), now));
    }
    return holidaysToFilter;
  }, [holidays, filter]);

  const visibleHolidays = filteredHolidays.filter(h => !hiddenHolidays.includes(getHolidayKey(h)));
  const currentlyHiddenHolidays = holidays.filter(h => hiddenHolidays.includes(getHolidayKey(h)));

  const renderHolidayList = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>جاري تحميل الإجازات...</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full justify-center">
                <Alert variant="destructive" className="text-center">
                    <CalendarX2 className="h-6 w-6 mx-auto mb-2" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                 <Button variant="link" className="mt-2" onClick={() => setIsEditUrlOpen(true)}>
                    <Pencil className="ml-2 h-4 w-4"/>
                    هل الرابط صحيح؟ اضغط هنا لتعديله
                </Button>
            </div>
        );
    }
    
    if (holidays.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <CalendarX2 className="h-8 w-8" />
              <p>لم يتم العثور على إجازات رسمية قادمة.</p>
                <Button variant="link" className="mt-2" onClick={() => setIsEditUrlOpen(true)}>
                    <Pencil className="ml-2 h-4 w-4"/>
                    هل الرابط صحيح؟ اضغط هنا لتعديله
                </Button>
            </div>
        );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2 p-1 bg-muted rounded-md">
          <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'secondary' : 'ghost'} className="flex-1 h-8">الكل</Button>
          <Button onClick={() => setFilter('month')} variant={filter === 'month' ? 'secondary' : 'ghost'} className="flex-1 h-8">هذا الشهر</Button>
          <Button onClick={() => setFilter('year')} variant={filter === 'year' ? 'secondary' : 'ghost'} className="flex-1 h-8">هذه السنة</Button>
        </div>
        <ScrollArea className="flex-1 rounded-md border">
          <div className="p-4">
            {currentlyHiddenHolidays.length > 0 && (
              <Accordion type="single" collapsible className="w-full mb-4">
                  <AccordionItem value="hidden-holidays">
                      <AccordionTrigger>
                          <div className="flex items-center gap-2 text-sm">
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                            المناسبات المخفية ({currentlyHiddenHolidays.length})
                          </div>
                      </AccordionTrigger>
                      <AccordionContent>
                          <ul className="space-y-2 pt-2">
                            {currentlyHiddenHolidays.map(holiday => (
                              <li key={getHolidayKey(holiday)} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30">
                                  <div className="flex flex-col">
                                      <span className="font-semibold text-muted-foreground">{getHolidayDisplayName(holiday)}</span>
                                      <span className="text-xs text-muted-foreground/70">{format(parseISO(holiday.date), 'eeee, dd MMMM yyyy', { locale: arSA })}</span>
                                  </div>
                                  <Button size="icon" variant="ghost" onClick={() => handleRestoreHoliday(getHolidayKey(holiday))}>
                                    <RotateCw className="h-4 w-4" />
                                  </Button>
                              </li>
                            ))}
                          </ul>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            )}

            <ul className="space-y-2">
              {visibleHolidays.length > 0 ? visibleHolidays.map((holiday) => {
                const holidayKey = getHolidayKey(holiday);
                const isEditingThis = editingHolidayKey === `${activeSource}:${selectedCountry}:${holiday.originalSummary}`;
                const displayName = getHolidayDisplayName(holiday);

                return (
                <li key={holidayKey} className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50">
                  {isEditingThis ? (
                    <div className="flex-grow flex items-center gap-2">
                      <Input value={editingHolidayName} onChange={(e) => setEditingHolidayName(e.target.value)} className="h-8"/>
                      <Button size="icon" variant="ghost" onClick={commitSaveEditing}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex flex-col flex-grow">
                      <span className="font-bold text-primary">{displayName}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(holiday.date), 'eeee, dd MMMM yyyy', { locale: arSA })}
                      </span>
                    </div>
                  )}
                  
                  {!isEditingThis && (
                    <div className="flex items-center shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"><Eye className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>إخفاء المناسبة</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هل أنت متأكد من أنك تريد إخفاء "{displayName}"؟ يمكنك استعادتها لاحقًا.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleHideHoliday(holidayKey)}>تأكيد الإخفاء</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => startEditing(holiday, displayName)}><Pencil className="h-4 w-4" /></Button>
                      <Button 
                        size="icon" 
                        variant={isSelected(holiday) ? "secondary" : "ghost"}
                        onClick={() => toggleHolidaySelection(holidayKey)}
                        className="w-10 h-10 shrink-0"
                        aria-label={isSelected(holiday) ? 'إلغاء تحديد' : 'تحديد'}
                      >
                        {isSelected(holiday) ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                      </Button>
                    </div>
                  )}
                </li>
              )}) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>لا توجد مناسبات في هذه الفترة.</p>
                </div>
              )}
            </ul>
          </div>
        </ScrollArea>
      </div>
    );
  };
  

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle>الإجازات الرسمية القادمة</DialogTitle>
          <DialogDescription>
            اختر الدولة والمصدر لعرض الإجازات الرسمية وإضافتها إلى جدولك.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger id="country-select" className="w-full">
                    <SelectValue placeholder="اختر دولة..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(COUNTRIES).map(([code, { name }]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

             <Select value={activeSource} onValueChange={(val) => handleSourceChange(val as CalendarSource)}>
                <SelectTrigger id="source-select" className="w-full">
                    <SelectValue placeholder="اختر مصدر..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="officeholidays">OfficeHolidays.com</SelectItem>
                    <SelectItem value="google">تقويم Google</SelectItem>
                    <SelectItem value="custom">رابط مخصص</SelectItem>
                </SelectContent>
            </Select>
        </div>


        <div className="flex-1 min-h-0">
          {renderHolidayList()}
        </div>

        {!loading && holidays.length > 0 &&(
            <DialogFooter className="flex-col sm:flex-row sm:justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                {visibleHolidays.length > 0 && selectedHolidays.size > 0 && (
                  <Button onClick={handleAddSelected}>
                    إضافة المحدد ({selectedHolidays.size})
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={loading || visibleHolidays.length === 0}>إضافة الكل ({visibleHolidays.length})</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم إضافة جميع الإجازات المعروضة ({visibleHolidays.length}) إلى جدولك الحالي.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAddAll}>تأكيد الإضافة</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    <EditUrlDialog
        isOpen={isEditUrlOpen}
        onOpenChange={setIsEditUrlOpen}
        countryCode={selectedCountry}
        source={activeSource}
        onSave={() => { 
            fetchHolidays(activeSource, selectedCountry)
        }}
    />
    </>
  );
}

    