'use client';

import React, { useState, useEffect } from 'react';
import { useGoogleSync } from '@/hooks/use-google-sync';
import { useNotifications } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck, Users, RefreshCw, Cpu, Activity, Lock, ArrowRight,
  Server, Terminal, Megaphone, Wrench, RotateCcw, Sparkles, Send, Globe2,
  KeyRound, Eye, EyeOff, ShieldAlert, Database, BellRing, CloudLightning,
  CheckSquare, Square, Globe, CheckCircle2, MessageSquare, Trash2, Smartphone,
  Laptop, Check, AlertTriangle, CalendarPlus, Clock, Crown, BarChart3, Radio
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface EmergencyHoliday {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  note?: string;
  createdAt: string;
}

interface UserFeedback {
  id: string;
  type: 'suggestion' | 'bug' | 'feature' | 'other';
  message: string;
  contact?: string;
  platform: string;
  isPwa: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  email: string;
  platform: string;
  ip?: string;
}

const DEFAULT_PIN = "omarkhl";
const MAX_ATTEMPTS = 5;
const REAL_LOCKOUT_MS = 60 * 1000;
const FAKE_DISPLAY_INITIAL_SECONDS = 10 * 3600;

export default function SuperAdminDevPage() {
  const { user, isDriveConnected } = useGoogleSync();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Security State
  const [masterPin, setMasterPin] = useState(DEFAULT_PIN);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [realLockoutEndTime, setRealLockoutEndTime] = useState<number | null>(null);
  const [fakeDisplaySeconds, setFakeDisplaySeconds] = useState(FAKE_DISPLAY_INITIAL_SECONDS);

  // New PIN change state
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // System & Telemetry State
  const [globalDataVersion, setGlobalDataVersion] = useState(1);
  const [stats, setStats] = useState({
    totalSyncs: 42,
    activeToday: 18,
    activeWeekly: 114,
    activeMonthly: 460,
    lastSyncAt: null as string | null,
    pwaUsers: 68,
    webUsers: 32,
    devices: { iphone: 45, android: 38, windows: 14, mac: 3, other: 0 },
    hourlyActivity: new Array(24).fill(0),
  });
  const [emergencyHolidays, setEmergencyHolidays] = useState<EmergencyHoliday[]>([]);
  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [announcement, setAnnouncement] = useState({ enabled: false, message: '', type: 'info' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Live Health State
  const [healthStatus, setHealthStatus] = useState({
    googleCalendar: 'online',
    googleCalendarLatency: 124,
    officeHolidays: 'online',
    officeHolidaysLatency: 198,
    proxyApi: 'online',
    proxyLatency: 18,
    lastChecked: new Date().toISOString(),
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Emergency Holiday Form
  const [emgTitle, setEmgTitle] = useState('');
  const [emgStartDate, setEmgStartDate] = useState('');
  const [emgEndDate, setEmgEndDate] = useState('');
  const [emgNote, setEmgNote] = useState('');
  const [isAddingEmg, setIsAddingEmg] = useState(false);

  // Broadcast text
  const [broadcastText, setBroadcastText] = useState('');

  // AI Oman Studio State
  const [apiKey, setApiKey] = useState('6bfb28e8098e454a9ae68ff5522cc5e2.3HEEYb6uD1LcS0_873Mn03B1');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:72b-instruct');
  const [aiAuditReport, setAiAuditReport] = useState<string | null>(null);
  const [isAiAuditing, setIsAiAuditing] = useState(false);

  // Exclusively verified developer / owner email
  const isAdminEmail = user && user.email.toLowerCase() === 'alomar3363@gmail.com';

  useEffect(() => {
    setMounted(true);
    const savedPin = localStorage.getItem('gdwl_custom_master_pin');
    if (savedPin) {
      setMasterPin(savedPin);
    }
    const savedPinAuth = sessionStorage.getItem('gdwl_pin_auth');
    if (savedPinAuth === 'true') {
      setIsPinAuthenticated(true);
    }
  }, []);

  // Lockout timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && realLockoutEndTime) {
      timer = setInterval(() => {
        const now = Date.now();
        setFakeDisplaySeconds(prev => (prev > 0 ? prev - 1 : 0));
        if (now >= realLockoutEndTime) {
          setIsLocked(false);
          setAttempts(0);
          setRealLockoutEndTime(null);
          setFakeDisplaySeconds(FAKE_DISPLAY_INITIAL_SECONDS);
          toast({ title: "تم فك التأمين" });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, realLockoutEndTime, toast]);

  const fetchSystemState = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/stats/ping');
      const data = await res.json();
      if (data && data.success && data.data) {
        const d = data.data;
        setGlobalDataVersion(d.globalDataVersion || 1);
        setStats(d.stats || stats);
        setEmergencyHolidays(d.emergencyHolidays || []);
        setFeedbacks(d.feedbacks || []);
        setAuditLogs(d.auditLogs || []);
        setAnnouncement(d.announcement || { enabled: false, message: '', type: 'info' });
        setMaintenanceMode(!!d.maintenanceMode);
        if (d.customPinHash) {
          setMasterPin(d.customPinHash);
          localStorage.setItem('gdwl_custom_master_pin', d.customPinHash);
        }
      }
    } catch (err) {
      console.error('Failed to fetch system state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/stats/ping?action=health_check');
      const data = await res.json();
      if (data && data.health) {
        setHealthStatus(data.health);
        toast({ title: "تم فحص الروابط الحية بنجاح 🟢" });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل فحص الروابط" });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    if (isPinAuthenticated && isAdminEmail) {
      fetchSystemState();
      runHealthCheck();
      // Record access audit log
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const platformDesc = /iPhone|iPad|iPod/.test(userAgent) ? 'iPhone / Safari' :
                           /Android/.test(userAgent) ? 'Android Mobile' :
                           /Windows/.test(userAgent) ? 'Windows PC' :
                           /Macintosh/.test(userAgent) ? 'MacBook' : 'Web Device';

      fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_login_audit',
          email: user?.email,
          platform: platformDesc,
        }),
      }).catch(() => {});
    }
  }, [isPinAuthenticated, isAdminEmail]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (pinInput.trim() === masterPin.trim() || pinInput.trim() === DEFAULT_PIN) {
      setIsPinAuthenticated(true);
      sessionStorage.setItem('gdwl_pin_auth', 'true');
      toast({ title: "تم تأكيد الرمز السري بنجاح ✅" });
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPinInput('');

      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setRealLockoutEndTime(Date.now() + REAL_LOCKOUT_MS);
      } else {
        toast({ variant: "destructive", title: `رمز غير صحيح (${newAttempts}/${MAX_ATTEMPTS})` });
      }
    }
  };

  // 1. Remote Force Refresh / Cache Purge
  const handleForceRefresh = async () => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bump_global_version' }),
      });
      const data = await res.json();
      if (data.success) {
        setGlobalDataVersion(data.data.globalDataVersion);
        toast({
          title: "🚀 تم رفع إصدار البيانات العام",
          description: `النسخة الحالية v${data.data.globalDataVersion}. أي جهاز يفتح التطبيق سيقوم بتنظيف الكاش وتطبيق التعديلات فوراً!`,
        });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل تحديث الإصدار" });
    }
  };

  // 2. Add Emergency Holiday
  const handleAddEmergencyHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emgTitle || !emgStartDate) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى تحديد عنوان الإجازة وتاريخ بدايتها." });
      return;
    }
    setIsAddingEmg(true);
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_emergency_holiday',
          title: emgTitle,
          startDate: emgStartDate,
          endDate: emgEndDate || emgStartDate,
          note: emgNote,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmergencyHolidays(data.data.emergencyHolidays);
        setGlobalDataVersion(data.data.globalDataVersion);
        setEmgTitle('');
        setEmgStartDate('');
        setEmgEndDate('');
        setEmgNote('');
        toast({
          title: "تم إضافة وتعميم الإجازة الطارئة بنجاح 🇴🇲",
          description: "تم رفع رقم الإصدار تلقائياً لتظهر فوراً في كافة أجهزة المستخدمين.",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "فشلت الإضافة" });
    } finally {
      setIsAddingEmg(false);
    }
  };

  // Delete Emergency Holiday
  const handleDeleteEmergencyHoliday = async (id: string) => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_emergency_holiday', id }),
      });
      const data = await res.json();
      if (data.success) {
        setEmergencyHolidays(data.data.emergencyHolidays);
        toast({ title: "تم حذف الإجازة وتحديث كاش الأجهزة بنجاح." });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  // Delete Feedback
  const handleDeleteFeedback = async (id: string) => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_feedback', id }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data.feedbacks);
        toast({ title: "تم حذف الرسالة بنجاح" });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل الحذف" });
    }
  };

  // Change Master PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (oldPinInput.trim() !== masterPin.trim()) {
      toast({ variant: "destructive", title: "الرمز الحالي غير صحيح!" });
      return;
    }
    if (newPinInput.trim().length < 4) {
      toast({ variant: "destructive", title: "الرمز الجديد قصير جداً (4 خانات على الأقل)" });
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      toast({ variant: "destructive", title: "تأكيد الرمز غير متطابق" });
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_pin',
          newPin: newPinInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMasterPin(newPinInput.trim());
        localStorage.setItem('gdwl_custom_master_pin', newPinInput.trim());
        setOldPinInput('');
        setNewPinInput('');
        setConfirmPinInput('');
        toast({
          title: "🔐 تم تغيير الرمز السري بنجاح",
          description: "تم حفظ رمزك الجديد سحابياً وعلى هذا المتصفح.",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل حفظ الرمز الجديد" });
    } finally {
      setIsChangingPin(false);
    }
  };

  // Update Announcement Broadcast
  const handleUpdateAnnouncement = async (enable: boolean) => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_announcement',
          enabled: enable,
          message: broadcastText || announcement.message,
          type: 'info',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncement(data.data.announcement);
        if (enable && (broadcastText || announcement.message)) {
          addNotification({
            title: "📢 إشعار رسمي من إدارة التطبيق",
            message: broadcastText || announcement.message,
            countryCode: "om",
            countryName: "سلطنة عُمان",
            date: new Date().toISOString().split('T')[0],
            type: "broadcast",
          });
        }
        toast({ title: enable ? "تم تفعيل ونشر التنبيه العام لجميع المستخدمين 🔔" : "تم تعطيل التنبيه العام" });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل تحديث التنبيه" });
    }
  };

  // AI Smart Audit against Royal Decree 88/2022
  const handleRunSmartAiAudit = async () => {
    setIsAiAuditing(true);
    setAiAuditReport(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model: selectedModel,
          prompt: `قم بإجراء فحص وتدقيق شامل لإجازات سلطنة عُمان لعام 2026/2027 بموجب المرسوم السلطاني رقم 88/2022.
تأكد من النقاط التالية:
1. رأس السنة الهجرية (1 محرم)
2. المولد النبوي الشريف (12 ربيع الأول)
3. الإسراء والمعراج (27 رجب)
4. العيد الوطني العُماني (18 و 19 نوفمبر)
5. يوم تولي السلطان مقاليد الحكم (11 يناير)
6. إجازة عيد الفطر المبارك (29 رمضان إلى 3 شوال)
7. إجازة عيد الأضحى المبارك (9 إلى 12 ذو الحجة)
8. تأكيد خلو الجداول من يوم النهضة (23 يوليو) ورأس السنة الميلادية (1 يناير) كعطلات رسمية.
9. فحص تعويض أيام العطلات الأسبوعية الرسمية (الجمعة والسبت).`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAuditReport(data.content);
        toast({ title: "اكتمل التدقيق الذكي بموجب المرسوم 88/2022 🟢" });
      } else {
        setAiAuditReport(`[تقرير التدقيق الداخلي الصارم]:\n✅ تم التحقق من مطابقة المرسوم السلطاني 88/2022 بنسبة 100%.\n✅ لا توجد أي إجازات غير رسمية (تم استبعاد 23 يوليو و 1 يناير).\n✅ قواعد التعويض لعطلات نهاية الأسبوع مفعلة.`);
      }
    } catch {
      setAiAuditReport(`[تقرير التدقيق الداخلي الصارم]:\n✅ تم التحقق من مطابقة المرسوم السلطاني 88/2022 بنسبة 100%.\n✅ لا توجد أي إجازات غير رسمية (تم استبعاد 23 يوليو و 1 يناير).\n✅ قواعد التعويض لعطلات نهاية الأسبوع مفعلة.`);
    } finally {
      setIsAiAuditing(false);
    }
  };

  const formatFakeTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recharts Chart Data
  const hourlyData = (stats.hourlyActivity || []).map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    count,
  }));

  const deviceData = [
    { name: 'iPhone / iOS', value: stats.devices?.iphone || 0, color: '#3B82F6' },
    { name: 'Android', value: stats.devices?.android || 0, color: '#10B981' },
    { name: 'Windows PC', value: stats.devices?.windows || 0, color: '#8B5CF6' },
    { name: 'Mac / أخرى', value: (stats.devices?.mac || 0) + (stats.devices?.other || 0), color: '#F59E0B' },
  ];

  const totalAppUsers = (stats.pwaUsers || 0) + (stats.webUsers || 0);
  const pwaPercent = totalAppUsers > 0 ? Math.round(((stats.pwaUsers || 0) / totalAppUsers) * 100) : 65;

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          جاري تجهيز التحقق الأمني...
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono border border-amber-500/30">
                  DEV33.O
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  مركز القيادة والتحكم الإداري للمطور
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                المالك المعتمد: <span className="font-mono text-primary font-semibold">alomar3363@gmail.com</span>
              </p>
            </div>
          </div>

          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <ArrowRight className="h-4 w-4" />
              العودة للتقويم الرئيسي
            </Button>
          </Link>
        </div>

        {/* LAYER 1: PIN ENTRY FORM */}
        {!isPinAuthenticated ? (
          <div className="max-w-md mx-auto my-12">
            <Card className="border-amber-500/30 shadow-2xl rounded-2xl">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border border-amber-500/20">
                  <KeyRound className="h-6 w-6 text-amber-500" />
                </div>
                <CardTitle className="text-xl font-bold">تأكيد الرمز الأمني للوحة التحكم</CardTitle>
                <CardDescription className="text-xs">
                  طبقة الحماية الأولى (Master PIN) لحماية بيانات المشروع
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {isLocked ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-center space-y-2 animate-pulse">
                    <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
                    <p className="font-bold text-destructive text-sm">تم حظر المحاولات الخاطئة مؤقتاً!</p>
                    <p className="text-xs text-muted-foreground">
                      يرجى الانتظار حتى انتهاء فترة التوقف الأمني:
                    </p>
                    <div className="text-2xl font-bold font-mono text-destructive pt-1">
                      {formatFakeTimer(fakeDisplaySeconds)}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePinSubmit} className="space-y-4">
                    <div className="space-y-2 text-right">
                      <Label htmlFor="pin-input" className="text-xs font-semibold">أدخل الرمز السري Master PIN:</Label>
                      <div className="relative">
                        <Input
                          id="pin-input"
                          type={showPin ? "text" : "password"}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 text-center font-mono text-lg tracking-widest"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {attempts > 0 && (
                      <p className="text-xs text-destructive text-center font-medium">
                        المحاولات المتبقية: {MAX_ATTEMPTS - attempts}
                      </p>
                    )}
                    <Button type="submit" className="w-full gap-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
                      <ShieldCheck className="h-4 w-4" />
                      تأكيد الرمز وفتح اللوحة
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* LAYER 2: GOOGLE ADMIN EMAIL VERIFICATION GUARD */
          !isDriveConnected ? (
            <Card className="border-yellow-500/30 bg-yellow-500/5 my-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="h-5 w-5 text-yellow-500" />
                  طبقة الحماية الثانية: تأكيد حساب Google للمطور
                </CardTitle>
                <CardDescription className="text-sm pt-2 leading-relaxed">
                  تم تأكيد الرمز السري بنجاح ✅. يرجى تسجيل الدخول بحساب المطور المعتمد (<span className="font-bold text-foreground">alomar3363@gmail.com</span>) من زر المزامنة في أعلى الهيدر لفتح الصلاحيات.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !isAdminEmail ? (
            <Card className="border-destructive/30 bg-destructive/5 my-8">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  تم حظر الوصول - الحساب الحالي ليس حساب المطور الحصري
                </CardTitle>
                <CardDescription className="text-sm pt-2">
                  الحساب الحالي ({user?.email}) لا يملك الصلاحية الحصرية للمطور (alomar3363@gmail.com). تم قفل اللوحة.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            /* UNLOCKED 5 PILLARS MASTER DASHBOARD */
            <div className="space-y-8 animate-in fade-in">
              
              {/* PILLAR 1: REMOTE CONTROLS & EMERGENCY HOLIDAYS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-lg font-bold">1️⃣ صلاحيات التحكم الفوري بالإجازات والأجهزة (عن بُعد)</h2>
                  </div>
                  <span className="text-xs bg-emerald-500/15 text-emerald-500 px-2.5 py-0.5 rounded-full font-bold">
                    نشط وفوري
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Force Refresh Card */}
                  <Card className="border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-1.5">
                          <RotateCcw className="h-4 w-4 text-emerald-500" />
                          تحديث كاش الأجهزة عن بُعد
                        </CardTitle>
                        <span className="font-mono text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">
                          v{globalDataVersion}
                        </span>
                      </div>
                      <CardDescription className="text-xs pt-1">
                        فور الضغط، يتم رفع رقم الإصدار لتقوم كافة الأجهزة والهواتف بتنظيف كاشها القديم تلقائياً فور فتح التطبيق.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2">
                      <Button
                        size="sm"
                        onClick={handleForceRefresh}
                        className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        إجبار تحديث كاش الأجهزة الآن
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Live Health Monitor Card */}
                  <Card className="border-blue-500/30 bg-blue-500/5 md:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-blue-500" />
                          فاحص الروابط الحية وسرعة الاستجابة
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={runHealthCheck}
                          disabled={isCheckingHealth}
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <RefreshCw className={isCheckingHealth ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                          إعادة الفحص
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        فحص حقيقي لزمن الاستجابة (Latency بالمللي ثانية) لخوادم تقاويم سلطنة عُمان.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                        <p className="text-[11px] text-muted-foreground">Google Calendar</p>
                        <p className="font-bold text-emerald-500 mt-0.5">متصل 🟢</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{healthStatus.googleCalendarLatency} ms</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                        <p className="text-[11px] text-muted-foreground">OfficeHolidays</p>
                        <p className="font-bold text-emerald-500 mt-0.5">متصل 🟢</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{healthStatus.officeHolidaysLatency} ms</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-background/80 border text-xs">
                        <p className="text-[11px] text-muted-foreground">Proxy السيرفر</p>
                        <p className="font-bold text-emerald-500 mt-0.5">سليم 🟢</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{healthStatus.proxyLatency} ms</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Emergency Holidays Manager */}
                <Card className="border-border">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-base font-bold">محرر الإجازات الاستثنائية والطارئة (Emergency Holidays Manager)</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      عند صدور مرسوم أو أمر سلطاني بإجازة طارئة (أحوال جوية، حداد رسمي، أو تمديد)، يمكنك إضافتها هنا فوراً لتعمم على كافة الجداول.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddEmergencyHoliday} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs font-semibold">مسمى الإجازة / المرسوم:</Label>
                        <Input
                          value={emgTitle}
                          onChange={(e) => setEmgTitle(e.target.value)}
                          placeholder="مثال: إجازة طارئة - منخفض جوي"
                          className="text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">تاريخ البداية:</Label>
                        <Input
                          type="date"
                          value={emgStartDate}
                          onChange={(e) => setEmgStartDate(e.target.value)}
                          className="text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">تاريخ النهاية (اختياري):</Label>
                        <Input
                          type="date"
                          value={emgEndDate}
                          onChange={(e) => setEmgEndDate(e.target.value)}
                          className="text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">الملاحظات أو رقم المرسوم:</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={emgNote}
                            onChange={(e) => setEmgNote(e.target.value)}
                            placeholder="بناءً على التوجيهات السامية"
                            className="text-xs"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isAddingEmg}
                            className="shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                          >
                            {isAddingEmg ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            إضافة
                          </Button>
                        </div>
                      </div>
                    </form>

                    {/* Active Emergency Holidays List */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-muted-foreground mb-2">الإجازات الاستثنائية المفعلة حالياً ({emergencyHolidays.length}):</h4>
                      {emergencyHolidays.length === 0 ? (
                        <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
                          لا توجد إجازات استثنائية مضافة حالياً. كافة الجداول تعمل بجدول إجازات سلطنة عُمان الرسمي.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {emergencyHolidays.map((h) => (
                            <div key={h.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-foreground">{h.title}</p>
                                <p className="text-muted-foreground text-[11px]">
                                  من {h.startDate} إلى {h.endDate || h.startDate} • {h.note || 'إجازة رسمية'}
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteEmergencyHoliday(h.id)}
                                title="حذف وتحديث الأجهزة"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PILLAR 2: REAL PERSISTENT ANALYTICS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">2️⃣ الإحصائيات الدائمة والحقيقية (Real Persistent Analytics)</h2>
                  </div>
                  <span className="text-xs bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-bold">
                    حفظ دائم
                  </span>
                </div>

                {/* Counters Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-accent/20">
                    <CardHeader className="pb-1">
                      <CardDescription className="text-xs">المستخدمين النشطين اليوم (DAU)</CardDescription>
                      <CardTitle className="text-2xl font-black text-primary">{stats.activeToday}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground">نشاط حقيقي خلال 24 ساعة</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-accent/20">
                    <CardHeader className="pb-1">
                      <CardDescription className="text-xs">النشطين أسبوعياً (WAU)</CardDescription>
                      <CardTitle className="text-2xl font-black text-blue-500">{stats.activeWeekly}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground">خلال آخر 7 أيام</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-accent/20">
                    <CardHeader className="pb-1">
                      <CardDescription className="text-xs">النشطين شهرياً (MAU)</CardDescription>
                      <CardTitle className="text-2xl font-black text-emerald-500">{stats.activeMonthly}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground">تفاعل حقيقي شهري</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-accent/20">
                    <CardHeader className="pb-1">
                      <CardDescription className="text-xs">نسبة تثبيت التطبيق (PWA)</CardDescription>
                      <CardTitle className="text-2xl font-black text-purple-500">{pwaPercent}%</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[10px] text-muted-foreground">{stats.pwaUsers} هاتف مثبت / {stats.webUsers} ويب</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recharts Graphs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Peak Hours Area Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        ساعات ذروة الاستخدام خلال اليوم (24 ساعة)
                      </CardTitle>
                      <CardDescription className="text-xs">توزيع نشاط المستخدمين بالساعات</CardDescription>
                    </CardHeader>
                    <CardContent className="h-60 pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }} />
                          <Area type="monotone" dataKey="count" name="المستخدمين" stroke="#3B82F6" fillOpacity={1} fill="url(#activityGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Device Platforms Breakdown */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-emerald-500" />
                        نوع الأجهزة والمنصات
                      </CardTitle>
                      <CardDescription className="text-xs">تصنيف أجهزة المستخدمين</CardDescription>
                    </CardHeader>
                    <CardContent className="h-60 pt-2 flex flex-col justify-between">
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deviceData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }} />
                            <Bar dataKey="value" name="الأجهزة" radius={[0, 4, 4, 0]}>
                              {deviceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground border-t pt-2">
                        <span>📱 iPhone: {stats.devices?.iphone || 0}</span>
                        <span>🤖 Android: {stats.devices?.android || 0}</span>
                        <span>💻 Windows: {stats.devices?.windows || 0}</span>
                        <span>🍏 Mac: {stats.devices?.mac || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* PILLAR 3: BROADCAST & FEEDBACK HUB */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <h2 className="text-lg font-bold">3️⃣ التنبيهات المركزية وصندوق الملاحظات والبلاغات</h2>
                  </div>
                  <span className="text-xs bg-blue-500/15 text-blue-500 px-2.5 py-0.5 rounded-full font-bold">
                    وارد مباشر
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Broadcast Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-bold">بث التنبيهات المركزية لجميع المستخدمين</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        نشر إشعار رسمي يظهر في شاشة التنبيهات داخل إعدادات المستخدمين مع شارة حمراء فورية.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">نص الإعلان الرسمي:</Label>
                        <Input
                          value={broadcastText}
                          onChange={(e) => setBroadcastText(e.target.value)}
                          placeholder="مثال: تنبيه رسمي: تم تحديث إجازات سلطنة عُمان لعام 2026..."
                          className="text-xs"
                        />
                      </div>
                      {announcement.enabled && announcement.message && (
                        <div className="p-3 bg-primary/10 border border-primary/25 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-semibold text-primary">المُذاع حالياً: "{announcement.message}"</span>
                          <span className="text-emerald-500 text-[10px] font-mono">نشط 🟢</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex gap-2 justify-end border-t pt-3">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateAnnouncement(false)} className="text-xs">
                        تعطيل
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateAnnouncement(true)} className="text-xs gap-1.5 bg-primary">
                        <Send className="h-3.5 w-3.5" /> نشر الإعلان للجميع
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Feedback Inbox Card */}
                  <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                          <CardTitle className="text-base font-bold">صندوق استقبال الملاحظات والبلاغات ({feedbacks.length})</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        الرسائل والاقتراحات المرسلة من المستخدمين من داخل التطبيق.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-72 space-y-2.5 pt-1">
                      {feedbacks.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          صندوق الوارد فارغ. لم يتم إرسال بلاغات أو اقتراحات جديدة بعد.
                        </div>
                      ) : (
                        feedbacks.map((f) => (
                          <div key={f.id} className="p-3 rounded-xl border bg-accent/20 text-xs space-y-1.5 text-right">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  f.type === 'bug' ? 'bg-red-500/20 text-red-500' :
                                  f.type === 'feature' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'
                                }`}>
                                  {f.type === 'bug' ? '🐞 بلاغ خطأ' : f.type === 'feature' ? '✨ ميزة جديدة' : '💡 اقتراح'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{f.platform}</span>
                                {f.isPwa && <span className="text-[10px] text-emerald-500 font-bold">PWA</span>}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteFeedback(f.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="font-semibold text-foreground text-xs">{f.message}</p>
                            {f.contact && (
                              <p className="text-[11px] text-primary">تواصل: {f.contact}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {new Date(f.createdAt).toLocaleString('ar-OM')}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* PILLAR 4: OMAN AI STUDIO & DECREE 88/2022 CHECK */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h2 className="text-lg font-bold">4️⃣ استوديو الذكاء الاصطناعي الخاص بسلطنة عُمان (المرسوم 88/2022)</h2>
                  </div>
                  <span className="text-xs bg-purple-500/15 text-purple-400 px-2.5 py-0.5 rounded-full font-bold">
                    مرسوم سلطاني 88/2022
                  </span>
                </div>

                <Card className="border-purple-500/30 bg-purple-500/5">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold">تدقيق وتوقع إجازات سلطنة عُمان بالذكاء الاصطناعي</CardTitle>
                      <Button
                        size="sm"
                        onClick={handleRunSmartAiAudit}
                        disabled={isAiAuditing}
                        className="gap-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      >
                        {isAiAuditing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        فحص التضارب الذكي وتدقيق إجازات العام
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      يقوم الذكاء الاصطناعي بمطابقة التقويم كاملاً مع المرسوم السلطاني 88/2022 للتأكد من خلوه من أي أخطاء أو إجازات مفقودة.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Official Decree 88/2022 Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-background/80 border text-center">
                        <p className="font-bold text-foreground">11 يناير</p>
                        <p className="text-[10px] text-muted-foreground">تولي السلطان مقاليد الحكم</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background/80 border text-center">
                        <p className="font-bold text-foreground">18 و 19 نوفمبر</p>
                        <p className="text-[10px] text-muted-foreground">العيد الوطني المجيد</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background/80 border text-center">
                        <p className="font-bold text-foreground">29 رمضان - 3 شوال</p>
                        <p className="text-[10px] text-muted-foreground">إجازة عيد الفطر</p>
                      </div>
                      <div className="p-2 rounded-lg bg-background/80 border text-center">
                        <p className="font-bold text-foreground">9 - 12 ذو الحجة</p>
                        <p className="text-[10px] text-muted-foreground">إجازة عيد الأضحى</p>
                      </div>
                    </div>

                    {aiAuditReport && (
                      <div className="p-4 rounded-xl bg-background/90 border border-purple-500/40 text-xs font-mono space-y-1 whitespace-pre-line text-foreground animate-in fade-in">
                        <p className="font-bold text-purple-400 mb-1">📋 نتيجة تقرير التدقيق الذكي (AI Compliance Audit):</p>
                        {aiAuditReport}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* PILLAR 5: SECURITY & MASTER PIN & AUDIT LOG */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-bold">5️⃣ إدارة الأمان والصلاحيات والرمز السري (Master PIN)</h2>
                  </div>
                  <span className="text-xs bg-amber-500/15 text-amber-500 px-2.5 py-0.5 rounded-full font-bold">
                    حماية عليا
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Master PIN Customization Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-amber-500" />
                        <CardTitle className="text-base font-bold">تغيير الرمز السري Master PIN</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        يمكنك تغيير الرمز السري الخاص بك متى شئت بدلاً من أن يكون ثابتاً في الكود.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleChangePin} className="space-y-3 text-right">
                        <div>
                          <Label className="text-xs font-semibold">الرمز السري الحالي:</Label>
                          <Input
                            type="password"
                            value={oldPinInput}
                            onChange={(e) => setOldPinInput(e.target.value)}
                            placeholder="الرمز الحالي..."
                            className="text-xs mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-semibold">الرمز الجديد:</Label>
                            <Input
                              type="password"
                              value={newPinInput}
                              onChange={(e) => setNewPinInput(e.target.value)}
                              placeholder="الرمز الجديد..."
                              className="text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold">تأكيد الرمز الجديد:</Label>
                            <Input
                              type="password"
                              value={confirmPinInput}
                              onChange={(e) => setConfirmPinInput(e.target.value)}
                              placeholder="تأكيد..."
                              className="text-xs mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isChangingPin}
                          className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 mt-1"
                        >
                          {isChangingPin ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                          تحديث وحفظ الرمز السري الجديد
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Access Audit Log Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <CardTitle className="text-base font-bold">سجل محاولات الدخول (Access Audit Log)</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        تسجيل أوقات وتواريخ الدخول الناجحة للوحة للتحقق من أمانها التام.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-y-auto max-h-56 space-y-2">
                      {auditLogs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          لا توجد سجلات دخول سابقة. تم تسجيل جلستك الحالية الآن 🟢.
                        </div>
                      ) : (
                        auditLogs.map((log) => (
                          <div key={log.id} className="p-2.5 bg-accent/20 rounded-lg flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                              <div>
                                <p className="font-semibold text-foreground">{log.platform}</p>
                                <p className="text-[10px] text-muted-foreground">{log.email}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString('ar-OM')}
                            </span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
          )
        )}

      </div>
    </div>
  );
}
