import type { QualifyingScoresConfig, ChampionshipType } from '../stores/hubStore';
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
