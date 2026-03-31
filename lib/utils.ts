
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getDay, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const generateMonthMatrix = (year: number, month: number, startDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0): (Date | null)[][] => {
  const date = new Date(year, month);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfMonth = getDay(monthStart);

  let paddingDaysCount = (firstDayOfMonth - startDayOfWeek + 7) % 7;
  
  const paddingDays: (Date | null)[] = Array(paddingDaysCount).fill(null);

  const days = [...paddingDays, ...daysInMonth];

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  
  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek && lastWeek.length < 7) {
    const remaining = 7 - lastWeek.length;
    lastWeek.push(...Array(remaining).fill(null));
  }
  
  const totalCells = weeks.flat().length;
  if (totalCells < 42) { // Ensure 6 rows for consistent layout
    const extraCells = 42 - totalCells;
    if (weeks[weeks.length-1].length < 7) {
      const lastWeekFill = 7 - weeks[weeks.length-1].length;
      weeks[weeks.length-1].push(...Array(lastWeekFill).fill(null));
      const remainingCells = extraCells - lastWeekFill;
      if (remainingCells > 0) {
        weeks.push(Array(7).fill(null));
      }
    } else {
        weeks.push(Array(7).fill(null));
    }
  }


  return weeks;
}

export const formatDateKey = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// A simple way to generate a UUID on the client side.
// Note: This is not a true UUID, but it's sufficient for this local-only app.
// For production apps with databases, use a proper UUID library.
export const uuidv4 = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
