
"use client";

import React, { useState, useEffect } from 'react';
import { generateMonthMatrix, formatDateKey, cn } from '@/lib/utils';
import { MONTH_NAMES, DAY_OF_WEEK_NAMES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { DayCell } from './day-cell';
import { eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameYear, getMonth, getYear, format, getDay, isBefore } from 'date-fns';
import { Schedule } from '@/lib/types';
import { Button } from './ui/button';
import { Paintbrush, Save, RotateCw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { useSchedules } from '@/hooks/use-schedules';
import { useViewSettings } from '@/hooks/use-view-settings';


type CalendarMonthProps = {
  month: Date;
  currentDate: Date;
  activeSchedule: Schedule;
  monthKey: string;
  isHighlighted?: boolean;
  highlightedDays?: string[];
};

export function CalendarMonth({ month, currentDate, activeSchedule, monthKey, isHighlighted = false, highlightedDays }: CalendarMonthProps) {
  const { updateSchedule } = useSchedules();
  const { backgroundColors } = useViewSettings();
 
  const scheduleStartDate = activeSchedule.startDate ? new Date(activeSchedule.startDate) : null;
  const year = getYear(month);
  const monthIndex = getMonth(month);
  const startDay = activeSchedule.startDayOfWeek;

  const weeks = generateMonthMatrix(year, monthIndex, startDay);
  const dayHeaders = [...DAY_OF_WEEK_NAMES.slice(startDay), ...DAY_OF_WEEK_NAMES.slice(0, startDay)];
  const dayIndices = [...Array(7).keys()].map(i => (i + startDay) % 7);


  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const summary = daysInMonth.reduce((acc, day) => {
    const dateKey = formatDateKey(day);
    const dayData = activeSchedule.days[dateKey];
    if (dayData && dayData.typeId) {
        const dayTypeDef = activeSchedule.dayTypes?.find(dt => dt.id === dayData.typeId);
        if (dayTypeDef) {
            if (!acc[dayTypeDef.id]) {
                acc[dayTypeDef.id] = { id: dayTypeDef.id, count: 0, name: dayTypeDef.name, color: dayTypeDef.color };
            }
            acc[dayTypeDef.id].count++;
        }
    }
    return acc;
  }, {} as Record<string, { id: string, count: number, name: string, color: string }>);
  
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [localMonthBg, setLocalMonthBg] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

  const savedMonthBg = activeSchedule.monthBackgrounds?.[monthKey] || '';

  useEffect(() => {
    if (isPopoverOpen) {
      // When opening the popover, initialize local state with the saved color
      setLocalMonthBg(savedMonthBg);
    }
  }, [isPopoverOpen, savedMonthBg]);

  const handleColorSave = () => {
    const newBackgrounds = { ...(activeSchedule.monthBackgrounds || {}) };

    if (applyToAll) {
        const currentYear = getYear(month);
        for(let i = 0; i < 12; i++) {
            const key = format(new Date(currentYear, i), 'yyyy-MM');
            newBackgrounds[key] = localMonthBg;
        }
    } else {
        newBackgrounds[monthKey] = localMonthBg;
    }
    updateSchedule(activeSchedule.id, { monthBackgrounds: newBackgrounds });
    setIsPopoverOpen(false); // Close popover on save
  };
  
  const handleResetColor = () => {
    // This resets the saved color, not just the local preview
    const newBackgrounds = { ...(activeSchedule.monthBackgrounds || {}) };

    if (applyToAll) {
        const currentYear = getYear(month);
        for(let i = 0; i < 12; i++) {
            const key = format(new Date(currentYear, i), 'yyyy-MM');
            delete newBackgrounds[key];
        }
    } else {
      delete newBackgrounds[monthKey];
    }
    
    updateSchedule(activeSchedule.id, { monthBackgrounds: newBackgrounds });
    setLocalMonthBg(''); // update preview
    setIsPopoverOpen(false); // Close popover on reset
  }

  const isCurrentMonth = isSameMonth(month, currentDate) && isSameYear(month, currentDate);
  const isPastMonth = isBefore(monthEnd, currentDate) && !isSameMonth(monthEnd, currentDate);

  const cardStyle = {
    // During editing, show the local preview color. Otherwise, show the saved color or default.
    backgroundColor: isPopoverOpen 
      ? (localMonthBg || backgroundColors.monthCard)
      : (savedMonthBg || backgroundColors.monthCard),
  };


  return (
    <>
      <Card 
        style={cardStyle}
        className={cn(
          "flex flex-col transition-all duration-300",
          isCurrentMonth && "border-primary/50",
          isHighlighted && "animate-flash border-2 border-transparent"
        )}>
        <CardHeader className="relative pb-2">
          {isPastMonth && <div className="absolute top-0 left-0 right-0 text-center text-xs text-muted-foreground bg-accent/30 rounded-t-md py-0.5">شهر منقضٍ</div>}
          <div className={cn("absolute top-2 left-3 text-xs font-mono", isPastMonth && "top-6")} style={{color: backgroundColors.monthNumber}}>{monthIndex + 1}</div>
          
           <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                <div className="absolute top-2 right-2 cursor-pointer p-1 rounded-full hover:bg-accent transition-colors">
                    <Paintbrush className="h-4 w-4 text-muted-foreground" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64" dir="rtl">
                <div className="space-y-4">
                    <h4 className="font-medium text-center">تخصيص خلفية الشهر</h4>
                    <div className="flex items-center justify-between">
                         <Label htmlFor={`color-picker-${monthKey}`} className="text-sm">اختر لون</Label>
                         <Input 
                            id={`color-picker-${monthKey}`}
                            type="color" 
                            value={localMonthBg} // Controlled by local state for preview
                            onChange={(e) => setLocalMonthBg(e.target.value)}
                            className="w-16 h-8 p-1"
                        />
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox 
                            id={`apply-to-all-${monthKey}`}
                            checked={applyToAll}
                            onCheckedChange={() => setApplyToAll(!applyToAll)}
                        />
                        <Label htmlFor={`apply-to-all-${monthKey}`} className="text-sm">تطبيق على كل أشهر السنة</Label>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="w-full" onClick={handleColorSave}>
                          <Save className="ml-2 h-4 w-4" />
                          حفظ
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full" onClick={handleResetColor}>
                        <RotateCw className="ml-2 h-4 w-4" />
                        إعادة للون الافتراضي
                      </Button>
                    </div>
                </div>
            </PopoverContent>
          </Popover>

            <div className={cn("flex justify-center items-center h-8 rounded-md border p-1 text-center font-semibold", isPastMonth && "mt-4")} style={{color: backgroundColors.monthName, backgroundColor: backgroundColors.monthNameBackground}}>
                <span>{MONTH_NAMES[monthIndex]} </span>
                <span className={cn("ml-2", getYear(month) > getYear(new Date()) && "text-destructive")}>{year}</span>
            </div>
        </CardHeader>
        <CardContent className="flex-grow p-2">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2 xl:gap-2">
            {dayHeaders.map((day, index) => {
              const dayIndex = dayIndices[index];
              const isWeekend = dayIndex === 5 || dayIndex === 6; // Friday or Saturday
              return (
                <div key={day} className={cn(
                  "flex h-8 items-center justify-center rounded-md border bg-accent/50 p-1 text-[10px] sm:text-xs",
                   isWeekend ? "text-green-400" : "text-foreground"
                )}>
                  {day}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 grid-rows-6 gap-1 xl:gap-2">
            {weeks.flat().map((day, index) => (
              <DayCell 
                key={day ? day.toISOString() : `empty-${index}`} 
                day={day} 
                currentDate={currentDate}
                isHighlighted={day ? highlightedDays?.includes(formatDateKey(day)) : false}
              />
            ))}
          </div>
        </CardContent>
        {Object.keys(summary).length > 0 && (
          <CardFooter className="justify-center gap-x-3 gap-y-1 flex-wrap border-t p-3 pt-2 text-sm">
              {Object.values(summary).map(item => (
                 <div key={item.id} className="flex items-center gap-2 border rounded-md px-2 py-1 text-foreground" style={{ borderColor: item.color }}>
                    <span>{item.name}:</span>
                    <span className="font-semibold" style={{ color: item.color }}>{item.count}</span>
                 </div>
              ))}
          </CardFooter>
        )}
      </Card>
    </>
  );
}
