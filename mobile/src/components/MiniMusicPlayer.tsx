import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Music, Play, Pause, X } from 'lucide-react-native';
import { colors } from '../constants/colors';
import { useMusicPlayerStore } from '../stores/musicPlayerStore';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function MiniMusicPlayer() {
  const track = useMusicPlayerStore((s) => s.track);
  const isPlaying = useMusicPlayerStore((s) => s.isPlaying);
  const positionMs = useMusicPlayerStore((s) => s.positionMs);
  const durationMs = useMusicPlayerStore((s) => s.durationMs);
  const pause = useMusicPlayerStore((s) => s.pause);
  const resume = useMusicPlayerStore((s) => s.resume);
  const stop = useMusicPlayerStore((s) => s.stop);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  if (!track) return null;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Track icon */}
        <View style={styles.iconContainer}>
          <Music size={18} color={colors.white} />
        </View>

        {/* Track info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>
            {track.gymnastName}
          </Text>
          <Text style={styles.fileName} numberOfLines={1}>
            {track.fileName}
          </Text>
        </View>

        {/* Time */}
        <Text style={styles.time}>
          {formatTime(positionMs)}{durationMs > 0 ? ` / ${formatTime(durationMs)}` : ''}
        </Text>

        {/* Play/Pause button */}
        <TouchableOpacity style={styles.playPauseBtn} onPress={handlePlayPause}>
          {isPlaying ? (
            <Pause size={20} color={colors.white} />
          ) : (
            <Play size={20} color={colors.white} />
          )}
        </TouchableOpacity>

        {/* Close/Stop button */}
        <TouchableOpacity style={styles.closeBtn} onPress={stop}>
          <X size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.slate[800],
    borderTopWidth: 1,
    borderTopColor: colors.slate[700],
  },
  progressBarBg: {
    height: 3,
    backgroundColor: colors.slate[700],
  },
  progressBarFill: {
    height: 3,
    backgroundColor: colors.brand[400],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  fileName: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 1,
  },
  time: {
    fontSize: 12,
    color: colors.slate[400],
    fontVariant: ['tabular-nums'],
  },
  playPauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.slate[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
