import { create } from 'zustand';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface Track {
  gymnastId: string;
  gymnastName: string;
  fileName: string;
  uri: string;
}

interface MusicPlayerState {
  track: Track | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;

  play: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
}

export const useMusicPlayerStore = create<MusicPlayerState>((set, get) => ({
  track: null,
  sound: null,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,

  play: async (track: Track) => {
    const { sound: currentSound, track: currentTrack } = get();

    // If same track, toggle play/stop
    if (currentTrack?.gymnastId === track.gymnastId && currentSound) {
      await get().stop();
      return;
    }

    // Stop current track first
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch {}
    }

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true },
      );

      const onStatus = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        set({
          positionMs: status.positionMillis ?? 0,
          durationMs: status.durationMillis ?? 0,
        });
        if (status.didJustFinish) {
          newSound.unloadAsync().catch(() => {});
          set({ isPlaying: false, sound: null, track: null, positionMs: 0, durationMs: 0 });
        }
      };

      newSound.setOnPlaybackStatusUpdate(onStatus);
      set({ sound: newSound, track, isPlaying: true, positionMs: 0, durationMs: 0 });
    } catch (err) {
      console.error('[MusicPlayer] Error playing:', err);
    }
  },

  pause: async () => {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.pauseAsync();
      set({ isPlaying: false });
    } catch (err) {
      console.error('[MusicPlayer] Error pausing:', err);
    }
  },

  resume: async () => {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.playAsync();
      set({ isPlaying: true });
    } catch (err) {
      console.error('[MusicPlayer] Error resuming:', err);
    }
  },

  stop: async () => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {}
    }
    set({ sound: null, track: null, isPlaying: false, positionMs: 0, durationMs: 0 });
  },

  seekTo: async (positionMs: number) => {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.setPositionAsync(positionMs);
    } catch (err) {
      console.error('[MusicPlayer] Error seeking:', err);
    }
  },
}));
