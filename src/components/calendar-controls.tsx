
'use client';

import * as React from 'react';
import { format, getYear, getMonth } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CalendarControlsProps = {
    viewDate: Date;
    isFullYearView: boolean;
    manualYear: string;
    setManualYear: (year: string) => void;
    handleYearSelect: (year: string) => void;
    handleMonthSelect: (monthIndex: number) => void;
    handleReturnToCurrent: () => void;
    scheduleInitialDate: Date;
};

export function CalendarControls({
    viewDate,
    isFullYearView,
    manualYear,
    setManualYear,
    handleYearSelect,
    handleMonthSelect,
    handleReturnToCurrent,
    scheduleInitialDate,
}: CalendarControlsProps) {
    const [isDatePopoverOpen, setIsDatePopoverOpen] = React.useState(false);

    React.useEffect(() => {
        setManualYear(String(getYear(viewDate)));
    }, [viewDate, setManualYear]);

    const getDisplayYearText = () => {
        if (!viewDate) return '';
        let startYear, endYear;

        if (isFullYearView) {
            startYear = getYear(viewDate);
            endYear = startYear;
        } else {
            const startMonthIndex = getMonth(scheduleInitialDate);
            const startYearVal = getYear(scheduleInitialDate);
            const endMonthDate = new Date(startYearVal, startMonthIndex + 11, 1);
            
            startYear = startYearVal;
            endYear = getYear(endMonthDate);
        }

        const currentActualYear = getYear(new Date());

        const startYearFormatted = format(new Date(startYear, 0, 1), 'yyyy', { locale: arSA });
        const isStartFuture = startYear > currentActualYear;

        if (startYear === endYear) {
            return <span className={cn(isStartFuture && "text-destructive")}>{startYearFormatted}</span>;
        }

        const endYearFormatted = format(new Date(endYear, 0, 1), 'yyyy', { locale: arSA });
        const isEndFuture = endYear > currentActualYear;

        return (
            <>
                <span className={cn(isEndFuture && "text-destructive")}>{endYearFormatted}</span>
                <span className="mx-2">-</span>
                <span className={cn(isStartFuture && "text-destructive")}>{startYearFormatted}</span>
            </>
        );
    };

    return (
        <div className="mx-auto flex w-full items-center justify-center gap-2 px-2 pb-3 sm:gap-4 sm:px-0">
            <div className="flex-grow flex justify-center">
                <div className="flex items-center gap-2 rounded-md border bg-accent/50 p-2">
                    <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => handleYearSelect(String(parseInt(manualYear, 10) - 1))}><ChevronRight className="h-6 w-6" /></Button>

                    <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-12 px-6 text-2xl font-bold">
                                {getDisplayYearText()}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" dir="rtl">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">تغيير العرض</h4>
                                    <p className="text-sm text-muted-foreground">
                                        اختر السنة والشهر لعرض التقويم.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleYearSelect(String(parseInt(manualYear, 10) - 1))}><ChevronRight className="h-4 w-4" /></Button>
                                        <Input
                                            type="number"
                                            value={manualYear}
                                            onChange={(e) => setManualYear(e.target.value)}
                                            onBlur={(e) => handleYearSelect(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleYearSelect(manualYear); }}
                                            className="h-9 text-center font-bold"
                                        />
                                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleYearSelect(String(parseInt(manualYear, 10) + 1))}><ChevronLeft className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Array.from({ length: 12 }).map((_, monthIndex) => (
                                            <Button
                                                key={monthIndex}
                                                variant={getMonth(viewDate) === monthIndex && isFullYearView ? "default" : "outline"}
                                                onClick={() => {
                                                    handleMonthSelect(monthIndex);
                                                    setIsDatePopoverOpen(false);
                                                }}
                                            >
                                                {format(new Date(2000, monthIndex, 1), 'MMM', { locale: arSA })}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => handleYearSelect(String(parseInt(manualYear, 10) + 1))}><ChevronLeft className="h-6 w-6" /></Button>

                    {isFullYearView && (
                        <Button variant="ghost" size="icon" onClick={handleReturnToCurrent} className="h-12 w-12 mr-1">
                            <Undo2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
