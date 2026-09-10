"use client";

import React, { useState } from 'react';
import { useGoogleSync } from '@/hooks/use-google-sync';
import { useSchedules } from '@/hooks/use-schedules';
import { useViewSettings } from '@/hooks/use-view-settings';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Cloud, Check, Loader2, LogOut, Download, Upload, ShieldCheck, Sparkles, Image as ImageIcon, Bot, RefreshCw, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { FullExport } from '@/lib/types';

// Curated Collection of Robot & Object Avatars (Non-human Icons)
const PRESET_AVATARS = [
  { id: 'google', label: 'صورة Google الحساب الأصلي', url: null },
  { id: 'bot-gold', label: 'روبوت الأدمن الذهبي', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=GoldMaster' },
  { id: 'bot-thunder', label: 'روبوت البرق التكنولوجي', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThunderBot' },
  { id: 'bot-cyber', label: 'روبوت سيبراني', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberBot' },
  { id: 'bot-blue', label: 'روبوت المساعد', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=BlueBot' },
  { id: 'bot-cute', label: 'روبوت ذكي', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CuteBot' },
  { id: 'icon-shapes', label: 'رمز كوني', url: 'https://api.dicebear.com/7.x/shapes/svg?seed=Cosmos' },
];

export function GoogleSyncButton() {
  const {
    user,
    status,
    lastSynced,
    error,
    isDriveConnected,
    requestGoogleLogin,
    logout,
    syncNow,
    restoreFromCloud,
    updateCustomAvatar,
  } = useGoogleSync();

  const { schedules, importFullData } = useSchedules();
  const { viewSettings } = useViewSettings();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Active avatar image URL priority: customAvatar -> user.picture -> fallback
  const activeAvatarUrl = user?.customAvatar || user?.picture;

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    const token = await requestGoogleLogin();
    setIsSyncing(false);
    if (token) {
      toast({
        title: "تم الاتصال بـ Google Drive",
        description: "تم تفعيل المزامنة السحابية وتثبيت حسابك بنجاح.",
      });
    }
  };

  const handleSyncToCloud = async () => {
    setIsSyncing(true);
    const exportPayload: FullExport = { schedules, viewSettings };
    const success = await syncNow(exportPayload);
    setIsSyncing(false);

    if (success) {
      toast({
        title: "تمت المزامنة بنجاح",
        description: "تم حفظ نسختك المشفرة في مجلد Google Drive الخاص بك.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "فشلت المزامنة",
        description: error || "تعذر رفع البيانات إلى Google Drive. انقر لتجديد الاتصال.",
      });
    }
  };

  const handleRestoreFromCloud = async () => {
    setIsSyncing(true);
    const cloudData = await restoreFromCloud();
    setIsSyncing(false);

    if (cloudData) {
      importFullData(cloudData);
      toast({
        title: "تم استعادة البيانات بنجاح",
        description: "تم تحديث الجداول والإعدادات من Google Drive.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "لم يتم العثور على نسخة",
        description: error || "لم نجد نسخة احتياطية سابقة في حسابك على Google Drive.",
      });
    }
  };

  const formattedLastSync = lastSynced
    ? formatDistanceToNow(parseISO(lastSynced), { addSuffix: true, locale: arSA })
    : 'لم تظهر بعد';

  // Auto-sync on page entry so user never forgets to upload!
  const hasAutoSyncedOnMount = React.useRef(false);
  React.useEffect(() => {
    if (isDriveConnected && user && schedules.length > 0 && !hasAutoSyncedOnMount.current) {
      hasAutoSyncedOnMount.current = true;
      syncNow({ schedules, viewSettings }).catch(() => {});
    }
  }, [isDriveConnected, user, schedules, viewSettings, syncNow]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isDriveConnected ? "outline" : "secondary"}
          size="sm"
          className="gap-2 text-xs font-medium border-primary/30 hover:border-primary/60"
        >
          {status === 'syncing' || isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : isDriveConnected && user ? (
            <div className="relative flex items-center gap-1.5">
              {activeAvatarUrl && !imgError ? (
                <img
                  src={activeAvatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-emerald-500/50"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-[10px]">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          ) : (
            <Cloud className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">
            {isDriveConnected && user ? user.name.split(' ')[0] : 'مزامنة Google'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-24px)] sm:w-80 max-h-[85vh] overflow-y-auto p-4 border-2 border-primary/20 shadow-2xl rounded-2xl bg-card text-card-foreground opacity-100 z-50 custom-scrollbar" align="end" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <h4 className="font-bold text-sm">المزامنة الخاصة (Google Drive)</h4>
            </div>
          </div>

          {isDriveConnected && user ? (
            <div className="space-y-3">
              {/* Profile Card */}
              <div className="flex items-center justify-between bg-accent/30 p-2.5 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  {activeAvatarUrl && !imgError ? (
                    <img
                      src={activeAvatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/40"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-base">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden text-xs">
                    <p className="font-semibold truncate">{user.name}</p>
                    <p className="text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  title="تغيير الصورة الرمزية"
                >
                  <Bot className="h-4 w-4" />
                </Button>
              </div>

              {/* Avatar Collection Selector Grid (Robots & Objects) */}
              {showAvatarPicker && (
                <div className="p-2.5 bg-muted/40 rounded-xl border text-xs space-y-2 max-h-44 overflow-y-auto custom-scrollbar animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary text-[11px] flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> اختر رمز روبوت أو شكل:
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {PRESET_AVATARS.map((avatar) => {
                      const url = avatar.url || user.picture;
                      const isSelected = (avatar.id === 'google' && !user.customAvatar) || user.customAvatar === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          onClick={() => {
                            updateCustomAvatar(avatar.url || undefined);
                            setImgError(false);
                            toast({ title: `تم اختيار ${avatar.label}` });
                          }}
                          className={`p-0.5 rounded-full border-2 transition-all flex items-center justify-center bg-background h-8 w-8 mx-auto ${
                            isSelected ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-transparent hover:border-muted'
                          }`}
                          title={avatar.label}
                        >
                          {url ? (
                            <img src={url} alt={avatar.label} referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/20 font-bold text-primary flex items-center justify-center text-[10px]">
                              {user.name.charAt(0)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-center justify-between gap-2">
                  <span className="text-[11px] leading-tight">{error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="h-6 text-[10px] px-2 shrink-0 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                  >
                    تجديد
                  </Button>
                </div>
              )}

              {/* EXCLUSIVE DEVELOPER & OWNER DIRECT ACCESS (alomar3363@gmail.com only) */}
              {user.email?.toLowerCase() === 'alomar3363@gmail.com' && (
                <div className="p-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                      <ShieldCheck className="h-4 w-4" />
                      <span>رتبة المطور والمالك الحصري</span>
                    </div>
                    <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded font-bold border border-amber-500/30">
                      DEV33.O
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    مرحباً بك يا عمر. لديك صلاحية الولوج المباشر لصفحة الأدمن للتحكم بالأجهزة وتغيير الرمز السري بنفسك.
                  </p>
                  <Link href="/dev33.o">
                    <Button
                      size="sm"
                      className="w-full gap-2 text-xs bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold shadow-md"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      دخول لوحة المطور (dev33.o) وإدارة الباسورد
                    </Button>
                  </Link>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-2 rounded">
                <p>🔒 البيانات متواجدة فقط في مساحتك الشخصية.</p>
                <p>🕒 آخر مزامنة: <span className="font-medium text-foreground">{formattedLastSync}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="gap-1.5 text-xs"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  حفظ ورفع البيانات
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRestoreFromCloud}
                  disabled={isSyncing}
                  className="gap-1.5 text-xs"
                >
                  {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  جلب وتنزيل
                </Button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="w-full text-xs text-destructive hover:bg-destructive/10 justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                تسجيل الخروج والقطع
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                احفظ جداولك بخصوصية 100% في مجلدك الخاص في Google Drive للمزامنة الفورية الدائمة بين هاتفك والكمبيوتر.
              </p>
              <Button
                onClick={handleGoogleLogin}
                disabled={isSyncing}
                className="w-full gap-2 font-semibold text-xs"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                تسجيل الدخول بـ Google
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
