import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { parseLocalDate, getEventLabel } from './constants';
import { sharedStyles } from './sharedStyles';
import { SeasonPicker } from '../ui/SeasonPicker';
import type { RecentScore } from './types';

interface Props {
  recentScores: RecentScore[];
  selectedSeasonId: string | null;
  onSeasonChange: (seasonId: string | null) => void;
  hubId: string;
}

export function ScoresTab({
  recentScores,
  selectedSeasonId,
  onSeasonChange,
  hubId,
}: Props) {
  const { t, isDark } = useTheme();

  const filteredScores = selectedSeasonId
    ? recentScores.filter((s) => s.season_id === selectedSeasonId)
    : recentScores;

  // Group scores by competition
  const groupedByCompetition: Record<string, {
    competition_id: string;
    competition_name: string;
    competition_date: string;
    scores: RecentScore[];
  }> = {};

  filteredScores.forEach((score) => {
    if (!groupedByCompetition[score.competition_id]) {
      groupedByCompetition[score.competition_id] = {
        competition_id: score.competition_id,
        competition_name: score.competition_name,
        competition_date: score.competition_date,
        scores: [],
      };
    }
    groupedByCompetition[score.competition_id].scores.push(score);
  });

  // Sort competitions by date (newest first)
  const competitions = Object.values(groupedByCompetition).sort((a, b) => {
    if (!a.competition_date) return 1;
    if (!b.competition_date) return -1;
    return new Date(b.competition_date).getTime() - new Date(a.competition_date).getTime();
  });

  return (
    <View style={sharedStyles.section}>
      {/* Season Picker */}
      <View style={styles.seasonPickerContainer}>
        <SeasonPicker
          hubId={hubId}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={(seasonId) => onSeasonChange(seasonId)}
          showAllOption={true}
          label="Season"
        />
      </View>

      <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Competition Scores</Text>
      {competitions.length > 0 ? (
        competitions.map((comp) => {
          // Calculate All-Around (AA) score
          const aaScore = comp.scores.reduce((sum, s) => sum + s.score, 0);

          return (
            <View key={comp.competition_id} style={[styles.competitionScoreCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.competitionScoreHeader, { borderBottomColor: t.borderSubtle }]}>
                <View style={styles.competitionScoreHeaderLeft}>
                  <Text style={[styles.competitionScoreName, { color: t.text }]}>{comp.competition_name}</Text>
                  {comp.competition_date && (
                    <Text style={[styles.competitionScoreDate, { color: t.textMuted }]}>
                      {format(parseLocalDate(comp.competition_date), 'MMM d, yyyy')}
                    </Text>
                  )}
                </View>
                <View style={[styles.aaScoreContainer, { backgroundColor: `${t.primary}15` }]}>
                  <Text style={[styles.aaScoreLabel, { color: t.primary }]}>AA</Text>
                  <Text style={[styles.aaScoreValue, { color: t.primary }]}>{aaScore.toFixed(3)}</Text>
                </View>
              </View>
              <View style={styles.eventScoresGrid}>
                {comp.scores.map((score) => (
                  <View key={score.id} style={[styles.eventScoreItem, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50] }]}>
                    <Text style={[styles.eventScoreLabel, { color: t.textMuted }]}>{getEventLabel(score.event)}</Text>
                    <Text style={[styles.eventScoreValue, { color: t.text }]}>{score.score.toFixed(3)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })
      ) : (
        <View style={sharedStyles.emptyContainer}>
          <BarChart3 size={48} color={t.textFaint} />
          <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Scores Found</Text>
          <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
            {selectedSeasonId ? 'No scores for this season' : 'No scores recorded yet'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  seasonPickerContainer: {
    marginBottom: 16,
  },
  competitionScoreCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  competitionScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  competitionScoreHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  competitionScoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 2,
  },
  competitionScoreDate: {
    fontSize: 13,
    color: colors.slate[500],
  },
  aaScoreContainer: {
    backgroundColor: colors.brand[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  aaScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand[600],
    marginBottom: 2,
  },
  aaScoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand[700],
  },
  eventScoresGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  eventScoreItem: {
    flex: 1,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  eventScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
    marginBottom: 2,
  },
  eventScoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
});
