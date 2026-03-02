import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { ChevronDown, Calendar, Check } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../services/supabase';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  hub_id: string;
}

interface SeasonPickerProps {
  hubId: string;
  selectedSeasonId: string | null;
  onSeasonChange: (seasonId: string | null, season: Season | null) => void;
  showAllOption?: boolean;
  label?: string;
}

export function SeasonPicker({
  hubId,
  selectedSeasonId,
  onSeasonChange,
  showAllOption = true,
  label = 'Season',
}: SeasonPickerProps) {
  const { t } = useTheme();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchSeasons();
  }, [hubId]);

  const fetchSeasons = async () => {
    if (!hubId) return;

    try {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name, start_date, end_date, hub_id')
        .eq('hub_id', hubId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      setSeasons(data || []);

      // Auto-select current season if none selected
      if (!selectedSeasonId && data && data.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const currentSeason = data.find((s: Season) => {
          const startDate = s.start_date;
          const endDate = s.end_date || '9999-12-31';
          return today >= startDate && today <= endDate;
        });

        if (currentSeason) {
          onSeasonChange(currentSeason.id, currentSeason);
        } else {
          // Default to most recent season
          onSeasonChange(data[0].id, data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

  const handleSelectSeason = (season: Season | null) => {
    onSeasonChange(season?.id || null, season);
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.brand[600]} />
      </View>
    );
  }

  if (seasons.length === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, { borderColor: `${t.primary}40`, backgroundColor: `${t.primary}10` }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Calendar size={16} color={t.primary} />
        <Text style={[styles.pickerLabel, { color: t.text }]}>
          {selectedSeason?.name || 'All Seasons'}
        </Text>
        <ChevronDown size={16} color={t.textFaint} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: t.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Select {label}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCloseText, { color: t.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={showAllOption ? [null, ...seasons] : seasons}
              keyExtractor={(item) => item?.id || 'all'}
              renderItem={({ item }) => {
                const isSelected = item?.id === selectedSeasonId || (!item && !selectedSeasonId);
                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && { backgroundColor: `${t.primary}10` }]}
                    onPress={() => handleSelectSeason(item)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionText, { color: t.text }, isSelected && { fontWeight: '600', color: t.primary }]}>
                        {item?.name || 'All Seasons'}
                      </Text>
                      {item && (
                        <Text style={[styles.optionDateRange, { color: t.textMuted }]}>
                          {new Date(item.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                          {item.end_date && ` - ${new Date(item.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}`}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Check size={20} color={t.primary} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: t.borderSubtle }]} />}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.brand[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  pickerLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand[600],
  },
  listContent: {
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionItemSelected: {
    backgroundColor: colors.brand[50],
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: colors.slate[900],
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.brand[600],
  },
  optionDateRange: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginHorizontal: 20,
  },
});
