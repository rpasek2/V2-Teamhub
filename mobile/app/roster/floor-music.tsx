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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import {
  Search,
  Music,
  Download,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

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
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { currentHub } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const levels = currentHub?.settings?.levels || [];

  // Auth guard - staff only
  useEffect(() => {
    if (!isStaff()) {
      router.back();
    }
  }, [isStaff]);

  useEffect(() => {
    fetchFloorMusic();
  }, [currentHub?.id]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

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
    if (!searchTerm) return gymnasts;
    const q = searchTerm.toLowerCase();
    return gymnasts.filter((g) =>
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(q)
    );
  }, [gymnasts, searchTerm]);

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

  const handlePlay = async (gymnast: FloorMusicGymnast) => {
    try {
      // If already playing this gymnast, stop
      if (playingId === gymnast.id && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingId(null);
        return;
      }

      // Stop any currently playing sound
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }

      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: gymnast.floor_music_url },
        { shouldPlay: true }
      );
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
      setSound(newSound);
      setPlayingId(gymnast.id);
    } catch (err) {
      console.error('Error playing music:', err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFloorMusic();
  };

  const renderGymnast = useCallback(
    (gymnast: FloorMusicGymnast) => {
      const isPlaying = playingId === gymnast.id;
      return (
        <View key={gymnast.id} style={styles.gymnastRow}>
          <View style={styles.gymnastInfo}>
            <Text style={styles.gymnastName}>
              {gymnast.first_name} {gymnast.last_name}
            </Text>
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
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Linking.openURL(gymnast.floor_music_url)}
            >
              <Download size={16} color={colors.slate[600]} />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [playingId, sound]
  );

  const renderLevelGroup = ({ item }: { item: LevelGroup }) => {
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
  };

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

      {groupedByLevel.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Music size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>
            {searchTerm ? 'No results found' : 'No floor music uploaded yet'}
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
});
