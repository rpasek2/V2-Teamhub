import type { QualifyingScoresConfig, ChampionshipType } from '../types';
import type { QualifyingLevel } from '../components/scores/QualifyingBadge';

/**
 * Determines which qualifying level(s) a score meets based on the championship type.
 *
 * Badge visibility rules by meet type:
 * - Regular meet (null): Show state badges if score meets state threshold
 * - State Championship: Show regional badges if score meets regional threshold
 * - Regional Championship: Show national badges if score meets national threshold
 * - National Championship: No badges shown
 * - Unsanctioned/Invitational: No badges shown (scores don't count for qualifying)
 *
 * @param score - The score to check
 * @param level - The gymnast's level (e.g., "Level 10")
 * @param gender - The gymnast's gender
 * @param scoreType - Whether this is an 'all_around' or 'individual_event' score
 * @param qualifyingScores - The hub's qualifying scores configuration
 * @param championshipType - The competition's championship type
 * @returns Array of qualifying levels the score meets (for the appropriate championship level)
 */
export function getQualifyingLevels(
    score: number | null | undefined,
    level: string | null | undefined,
    gender: 'Male' | 'Female' | null,
    scoreType: 'all_around' | 'individual_event',
    qualifyingScores: QualifyingScoresConfig | undefined,
    championshipType: ChampionshipType
): QualifyingLevel[] {
    // No badges for national championships or unsanctioned meets
    if (championshipType === 'national' || championshipType === 'unsanctioned') {
        return [];
    }

    if (score == null || !level || !gender || !qualifyingScores) {
        return [];
    }

    const genderConfig = qualifyingScores[gender];
    if (!genderConfig) return [];

    const levelConfig = genderConfig[level];
    if (!levelConfig) return [];

    const thresholds = levelConfig[scoreType];
    if (!thresholds) return [];

    const qualifyingLevels: QualifyingLevel[] = [];

    // Determine which threshold to check based on championship type
    if (championshipType === null) {
        // Regular meet: check state qualification
        if (thresholds.state != null && score >= thresholds.state) {
            qualifyingLevels.push('state');
        }
    } else if (championshipType === 'state') {
        // State championship: check regional qualification
        if (thresholds.regional != null && score >= thresholds.regional) {
            qualifyingLevels.push('regional');
        }
    } else if (championshipType === 'regional') {
        // Regional championship: check national qualification
        if (thresholds.national != null && score >= thresholds.national) {
            qualifyingLevels.push('national');
        }
    }

    return qualifyingLevels;
}

/**
 * Gets the qualifying thresholds for a specific level and gender
 */
export function getQualifyingThresholds(
    level: string | null | undefined,
    gender: 'Male' | 'Female' | null,
    qualifyingScores: QualifyingScoresConfig | undefined
) {
    if (!level || !gender || !qualifyingScores) {
        return null;
    }

    const genderConfig = qualifyingScores[gender];
    if (!genderConfig) return null;

    return genderConfig[level] || null;
}

/**
 * Checks if any qualifying scores are configured for a hub
 */
export function hasQualifyingScoresConfigured(
    qualifyingScores: QualifyingScoresConfig | undefined
): boolean {
    if (!qualifyingScores) return false;

    for (const gender of ['Female', 'Male'] as const) {
        const genderConfig = qualifyingScores[gender];
        if (!genderConfig) continue;

        for (const levelConfig of Object.values(genderConfig)) {
            if (levelConfig.all_around?.state != null ||
                levelConfig.all_around?.regional != null ||
                levelConfig.all_around?.national != null ||
                levelConfig.individual_event?.state != null ||
                levelConfig.individual_event?.regional != null ||
                levelConfig.individual_event?.national != null) {
                return true;
            }
        }
    }

    return false;
}
