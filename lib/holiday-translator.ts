// Official Holiday Dictionary & Translator specifically tailored for Sultanate of Oman (سلطنة عُمان)
// Based on Royal Decree No. 88/2022 determining official public holidays in the Sultanate of Oman.

export interface HolidayTranslation {
  title: string;
  note: string;
}

export const OMAN_OFFICIAL_HOLIDAYS: Record<string, HolidayTranslation> = {
  // 1. تولي السلطان مقاليد الحكم (11 يناير)
  "accession": {
    title: "إجازة يوم تولي جلالة السلطان مقاليد الحكم",
    note: "عطلة رسمية بمناسبة تولي حضرة صاحب الجلالة السلطان هيثم بن طارق المعظم مقاليد الحكم في 11 يناير"
  },
  "ascension": {
    title: "إجازة يوم تولي جلالة السلطان مقاليد الحكم",
    note: "عطلة رسمية بمناسبة تولي حضرة صاحب الجلالة السلطان هيثم بن طارق المعظم مقاليد الحكم في 11 يناير"
  },
  "sultan": {
    title: "إجازة يوم تولي جلالة السلطان مقاليد الحكم",
    note: "عطلة رسمية بمناسبة تولي حضرة صاحب الجلالة السلطان هيثم بن طارق المعظم مقاليد الحكم في 11 يناير"
  },

  // 2. ذكرى الإسراء والمعراج (27 رجب)
  "isra": {
    title: "إجازة ذكرى الإسراء والمعراج",
    note: "عطلة رسمية بمناسبة ذكرى الإسراء والمعراج الشريفين (27 رجب)"
  },
  "miraj": {
    title: "إجازة ذكرى الإسراء والمعراج",
    note: "عطلة رسمية بمناسبة ذكرى الإسراء والمعراج الشريفين (27 رجب)"
  },

  // 3. عيد الفطر المبارك (29 رمضان إلى 3 شوال)
  "eid al-fitr": {
    title: "إجازة عيد الفطر المبارك",
    note: "عطلة رسمية بمناسبة حلول عيد الفطر المبارك"
  },
  "eid al fitr": {
    title: "إجازة عيد الفطر المبارك",
    note: "عطلة رسمية بمناسبة حلول عيد الفطر المبارك"
  },
  "end of ramadan": {
    title: "إجازة عيد الفطر المبارك",
    note: "عطلة رسمية بمناسبة حلول عيد الفطر المبارك"
  },

  // 4. وقفة عرفات وعيد الأضحى المبارك (9 إلى 12 ذو الحجة)
  "arafat": {
    title: "إجازة وقفة عرفات",
    note: "عطلة رسمية بمناسبة يوم عرفة المبارك"
  },
  "arafa": {
    title: "إجازة وقفة عرفات",
    note: "عطلة رسمية بمناسبة يوم عرفة المبارك"
  },
  "eid al-adha": {
    title: "إجازة عيد الأضحى المبارك",
    note: "عطلة رسمية بمناسبة عيد الأضحى المبارك وأيام التشريق"
  },
  "eid al adha": {
    title: "إجازة عيد الأضحى المبارك",
    note: "عطلة رسمية بمناسبة عيد الأضحى المبارك وأيام التشريق"
  },
  "feast of the sacrifice": {
    title: "إجازة عيد الأضحى المبارك",
    note: "عطلة رسمية بمناسبة عيد الأضحى المبارك وأيام التشريق"
  },

  // 5. رأس السنة الهجرية (غرة محرم)
  "muharram": {
    title: "إجازة رأس السنة الهجرية (غرة محرم)",
    note: "عطلة رسمية بمناسبة غرة محرم وبداية العام الهجري الجديد"
  },
  "al-hijra": {
    title: "إجازة رأس السنة الهجرية (غرة محرم)",
    note: "عطلة رسمية بمناسبة غرة محرم وبداية العام الهجري الجديد"
  },
  "hijri": {
    title: "إجازة رأس السنة الهجرية (غرة محرم)",
    note: "عطلة رسمية بمناسبة غرة محرم وبداية العام الهجري الجديد"
  },
  "islamic new year": {
    title: "إجازة رأس السنة الهجرية (غرة محرم)",
    note: "عطلة رسمية بمناسبة غرة محرم وبداية العام الهجري الجديد"
  },

  // 6. المولد النبوي الشريف (12 ربيع الأول)
  "mawlid": {
    title: "إجازة المولد النبوي الشريف",
    note: "عطلة رسمية بمناسبة ذكرى المولد النبوي الشريف (12 ربيع الأول)"
  },
  "prophet's birthday": {
    title: "إجازة المولد النبوي الشريف",
    note: "عطلة رسمية بمناسبة ذكرى المولد النبوي الشريف (12 ربيع الأول)"
  },
  "milad": {
    title: "إجازة المولد النبوي الشريف",
    note: "عطلة رسمية بمناسبة ذكرى المولد النبوي الشريف (12 ربيع الأول)"
  },

  // 7. العيد الوطني المجيد (18 و19 نوفمبر)
  "national day": {
    title: "إجازة العيد الوطني المجيد",
    note: "عطلة رسمية بمناسبة احتفالات العيد الوطني لسلطنة عُمان (18 و19 نوفمبر)"
  },
};

// Aliases for compatibility
export const HOLIDAY_ARABIC_DICTIONARY = OMAN_OFFICIAL_HOLIDAYS;

// List of invalid / non-official items to explicitly ignore/filter out in Oman
const DISALLOWED_HOLIDAYS = [
  "new year", // رأس السنة الميلادية ليست إجازة رسمية بسلطنة عمان
  "public holiday", // placeholder generic
  "renaissance", // يوم النهضة 23 يوليو أُلغي بالمرسوم السلطاني 88/2022 واستبدل بـ 11 يناير
  "نهضة",
  "النهضة",
  "labor",
  "labour",
  "revolution",
  "throne",
  "commemoration",
  "founding",
  "independence",
  "christmas",
  "easter",
];

/**
 * Validates if an ICS event summary is a genuine official holiday of Sultanate of Oman
 */
export function isOmanOfficialHoliday(summary: string): boolean {
  if (!summary) return false;
  const lower = summary.toLowerCase();

  // Strictly disallow Gregorian New Year in any language or phrasing
  if (
    lower.includes('الميلادية') ||
    lower.includes('الميلادي') ||
    (lower.includes('ميلاد') && !lower.includes('المولد النبوي') && !lower.includes('مولد')) ||
    (lower.includes('new year') && !lower.includes('hijri') && !lower.includes('islamic'))
  ) {
    return false;
  }

  // Exclude non-official or foreign holidays
  for (const disallowed of DISALLOWED_HOLIDAYS) {
    if (lower.includes(disallowed)) {
      // Except if it's "Hijri New Year" or "Islamic New Year"
      if (lower.includes('hijri') || lower.includes('islamic')) {
        continue;
      }
      return false;
    }
  }

  // Check if it matches any authentic Oman official holiday
  for (const key of Object.keys(OMAN_OFFICIAL_HOLIDAYS)) {
    if (lower.includes(key)) {
      return true;
    }
  }

  // Arabic checks
  if (
    lower.includes('اليوم الوطني') ||
    lower.includes('العيد الوطني') ||
    lower.includes('عيد الفطر') ||
    lower.includes('عيد الأضحى') ||
    lower.includes('عرفات') ||
    lower.includes('عرفة') ||
    lower.includes('الإسراء والمعراج') ||
    lower.includes('المولد النبوي') ||
    lower.includes('رأس السنة الهجرية') ||
    lower.includes('الهجري') ||
    lower.includes('تولي السلطان')
  ) {
    return true;
  }

  return false;
}

/**
 * Translates an English/Arabic summary into official Arabic title and note
 */
export function translateHolidaySummary(summary: string): HolidayTranslation {
  if (!summary) {
    return { title: "إجازة رسمية", note: "عطلة رسمية في سلطنة عُمان" };
  }

  const rawLower = summary.toLowerCase();
  // Strictly prevent translating any Gregorian New Year into an official holiday
  if (
    rawLower.includes('الميلادية') ||
    rawLower.includes('الميلادي') ||
    (rawLower.includes('new year') && !rawLower.includes('hijri') && !rawLower.includes('islamic'))
  ) {
    return { title: "إجازة غير معتمدة", note: "" };
  }

  // 1. Remove country prefixes like "Oman: "
  let cleaned = summary.replace(/^[^:]+:\s*/, '');

  // 2. Remove tentative/observed tags
  cleaned = cleaned
    .replace(/\(tentative\)/gi, '')
    .replace(/\[tentative\]/gi, '')
    .replace(/\(observed\)/gi, '')
    .replace(/\(subject to change\)/gi, '')
    .replace(/\*/g, '')
    .trim();

  const lower = cleaned.toLowerCase();

  // 3. Match against Oman official dictionary
  for (const [key, val] of Object.entries(OMAN_OFFICIAL_HOLIDAYS)) {
    if (lower.includes(key)) {
      return val;
    }
  }

  return { title: cleaned || summary, note: "عطلة رسمية في سلطنة عُمان" };
}
