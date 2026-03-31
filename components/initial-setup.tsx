"use client";

import * as React from 'react';
import { useSchedules } from '@/hooks/use-schedules';
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
import { Calendar as CalendarIcon, Trash2, Plus, GripVertical } from 'lucide-react';
import { cn, formatDateKey, uuidv4 } from '@/lib/utils';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Schedule, DayTypeDefinition, DayUnderlyingType } from '@/lib/types';
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

  const [scheduleName, setScheduleName] = React.useState('');
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [dayTypes, setDayTypes] = React.useState<DayTypeDefinition[]>([]);
  
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
                : 'أدخل تفاصيل جدولك الجديد. يتم تخزين جميع البيانات محليًا على جهازك.'}
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
            {isDialog && onFinished && <Button variant="outline" type="button" onClick={onFinished}>إلغاء</Button>}
            <Button type="submit" className="w-full sm:w-auto" disabled={!scheduleName.trim() || !startDate}>
              {existingSchedule ? 'حفظ التعديلات' : 'إنشاء وتطبيق الإعدادات'}
            </Button>
          </CardFooter>
      </>
  );

  if (isDialog) {
    return <form onSubmit={handleSubmit} className="flex flex-col">{cardContent}</form>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl">
        <form onSubmit={handleSubmit}>
            {cardContent}
        </form>
      </Card>
    </div>
  );
}
