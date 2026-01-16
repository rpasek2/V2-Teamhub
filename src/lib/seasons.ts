import { supabase } from './supabase';
import type { Season, SeasonConfig } from '../types';

// Default season configuration (August 1)
export const DEFAULT_SEASON_CONFIG: SeasonConfig = {
    startMonth: 8,  // August
    startDay: 1,
};

/**
 * Generate a season name in "YYYY-YYYY" format
 */
export function generateSeasonName(startYear: number): string {
    return `${startYear}-${startYear + 1}`;
}

/**
 * Calculate season start and end dates for a given year and config
 */
export function calculateSeasonDates(
    startYear: number,
    config: SeasonConfig = DEFAULT_SEASON_CONFIG
): { startDate: Date; endDate: Date } {
    const startDate = new Date(startYear, config.startMonth - 1, config.startDay);
    // End date is the day before the next season starts
    const endDate = new Date(startYear + 1, config.startMonth - 1, config.startDay - 1);
    return { startDate, endDate };
}

/**
 * Determine which season year a given date falls into
 */
export function getSeasonYearForDate(
    date: Date,
    config: SeasonConfig = DEFAULT_SEASON_CONFIG
): number {
    const year = date.getFullYear();
    const seasonStartThisYear = new Date(year, config.startMonth - 1, config.startDay);

    // If we're before this year's season start, we're in the previous season
    if (date < seasonStartThisYear) {
        return year - 1;
    }
    return year;
}

/**
 * Get the current season name based on today's date
 */
export function getCurrentSeasonName(config: SeasonConfig = DEFAULT_SEASON_CONFIG): string {
    const seasonYear = getSeasonYearForDate(new Date(), config);
    return generateSeasonName(seasonYear);
}

/**
 * Format a date as YYYY-MM-DD for database storage
 */
export function formatDateForDB(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Get or create the current season for a hub
 */
export async function getOrCreateCurrentSeason(
    hubId: string,
    config: SeasonConfig = DEFAULT_SEASON_CONFIG
): Promise<Season | null> {
    const seasonName = getCurrentSeasonName(config);

    // First, try to find existing season
    const { data: existingSeason, error: fetchError } = await supabase
        .from('seasons')
        .select('*')
        .eq('hub_id', hubId)
        .eq('name', seasonName)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching season:', fetchError);
        return null;
    }

    if (existingSeason) {
        return existingSeason;
    }

    // Create the season if it doesn't exist
    const seasonYear = getSeasonYearForDate(new Date(), config);
    const { startDate, endDate } = calculateSeasonDates(seasonYear, config);

    const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert({
            hub_id: hubId,
            name: seasonName,
            start_date: formatDateForDB(startDate),
            end_date: formatDateForDB(endDate),
            is_current: true,
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating season:', createError);
        return null;
    }

    // Mark other seasons as not current
    await supabase
        .from('seasons')
        .update({ is_current: false })
        .eq('hub_id', hubId)
        .neq('id', newSeason.id);

    return newSeason;
}

/**
 * Get season for a specific date (for assigning competitions)
 */
export async function getOrCreateSeasonForDate(
    hubId: string,
    date: Date,
    config: SeasonConfig = DEFAULT_SEASON_CONFIG
): Promise<Season | null> {
    const seasonYear = getSeasonYearForDate(date, config);
    const seasonName = generateSeasonName(seasonYear);

    // First, try to find existing season
    const { data: existingSeason, error: fetchError } = await supabase
        .from('seasons')
        .select('*')
        .eq('hub_id', hubId)
        .eq('name', seasonName)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching season:', fetchError);
        return null;
    }

    if (existingSeason) {
        return existingSeason;
    }

    // Create the season if it doesn't exist
    const { startDate, endDate } = calculateSeasonDates(seasonYear, config);
    const currentSeasonName = getCurrentSeasonName(config);

    const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert({
            hub_id: hubId,
            name: seasonName,
            start_date: formatDateForDB(startDate),
            end_date: formatDateForDB(endDate),
            is_current: seasonName === currentSeasonName,
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating season:', createError);
        return null;
    }

    return newSeason;
}

/**
 * Fetch all seasons for a hub, ordered by most recent first
 */
export async function fetchSeasonsForHub(hubId: string): Promise<Season[]> {
    const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('hub_id', hubId)
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error fetching seasons:', error);
        return [];
    }

    return data || [];
}

/**
 * Update which season is marked as current
 */
export async function setCurrentSeason(
    hubId: string,
    seasonId: string
): Promise<boolean> {
    // First, set all seasons to not current
    const { error: clearError } = await supabase
        .from('seasons')
        .update({ is_current: false })
        .eq('hub_id', hubId);

    if (clearError) {
        console.error('Error clearing current season:', clearError);
        return false;
    }

    // Then set the specified season as current
    const { error: setError } = await supabase
        .from('seasons')
        .update({ is_current: true })
        .eq('id', seasonId);

    if (setError) {
        console.error('Error setting current season:', setError);
        return false;
    }

    return true;
}

/**
 * Create a new season manually
 */
export async function createSeason(
    hubId: string,
    name: string,
    startDate: Date,
    endDate: Date,
    isCurrent: boolean = false
): Promise<Season | null> {
    // If this is to be current, clear other current flags first
    if (isCurrent) {
        await supabase
            .from('seasons')
            .update({ is_current: false })
            .eq('hub_id', hubId);
    }

    const { data, error } = await supabase
        .from('seasons')
        .insert({
            hub_id: hubId,
            name,
            start_date: formatDateForDB(startDate),
            end_date: formatDateForDB(endDate),
            is_current: isCurrent,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating season:', error);
        return null;
    }

    return data;
}

/**
 * Get month name for display
 */
export function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
}
