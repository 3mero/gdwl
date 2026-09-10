
"use client";

import React, { useState, useRef } from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { useViewSettings } from '@/hooks/use-view-settings';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Upload, Download, SlidersHorizontal, ZoomIn, ZoomOut, LayoutGrid, Smartphone, AlertTriangle, Bell, ChevronLeft, ArrowRight, CheckCheck, Sparkles, Megaphone, Globe, Check, RotateCw, MessageSquare, Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Schedule, FullExport } from '@/lib/types';
import { InitialSetup } from './initial-setup';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";


function DeleteAllDataDialog({ onConfirm }: { onConfirm: () => void }) {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "حذف كل شي";
    const isMatch = confirmationText === requiredText;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    <AlertTriangle className="ml-2 h-4 w-4" />
                    حذف جميع بيانات التطبيق
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                    <AlertDialogTitle>إجراء خطير: حذف جميع البيانات</AlertDialogTitle>
                    <AlertDialogDescription>
                        سيؤدي هذا إلى حذف **جميع** الجداول والإعدادات والبيانات المحفوظة في التطبيق بشكل نهائي.
                        للتأكيد، الرجاء كتابة "<span className="font-bold text-destructive">{requiredText}</span>" في الحقل أدناه.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                    <Label htmlFor="delete-confirmation" className="sr-only">تأكيد الحذف</Label>
                    <Input
                        id="delete-confirmation"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder={requiredText}
                        autoComplete="off"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmationText('')}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!isMatch}
                        onClick={() => {
                            if (isMatch) {
                                onConfirm();
                                setConfirmationText('');
                            }
                        }}
                    >
                        أنا متأكد، احذف كل شيء
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

type ScheduleManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetGridCols: (cols: number) => void;
  currentGridCols: number;
  installPrompt: any;
  isAppInstalled: boolean;
  onInstallClick: () => void;
  initialTab?: 'settings' | 'notifications';
  onOpenHolidays?: () => void;
};

export function ScheduleManager({ 
    open, 
    onOpenChange, 
    onZoomIn, 
    onZoomOut, 
    onSetGridCols, 
    currentGridCols,
    installPrompt,
    isAppInstalled,
    onInstallClick,
    initialTab = 'settings',
    onOpenHolidays
}: ScheduleManagerProps) {
  const { schedules, deleteSchedule, importFullData, setSchedules, deleteAllData, purgeInvalidHolidays } = useSchedules();
  const { viewSettings, tickerSpeed, setTickerSpeed, showTicker, setShowTicker } = useViewSettings();
  const { 
    filteredNotifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearNotifications 
  } = useNotifications();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentView, setCurrentView] = useState<'main' | 'notifications'>('main');
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<Schedule | null>(null);

  React.useEffect(() => {
    if (open) {
      if (initialTab === 'notifications') {
        setCurrentView('notifications');
      } else {
        setCurrentView('main');
      }
    }
  }, [open, initialTab]);

  const handleManualSyncHolidays = async () => {
    setIsSyncingHolidays(true);
    try {
      const cleaned = purgeInvalidHolidays();
      toast({
        title: "تم تحديث ومزامنة إجازات سلطنة عُمان",
        description: cleaned > 0 
          ? `تم تنظيف ${cleaned} من الإدخالات القديمة وتثبيت وضع سلطنة عُمان المستقر.`
          : "تم التحقق من استقرار ومزامنة إجازات سلطنة عُمان بنجاح.",
      });
      if (onOpenHolidays) {
        onOpenHolidays();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'bug' | 'feature' | 'other'>('suggestion');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى كتابة نص الرسالة أو الاقتراح أولاً." });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const isPwa = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const platform = /iPhone|iPad|iPod/.test(userAgent) ? 'iPhone / iOS' :
                       /Android/.test(userAgent) ? 'Android' :
                       /Windows/.test(userAgent) ? 'Windows' :
                       /Macintosh/.test(userAgent) ? 'Mac' : 'Web Browser';

      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_feedback',
          type: feedbackType,
          message: feedbackMessage,
          contact: feedbackContact,
          platform,
          isPwa,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        toast({
          title: "تم الإرسال بنجاح 💌",
          description: "شكراً لك! وصلت رسالتك مباشرة إلى لوحة المطور وسيتم مراجعتها باهتمام.",
        });
        setFeedbackMessage('');
        setFeedbackContact('');
        setIsFeedbackOpen(false);
      } else {
        toast({ variant: "destructive", title: "خطأ بالإرسال", description: data?.error || "تعذر إرسال الملاحظة حالياً." });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ بالاتصال", description: "يرجى التحقق من اتصالك بالإنترنت." });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };



  const handleExport = () => {
    if (schedules.length === 0) return;

    const exportData: FullExport = {
      schedules,
      viewSettings
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `my_planner_backup_${format(new Date(), 'yyyy-MM-dd')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: "تم تصدير البيانات", description: `تم تصدير جميع الجداول والإعدادات.` });
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
            importFullData(imported);
            toast({ title: "نجح الاستيراد الكامل", description: "تم استيراد الجداول والإعدادات." });
          } else if (Array.isArray(imported)) {
            const cleanedSchedules = imported.map(s => {
                if ((s as any).colors) {
                    delete (s as any).colors;
                }
                return s;
            });
            setSchedules(cleanedSchedules);
            toast({ title: "نجح الاستيراد (تنسيق قديم)", description: "تم استيراد الجداول. قد تحتاج لإعادة ضبط إعدادات الواجهة." });
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
  
  const handleResetAll = () => {
        deleteAllData();
  }

  const handleOpenEditDialog = (schedule: Schedule) => {
    // Create a deep copy to isolate the editing state
    setScheduleToEdit(JSON.parse(JSON.stringify(schedule)));
  };


  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-4 sm:p-6" dir="rtl">
        {currentView === 'notifications' ? (
          <>
            <SheetHeader className="text-right pb-3 border-b">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCurrentView('main')} 
                className="h-8 text-xs text-muted-foreground hover:text-primary gap-1.5 self-start px-2 mb-1 font-medium"
              >
                <ArrowRight className="h-4 w-4" />
                العودة للإعدادات
              </Button>
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary border border-primary/25 shrink-0">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-base font-bold flex items-center gap-2">
                      <span>مركز التنبيهات</span>
                      {unreadCount > 0 && (
                        <span className="bg-red-500/15 text-red-500 text-[11px] px-2 py-0.5 rounded-full font-bold border border-red-500/20 shrink-0">
                          {unreadCount} جديد
                        </span>
                      )}
                    </SheetTitle>
                    <SheetDescription className="text-xs truncate">إجازات سلطنة عُمان وتحديثات النظام</SheetDescription>
                  </div>
                </div>

                {filteredNotifications.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-primary gap-1 px-2 font-medium"
                      onClick={markAllAsRead}
                      title="تحديد الكل كمقروء"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">قراءة الكل</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1 px-2 font-medium"
                      onClick={clearNotifications}
                      title="مسح الكل"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>مسح</span>
                    </Button>
                  </div>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 min-h-0 py-3">
              <ScrollArea className="h-full pr-1">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <Check className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-sm text-foreground">لا توجد تنبيهات جديدة</p>
                    <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
                      جدولك وإجازات سلطنة عُمان محدثة بالكامل بأحدث وضع مستقر.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 pb-4">
                    {filteredNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden group text-right",
                          notif.read
                            ? "bg-muted/30 border-border/50 opacity-85 hover:opacity-100 hover:bg-muted/50"
                            : "bg-primary/8 border-primary/30 shadow-sm hover:border-primary/50"
                        )}
                      >
                        {!notif.read && (
                          <div className="absolute top-0 right-0 w-1.5 h-full bg-primary rounded-l-full" />
                        )}

                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {notif.type === 'ai_sync' ? (
                              <div className="h-8 w-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/20">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            ) : notif.type === 'broadcast' ? (
                              <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/20">
                                <Megaphone className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <Globe className="h-4 w-4" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                notif.type === 'ai_sync'
                                  ? "bg-purple-500/15 text-purple-400"
                                  : notif.type === 'broadcast'
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-emerald-500/15 text-emerald-400"
                              )}>
                                {notif.type === 'ai_sync' ? '🤖 ذكاء اصطناعي' : notif.type === 'broadcast' ? '📢 إعلان' : '🇴🇲 سلطنة عُمان'}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(parseISO(notif.timestamp), { addSuffix: true, locale: arSA })}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notif.id);
                                  }}
                                  className="text-muted-foreground/50 hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                                  title="حذف التنبيه"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-bold text-xs sm:text-sm text-foreground leading-snug">{notif.title}</h5>
                            <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed break-words">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <SheetFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setCurrentView('main')} className="w-full">
                <ArrowRight className="ml-2 h-4 w-4" />
                العودة إلى الإعدادات
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="text-right">
              <SheetTitle>الإعدادات</SheetTitle>
              <SheetDescription>
                إدارة الجداول، التنبيهات، وتخصيص الواجهة وبيانات التطبيق.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4 pt-2">
                  {/* Notifications Section Button in Settings */}
                  <div 
                    onClick={() => setCurrentView('notifications')}
                    className="p-3.5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/15 via-accent/30 to-background hover:border-primary/50 transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                        <Bell className={cn("h-5 w-5", unreadCount > 0 && "animate-wiggle text-primary")} />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-background animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 text-right">
                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <span>مركز التنبيهات</span>
                          {unreadCount > 0 && (
                            <span className="bg-red-500/15 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                              {unreadCount} جديد
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {unreadCount > 0 ? 'لديك تنبيهات جديدة لم يتم قراءتها' : 'جميع الإشعارات مقروءة ومحدثة'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center text-muted-foreground group-hover:text-primary transition-colors shrink-0 mr-1">
                      <ChevronLeft className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Oman Holiday Sync & Refresh Card */}
                  <div className="p-3 rounded-xl border border-border/70 bg-accent/25 flex items-center justify-between gap-2 text-right">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                        <RotateCw className="h-3.5 w-3.5 text-primary" />
                        <span>مزامنة إجازات سلطنة عُمان</span>
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        تحديث ومسح الكاش القديم لتثبيت الوضع المستقر
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualSyncHolidays}
                      disabled={isSyncingHolidays}
                      className="h-8 text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/10 font-bold"
                    >
                      <RotateCw className={cn("h-3.5 w-3.5", isSyncingHolidays && "animate-spin")} />
                      <span>تحديث ومزامنة</span>
                    </Button>
                  </div>

                  {/* User Feedback & Bug Report Card */}
                  <div 
                    onClick={() => setIsFeedbackOpen(true)}
                    className="p-3 rounded-xl border border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/10 transition-colors flex items-center justify-between gap-2 text-right cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500 shrink-0">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-foreground">
                          إرسال اقتراح أو بلاغ للمطور
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">
                          شاركنا أفكارك لتحسين التطبيق أو الإبلاغ عن أي ملاحظة
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
                  </div>

                  <Separator className="my-4" />

                  <h3 className="font-semibold">إدارة الجداول</h3>
                  <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" className="w-full">
                    <Plus className="ml-2 h-4 w-4" /> إضافة جدول جديد
                  </Button>
                  <div className="space-y-2">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="flex items-center gap-2 rounded-lg border p-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive hover:text-destructive" disabled={schedules.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيؤدي هذا إلى حذف جدول "{schedule.name}" نهائيًا. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSchedule(schedule.id)}>حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleOpenEditDialog(schedule)}><SlidersHorizontal className="h-4 w-4" /></Button>
                          <span className="font-medium flex-grow truncate text-right">{schedule.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator className="my-6" />
                 <div className="space-y-4 text-right">
                   <h3 className="font-semibold">إعدادات الواجهة</h3>
                     <div className="flex items-center justify-between">
                      <Label htmlFor="zoom-controls">التحكم في العرض</Label>
                        <div className="flex gap-2">
                           <Button variant="outline" size="icon" onClick={onZoomIn} aria-label="Zoom In">
                              <ZoomIn className="h-4 w-4" />
                           </Button>
                           <Button variant="outline" size="icon" onClick={onZoomOut} aria-label="Zoom Out">
                              <ZoomOut className="h-4 w-4" />
                           </Button>

                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Change grid layout">
                                      <LayoutGrid className="h-4 w-4" />
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>تخطيط الشبكة</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={String(currentGridCols)} onValueChange={(val) => onSetGridCols(Number(val))}>
                                  <DropdownMenuRadioItem value="2">عرض عمودين</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="3">عرض 3 أعمدة</DropdownMenuRadioItem>
                                  <DropdownMenuRadioItem value="4">عرض 4 أعمدة</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                              </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticker-speed">مؤقت عرض الأخبار (بالثواني)</Label>
                      <div className='flex items-center gap-2'>
                        <Slider
                            id="ticker-speed"
                            min={2}
                            max={15}
                            step={1}
                            value={[tickerSpeed]}
                            onValueChange={(value) => setTickerSpeed(value[0])}
                            dir='ltr'
                        />
                        <span className='text-xs text-muted-foreground font-mono'>{tickerSpeed}s</span>
                      </div>
                    </div>
                     <div className="flex items-center justify-between mt-4">
                        <Label htmlFor="show-ticker" className="text-nowrap">
                           إظهار الشريط الإخباري
                        </Label>
                        <Switch
                            id="show-ticker"
                            checked={showTicker}
                            onCheckedChange={setShowTicker}
                        />
                    </div>
                 </div>

                <Separator className="my-6" />
                <div className="space-y-4 text-right">
                   <h3 className="font-semibold">إدارة البيانات</h3>
                   <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="ml-2 h-4 w-4" /> استيراد
                      </Button>
                      <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                      <Button variant="outline" className="w-full" onClick={handleExport} disabled={schedules.length === 0}>
                        <Download className="ml-2 h-4 w-4" /> تصدير
                      </Button>
                   </div>
                    <DeleteAllDataDialog onConfirm={handleResetAll} />
                    {installPrompt && !isAppInstalled && (
                      <Button variant="outline" className="w-full mt-2" onClick={onInstallClick}>
                        <Smartphone className="ml-2 h-4 w-4" /> تثبيت التطبيق
                      </Button>
                    )}
                </div>
              </ScrollArea>
            </div>
            <SheetFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">تم</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
    
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-lg p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
            <DialogTitle>إنشاء جدول جديد</DialogTitle>
            <DialogDescription>
                أدخل تفاصيل جدولك الجديد.
            </DialogDescription>
        </DialogHeader>
        <InitialSetup 
            isDialog={true} 
            onFinished={() => setIsCreateDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
    
    <Dialog open={!!scheduleToEdit} onOpenChange={(open) => !open && setScheduleToEdit(null)}>
        <DialogContent className="max-w-lg p-0" dir="rtl">
            <DialogHeader className="p-6 pb-0">
                 <DialogTitle>تعديل الجدول</DialogTitle>
                 <DialogDescription>
                    قم بتعديل تفاصيل جدول "{scheduleToEdit?.name}".
                 </DialogDescription>
            </DialogHeader>
            {scheduleToEdit && (
                <InitialSetup 
                    isDialog={true} 
                    onFinished={() => setScheduleToEdit(null)}
                    existingSchedule={scheduleToEdit}
                />
            )}
        </DialogContent>
    </Dialog>

    {/* User Feedback Submission Dialog */}
    <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
      <DialogContent className="max-w-md p-6" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-500">
              <MessageSquare className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold">إرسال اقتراح أو بلاغ للمطور</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            تصل رسالتك مباشرة للمطور في لوحة التحكم الإدارية لمراجعتها فوراً والعمل بها.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5 text-right">
            <Label className="text-xs font-semibold">نوع الملاحظة:</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackType('suggestion')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  feedbackType === 'suggestion'
                    ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                    : 'bg-accent/40 border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                💡 اقتراح تحسين
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('bug')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  feedbackType === 'bug'
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : 'bg-accent/40 border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                🐞 بلاغ عن خطأ
              </button>
              <button
                type="button"
                onClick={() => setFeedbackType('feature')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                  feedbackType === 'feature'
                    ? 'bg-purple-500 text-white border-purple-500 shadow-sm'
                    : 'bg-accent/40 border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                ✨ ميزة جديدة
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <Label htmlFor="feedback-text" className="text-xs font-semibold">نص الرسالة أو الاقتراح:</Label>
            <textarea
              id="feedback-text"
              rows={4}
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="اكتب ملاحظتك بالتفصيل هنا..."
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-right resize-none"
            />
          </div>

          <div className="space-y-1.5 text-right">
            <Label htmlFor="feedback-contact" className="text-xs font-semibold">طريقة تواصل (اختياري للرد عليك):</Label>
            <Input
              id="feedback-contact"
              value={feedbackContact}
              onChange={(e) => setFeedbackContact(e.target.value)}
              placeholder="إيميلك أو حسابك (اختياري تماماً)"
              className="text-xs text-right"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFeedbackOpen(false)}
              disabled={isSubmittingFeedback}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingFeedback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              إرسال للمطور الآن
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

    
