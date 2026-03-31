
'use client';

import React from 'react';
import { Schedule, DayData } from '@/lib/types';
import { TickerItemData } from '@/components/news-ticker';
import { format, parseISO, isAfter, startOfToday, differenceInDays, isTomorrow, isSameDay, isToday } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Briefcase, Coffee, MessageSquare, Pin } from 'lucide-react';


export const generateTickerItems = (schedule: Schedule | null, today: Date): TickerItemData[] => {
    if (!schedule) return [];

    const items: TickerItemData[] = [];
    const todayStart = startOfToday();
    const todayKey = format(todayStart, 'yyyy-MM-dd');
    
    const sortedDays = Object.keys(schedule.days).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    const isTodayWorkDay = schedule.days[todayKey]?.type === 'work';

    // Find next holiday streak
    const findNextHolidayStreak = (startDate: Date): Date[] => {
        const futureDaysOnly = sortedDays.filter(dayKey => isAfter(parseISO(dayKey), startDate) || isSameDay(parseISO(dayKey), startDate));
        let streak: Date[] = [];
        let firstHolidayIndex = -1;

        for (let i = 0; i < futureDaysOnly.length; i++) {
            if (schedule.days[futureDaysOnly[i]]?.type === 'holiday') {
                firstHolidayIndex = i;
                break;
            }
        }

        if (firstHolidayIndex !== -1) {
            const firstHolidayDate = parseISO(futureDaysOnly[firstHolidayIndex]);
            streak.push(firstHolidayDate);

            for (let i = firstHolidayIndex + 1; i < futureDaysOnly.length; i++) {
                const currentKey = futureDaysOnly[i];
                const currentDate = parseISO(currentKey);
                const prevDate = streak[streak.length - 1];

                if (differenceInDays(currentDate, prevDate) === 1 && schedule.days[currentKey]?.type === 'holiday') {
                    streak.push(currentDate);
                } else {
                    break; 
                }
            }
        }
        return streak;
    };
    
    if (isTodayWorkDay) {
        const nextHolidayStreak = findNextHolidayStreak(todayStart);
        let holidayInfo = '';
        if (nextHolidayStreak.length > 0) {
            const isHolidayTomorrow = isTomorrow(nextHolidayStreak[0]);
            if(isHolidayTomorrow) {
                holidayInfo = ` | وإجازتك تبدأ غدًا (${nextHolidayStreak.length} أيام)`;
            } else {
                 holidayInfo = ` | إجازتك القادمة ${nextHolidayStreak.length} أيام`;
            }
        }

        const todayName = format(today, 'eeee', { locale: arSA });

        items.push({
            id: `work-${todayKey}`,
            date: today.toISOString(),
            type: 'work',
            relatedDays: [todayKey],
            node: (
                <div className="flex items-center gap-2" dir="rtl">
                    <span className="bg-accent/50 text-foreground font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                        <Briefcase className="h-4 w-4 text-green-400" />
                        <span>عملك التالي:</span>
                    </span>
                    <span className="font-bold text-primary">اليوم {todayName}{holidayInfo}</span>
                </div>
            )
        });
    } else {
        // Find next work day if today is not a work day
        const futureWorkDays = sortedDays.filter(dayKey => {
            const dayDate = parseISO(dayKey);
            return (isAfter(dayDate, todayStart)) && schedule.days[dayKey]?.type === 'work';
        });

        if (futureWorkDays.length > 0) {
            const nextWorkDay = parseISO(futureWorkDays[0]);
            const daysRemaining = differenceInDays(nextWorkDay, todayStart);
            items.push({
                id: `work-${format(nextWorkDay, 'yyyy-MM-dd')}`,
                date: nextWorkDay.toISOString(),
                type: 'work',
                relatedDays: [format(nextWorkDay, 'yyyy-MM-dd')],
                node: (
                    <div className="flex items-center gap-2" dir="rtl">
                        <span className="bg-accent/50 text-foreground font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                            <Briefcase className="h-4 w-4 text-green-400" />
                            <span>عملك التالي</span>
                        </span>
                        <span>
                            يوم {format(nextWorkDay, 'eeee, d MMMM yyyy', { locale: arSA })} (يتبقى {daysRemaining} أيام)
                        </span>
                    </div>
                )
            });
        }
    }
    
    // Find next consecutive holidays (only if today is NOT a workday, as it's handled above)
    if (!isTodayWorkDay) {
        const nextHolidayStreak = findNextHolidayStreak(todayStart);

        if (nextHolidayStreak.length > 0) {
            const streakStartDate = nextHolidayStreak[0];
            const streakEndDate = nextHolidayStreak[nextHolidayStreak.length - 1];
            
            // Filter streak to only count days from today onwards
            const remainingDaysInStreak = nextHolidayStreak.filter(d => isSameDay(d, todayStart) || isAfter(d, todayStart)).length;

            let holidayText;
            if (nextHolidayStreak.length > 6) {
                const startFormatted = format(streakStartDate, 'd MMMM', { locale: arSA });
                const endFormatted = format(streakEndDate, 'd MMMM', { locale: arSA });
                holidayText = `من ${startFormatted} إلى ${endFormatted}`;
            } else {
                 const dayFormatter = (date: Date) => {
                    if (isToday(date)) return `اليوم (${format(date, 'eeee', { locale: arSA })})`;
                    if (isTomorrow(date)) return `غداً (${format(date, 'eeee', { locale: arSA })})`;
                    const diff = differenceInDays(date, todayStart);
                    if (diff === 2) return `بعد غد (${format(date, 'eeee', { locale: arSA })})`;
                    return format(date, 'eeee, d MMMM', { locale: arSA });
                };
                holidayText = nextHolidayStreak.map(dayFormatter).join('، ');
            }
            
            const remainingText = `(يتبقى ${remainingDaysInStreak} ${remainingDaysInStreak > 2 ? 'أيام' : 'يوم'})`;

            items.push({
                id: `holiday-${format(streakStartDate, 'yyyy-MM-dd')}`,
                date: streakStartDate.toISOString(),
                type: 'holiday',
                relatedDays: nextHolidayStreak.map(d => format(d, 'yyyy-MM-dd')),
                node: (
                    <div className="flex items-center gap-2" dir="rtl">
                        <span className="bg-accent/50 text-foreground font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                            <Coffee className="h-4 w-4 text-orange-400" />
                            <span>إجازتك التالية</span>
                        </span>
                        <span>{holidayText} {remainingText}</span>
                    </div>
                )
            });
        }
    }


    const allDaysWithData = sortedDays
        .map(key => ({ key, data: schedule.days[key], date: parseISO(key) }));

    const pinnedEvents = allDaysWithData.filter(event => event.data.pinned);
    const noteEvents = allDaysWithData.filter(event => event.data.title && event.data.title.trim() !== '');

    const eventSorter = (a: {date: Date}, b: {date: Date}) => {
        const diffA = differenceInDays(a.date, todayStart);
        const diffB = differenceInDays(b.date, todayStart);
        if (diffA >= 0 && diffB >= 0) return diffA - diffB; // Future events, closer first
        if (diffA < 0 && diffB < 0) return diffB - diffA; // Past events, closer first
        if (diffA >= 0 && diffB < 0) return -1; // Future before past
        if (diffA < 0 && diffB >= 0) return 1;  // Future before past
        return 0;
    };
    
    pinnedEvents.sort(eventSorter).forEach(event => {
        const daysDiff = differenceInDays(event.date, todayStart);
        let timeText: string;
        if (daysDiff > 0) timeText = `(يتبقى ${daysDiff} أيام)`;
        else if (daysDiff < 0) timeText = `(قبل ${Math.abs(daysDiff)} أيام)`;
        else timeText = "(اليوم)";

        items.push({
            id: `pin-${event.key}`,
            date: event.date.toISOString(),
            type: 'pin',
            data: event.data,
            relatedDays: [event.key],
            node: (
                <div className="flex items-center gap-2" dir="rtl">
                    <span className="bg-accent/50 text-foreground font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                         <Pin className="h-4 w-4 text-red-500 fill-red-500" />
                        <span>يوم مثبت</span>
                    </span>
                    <span>
                       {format(event.date, 'eeee, d MMMM yyyy', { locale: arSA })} {timeText}
                    </span>
                </div>
            )
        });
    });

    noteEvents.sort(eventSorter).forEach(event => {
        const daysDiff = differenceInDays(event.date, todayStart);
        let timeText: string;
        if (daysDiff > 0) timeText = `(يتبقى ${daysDiff} أيام)`;
        else if (daysDiff < 0) timeText = `(قبل ${Math.abs(daysDiff)} أيام)`;
        else timeText = "(اليوم)";

        items.push({
            id: `note-${event.key}`,
            date: event.date.toISOString(),
            type: 'note',
            data: event.data,
            relatedDays: [event.key],
            node: (
                <div className="flex items-center gap-2" dir="rtl">
                    <span className="bg-accent/50 text-foreground font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                        <span>ملاحظة:</span>
                    </span>
                    <span className="font-semibold text-yellow-400 mx-1">"{event.data.title}"</span>
                    <span>ليوم {format(event.date, 'd MMMM yyyy', { locale: arSA })} {timeText}</span>
                </div>
            )
        });
    });

    if (items.length === 0) {
        items.push({
            id: 'welcome',
            date: today.toISOString(),
            type: 'info',
            node: <span key="welcome">مرحباً بك في مخططك! قم بتثبيت يوم أو أضف ملاحظة لعرضها هنا.</span>
        });
    }
    
    // Sort all collected items by date proximity
    items.sort((a, b) => {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        const diffA = Math.abs(differenceInDays(dateA, todayStart));
        const diffB = Math.abs(differenceInDays(dateB, todayStart));
        
        const isFutureA = isAfter(dateA, todayStart) || isSameDay(dateA, todayStart);
        const isFutureB = isAfter(dateB, todayStart) || isSameDay(dateB, todayStart);

        if (isFutureA && !isFutureB) return -1;
        if (!isFutureA && isFutureB) return 1;

        if (isFutureA && isFutureB) { // Both future
            return differenceInDays(dateA, todayStart) - differenceInDays(dateB, todayStart);
        } else { // Both past
            return differenceInDays(dateB, todayStart) - differenceInDays(dateA, todayStart);
        }
    });

    return items;
};
