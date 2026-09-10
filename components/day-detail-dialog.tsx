
"use client";

import React, { useState, useEffect } from 'react';
import type { DayData } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, MessageSquare, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';

interface DayDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  day: Date | null;
  dayData: DayData | undefined;
  onSave: (title: string, note: string, pinned: boolean) => void;
  onDeleteHoliday?: () => void;
}

export function DayDetailDialog({
  isOpen,
  onOpenChange,
  day,
  dayData,
  onSave,
  onDeleteHoliday,
}: DayDetailDialogProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(dayData?.title || '');
      setNote(dayData?.note || '');
      setPinned(dayData?.pinned || false);
    }
  }, [isOpen, dayData]);

  if (!day) return null;

  const handleSave = () => {
    onSave(title, note, pinned);
    onOpenChange(false);
  };
  
  const dayFormatted = day.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>تفاصيل اليوم</DialogTitle>
          <DialogDescription>{dayFormatted}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
          
          {/* Dedicated Red Official Holiday Box */}
          {(dayData?.holidayInfo || dayData?.event) && (
            <div className="bg-red-500/10 border-2 border-red-500/30 p-3.5 rounded-xl text-right flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <CalendarDays className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>إجازة رسمية: {dayData.holidayInfo?.title || dayData.event}</span>
                </div>
                {(dayData.holidayInfo?.note) && (
                  <p className="text-xs text-red-400 font-medium pr-6.5 pt-0.5 leading-relaxed">
                    {dayData.holidayInfo.note}
                  </p>
                )}
              </div>
              {onDeleteHoliday && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-500/20 shrink-0"
                  onClick={onDeleteHoliday}
                  title="حذف هذه الإجازة من هذا اليوم"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {(dayData?.holidayInfo || dayData?.event) && <Separator />}

          <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-foreground">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                الملاحظة الشخصية
              </h3>
              <div className="space-y-2">
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="إضافة عنوان للملاحظة..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">الوصف (اختياري)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="إضافة وصف تفصيلي..."
                  rows={4}
                />
              </div>
          </div>

          <div className="flex flex-col gap-1 pt-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="pinned"
                checked={pinned}
                onCheckedChange={setPinned}
              />
              <Label htmlFor="pinned" className="cursor-pointer font-semibold">تثبيت هذا اليوم للوصول السريع</Label>
            </div>
            <p className="text-[11px] text-muted-foreground/80 font-normal pr-8">
              (خاصة بك ولن يقرأها البوت)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave}>حفظ التغييرات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
