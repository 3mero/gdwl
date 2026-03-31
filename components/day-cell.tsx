
"use client";

import React, { useRef, useState } from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { cn, formatDateKey } from '@/lib/utils';
import { DayUnderlyingType, DayTypeDefinition } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Pin, MessageSquare, Edit2, Check, X, Trash2 } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { DayDetailDialog } from './day-detail-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';


type DayCellProps = {
  day: Date | null;
  currentDate: Date;
  isHighlighted?: boolean;
};

export function DayCell({ day, currentDate, isHighlighted }: DayCellProps) {
  const { activeSchedule, updateDay } = useSchedules();
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const pressTimer = useRef<NodeJS.Timeout>();

  if (!day) {
    return <div className="aspect-square rounded-md border" />;
  }

  const dateKey = formatDateKey(day);
  const dayData = activeSchedule?.days[dateKey];
  const dayTypeDef = activeSchedule?.dayTypes?.find(dt => dt.id === dayData?.typeId);
  
  const handleSetType = (typeId: string) => {
    updateDay(dateKey, { typeId: typeId });
  };
  
  const handleTogglePin = () => {
    updateDay(dateKey, { pinned: !dayData?.pinned });
  };

  const handleSaveDetails = (title: string, note: string, pinned: boolean) => {
    updateDay(dateKey, { title, note, pinned });
  };
  
  const handleClearData = () => {
    // Only clears note and pin, preserves the type
    updateDay(dateKey, { title: undefined, note: undefined, pinned: false });
  };

  const isCurrentDay = isSameDay(day, currentDate);

  const getBackgroundColor = () => {
    return dayTypeDef?.color || 'transparent';
  };
  
  const cellStyle = {
    backgroundColor: getBackgroundColor(),
  };

  const getDayNumberColor = () => {
    if (dayTypeDef) {
      // Basic contrast check, could be improved with a library
      const color = dayTypeDef.color.substring(1); // strip #
      const rgb = parseInt(color, 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma < 128 ? 'white' : 'black';
    }
    return '#000000'; // Default to black
  }
  
  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
        setIsMenuOpen(true);
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) {
        clearTimeout(pressTimer.current);
    }
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
      if (isMobile) {
          e.preventDefault();
          setIsMenuOpen(true);
      }
  };

  const cellContent = (
    <div
      style={cellStyle}
      className={cn(
        "relative flex aspect-square cursor-pointer items-center justify-center rounded-md border border-transparent transition-all duration-200 select-none hover:opacity-80",
        isCurrentDay && 'border-red-500 ring-2 ring-red-500 shadow-md shadow-red-500/40',
        isHighlighted && "animate-flash border-2 border-transparent"
      )}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      onContextMenu={handleContextMenu}
    >
      <span 
        className={cn(
          "text-sm font-bold",
          isCurrentDay && "text-red-400"
        )} 
        style={isCurrentDay ? undefined : { color: getDayNumberColor() }}
      >
        {day.getDate()}
      </span>
      {dayData?.pinned && (
        <Pin className="absolute top-1 right-1 h-3 w-3 fill-red-500 text-red-500" />
      )}
      {(dayData?.note || dayData?.title) && (
        <MessageSquare className="absolute bottom-1 left-1 h-3 w-3 fill-accent text-transparent" />
      )}
    </div>
  );

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild disabled={isMobile}>
                    <div className="w-full h-full">{cellContent}</div>
                </DropdownMenuTrigger>
            </TooltipTrigger>
            {dayData?.title && <TooltipContent><p>{dayData.title}</p></TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        <DropdownMenuContent className="w-56" dir="rtl" align="end">
          <DropdownMenuItem onSelect={() => setIsDetailOpen(true)}>
            <Edit2 className="ml-2 h-4 w-4" />
            <span>تعديل التفاصيل</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleTogglePin}>
            <Pin className="ml-2 h-4 w-4" />
            <span>{dayData?.pinned ? 'إلغاء تثبيت اليوم' : 'تثبيت هذا اليوم'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
           <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Check className="ml-2 h-4 w-4" />
              <span>تعيين نوع اليوم</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48">
                {activeSchedule?.dayTypes?.map(dt => (
                  <DropdownMenuItem key={dt.id} onSelect={() => handleSetType(dt.id)}>
                     <div style={{backgroundColor: dt.color}} className="w-4 h-4 rounded-full border ml-2"/>
                    <span>{dt.name}</span>
                  </DropdownMenuItem>
                ))}
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={() => updateDay(dateKey, { typeId: undefined })}>
                    <X className="ml-2 h-4 w-4 text-destructive" />
                    <span className="text-destructive">إزالة النوع</span>
                 </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {dayData && (dayData.note || dayData.pinned || dayData.title) && <DropdownMenuSeparator />}
          {dayData && (dayData.note || dayData.pinned || dayData.title) &&
            <DropdownMenuItem onSelect={handleClearData} className="text-destructive">
              <Trash2 className="ml-2 h-4 w-4" />
              <span>مسح البيانات (عنوان وملاحظة ودبوس)</span>
            </DropdownMenuItem>
          }
        </DropdownMenuContent>
      </DropdownMenu>

      <DayDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        day={day}
        dayData={dayData}
        onSave={handleSaveDetails}
      />
    </>
  );
}
