import { describe, it, expect } from 'vitest';
import { getQualifyingLevels, getQualifyingThresholds, hasQualifyingScoresConfigured } from './qualifyingScores';
import type { QualifyingScoresConfig } from '../types';

const mockQualifyingScores: QualifyingScoresConfig = {
    Female: {
        'Level 10': {
            all_around: { state: 32.0, regional: 34.0, national: 36.0 },
            individual_event: { state: 8.5, regional: 8.75, national: 9.0 }
        },
        'Level 9': {
            all_around: { state: 33.0, regional: 35.0 },
            individual_event: { state: 8.0, regional: 8.5 }
        }
    },
    Male: {
        'Level 10': {
            all_around: { state: 78.0, regional: 80.0, national: 82.0 },
            individual_event: { state: 12.5, regional: 13.0, national: 13.5 }
        }
    }
};

describe('getQualifyingLevels', () => {
    describe('championship type filtering', () => {
        it('returns empty array for national championships', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'national'
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for unsanctioned meets', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'unsanctioned'
            );
            expect(result).toEqual([]);
        });
    });

    describe('regular meets (null championship type)', () => {
        it('returns state badge when score meets state threshold', () => {
            const result = getQualifyingLevels(
                33.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual(['state']);
        });

        it('returns empty array when score is below state threshold', () => {
            const result = getQualifyingLevels(
                31.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns state badge for individual event when score meets threshold', () => {
            const result = getQualifyingLevels(
                8.6, 'Level 10', 'Female', 'individual_event',
                mockQualifyingScores, null
            );
            expect(result).toEqual(['state']);
        });
    });

    describe('state championships', () => {
        it('returns regional badge when score meets regional threshold', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'state'
            );
            expect(result).toEqual(['regional']);
        });

        it('returns empty array when score is below regional threshold', () => {
            const result = getQualifyingLevels(
                33.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'state'
            );
            expect(result).toEqual([]);
        });
    });

    describe('regional championships', () => {
        it('returns national badge when score meets national threshold', () => {
            const result = getQualifyingLevels(
                37.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'regional'
            );
            expect(result).toEqual(['national']);
        });

        it('returns empty array when score is below national threshold', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, 'regional'
            );
            expect(result).toEqual([]);
        });

        it('returns empty array when national threshold is not configured', () => {
            const result = getQualifyingLevels(
                40.0, 'Level 9', 'Female', 'all_around',
                mockQualifyingScores, 'regional'
            );
            expect(result).toEqual([]);
        });
    });

    describe('edge cases', () => {
        it('returns empty array for null score', () => {
            const result = getQualifyingLevels(
                null, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for undefined score', () => {
            const result = getQualifyingLevels(
                undefined, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for null level', () => {
            const result = getQualifyingLevels(
                35.0, null, 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for null gender', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', null, 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for undefined config', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 10', 'Female', 'all_around',
                undefined, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for unconfigured level', () => {
            const result = getQualifyingLevels(
                35.0, 'Level 8', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual([]);
        });

        it('returns empty array for unconfigured gender', () => {
            const configWithoutMale: QualifyingScoresConfig = {
                Female: mockQualifyingScores.Female
            };
            const result = getQualifyingLevels(
                80.0, 'Level 10', 'Male', 'all_around',
                configWithoutMale, null
            );
            expect(result).toEqual([]);
        });

        it('works for male gymnasts', () => {
            const result = getQualifyingLevels(
                79.0, 'Level 10', 'Male', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual(['state']);
        });

        it('returns badge when score exactly meets threshold', () => {
            const result = getQualifyingLevels(
                32.0, 'Level 10', 'Female', 'all_around',
                mockQualifyingScores, null
            );
            expect(result).toEqual(['state']);
        });
    });
});

describe('getQualifyingThresholds', () => {
    it('returns thresholds for valid level and gender', () => {
        const result = getQualifyingThresholds('Level 10', 'Female', mockQualifyingScores);
        expect(result).toEqual({
            all_around: { state: 32.0, regional: 34.0, national: 36.0 },
            individual_event: { state: 8.5, regional: 8.75, national: 9.0 }
        });
    });

    it('returns null for null level', () => {
        const result = getQualifyingThresholds(null, 'Female', mockQualifyingScores);
        expect(result).toBeNull();
    });

    it('returns null for null gender', () => {
        const result = getQualifyingThresholds('Level 10', null, mockQualifyingScores);
        expect(result).toBeNull();
    });

    it('returns null for undefined config', () => {
        const result = getQualifyingThresholds('Level 10', 'Female', undefined);
        expect(result).toBeNull();
    });

    it('returns null for unconfigured level', () => {
        const result = getQualifyingThresholds('Level 8', 'Female', mockQualifyingScores);
        expect(result).toBeNull();
    });
});

describe('hasQualifyingScoresConfigured', () => {
    it('returns true when qualifying scores are configured', () => {
        const result = hasQualifyingScoresConfigured(mockQualifyingScores);
        expect(result).toBe(true);
    });

    it('returns false for undefined config', () => {
        const result = hasQualifyingScoresConfigured(undefined);
        expect(result).toBe(false);
    });

    it('returns false for empty config', () => {
        const result = hasQualifyingScoresConfigured({});
        expect(result).toBe(false);
    });

    it('returns false for config with empty gender', () => {
        const result = hasQualifyingScoresConfigured({ Female: {} });
        expect(result).toBe(false);
    });

    it('returns false for config with empty level', () => {
        const result = hasQualifyingScoresConfigured({
            Female: { 'Level 10': {} }
        });
        expect(result).toBe(false);
    });

    it('returns true when only state threshold is configured', () => {
        const result = hasQualifyingScoresConfigured({
            Female: {
                'Level 10': {
                    all_around: { state: 32.0 }
                }
            }
        });
        expect(result).toBe(true);
    });

    it('returns true when only individual_event is configured', () => {
        const result = hasQualifyingScoresConfigured({
            Male: {
                'Level 10': {
                    individual_event: { regional: 13.0 }
                }
            }
        });
        expect(result).toBe(true);
    });
});
