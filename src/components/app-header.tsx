
"use client";

import React from 'react';
import { Calendar, Settings, ChevronDown, Check, Palette, Camera, Loader2, Download, Upload, Trash2, PlusCircle, Info, Smartphone, CalendarDays, SlidersHorizontal, Paintbrush, Save, Mail, Library, RotateCw } from 'lucide-react';
import { useSchedules } from '@/hooks/use-schedules';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { useViewSettings } from '@/hooks/use-view-settings';
import { BackgroundColors, ThemeFile, ColorPreset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import Link from 'next/link';


type AppHeaderProps = {
  onCapture: () => void;
  captureStatus: 'idle' | 'capturing' | 'success';
  onOpenSettings: () => void;
  onOpenHolidays: () => void;
  installPrompt: any;
  isAppInstalled: boolean;
  onInstallClick: () => void;
};


const ColorInputTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { color: string }
>(({ color, ...props }, ref) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <button
                ref={ref}
                className="h-8 w-8 rounded-full border-2 border-background shadow-md cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                {...props}
            />
        </TooltipTrigger>
        <TooltipContent side="top">
            <p>تغيير اللون</p>
        </TooltipContent>
    </Tooltip>
));
ColorInputTrigger.displayName = 'ColorInputTrigger';

type ColorPickerItemProps = {
    label: string;
    color: string;
    onColorChange: (color: string) => void;
};

function ColorPickerItem({ label, color, onColorChange }: ColorPickerItemProps) {
    const id = `color-picker-${label.replace(/\s+/g, '-')}`;
    return (
        <div className="flex items-center justify-between p-2 rounded-md bg-accent/30">
            <Label htmlFor={id} className="font-medium">{label}</Label>
            <div className="relative">
                <ColorInputTrigger color={color} onClick={() => document.getElementById(id)?.click()} />
                <Input
                    id={id}
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="absolute opacity-0 w-0 h-0"
                />
            </div>
        </div>
    );
}

export function AppHeader({ 
  onCapture, 
  captureStatus, 
  onOpenSettings,
  onOpenHolidays,
  installPrompt,
  isAppInstalled,
  onInstallClick
}: AppHeaderProps) {
  const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = React.useState(false);
  const { schedules, activeSchedule, activeScheduleId, setActiveScheduleId } = useSchedules();
  
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [themeName, setThemeName] = React.useState('');
  const [isSavePromptOpen, setIsSavePromptOpen] = React.useState(false);
  const [isSavePresetOpen, setIsSavePresetOpen] = React.useState(false);

  const { 
    backgroundColors, 
    setBackgroundColors,
    resetBackgroundColors,
    colorPresets,
    saveColorPreset,
    deleteColorPreset,
    applyColorPreset,
  } = useViewSettings();


  const handleColorChange = (key: keyof Omit<BackgroundColors, 'header' | 'news'>, value: string) => {
    setBackgroundColors(prev => ({...prev, [key]: value}));
  };

  const handleColorReset = () => {
    resetBackgroundColors();
    toast({ title: "تمت استعادة الألوان الافتراضية", duration: 2000 });
  };
  
  const handleExportTheme = () => {
    if (!themeName.trim()) {
      toast({ variant: "destructive", title: "الرجاء إدخال اسم للثيم" });
      return;
    }
    const themeFile: ThemeFile = {
      name: themeName.trim(),
      colors: backgroundColors,
    };
    const dataStr = JSON.stringify(themeFile, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${themeName.trim().replace(/\s+/g, '_')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setIsSavePromptOpen(false);
    setThemeName('');
    toast({ title: `تم تصدير ثيم "${themeFile.name}"` });
  };
  
  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result;
          const imported = JSON.parse(content as string) as ThemeFile;
          if (imported.name && imported.colors) {
            setBackgroundColors(imported.colors); // Save and apply
            toast({ title: `تم استيراد ثيم "${imported.name}"` });
          } else {
             throw new Error("Invalid theme file format");
          }
        } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "فشل الاستيراد", description: "ملف الثيم غير صالح." });
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  const handleSavePreset = () => {
    if (!themeName.trim()) {
      toast({ variant: "destructive", title: "الرجاء إدخال اسم للثيم" });
      return;
    }
    saveColorPreset(themeName, backgroundColors);
    toast({ title: "تم حفظ الثيم بنجاح!" });
    setIsSavePresetOpen(false);
    setThemeName('');
  };


  const todayFormatted = format(new Date(), "eeee, d MMMM yyyy", { locale: arSA });

  const getCaptureButtonContent = () => {
    switch (captureStatus) {
      case 'capturing':
        return <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري الحفظ...</>;
      case 'success':
        return <>تم الحفظ!</>;
      default:
        return <><Camera className="mr-2 h-4 w-4" /> حفظ كصورة</>;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/75 px-2 sm:px-4 md:px-6 backdrop-blur-sm" dir="rtl">
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">فتح الإعدادات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" dir="rtl">
                <DropdownMenuLabel>الإعدادات العامة</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onOpenSettings}>
                  <SlidersHorizontal className="ml-2 h-4 w-4 text-blue-400" />
                  <span>إعدادات الجداول والواجهة</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/overview">
                    <Library className="ml-2 h-4 w-4 text-purple-400" />
                    <span>العرض الشامل</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onOpenHolidays}>
                  <CalendarDays className="ml-2 h-4 w-4 text-green-400" />
                  <span>المناسبات الرسمية</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setIsColorPickerOpen(true)}>
                  <Palette className="ml-2 h-4 w-4 text-pink-400" />
                  <span>تخصيص ألوان الواجهة</span>
                </DropdownMenuItem>
                {installPrompt && !isAppInstalled && (
                  <DropdownMenuItem onSelect={onInstallClick}>
                    <Smartphone className="ml-2 h-4 w-4 text-gray-400" />
                    <span>تثبيت التطبيق</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsAboutDialogOpen(true)}>
                  <Info className="ml-2 h-4 w-4 text-yellow-400" />
                  <span>حول التطبيق</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden md:flex items-center gap-2" data-capture-btn="true">
              <Button variant="outline" onClick={onCapture} disabled={captureStatus !== 'idle'} className="w-36">
                  {getCaptureButtonContent()}
              </Button>
            </div>

            {schedules.length > 1 && activeSchedule && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="max-w-[150px] sm:max-w-xs">
                    <ChevronDown className="mr-2 h-4 w-4" />
                    <span className="truncate">{activeSchedule.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56" dir="rtl">
                  <DropdownMenuLabel>تبديل الجدول</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {schedules.map((schedule) => (
                    <DropdownMenuItem
                      key={schedule.id}
                      onSelect={() => setActiveScheduleId(schedule.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{schedule.name}</span>
                      {schedule.id === activeScheduleId && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>

        <div className="mx-auto flex items-center justify-center">
            <Card className="hidden sm:block w-fit max-w-full mx-auto px-4 py-1 shadow-lg border-primary/20">
                <div className="flex flex-col justify-center items-center h-12 rounded-md border bg-accent/50 p-1 text-center font-semibold">
                    <p className="text-xs font-medium text-muted-foreground">اليوم</p>
                    <p className="text-base sm:text-lg tracking-wide text-primary">{todayFormatted}</p>
                </div>
            </Card>
        </div>


        <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex justify-center items-center h-10 rounded-md border bg-accent/50 p-2 px-4 text-center font-semibold text-primary">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">جداول العمل</h1>
            </div>
            <Calendar className="h-6 w-6 text-primary" />
        </div>
      </header>
      
      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <DialogContent className="max-w-md h-auto flex flex-col max-h-[80vh]" dir="rtl">
            <DialogHeader className="shrink-0">
                <DialogTitle>حول تطبيق جداول العمل</DialogTitle>
                <DialogDescription>تطبيق بسيط وفعال لتنظيم جداول العمل.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
                <div className="py-4 space-y-6">
                    <Card className="bg-accent/30">
                        <CardContent className="p-4 text-center">
                            <p className="font-semibold">المطور</p>
                            <p className="text-primary font-bold text-lg">عمر الوهيبي</p>
                            <p className="text-xs text-muted-foreground">
                                تم التطوير باستخدام Google Gemini & Firebase Studio
                            </p>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h4 className="text-center font-semibold">للتواصل</h4>
                        <div className="flex justify-center gap-4">
                            <a href="https://wa.me/96892670679" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                <span>واتساب</span>
                            </a>
                            <a href="mailto:alomar3363@gamil.com" className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors">
                                <Mail className="h-6 w-6" />
                                <span>البريد الإلكتروني</span>
                            </a>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <h4 className="text-center font-semibold">أهم مميزات التطبيق</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground text-right">
                            <li><span className="font-semibold text-foreground">الخصوصية أولاً:</span> جميع جداولك وبياناتك تحفظ على جهازك فقط.</li>
                            <li><span className="font-semibold text-foreground">تخصيص كامل:</span> تحكم في ألوان الواجهة، تخطيط التقويم، وخلفيات الأشهر.</li>
                            <li><span className="font-semibold text-foreground">جداول متعددة:</span> أنشئ وأدِر عدة جداول عمل مختلفة وتبدل بينها بسهولة.</li>
                            <li><span className="font-semibold text-foreground">ملاحظات وتثبيت:</span> أضف ملاحظات وعناوين للأيام المهمة وقم بتثبيتها للوصول السريع.</li>
                            <li><span className="font-semibold text-foreground">إجازات رسمية:</span> استورد الإجازات الرسمية لأي دولة وأضفها لجدولك.</li>
                            <li><span className="font-semibold text-foreground">حفظ ومشاركة:</span> صدر بياناتك بالكامل كنسخة احتياطية، واحفظ جدولك كصورة عالية الجودة.</li>
                            <li><span className="font-semibold text-foreground">تطبيق ويب تقدمي (PWA):</span> قم بتثبيت التطبيق على جهازك للوصول السريع والعمل دون اتصال.</li>
                        </ul>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="shrink-0 pt-4 border-t -mx-6 px-6">
                <Button onClick={() => setIsAboutDialogOpen(false)} className="w-full">إغلاق</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    <Dialog open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <DialogContent className="max-w-lg h-[90vh] sm:h-auto flex flex-col" dir="rtl" overlayClassName="no-overlay">
            <DialogHeader>
                <DialogTitle>تخصيص ألوان الواجهة</DialogTitle>
                <DialogDescription>
                    انقر على الدوائر الملونة لتغيير الألوان، أو اختر من الثيمات المحفوظة. التغييرات تظهر فورًا.
                </DialogDescription>
            </DialogHeader>
            
             <div className="flex-1 min-h-0 py-4">
                <ScrollArea className="h-full pr-4 -mr-4">
                    <div className="space-y-4 pr-4">
                        <div className="border-b pb-4">
                            <h4 className="font-semibold mb-2">الثيمات المحفوظة</h4>
                            <div className="flex gap-2 items-center">
                                <AlertDialog open={isSavePresetOpen} onOpenChange={setIsSavePresetOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="icon"><Save className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>حفظ الثيم الحالي</AlertDialogTitle>
                                            <AlertDialogDescription>الرجاء إدخال اسم للثيم ليتم حفظه.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="py-4">
                                            <Label htmlFor="preset-name" className="text-right">اسم الثيم</Label>
                                            <Input id="preset-name" value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="مثال: ثيم الصحراء" />
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel onClick={() => setThemeName('')}>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSavePreset}>حفظ</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Separator orientation="vertical" className="h-8" />
                                {colorPresets.length > 0 ? (
                                    <div className="flex gap-2">
                                        {colorPresets.map((preset) => (
                                            <div key={preset.id} className="relative group">
                                                <Button variant="secondary" onClick={() => applyColorPreset(preset.colors)}>{preset.name}</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="destructive" className="absolute -top-2 -left-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent dir="rtl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                            <AlertDialogDescription>سيتم حذف ثيم "{preset.name}" نهائيًا.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteColorPreset(preset.id)}>نعم، احذف</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">لم يتم حفظ أي ثيمات بعد.</p>
                                )}
                            </div>
                        </div>

                        <TooltipProvider>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <ColorPickerItem label="خلفية الصفحة" color={backgroundColors.page} onColorChange={(c) => handleColorChange('page', c)} />
                                <ColorPickerItem label="إطار التقويم" color={backgroundColors.container} onColorChange={(c) => handleColorChange('container', c)} />
                                <ColorPickerItem label="خلفية بطاقة الشهر" color={backgroundColors.monthCard} onColorChange={(c) => handleColorChange('monthCard', c)} />
                                <ColorPickerItem label="خلفية اسم الشهر" color={backgroundColors.monthNameBackground} onColorChange={(c) => handleColorChange('monthNameBackground', c)} />
                                <ColorPickerItem label="لون اسم الشهر" color={backgroundColors.monthName} onColorChange={(c) => handleColorChange('monthName', c)} />
                                <ColorPickerItem label="لون رقم الشهر" color={backgroundColors.monthNumber} onColorChange={(c) => handleColorChange('monthNumber', c)} />
                            </div>
                        </TooltipProvider>
                    </div>
                </ScrollArea>
            </div>
            
            <DialogFooter className="flex-col sm:flex-row items-center gap-2 pt-4 border-t shrink-0">
                <Button variant="ghost" onClick={handleColorReset} className="w-full sm:w-auto">
                    <RotateCw className="mr-2 h-4 w-4" />
                    إعادة للون الافتراضي
                </Button>
                <div className='flex gap-2 w-full sm:w-auto'>
                    <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> استيراد
                    </Button>
                    <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }} onChange={handleImportTheme} />
                    <AlertDialog open={isSavePromptOpen} onOpenChange={setIsSavePromptOpen}>
                        <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Download className="mr-2 h-4 w-4" /> حفظ
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>حفظ الثيم الحالي</AlertDialogTitle>
                            <AlertDialogDescription>
                            الرجاء إدخال اسم للثيم ليتم حفظه في ملف JSON.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                            <Label htmlFor="theme-name" className="text-right">اسم الثيم</Label>
                            <Input id="theme-name" value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="مثال: ثيم الصحراء" />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleExportTheme}>حفظ وتنزيل</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

    
