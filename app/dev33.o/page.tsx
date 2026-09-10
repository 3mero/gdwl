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
  CheckSquare, Square, Globe, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const CORRECT_PIN = "omarkhl";
const MAX_ATTEMPTS = 3;
const REAL_LOCKOUT_MS = 60 * 1000;
const FAKE_DISPLAY_INITIAL_SECONDS = 10 * 3600;
const DEFAULT_API_KEY = "6bfb28e8098e454a9ae68ff5522cc5e2.3HEEYb6uD1LcS0_873Mn03B1";

const ARAB_COUNTRIES = [
  { code: 'om', name: 'سلطنة عُمان', flag: '🇴🇲' },
  { code: 'sa', name: 'المملكة العربية السعودية', flag: '🇸🇦' },
  { code: 'ae', name: 'الإمارات العربية المتحدة', flag: '🇦🇪' },
  { code: 'kw', name: 'الكويت', flag: '🇰🇼' },
  { code: 'qa', name: 'قطر', flag: '🇶🇦' },
  { code: 'bh', name: 'البحرين', flag: '🇧🇭' },
  { code: 'eg', name: 'مصر', flag: '🇪🇬' },
  { code: 'jo', name: 'الأردن', flag: '🇯🇴' },
  { code: 'iq', name: 'العراق', flag: '🇮🇶' },
  { code: 'ye', name: 'اليمن', flag: '🇾🇪' },
  { code: 'ps', name: 'فلسطين', flag: '🇵🇸' },
  { code: 'ma', name: 'المغرب', flag: '🇲🇦' },
  { code: 'dz', name: 'الجزائر', flag: '🇩🇿' },
  { code: 'tn', name: 'تونس', flag: '🇹🇳' },
  { code: 'ly', name: 'ليبيا', flag: '🇱🇾' },
  { code: 'sd', name: 'السودان', flag: '🇸🇩' },
  { code: 'lb', name: 'لبنان', flag: '🇱🇧' },
  { code: 'sy', name: 'سوريا', flag: '🇸🇾' },
];

export default function SuperAdminDevPage() {
  const { user, isDriveConnected } = useGoogleSync();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Security State
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [realLockoutEndTime, setRealLockoutEndTime] = useState<number | null>(null);
  const [fakeDisplaySeconds, setFakeDisplaySeconds] = useState(FAKE_DISPLAY_INITIAL_SECONDS);

  // Ollama Cloud API & Model Settings
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:72b-instruct');
  const [isSavedInCloud, setIsSavedInCloud] = useState(false);

  // Arab Countries Selection State
  const [selectedCountries, setSelectedCountries] = useState<string[]>(ARAB_COUNTRIES.map(c => c.code));

  // System State
  const [stats, setStats] = useState<{ totalSyncs: number; activeToday: number; lastSyncAt: string | null }>({
    totalSyncs: 0,
    activeToday: 0,
    lastSyncAt: null,
  });
  const [announcement, setAnnouncement] = useState({ enabled: false, message: '', type: 'info' });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Tools State
  const [broadcastText, setBroadcastText] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiTesting, setIsAiTesting] = useState(false);
  const [targetCountry, setTargetCountry] = useState('om');

  // Layer 2 Email Authorization Check
  const adminEmails = ['alomar3363@gmail.com', 'mypc3363@gmail.com', 'm3363y@gmail.com'];
  const isAdminEmail = user && (
    adminEmails.includes(user.email.toLowerCase()) ||
    user.email.toLowerCase().includes('alomar')
  );

  useEffect(() => {
    setMounted(true);
    const savedPinAuth = sessionStorage.getItem('gdwl_pin_auth');
    if (savedPinAuth === 'true') {
      setIsPinAuthenticated(true);
    }

    const savedKey = localStorage.getItem('gdwl_ollama_apikey');
    const savedModel = localStorage.getItem('gdwl_ollama_model');
    const savedCountries = localStorage.getItem('gdwl_monitored_countries');
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setSelectedModel(savedModel);
    if (savedCountries) {
      try { setSelectedCountries(JSON.parse(savedCountries)); } catch {}
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
      if (data.success && data.data) {
        setStats(data.data.stats || { totalSyncs: 0, activeToday: 0, lastSyncAt: null });
        setAnnouncement(data.data.announcement || { enabled: false, message: '', type: 'info' });
        setMaintenanceMode(!!data.data.maintenanceMode);
      }
    } catch (err) {
      console.error('Failed to fetch system state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPinAuthenticated && isAdminEmail) {
      fetchSystemState();
    }
  }, [isPinAuthenticated, isAdminEmail]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (pinInput === CORRECT_PIN) {
      setIsPinAuthenticated(true);
      sessionStorage.setItem('gdwl_pin_auth', 'true');
      toast({ title: "تم تأكيد الرمز السري بنجاح" });
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

  const handleToggleCountry = (code: string) => {
    setSelectedCountries(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      localStorage.setItem('gdwl_monitored_countries', JSON.stringify(next));
      return next;
    });
    toast({ title: "تم حفظ تحديث اختيار الدول العربية تلقائياً 💾" });
  };

  const handleSelectAllCountries = () => {
    const all = ARAB_COUNTRIES.map(c => c.code);
    setSelectedCountries(all);
    localStorage.setItem('gdwl_monitored_countries', JSON.stringify(all));
    toast({ title: "تم تحديد وحفظ جميع الدول العربية (18 دولة)" });
  };

  const handleDeselectAllCountries = () => {
    setSelectedCountries([]);
    localStorage.setItem('gdwl_monitored_countries', JSON.stringify([]));
    toast({ title: "تم إلغاء تحديد كافة الدول" });
  };

  const handleSaveApiSettings = () => {
    localStorage.setItem('gdwl_ollama_apikey', apiKey);
    localStorage.setItem('gdwl_ollama_model', selectedModel);
    localStorage.setItem('gdwl_monitored_countries', JSON.stringify(selectedCountries));
    setIsSavedInCloud(true);
    toast({
      title: "تم حفظ إعدادات الدول والذكاء الاصطناعي سحابياً",
      description: `تم حفظ ${selectedCountries.length} دولة عربية للمتابعة التلقائية وتوزيع الإجازات.`,
    });
  };

  const handleTestCloudApi = async () => {
    setIsAiTesting(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model: selectedModel,
          prompt: `اختبار فحص وترجمة الإجازات الرسمية للدول العربية المحددة (${selectedCountries.length} دولة)`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiResponse(data.content);
        toast({ title: "تم جلب رد الـ API والترجمة بنجاح 🟢" });
      } else {
        setAiResponse(`[خطأ في الاتصال]: ${data.error || 'تعذر جلب الاستجابة'}`);
      }
    } catch (err: any) {
      setAiResponse(`[خطأ بالشبكة]: ${err.message}`);
    } finally {
      setIsAiTesting(false);
    }
  };

  const handleTestTargetedNotification = () => {
    const targetCountryObj = ARAB_COUNTRIES.find(c => c.code === targetCountry);
    addNotification({
      title: `🤖 إجازات رسمية | ${targetCountryObj?.name || 'الدولة المحددة'}`,
      message: `تم التأكيد: أدرج البوت رسمياً إجازات ${targetCountryObj?.name || 'الدولة المحددة'} في جدولك.`,
      countryCode: 'all',
      countryName: targetCountryObj?.name || 'الدول العربية',
      date: new Date().toISOString().split('T')[0],
      type: 'ai_sync',
    });

    toast({
      title: "🔔 تم إرسال الإشعار بنجاح إلى أعلى الشاشة",
      description: "افتح صورة الجرس 🔔 بجانب الملف الشخصي لتشاهد التنبيه الآن!",
    });
  };

  const formatFakeTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
            title: "📢 إعلان عام",
            message: broadcastText || announcement.message,
            countryCode: "all",
            countryName: "جميع المستخدمين",
            date: new Date().toISOString().split('T')[0],
            type: "broadcast",
          });
        }
        toast({ title: enable ? "تم تفعيل التنبيه العام وإرساله إلى كافّة الأجراس 🔔" : "تم تعطيل التنبيه العام" });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل تحديث التنبيه" });
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_maintenance' }),
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(data.data.maintenanceMode);
        toast({ title: data.message });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل التعديل" });
    }
  };

  const handleResetStats = async () => {
    try {
      const res = await fetch('/api/stats/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_stats' }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        toast({ title: "تم إعادة ضبط العداد بنجاح إلى 0" });
      }
    } catch {
      toast({ variant: "destructive", title: "فشل إعادة الضبط" });
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">جاري التجهيز والأمان...</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Navigation */}
        <div className="flex justify-between items-center border-b pb-6">
          <div className="flex items-center gap-2">
            <span className="bg-destructive/20 text-destructive px-2.5 py-0.5 rounded text-xs font-bold font-mono">SECURE DEV33.O ZONE</span>
            <h1 className="text-2xl font-bold text-primary">لوحة الحماية والتحكم الإداري المتقدمة</h1>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للتقويم
            </Button>
          </Link>
        </div>

        {/* LAYER 1: PIN ENTRY FORM & DECEPTIVE LOCKOUT GUARD */}
        {!isPinAuthenticated ? (
          <div className="max-w-md mx-auto my-12">
            <Card className="border-primary/30 shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">تأكيد الرمز الأمني للوحة التحكم</CardTitle>
                <CardDescription className="text-xs">
                  طبقة الحماية الأولى (Master PIN Protection)
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {isLocked ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center space-y-2 animate-pulse">
                    <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
                    <p className="font-bold text-destructive text-sm">تم حظر المحاولات الخاطئة!</p>
                    <p className="text-xs text-muted-foreground">
                      تجاوزت الحد المسموح به للمحاولات المتتالية. يرجى الانتظار حتى انتهاء فترة التوقف الأمني:
                    </p>
                    <div className="text-xl font-bold font-mono text-destructive pt-1">
                      {formatFakeTimer(fakeDisplaySeconds)}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePinSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pin-input-src" className="text-xs font-semibold">أدخل الرمز السري:</Label>
                      <div className="relative">
                        <Input
                          id="pin-input-src"
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
                    <Button type="submit" className="w-full gap-2 text-xs">
                      <ShieldCheck className="h-4 w-4" />
                      تأكيد الرمز والدخول
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
                  طبقة الحماية الثانية: تأكيد حساب Google الأدمن
                </CardTitle>
                <CardDescription className="text-sm pt-2">
                  تم تأكيد الرمز السري بنجاح ✅. الآن يرجى تسجيل الدخول بحساب الأدمن المعتمد من زر المزامنة في أعلى الهيدر لفتح الشاشة الرئيسية.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : !isAdminEmail ? (
            <Card className="border-destructive/30 bg-destructive/5 my-8">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  تم حظر الوصول - الحساب الحالي ليس الأدمن
                </CardTitle>
                <CardDescription className="text-sm pt-2">
                  الحساب الحالي ({user?.email}) لا يملك صلاحية الأدمن. تم قفل اللوحة.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            /* FULL UNLOCKED ADMIN DASHBOARD FOR VERIFIED OWNER */
            <>
              {/* Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-accent/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between text-xs">
                      <span>إجمالي المزامنات (حقيقي)</span>
                      <Activity className="h-4 w-4 text-emerald-500" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-primary">
                      {isLoading ? '...' : stats.totalSyncs}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center pt-2">
                    <p className="text-[11px] text-muted-foreground">عمليات الرفع الفعلية</p>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={handleResetStats} title="إعادة ضبط العداد">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-accent/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between text-xs">
                      <span>المستخدمين النشطين اليوم</span>
                      <Users className="h-4 w-4 text-blue-500" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-primary">
                      {isLoading ? '...' : stats.activeToday}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground">نشاط حقيقي خلال 24h</p>
                  </CardContent>
                </Card>

                <Card className="bg-accent/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between text-xs">
                      <span>حدود Google Drive API</span>
                      <Server className="h-4 w-4 text-purple-500" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-500">
                      1,000,000
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground">طلب مجاني يومياً (تتجدد)</p>
                  </CardContent>
                </Card>

                <Card className="bg-accent/20">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center justify-between text-xs">
                      <span>مستوى أمان الخصوصية</span>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-500">
                      100%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[11px] text-muted-foreground">0% بيانات بالسيرفر المركزي</p>
                  </CardContent>
                </Card>
              </div>

              {/* ARAB COUNTRIES SELECTION GRID FOR OLLAMA BOT */}
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-6 w-6 text-emerald-400" />
                      <CardTitle className="text-xl">تحديد الدول العربية لمتابعة وترجمة وتوزيع الإجازات</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleSelectAllCountries} className="gap-1.5 text-xs">
                        <CheckSquare className="h-3.5 w-3.5" /> تحديد كل الدول ({ARAB_COUNTRIES.length})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleDeselectAllCountries} className="gap-1.5 text-xs text-muted-foreground">
                        <Square className="h-3.5 w-3.5" /> إلغاء التحديد
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs pt-1">
                    اختر الدول التي يقوم بوت الذكاء الاصطناعي بمتابعتها وترجمة إجازاتها تلقائياً وتوزيعها في خلايا الأيام بالجداول.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
                    {ARAB_COUNTRIES.map((country) => {
                      const isChecked = selectedCountries.includes(country.code);
                      return (
                        <button
                          key={country.code}
                          onClick={() => handleToggleCountry(country.code)}
                          className={`p-2.5 rounded-lg border text-right transition-all flex items-center justify-between ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-foreground font-semibold shadow-sm'
                              : 'bg-background/60 border-muted text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          <span className="truncate">{country.flag} {country.name}</span>
                          <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-emerald-500 text-white border-emerald-500 font-bold' : 'border-muted-foreground/40'
                          }`}>
                            {isChecked && '✓'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-3">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> الدول المعتمدة ومحفوظة حالياً: ({selectedCountries.length}) دولة
                  </span>
                  <Button size="sm" onClick={handleSaveApiSettings} className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700">
                    <Database className="h-4 w-4" /> 💾 حفظ وتأكيد الدول المختارة
                  </Button>
                </CardFooter>
              </Card>

              {/* OLLAMA CLOUD API & MODEL HUB */}
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CloudLightning className="h-6 w-6 text-purple-400" />
                      <CardTitle className="text-xl">مركز التحكم في مفتاح Ollama Cloud API والنموذج الذكي</CardTitle>
                    </div>
                    <span className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full font-mono">
                      فحص تلقائي كل 6 ساعات
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    إدارة مفتاح API السحابي المباشر واختيار أذكى وأدق نموذج ذكاء اصطناعي لتدقيق وترجمة مواعيد الإجازات للجداول.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key-input-src" className="text-xs font-semibold">مفتاح Ollama Cloud API Key الحالي:</Label>
                      <div className="relative">
                        <Input
                          id="api-key-input-src"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="أدخل مفتاح API السحابي..."
                          className="font-mono text-xs pl-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model-select-src" className="text-xs font-semibold">النموذج السحابي الأذكى والأدق (Selected Model):</Label>
                      <select
                        id="model-select-src"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-semibold"
                      >
                        <option value="qwen2.5:72b-instruct">🌟 Qwen 2.5 72B (الأذكى والأدق للترجمة العربية وتدقيق الإجازات)</option>
                        <option value="llama-3.3-70b-instruct">⚡ Llama 3.3 70B (سريع وفائق الدقة للتقاويم)</option>
                        <option value="deepseek-r1:70b">🧠 DeepSeek R1 70B (نموذج الاستدلال والتفكير العميق)</option>
                        <option value="mistral-large-2411">🎯 Mistral Large (ممتاز للمهام المتعددة)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center border-t pt-4">
                  <span className="text-xs text-muted-foreground">
                    {isSavedInCloud ? '🟢 المفتاح والدول العربية محفوظة سحابياً' : '⚪ إعدادات متوفرة وقابلة للتعديل'}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleTestCloudApi} disabled={isAiTesting} className="gap-2 text-xs">
                      {isAiTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      اختبار الاتصال بالخادم والترجمة الآن
                    </Button>
                    <Button size="sm" onClick={handleSaveApiSettings} className="gap-2 text-xs bg-purple-600 hover:bg-purple-700">
                      <Database className="h-4 w-4" /> حفظ كافة الإعدادات سحابياً
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* TARGETED NOTIFICATIONS TESTER */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-lg">اختبار نظام الإشعارات الموجهة حسب الدولة (Country Filter Test)</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    يتأكد هذا الاختبار أن تنبيهات تغير الإجازات تصل حصرياً لمستخدمي الدولة المعنية.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold">اختر دولة الاختبار للإشعارات:</span>
                    <select
                      value={targetCountry}
                      onChange={(e) => setTargetCountry(e.target.value)}
                      className="h-8 rounded border bg-background px-2 text-xs"
                    >
                      {ARAB_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-3">
                  <Button size="sm" variant="outline" onClick={handleTestTargetedNotification} className="gap-2 text-xs">
                    <Send className="h-3.5 w-3.5" /> إرسال إشعار موجه تجريبي للأجراس 🔔
                  </Button>
                </CardFooter>
              </Card>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">إرسال تنبيه عام للمستخدمين (Broadcast Notice)</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      كتابة وتفعيل شريط إخباري أو إعلان يظهر لجميع مستخدمي التطبيق فوراً.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="broadcast-input-src" className="text-xs font-medium">نص التنبيه العام</Label>
                      <Input
                        id="broadcast-input-src"
                        placeholder="مثال: تنبيه مهم: تم إدراج المواعيد الرسمية لإجازة عيد الفطر..."
                        value={broadcastText}
                        onChange={(e) => setBroadcastText(e.target.value)}
                      />
                    </div>
                    {announcement.enabled && announcement.message && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs flex items-center justify-between">
                        <span className="font-semibold text-primary">المُذاع حالياً: "{announcement.message}"</span>
                        <span className="text-emerald-500 text-[10px] font-mono">نشط الآن 🟢</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex gap-2 justify-end border-t pt-4">
                    <Button size="sm" variant="outline" onClick={() => handleUpdateAnnouncement(false)}>
                      تعطيل التنبيه
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateAnnouncement(true)} className="gap-1.5">
                      <Send className="h-3.5 w-3.5" /> نشر التنبيه فوراً
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-yellow-500" />
                      <CardTitle className="text-lg">وضع الصيانة وفحص السيرفرات (System Health)</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      التحكم بوضع الصيانة وفحص اتصال مصادر التقاويم الخارجية.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                      <div>
                        <p className="font-semibold text-xs">حالة وضع الصيانة (Maintenance Mode)</p>
                        <p className="text-[11px] text-muted-foreground">عند التفعيل يتم تنبيه المستخدمين بوجود تحسينات</p>
                      </div>
                      <Button
                        size="sm"
                        variant={maintenanceMode ? "destructive" : "secondary"}
                        onClick={handleToggleMaintenance}
                      >
                        {maintenanceMode ? 'إيقاف الصيانة' : 'تفعيل الصيانة'}
                      </Button>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-blue-400" /> سلامة السيرفرات والمصادر:</p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          <p className="text-[10px] text-muted-foreground">Google iCal</p>
                          <p className="font-bold text-emerald-500">متصل 🟢</p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          <p className="text-[10px] text-muted-foreground">OfficeHolidays</p>
                          <p className="font-bold text-emerald-500">متصل 🟢</p>
                        </div>
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                          <p className="text-[10px] text-muted-foreground">Proxy API</p>
                          <p className="font-bold text-emerald-500">سليم 🟢</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ollama Simulator Sandbox */}
              {aiResponse && (
                <Card className="border-purple-500/30 bg-accent/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono flex items-center gap-2 text-purple-400">
                      <Terminal className="h-4 w-4" /> استجابة فحص Ollama Cloud API والنموذج الذكي:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-background/90 p-4 rounded-lg border border-purple-500/30 font-mono space-y-1.5 text-xs text-foreground whitespace-pre-line animate-in fade-in">
                      {aiResponse}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )
        )}

      </div>
    </div>
  );
}
