import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BarChart3, Check } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';

interface PollSettings {
  multipleChoice?: boolean;
  allowChangeVote?: boolean;
  showResultsBeforeVote?: boolean;
}

interface PollDisplayProps {
  postId: string;
  question: string;
  options: string[];
  settings: PollSettings;
  currentUserId: string;
}

interface PollResponse {
  id: string;
  post_id: string;
  user_id: string;
  option_indices: number[];
}

export function PollDisplay({ postId, question, options, settings, currentUserId }: PollDisplayProps) {
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [userResponse, setUserResponse] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [postId]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('poll_responses')
        .select('*')
        .eq('post_id', postId);

      if (error) throw error;

      setResponses(data || []);

      // Check if current user has voted
      const myResponse = data?.find((r) => r.user_id === currentUserId);
      if (myResponse) {
        setUserResponse(myResponse.option_indices);
        setHasVoted(true);
      }
    } catch (err) {
      console.error('Error fetching poll responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!currentUserId || voting) return;

    setVoting(true);
    try {
      let newSelection: number[];

      if (settings.multipleChoice) {
        // Toggle selection for multiple choice
        if (userResponse.includes(optionIndex)) {
          newSelection = userResponse.filter((i) => i !== optionIndex);
        } else {
          newSelection = [...userResponse, optionIndex];
        }
      } else {
        // Single choice - replace selection
        newSelection = [optionIndex];
      }

      if (hasVoted) {
        if (!settings.allowChangeVote) {
          setVoting(false);
          return; // Can't change vote
        }
        // Update existing vote
        const { error } = await supabase
          .from('poll_responses')
          .update({ option_indices: newSelection, updated_at: new Date().toISOString() })
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        if (error) throw error;

        // Update responses optimistically
        setResponses((prev) =>
          prev.map((r) =>
            r.user_id === currentUserId ? { ...r, option_indices: newSelection } : r
          )
        );
        setUserResponse(newSelection);
      } else {
        // Insert new vote
        const { error } = await supabase.from('poll_responses').insert({
          post_id: postId,
          user_id: currentUserId,
          option_indices: newSelection,
        });

        if (error) throw error;

        // Optimistically add to state
        setResponses((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            post_id: postId,
            user_id: currentUserId,
            option_indices: newSelection,
          },
        ]);
        setUserResponse(newSelection);
        setHasVoted(true);
      }
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setVoting(false);
    }
  };

  // Calculate vote counts
  const voteCounts = options.map((_, index) =>
    responses.filter((r) => r.option_indices.includes(index)).length
  );
  const totalVotes = responses.length;

  const showResults = settings.showResultsBeforeVote || hasVoted;
  const canVote = !hasVoted || settings.allowChangeVote;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.purple[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BarChart3 size={14} color={colors.purple[600]} />
        <Text style={styles.headerTitle}>Poll</Text>
        <Text style={styles.voteCount}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.question}>{question}</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map((option, index) => {
            const voteCount = voteCounts[index];
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userResponse.includes(index);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  !canVote && styles.optionButtonDisabled,
                ]}
                onPress={() => canVote && handleVote(index)}
                disabled={!canVote || voting}
                activeOpacity={canVote ? 0.7 : 1}
              >
                {/* Progress bar background */}
                {showResults && (
                  <View
                    style={[
                      styles.progressBar,
                      isSelected ? styles.progressBarSelected : styles.progressBarDefault,
                      { width: `${percentage}%` },
                    ]}
                  />
                )}

                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Check size={10} color={colors.white} />}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </View>
                  {showResults && (
                    <Text
                      style={[
                        styles.percentageText,
                        isSelected && styles.percentageTextSelected,
                      ]}
                    >
                      {percentage}%
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Settings info */}
        <View style={styles.settingsContainer}>
          {settings.multipleChoice && (
            <View style={styles.settingBadge}>
              <Text style={styles.settingText}>Multiple choice</Text>
            </View>
          )}
          {!settings.allowChangeVote && hasVoted && (
            <View style={styles.settingBadge}>
              <Text style={styles.settingText}>Vote cannot be changed</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.purple[200],
    backgroundColor: colors.purple[50],
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.purple[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.purple[200],
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.purple[700],
    flex: 1,
  },
  voteCount: {
    fontSize: 12,
    color: colors.purple[500],
  },
  content: {
    padding: 12,
  },
  question: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    position: 'relative',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  optionButtonSelected: {
    borderColor: colors.purple[400],
    backgroundColor: colors.purple[50],
  },
  optionButtonDisabled: {
    opacity: 0.9,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  progressBarDefault: {
    backgroundColor: colors.slate[100],
  },
  progressBarSelected: {
    backgroundColor: colors.purple[200],
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.purple[500],
    backgroundColor: colors.purple[500],
  },
  optionText: {
    fontSize: 14,
    color: colors.slate[700],
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '500',
    color: colors.purple[900],
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[500],
  },
  percentageTextSelected: {
    color: colors.purple[700],
  },
  settingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  settingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.purple[100],
    borderRadius: 10,
  },
  settingText: {
    fontSize: 11,
    color: colors.purple[600],
  },
});
