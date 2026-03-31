


export type DayUnderlyingType = 'work' | 'holiday';

export interface DayTypeDefinition {
  id: string;
  name: string;
  type: DayUnderlyingType;
  days: number;
  color: string;
}

export interface DayData {
  title?: string;
  note?: string;
  pinned?: boolean;
  typeId?: string; // References DayTypeDefinition.id
}

export interface Schedule {
  id: string;
  name: string;
  startDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 for Sunday
  days: { [date: string]: DayData }; // "YYYY-MM-DD" -> DayData
  monthsToShow: number;
  startDate?: string; // YYYY-MM-DD
  monthBackgrounds?: { [monthKey: string]: string }; // "YYYY-MM" -> color
  dayTypes: DayTypeDefinition[];
}

export interface BackgroundColors {
    page: string;
    container: string;
    monthCard: string;
    monthName: string;
    monthNameBackground: string;
    monthNumber: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  colors: BackgroundColors;
}

export type CalendarSource = 'google' | 'officeholidays' | 'custom';

export interface ViewSettings {
    zoomLevel: number;
    gridCols: number;
    backgroundColors: BackgroundColors;
    tickerSpeed: number;
    showTicker: boolean;
    colorPresets: ColorPreset[];
    customHolidayCalendars: { [key: string]: string };
    lastHolidaySource: CalendarSource | null;
    lastHolidayCountry: string | null;
    customHolidayNames: Record<string, string>;
    hiddenHolidays: string[];
    holidayTranslations: Record<string, string>;
    hasSeenRotationTip?: boolean;
}

export interface FullExport {
    schedules: Schedule[];
    viewSettings: ViewSettings;
}

// Represents a theme file for export/import
export interface ThemeFile {
    name: string;
    colors: BackgroundColors;
}

export interface HolidayEvent {
  uid: string;
  date: string;
  originalSummary: string;
  description: string;
}
