
'use client';

import React, { useState, useEffect } from 'react';
import { useSchedules } from '@/hooks/use-schedules';
import { DayData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { format, parseISO, getYear } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Pin, MessageSquare, Edit2, Trash2, ArrowRight, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { DayDetailDialog } from '@/components/day-detail-dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventItem {
  date: Date;
  data: DayData;
  dateKey: string;
}

const getLocalStorageSize = () => {
    if (typeof window === 'undefined') return 0;
    let total = 0;
    for (const key in window.localStorage) {
        if (window.localStorage.hasOwnProperty(key)) {
            const value = window.localStorage.getItem(key);
            if (value) {
                total += value.length * 2; // JavaScript strings are UTF-16
            }
        }
    }
    return total;
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


function EventCard({ item, onEdit, onDelete }: { item: EventItem; onEdit: (item: EventItem) => void; onDelete: (item: EventItem) => void; }) {
    const hasNote = item.data.note && item.data.note.trim() !== '';
    const hasTitle = item.data.title && item.data.title.trim() !== '';

    return (
        <div className="bg-accent/30 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow space-y-2">
                <div className="flex items-center gap-3">
                    <div className="font-bold text-primary text-lg">
                        {format(item.date, 'eeee, dd MMMM yyyy', { locale: arSA })}
                    </div>
                    {hasTitle && <div className="font-semibold text-foreground text-md">"{item.data.title}"</div>}
                </div>
                {hasNote && (
                    <div className="flex items-start gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-400 mt-1 shrink-0" />
                        <p className="text-yellow-400/90">{item.data.note}</p>
                    </div>
                )}
                {item.data.pinned && (
                    <div className="flex items-center gap-2">
                        <Pin className="h-5 w-5 text-red-500 fill-red-500" />
                        <span className="font-semibold text-red-400/90">يوم مثبت</span>
                    </div>
                )}
            </div>
            <div className="flex gap-2 shrink-0 self-end sm:self-center">
                <Button variant="outline" size="icon" onClick={() => onEdit(item)}>
                    <Edit2 className="h-4 w-4" />
                </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيؤدي هذا إلى مسح العنوان والملاحظة والدبوس لهذا اليوم. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(item)}>مسح البيانات</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function DeleteAllDataDialog({ onConfirm }: { onConfirm: () => void }) {
    const [confirmationText, setConfirmationText] = useState('');
    const requiredText = "حذف كل شي";
    const isMatch = confirmationText === requiredText;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
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


const YEARS_PER_PAGE = 7;

export default function OverviewPage() {
    const { activeSchedule, updateDay, deleteYearData, deleteAllEvents, isLoaded, deleteAllData } = useSchedules();
    const { toast } = useToast();

    const [eventsByYear, setEventsByYear] = useState<Record<string, EventItem[]>>({});
    const [editingItem, setEditingItem] = useState<EventItem | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [storageSize, setStorageSize] = useState('0 Bytes');
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [yearPage, setYearPage] = useState(0);

    useEffect(() => {
        if (activeSchedule) {
            const allEvents = Object.entries(activeSchedule.days)
                .map(([dateKey, data]) => ({ date: parseISO(dateKey), data, dateKey }))
                .filter(item => item.data.pinned || (item.data.note && item.data.note.trim() !== '') || (item.data.title && item.data.title.trim() !== ''))
                .sort((a, b) => b.date.getTime() - a.date.getTime());

            const grouped = allEvents.reduce((acc, item) => {
                const year = getYear(item.date).toString();
                if (!acc[year]) {
                    acc[year] = [];
                }
                acc[year].push(item);
                return acc;
            }, {} as Record<string, EventItem[]>);

            setEventsByYear(grouped);

            const years = Object.keys(grouped).sort((a, b) => parseInt(b) - parseInt(a));
            if (years.length > 0 && (!selectedYear || !grouped[selectedYear])) {
                setSelectedYear(years[0]);
            } else if (years.length === 0) {
                setSelectedYear(null);
            }
        }
        setStorageSize(formatBytes(getLocalStorageSize()));
    }, [activeSchedule, selectedYear]);

    const handleEdit = (item: EventItem) => {
        setEditingItem(item);
        setIsDetailOpen(true);
    };

    const handleDelete = (item: EventItem) => {
        updateDay(item.dateKey, { title: undefined, note: undefined, pinned: false });
        toast({ title: 'تم مسح البيانات', description: `تم مسح بيانات يوم ${format(item.date, 'd MMMM', { locale: arSA })}.` });
    };

    const handleSaveDetails = (title: string, note: string, pinned: boolean) => {
        if (editingItem) {
            updateDay(editingItem.dateKey, { title, note, pinned });
            toast({ title: "تم حفظ التعديلات" });
        }
    };
    
    const handleDeleteYear = (year: string) => {
        deleteYearData(year);
        toast({
            variant: "destructive",
            title: "تم حذف بيانات السنة",
            description: `تم حذف جميع العناوين والملاحظات والأيام المثبتة لسنة ${year}.`
        });
    };

    const handleResetAll = () => {
        toast({
            variant: "destructive",
            title: "جاري الحذف...",
            description: "سيتم حذف جميع البيانات وإعادة تهيئة التطبيق.",
            duration: 5000,
        });
        deleteAllData();
    }

    if (!isLoaded) {
        return (
          <div className="flex h-screen w-full items-center justify-center">
            <div className="text-lg">جار تحميل البيانات...</div>
          </div>
        );
    }
    
    const sortedYears = Object.keys(eventsByYear).sort((a,b) => parseInt(b) - parseInt(a));
    const yearPageCount = Math.ceil(sortedYears.length / YEARS_PER_PAGE);
    const paginatedYears = sortedYears.slice(yearPage * YEARS_PER_PAGE, (yearPage + 1) * YEARS_PER_PAGE);

    return (
        <div dir="rtl" className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-primary">العرض الشامل</h1>
                    <Link href="/">
                        <Button variant="outline">
                            <ArrowRight className="ml-2 h-4 w-4" />
                            العودة للتقويم
                        </Button>
                    </Link>
                </div>
                
                {sortedYears.length > 0 ? (
                    <>
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="text-center">السنوات المتاحة</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center gap-2">
                                {yearPageCount > 1 && (
                                    <Button variant="ghost" size="icon" onClick={() => setYearPage(p => p - 1)} disabled={yearPage === 0}>
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                )}
                                <div className="flex flex-wrap justify-center gap-2">
                                    {paginatedYears.map(year => (
                                        <Button 
                                            key={year}
                                            variant={selectedYear === year ? 'default' : 'secondary'}
                                            onClick={() => setSelectedYear(year)}
                                        >
                                            سنة {year}
                                            <span className="mr-2 bg-primary/20 text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {eventsByYear[year].length}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                                {yearPageCount > 1 && (
                                     <Button variant="ghost" size="icon" onClick={() => setYearPage(p => p + 1)} disabled={yearPage >= yearPageCount - 1}>
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                        
                        {selectedYear && eventsByYear[selectedYear] && (
                            <Card className="overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-2xl text-center font-bold bg-accent/50 p-3 rounded-t-lg">
                                        عرض أحداث سنة {selectedYear}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                     <ScrollArea className="h-[45vh] pr-4 -mr-4">
                                        <div className="space-y-4">
                                         {eventsByYear[selectedYear].map(item => (
                                            <EventCard key={item.dateKey} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                                         ))}
                                        </div>
                                     </ScrollArea>
                                </CardContent>
                                <CardFooter className="bg-accent/20 p-3 justify-center">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">حذف جميع بيانات سنة {selectedYear}</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent dir="rtl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    سيؤدي هذا إلى حذف جميع العناوين والملاحظات والأيام المثبتة لسنة {selectedYear} فقط. لا يمكن التراجع عن هذا الإجراء.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteYear(selectedYear)}>نعم، احذف بيانات السنة</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            </Card>
                        )}
                    </>
                ) : (
                    <Card className="text-center p-12">
                        <CardTitle>لا توجد بيانات لعرضها</CardTitle>
                        <p className="text-muted-foreground mt-2">
                            لم تقم بإضافة أي ملاحظات أو تثبيت أي أيام بعد.
                        </p>
                    </Card>
                )}

                <div className="mt-12 text-center text-sm text-muted-foreground space-y-4">
                     <p>حجم البيانات المخزنة محلياً: <span className="font-mono font-bold text-primary">{storageSize}</span></p>
                     <div className="flex justify-center">
                        <DeleteAllDataDialog onConfirm={handleResetAll} />
                     </div>
                </div>
            </div>

            {editingItem && (
                 <DayDetailDialog
                    isOpen={isDetailOpen}
                    onOpenChange={setIsDetailOpen}
                    day={editingItem.date}
                    dayData={editingItem.data}
                    onSave={handleSaveDetails}
                 />
            )}
        </div>
    );
}

    