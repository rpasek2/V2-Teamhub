import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Music,
  Download,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  CloudDownload,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useOfflineMusicStore } from '../../src/stores/offlineMusicStore';
import { useMusicPlayerStore } from '../../src/stores/musicPlayerStore';

interface FloorMusicGymnast {
  id: string;
  first_name: string;
  last_name: string;
  level: string;
  floor_music_url: string;
  floor_music_name: string | null;
}

interface LevelGroup {
  level: string;
  gymnasts: FloorMusicGymnast[];
}

export default function FloorMusicScreen() {
  const router = useRouter();
  const [gymnasts, setGymnasts] = useState<FloorMusicGymnast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());
  const currentHub = useHubStore((state) => state.currentHub);
  const isStaff = useHubStore((state) => state.isStaff);
  const levels = currentHub?.settings?.levels || [];

  const offlineStore = useOfflineMusicStore();
  const { activeDownloads, bulkDownloading, downloads } = offlineStore;
  const playerStore = useMusicPlayerStore();
  const playingId = playerStore.track?.gymnastId ?? null;

  // Auth guard - staff only
  useEffect(() => {
    if (!isStaff()) {
      router.back();
    }
  }, [isStaff]);

  useEffect(() => {
    if (currentHub?.id) offlineStore.initialize(currentHub.id);
  }, [currentHub?.id]);

  useEffect(() => {
    fetchFloorMusic();
  }, [currentHub?.id]);

  const fetchFloorMusic = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('gymnast_profiles')
        .select('id, first_name, last_name, level, floor_music_url, floor_music_name')
        .eq('hub_id', currentHub.id)
        .not('floor_music_url', 'is', null)
        .order('level')
        .order('last_name');

      if (error) throw error;
      setGymnasts((data || []) as FloorMusicGymnast[]);
    } catch (err) {
      console.error('Error fetching floor music:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    let result = gymnasts;
    if (selectedLevel) {
      result = result.filter((g) => g.level === selectedLevel);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((g) =>
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [gymnasts, searchTerm, selectedLevel]);

  const levelsWithMusic = useMemo(() => {
    const set = new Set(gymnasts.map((g) => g.level));
    return levels.filter((l) => set.has(l));
  }, [gymnasts, levels]);

  const groupedByLevel = useMemo((): LevelGroup[] => {
    const groups: Record<string, FloorMusicGymnast[]> = {};
    for (const level of levels) {
      groups[level] = [];
    }
    for (const g of filtered) {
      if (!groups[g.level]) groups[g.level] = [];
      groups[g.level].push(g);
    }
    return Object.entries(groups)
      .filter(([, v]) => v.length > 0)
      .map(([level, gymnasts]) => ({ level, gymnasts }));
  }, [filtered, levels]);

  const toggleLevel = (level: string) => {
    setCollapsedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const handlePlay = (gymnast: FloorMusicGymnast) => {
    const localUri = offlineStore.getLocalUri(gymnast.id, gymnast.floor_music_url);
    const uri = localUri || gymnast.floor_music_url;
    playerStore.play({
      gymnastId: gymnast.id,
      gymnastName: `${gymnast.first_name} ${gymnast.last_name}`,
      fileName: gymnast.floor_music_name || 'Floor Music',
      uri,
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFloorMusic();
  };

  const renderGymnast = useCallback(
    (gymnast: FloorMusicGymnast) => {
      const isPlaying = playingId === gymnast.id;
      const downloaded = offlineStore.isDownloaded(gymnast.id, gymnast.floor_music_url);
      const progress = activeDownloads[gymnast.id];
      const isDownloading = !!progress;

      return (
        <View key={gymnast.id} style={styles.gymnastRow}>
          <View style={styles.gymnastInfo}>
            <View style={styles.gymnastNameRow}>
              <Text style={styles.gymnastName}>
                {gymnast.first_name} {gymnast.last_name}
              </Text>
              {downloaded && (
                <View style={styles.downloadedBadge}>
                  <Check size={10} color={colors.success[600]} />
                </View>
              )}
            </View>
            <Text style={styles.musicFileName} numberOfLines={1}>
              {gymnast.floor_music_name || 'Floor Music'}
            </Text>
          </View>
          <View style={styles.gymnastActions}>
            <TouchableOpacity
              style={[styles.actionBtn, isPlaying && styles.actionBtnActive]}
              onPress={() => handlePlay(gymnast)}
            >
              {isPlaying ? (
                <Square size={16} color={colors.brand[600]} />
              ) : (
                <Play size={16} color={colors.brand[600]} />
              )}
            </TouchableOpacity>
            {isDownloading ? (
              <View style={[styles.actionBtn, styles.downloadingBtn]}>
                <ActivityIndicator size="small" color={colors.brand[600]} />
              </View>
            ) : downloaded ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.downloadedBtn]}
                onPress={() => {
                  Alert.alert(
                    'Remove Download',
                    `Remove offline copy of ${gymnast.first_name}'s floor music?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => offlineStore.removeFile(gymnast.id) },
                    ]
                  );
                }}
              >
                <Check size={16} color={colors.success[600]} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => offlineStore.downloadFile(gymnast.id, gymnast.floor_music_url, gymnast.floor_music_name || 'floor-music')}
              >
                <Download size={16} color={colors.slate[600]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [playingId, activeDownloads, downloads]
  );

  const renderLevelGroup = useCallback(({ item }: { item: LevelGroup }) => {
    const isCollapsed = collapsedLevels.has(item.level);
    return (
      <View style={styles.levelGroup}>
        <TouchableOpacity
          style={styles.levelHeader}
          onPress={() => toggleLevel(item.level)}
        >
          <View style={styles.levelHeaderLeft}>
            {isCollapsed ? (
              <ChevronRight size={18} color={colors.slate[400]} />
            ) : (
              <ChevronDown size={18} color={colors.slate[400]} />
            )}
            <Text style={styles.levelTitle}>{item.level}</Text>
            <Text style={styles.levelCount}>({item.gymnasts.length})</Text>
          </View>
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={styles.levelContent}>
            {item.gymnasts.map(renderGymnast)}
          </View>
        )}
      </View>
    );
  }, [collapsedLevels, renderGymnast, toggleLevel]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor={colors.slate[400]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <Text style={styles.countText}>
          {gymnasts.length} gymnast{gymnasts.length !== 1 ? 's' : ''} with floor music
        </Text>
      </View>

      {/* Level Filter */}
      {levelsWithMusic.length > 1 && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            <TouchableOpacity
              style={[styles.filterChip, selectedLevel === null && styles.filterChipActive]}
              onPress={() => setSelectedLevel(null)}
            >
              <Text style={[styles.filterChipText, selectedLevel === null && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {levelsWithMusic.map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.filterChip, selectedLevel === level && styles.filterChipActive]}
                onPress={() => setSelectedLevel(selectedLevel === level ? null : level)}
              >
                <Text style={[styles.filterChipText, selectedLevel === level && styles.filterChipTextActive]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Offline Toolbar */}
      {gymnasts.length > 0 && (
        <View style={styles.offlineToolbar}>
          <Text style={styles.offlineInfoText}>
            {offlineStore.getDownloadCount()} of {gymnasts.length} saved offline
          </Text>
          <View style={styles.offlineActions}>
            {bulkDownloading ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={offlineStore.cancelBulkDownload}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <>
                {offlineStore.getDownloadCount() > 0 && (
                  <TouchableOpacity
                    style={styles.removeAllBtn}
                    onPress={() => {
                      Alert.alert(
                        'Remove All Downloads',
                        'Remove all offline floor music files? You can re-download them later.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => offlineStore.removeAllFiles() },
                        ]
                      );
                    }}
                  >
                    <Trash2 size={16} color={colors.error[600]} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.downloadAllBtn}
                  onPress={async () => {
                    const result = await offlineStore.downloadAll(
                      gymnasts.map(g => ({ id: g.id, floor_music_url: g.floor_music_url, floor_music_name: g.floor_music_name }))
                    );
                    if (result.failed > 0) {
                      Alert.alert('Download Complete', `Downloaded ${result.downloaded} files. ${result.failed} failed.`);
                    }
                  }}
                >
                  <CloudDownload size={16} color={colors.white} />
                  <Text style={styles.downloadAllBtnText}>Download All</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {groupedByLevel.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Music size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>
            {searchTerm || selectedLevel ? 'No results found' : 'No floor music uploaded yet'}
          </Text>
          <Text style={styles.emptyText}>
            {searchTerm
              ? 'Try a different search term'
              : 'Upload floor music from gymnast profiles'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedByLevel}
          keyExtractor={(item) => item.level}
          renderItem={renderLevelGroup}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate[900],
  },
  countText: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  levelGroup: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
    overflow: 'hidden',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.slate[50],
  },
  levelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  levelCount: {
    fontSize: 13,
    color: colors.slate[500],
  },
  levelContent: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  gymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  gymnastInfo: {
    flex: 1,
    marginRight: 12,
  },
  gymnastName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  musicFileName: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  gymnastActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: colors.brand[50],
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    paddingVertical: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
  },
  filterChipActive: {
    backgroundColor: colors.brand[500],
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  gymnastNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadedBtn: {
    backgroundColor: colors.success[50],
  },
  downloadingBtn: {
    backgroundColor: colors.brand[50],
  },
  offlineToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  offlineInfoText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  offlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand[600],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadAllBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  removeAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.error[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
