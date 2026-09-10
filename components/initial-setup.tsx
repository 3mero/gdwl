"use client";

import * as React from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { useGoogleSync } from '@/hooks/use-google-sync';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Trash2, Plus, GripVertical, Upload, Cloud, Loader2 } from 'lucide-react';
import { cn, formatDateKey, uuidv4 } from '@/lib/utils';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Schedule, DayTypeDefinition, DayUnderlyingType, FullExport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from './ui/separator';

type InitialSetupProps = {
    isDialog?: boolean;
    onFinished?: () => void;
    existingSchedule?: Schedule | null;
}

const defaultDayTypes: DayTypeDefinition[] = [
    { id: uuidv4(), name: 'عمل', type: 'work', days: 1, color: '#10B981' },
    { id: uuidv4(), name: 'إجازة', type: 'holiday', days: 3, color: '#FFFFFF' }
];

export function InitialSetup({ isDialog = false, onFinished, existingSchedule = null }: InitialSetupProps) {
  const { toast } = useToast();
  const schedulesHook = useSchedules();
  const googleSync = useGoogleSync();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [scheduleName, setScheduleName] = React.useState('');
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [dayTypes, setDayTypes] = React.useState<DayTypeDefinition[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (existingSchedule) {
      setScheduleName(existingSchedule.name);
      setStartDate(existingSchedule.startDate ? parseISO(existingSchedule.startDate) : undefined);
      setDayTypes(existingSchedule.dayTypes && existingSchedule.dayTypes.length > 0
          ? JSON.parse(JSON.stringify(existingSchedule.dayTypes))
          : JSON.parse(JSON.stringify(defaultDayTypes))
      );
    } else {
      setScheduleName('');
      setStartDate(undefined);
      setDayTypes(JSON.parse(JSON.stringify(defaultDayTypes)));
    }
  }, [existingSchedule]);

  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [draggedItem, setDraggedItem] = React.useState<DayTypeDefinition | null>(null);
  
  const handleBulkUpdate = (scheduleId: string, baseDate: Date, currentDays: Schedule['days'], localDayTypes: DayTypeDefinition[]) => {
    const newDays = { ...currentDays };
    const cycleDefinition = localDayTypes.filter(dt => dt.days > 0);
    const cycleLength = cycleDefinition.reduce((acc, dt) => acc + dt.days, 0);

    if (cycleLength === 0) return newDays;

    const totalDaysToProcess = 365 * 20; 
    const processingStartDate = addDays(baseDate, -totalDaysToProcess / 2);

    for (let i = 0; i < totalDaysToProcess; i++) {
        const currentDate = addDays(processingStartDate, i);
        const daysDiff = differenceInDays(currentDate, baseDate);
        let dayInCycle = (daysDiff % cycleLength + cycleLength) % cycleLength;
        
        const dateKey = formatDateKey(currentDate);
        
        let typeId: string | undefined = undefined;
        let counter = 0;
        for (const dayType of cycleDefinition) {
            if (dayInCycle >= counter && dayInCycle < counter + dayType.days) {
                typeId = dayType.id;
                break;
            }
            counter += dayType.days;
        }

        newDays[dateKey] = { 
            ...(newDays[dateKey] || {}), 
            typeId: typeId,
        };
    }
    return newDays;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduleName.trim() || !startDate) {
        toast({
            variant: "destructive",
            title: "بيانات غير مكتملة",
            description: "الرجاء إدخال اسم للجدول وتاريخ بدء.",
        });
        return;
    }
    
    const startDayOfWeekValue: 0 | 1 | 6 = 0; // Default to Sunday

    const scheduleData = {
        name: scheduleName.trim(),
        startDate: formatDateKey(startDate),
        monthsToShow: 12,
        startDayOfWeek: startDayOfWeekValue,
        dayTypes: dayTypes,
    };

    if (existingSchedule) {
        // Update existing schedule
        const updatedDays = handleBulkUpdate(existingSchedule.id, startDate, existingSchedule.days, dayTypes);
        schedulesHook.updateSchedule(existingSchedule.id, { ...scheduleData, days: updatedDays });
        toast({ title: "تم تحديث الجدول بنجاح!" });
        if (onFinished) {
            onFinished();
        }
    } else {
        // Create new schedule
        const newSchedule = schedulesHook.addSchedule(
          scheduleName.trim(), 
          startDayOfWeekValue,
          12,
          formatDateKey(startDate),
          dayTypes,
        );
        const updatedDays = handleBulkUpdate(newSchedule.id, startDate, newSchedule.days, dayTypes);
        schedulesHook.updateSchedule(newSchedule.id, { days: updatedDays });
        schedulesHook.setActiveScheduleId(newSchedule.id);
        toast({ title: "تم إنشاء الجدول بنجاح!" });
        if (onFinished) {
            onFinished();
        }
    }
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          const imported = JSON.parse(content as string) as FullExport | Schedule[];
          
          if ('schedules' in imported && 'viewSettings' in imported) {
            schedulesHook.importFullData(imported);
            toast({ title: "نجح الاستيراد الكامل", description: "تم استيراد الجداول والإعدادات." });
            if (onFinished) onFinished();
          } else if (Array.isArray(imported)) {
            const cleanedSchedules = imported.map(s => {
                if ((s as any).colors) {
                    delete (s as any).colors;
                }
                return s;
            });
            schedulesHook.setSchedules(cleanedSchedules);
            toast({ title: "نجح الاستيراد (تنسيق قديم)", description: "تم استيراد الجداول. قد تحتاج لإعادة ضبط إعدادات الواجهة." });
            if (onFinished) onFinished();
          } else {
             throw new Error("Invalid file format");
          }
        } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "فشل الاستيراد", description: "ملف JSON غير صالح أو بتنسيق خاطئ." });
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  const handleGoogleLoginAndRestore = async () => {
    setIsGoogleLoading(true);
    try {
      const token = await googleSync.requestGoogleLogin();
      if (!token) {
        setIsGoogleLoading(false);
        return;
      }
      toast({
        title: "تم تسجيل الدخول بحساب Google",
        description: "جار فحص النسخة السحابية في Google Drive...",
      });
      const cloudData = await googleSync.restoreFromCloud();
      if (cloudData && cloudData.schedules && cloudData.schedules.length > 0) {
        schedulesHook.importFullData(cloudData);
        toast({
          title: "تمت استعادة جداولك بنجاح!",
          description: `تم استرجاع ${cloudData.schedules.length} جدول وإعداداتك بالكامل.`,
        });
        if (onFinished) onFinished();
      } else {
        // First-time email login: automatically initialize first schedule and transfer to schedules page!
        const initialName = scheduleName.trim() || 'جدول العمل';
        const initialBaseDate = startDate || new Date();
        const startDayOfWeekValue: 0 | 1 | 6 = 0;
        const activeTypes = dayTypes && dayTypes.length > 0 ? dayTypes : defaultDayTypes;

        const newSchedule = schedulesHook.addSchedule(
          initialName,
          startDayOfWeekValue,
          12,
          formatDateKey(initialBaseDate),
          activeTypes,
        );
        const updatedDays = handleBulkUpdate(newSchedule.id, initialBaseDate, newSchedule.days, activeTypes);
        schedulesHook.updateSchedule(newSchedule.id, { days: updatedDays });
        schedulesHook.setActiveScheduleId(newSchedule.id);

        // Immediate background cloud backup so it's safely saved in Drive
        googleSync.syncNow({
          schedules: [{ ...newSchedule, days: updatedDays }],
          viewSettings: {} as any,
        }).catch(() => {});

        toast({
          title: "مرحباً بك! تم تسجيل الدخول بنجاح",
          description: "تم إنشاء جدولك الأول تلقائياً ونقلك مباشرة إلى صفحة الجداول.",
        });

        if (onFinished) {
          onFinished();
        }
      }
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "تعذر الاتصال بـ Google",
        description: err.message || "حدث خطأ أثناء تسجيل الدخول.",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    setIsCalendarOpen(false);
  };

  const handleDayTypeChange = <K extends keyof DayTypeDefinition>(id: string, key: K, value: DayTypeDefinition[K]) => {
    setDayTypes(prev => prev.map(dt => dt.id === id ? {...dt, [key]: value} : dt));
  }

  const addDayType = () => {
    const newDayType: DayTypeDefinition = {
        id: uuidv4(),
        name: `نوع جديد`,
        type: 'work',
        days: 1,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
    };
    setDayTypes(prev => [...prev, newDayType]);
  }

  const removeDayType = (id: string) => {
    if (dayTypes.length > 1) {
        setDayTypes(prev => prev.filter(dt => dt.id !== id));
    } else {
        toast({ variant: 'destructive', title: "لا يمكن الحذف", description: "يجب أن يوجد نوع يوم واحد على الأقل."})
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: DayTypeDefinition) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: DayTypeDefinition) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) {
        setDraggedItem(null);
        return;
    }

    const currentIndex = dayTypes.findIndex(item => item.id === draggedItem.id);
    const targetIndex = dayTypes.findIndex(item => item.id === targetItem.id);

    if (currentIndex !== -1 && targetIndex !== -1) {
        const newDayTypes = [...dayTypes];
        const [movedItem] = newDayTypes.splice(currentIndex, 1);
        newDayTypes.splice(targetIndex, 0, movedItem);
        setDayTypes(newDayTypes);
    }
    setDraggedItem(null);
  };

  const cardContent = (
      <>
          <CardHeader className={cn(isDialog && "hidden")}>
            <CardTitle className="text-2xl font-bold text-primary">
                {existingSchedule ? 'تعديل الجدول' : 'إنشاء جدول جديد'}
            </CardTitle>
            <CardDescription>
              {existingSchedule 
                ? `تعديل تفاصيل جدول "${existingSchedule.name}"` 
                : 'أدخل تفاصيل جدولك الجديد. يتم تخزين جميع البيانات محليًا على جهازك مع دعم المزامنة السحابية.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-right max-h-[60vh] overflow-y-auto p-6">
            <div className="space-y-2">
              <Label htmlFor="schedule-name">اسم الجدول</Label>
              <Input
                id="schedule-name"
                placeholder="مثال: جدول أعمالي"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">تاريخ بدء الدورة</Label>
               <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: arSA }) : <span>اختر تاريخًا</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={arSA}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
                <Label>دورة الأيام</Label>
                <div className='space-y-3'>
                    {dayTypes.map((dt) => (
                        <div 
                          key={dt.id} 
                          className="flex items-center gap-2 p-2 border rounded-lg bg-accent/30 transition-all"
                          draggable
                          onDragStart={(e) => handleDragStart(e, dt)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, dt)}
                          style={{ opacity: draggedItem?.id === dt.id ? 0.5 : 1 }}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                            <div className='flex-1 grid grid-cols-2 gap-2'>
                                <Input 
                                    placeholder="اسم النوع (عمل, إجازة...)" 
                                    value={dt.name} 
                                    onChange={e => handleDayTypeChange(dt.id, 'name', e.target.value)}
                                />
                                <Input 
                                    type="number" 
                                    value={dt.days} 
                                    onChange={e => handleDayTypeChange(dt.id, 'days', parseInt(e.target.value) || 0)} 
                                    min="0"
                                    placeholder="عدد الأيام"
                                />
                                 <Select value={dt.type} onValueChange={(val: DayUnderlyingType) => handleDayTypeChange(dt.id, 'type', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="work">يوم عمل</SelectItem>
                                        <SelectItem value="holiday">يوم إجازة</SelectItem>
                                    </SelectContent>
                                 </Select>
                                 <Input 
                                    type="color" 
                                    value={dt.color} 
                                    onChange={(e) => handleDayTypeChange(dt.id, 'color', e.target.value)} 
                                    className="p-1 h-10 min-w-[50px]"
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDayType(dt.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button variant="outline" className="w-full mt-2" type="button" onClick={addDayType}>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة نوع يوم جديد
                </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 pt-0">
            <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            {isDialog ? (
                onFinished && <Button variant="outline" type="button" onClick={onFinished}>إلغاء</Button>
            ) : (
                <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="ml-2 h-4 w-4" />
                    استرداد ملف JSON
                </Button>
            )}
            <Button type="submit" className="w-full sm:w-auto" disabled={!scheduleName.trim() || !startDate}>
              {existingSchedule ? 'حفظ التعديلات' : 'إنشاء وتطبيق الإعدادات'}
            </Button>
          </CardFooter>

          {!isDialog && (
            <div className="border-t bg-muted/40 p-4 sm:p-5 rounded-b-xl space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-foreground">
                <Cloud className="h-4 w-4 text-primary" />
                <span>لديك حساب سابق أو جداول محفوظة في Google Drive؟</span>
              </div>
              <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                سجل الدخول بحساب Google لاستعادة جميع جداولك وإعداداتك السحابية فوراً دون الحاجة لإعادة إدخالها.
              </p>
              <div className="pt-1 max-w-sm mx-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLoginAndRestore}
                  disabled={isGoogleLoading}
                  className="w-full gap-2.5 font-bold text-xs py-2.5 h-11 rounded-xl border-primary/30 hover:border-primary hover:bg-primary/5 transition-all shadow-sm"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>تسجيل الدخول بـ Google واستعادة الجداول</span>
                </Button>
              </div>
            </div>
          )}
      </>
  );

  if (isDialog) {
    return <form onSubmit={handleSubmit} className="flex flex-col">{cardContent}</form>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl overflow-hidden border-2 border-primary/20">
        <form onSubmit={handleSubmit}>
            {cardContent}
        </form>
      </Card>
    </div>
  );
}
