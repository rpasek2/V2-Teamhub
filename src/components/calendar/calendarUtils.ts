import { format, getDay } from 'date-fns';

// Holiday definitions with emoji icons
export interface Holiday {
    name: string;
    emoji: string;
    bgColor: string;
    textColor: string;
}

// Get nth weekday of month (e.g., 4th Thursday)
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekday = getDay(firstOfMonth);
    let dayOffset = weekday - firstWeekday;
    if (dayOffset < 0) dayOffset += 7;
    return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
}

// Get last weekday of month (e.g., last Monday)
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
    const lastOfMonth = new Date(year, month + 1, 0);
    const lastDay = lastOfMonth.getDate();
    const lastWeekday = getDay(lastOfMonth);
    let dayOffset = lastWeekday - weekday;
    if (dayOffset < 0) dayOffset += 7;
    return new Date(year, month, lastDay - dayOffset);
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

// Get all US holidays for a given year
function getUSHolidays(year: number): Map<string, Holiday> {
    const holidays = new Map<string, Holiday>();

    // Helper to add holiday
    const addHoliday = (date: Date, name: string, emoji: string, bgColor: string, textColor: string) => {
        const key = format(date, 'yyyy-MM-dd');
        holidays.set(key, { name, emoji, bgColor, textColor });
    };

    // Fixed date holidays - light theme compatible
    addHoliday(new Date(year, 0, 1), "New Year's Day", String.fromCodePoint(0x1F389), 'bg-yellow-50', 'text-yellow-700');
    addHoliday(new Date(year, 1, 14), "Valentine's Day", String.fromCodePoint(0x1F495), 'bg-pink-50', 'text-pink-700');
    addHoliday(new Date(year, 2, 17), "St. Patrick's Day", String.fromCodePoint(0x2618, 0xFE0F), 'bg-emerald-50', 'text-emerald-700');
    addHoliday(new Date(year, 6, 4), "Independence Day", String.fromCodePoint(0x1F1FA, 0x1F1F8), 'bg-blue-50', 'text-blue-700');
    addHoliday(new Date(year, 9, 31), "Halloween", String.fromCodePoint(0x1F383), 'bg-orange-50', 'text-orange-700');
    addHoliday(new Date(year, 10, 11), "Veterans Day", String.fromCodePoint(0x1F396, 0xFE0F), 'bg-red-50', 'text-red-700');
    addHoliday(new Date(year, 11, 25), "Christmas Day", String.fromCodePoint(0x1F384), 'bg-red-50', 'text-red-700');
    addHoliday(new Date(year, 11, 31), "New Year's Eve", String.fromCodePoint(0x1F973), 'bg-purple-50', 'text-purple-700');
    addHoliday(new Date(year, 11, 24), "Christmas Eve", String.fromCodePoint(0x1F385), 'bg-red-50', 'text-red-700');

    // Floating holidays
    addHoliday(getNthWeekdayOfMonth(year, 0, 1, 3), "MLK Jr. Day", String.fromCodePoint(0x270A, 0x1F3FF), 'bg-slate-100', 'text-slate-700');
    addHoliday(getNthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day", String.fromCodePoint(0x1F3DB, 0xFE0F), 'bg-blue-50', 'text-blue-700');
    addHoliday(getNthWeekdayOfMonth(year, 4, 0, 2), "Mother's Day", String.fromCodePoint(0x1F490), 'bg-pink-50', 'text-pink-700');
    addHoliday(getLastWeekdayOfMonth(year, 4, 1), "Memorial Day", String.fromCodePoint(0x1F1FA, 0x1F1F8), 'bg-red-50', 'text-red-700');
    addHoliday(getNthWeekdayOfMonth(year, 5, 0, 3), "Father's Day", String.fromCodePoint(0x1F454), 'bg-blue-50', 'text-blue-700');
    addHoliday(getNthWeekdayOfMonth(year, 8, 1, 1), "Labor Day", String.fromCodePoint(0x2692, 0xFE0F), 'bg-amber-50', 'text-amber-700');
    addHoliday(getNthWeekdayOfMonth(year, 9, 1, 2), "Columbus Day", String.fromCodePoint(0x1F9ED), 'bg-indigo-50', 'text-indigo-700');
    addHoliday(getNthWeekdayOfMonth(year, 10, 4, 4), "Thanksgiving", String.fromCodePoint(0x1F983), 'bg-orange-50', 'text-orange-700');

    // Easter (calculated)
    const easter = getEasterSunday(year);
    addHoliday(easter, "Easter Sunday", String.fromCodePoint(0x1F430), 'bg-pink-50', 'text-pink-700');

    // Juneteenth
    addHoliday(new Date(year, 5, 19), "Juneteenth", String.fromCodePoint(0x270A, 0x1F3FF), 'bg-red-50', 'text-red-700');

    return holidays;
}

// Pre-compute holidays for a reasonable range of years (module-level constant)
// This avoids recalculating holidays on every currentDate change
export const ALL_HOLIDAYS_MAP = new Map<string, Holiday>();
for (let year = 2020; year <= 2035; year++) {
    const yearHolidays = getUSHolidays(year);
    yearHolidays.forEach((holiday, key) => ALL_HOLIDAYS_MAP.set(key, holiday));
}

export const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    practice: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    competition: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    mentorship: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    meeting: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    social: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    private_lesson: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
    camp: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    clinic: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    fundraiser: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    other: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' }
};

// Birthday type for calendar display
export interface Birthday {
    id: string;
    name: string;
    date: string; // MM-DD format for matching
    fullDate: string; // Original DOB
}

export function getEventColors(type: string) {
    return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
}
