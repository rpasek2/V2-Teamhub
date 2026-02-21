import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'floor-music-offline:';

interface DownloadedFile {
  localPath: string;
  remoteUrl: string;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
}

interface DownloadProgress {
  progress: number; // 0–1
}

interface OfflineMusicState {
  downloads: Record<string, DownloadedFile>;
  activeDownloads: Record<string, DownloadProgress>;
  bulkDownloading: boolean;
  initialized: boolean;
  currentHubId: string | null;
  _cancelBulk: boolean;

  isDownloaded: (gymnastId: string, currentRemoteUrl: string) => boolean;
  getLocalUri: (gymnastId: string, currentRemoteUrl: string) => string | null;
  getDownloadCount: () => number;
  getTotalSize: () => number;

  initialize: (hubId: string) => Promise<void>;
  downloadFile: (gymnastId: string, remoteUrl: string, fileName: string) => Promise<boolean>;
  removeFile: (gymnastId: string) => Promise<void>;
  removeAllFiles: () => Promise<void>;
  downloadAll: (
    gymnasts: Array<{ id: string; floor_music_url: string; floor_music_name: string | null }>
  ) => Promise<{ downloaded: number; failed: number }>;
  cancelBulkDownload: () => void;
}

const getBaseDir = () => `${FileSystem.documentDirectory}floor-music/`;

const persist = async (hubId: string, downloads: Record<string, DownloadedFile>) => {
  await AsyncStorage.setItem(STORAGE_KEY_PREFIX + hubId, JSON.stringify(downloads));
};

const load = async (hubId: string): Promise<Record<string, DownloadedFile>> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + hubId);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY_PREFIX + hubId);
    return {};
  }
};

export const useOfflineMusicStore = create<OfflineMusicState>((set, get) => ({
  downloads: {},
  activeDownloads: {},
  bulkDownloading: false,
  initialized: false,
  currentHubId: null,
  _cancelBulk: false,

  isDownloaded: (gymnastId, currentRemoteUrl) => {
    const entry = get().downloads[gymnastId];
    return !!entry && entry.remoteUrl === currentRemoteUrl;
  },

  getLocalUri: (gymnastId, currentRemoteUrl) => {
    const entry = get().downloads[gymnastId];
    if (entry && entry.remoteUrl === currentRemoteUrl) return entry.localPath;
    return null;
  },

  getDownloadCount: () => Object.keys(get().downloads).length,

  getTotalSize: () =>
    Object.values(get().downloads).reduce((sum, f) => sum + f.fileSize, 0),

  initialize: async (hubId) => {
    const state = get();
    if (state.initialized && state.currentHubId === hubId) return;

    const stored = await load(hubId);
    const verified: Record<string, DownloadedFile> = {};
    let changed = false;

    for (const [gymnastId, entry] of Object.entries(stored)) {
      const info = await FileSystem.getInfoAsync(entry.localPath);
      if (info.exists) {
        verified[gymnastId] = entry;
      } else {
        changed = true;
      }
    }

    if (changed) {
      await persist(hubId, verified);
    }

    set({ downloads: verified, initialized: true, currentHubId: hubId });
  },

  downloadFile: async (gymnastId, remoteUrl, fileName) => {
    const { currentHubId } = get();
    if (!currentHubId) return false;

    // Extract extension from URL
    const urlPath = remoteUrl.split('?')[0];
    const ext = urlPath.split('.').pop() || 'mp3';
    const localDir = `${getBaseDir()}${currentHubId}/${gymnastId}/`;
    const localPath = `${localDir}${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;

    set((s) => ({
      activeDownloads: { ...s.activeDownloads, [gymnastId]: { progress: 0 } },
    }));

    try {
      await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });

      const downloadResumable = FileSystem.createDownloadResumable(
        remoteUrl,
        localPath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesExpectedToWrite > 0
              ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
              : 0;
          set((s) => ({
            activeDownloads: { ...s.activeDownloads, [gymnastId]: { progress } },
          }));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) throw new Error('Download returned no result');

      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size || 0 : 0;

      const entry: DownloadedFile = {
        localPath,
        remoteUrl,
        fileName,
        fileSize,
        downloadedAt: new Date().toISOString(),
      };

      const newDownloads = { ...get().downloads, [gymnastId]: entry };
      await persist(get().currentHubId!, newDownloads);

      set((s) => {
        const { [gymnastId]: _, ...rest } = s.activeDownloads;
        return { downloads: newDownloads, activeDownloads: rest };
      });

      return true;
    } catch (error) {
      console.error('Error downloading floor music:', error);
      // Clean up partial file
      await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});

      set((s) => {
        const { [gymnastId]: _, ...rest } = s.activeDownloads;
        return { activeDownloads: rest };
      });

      return false;
    }
  },

  removeFile: async (gymnastId) => {
    const { downloads, currentHubId } = get();
    const entry = downloads[gymnastId];
    if (!entry || !currentHubId) return;

    await FileSystem.deleteAsync(entry.localPath, { idempotent: true }).catch(() => {});

    const { [gymnastId]: _, ...rest } = downloads;
    await persist(currentHubId, rest);
    set({ downloads: rest });
  },

  removeAllFiles: async () => {
    const { downloads, currentHubId } = get();
    if (!currentHubId) return;

    for (const entry of Object.values(downloads)) {
      await FileSystem.deleteAsync(entry.localPath, { idempotent: true }).catch(() => {});
    }

    // Also try to remove the hub directory
    const hubDir = `${getBaseDir()}${currentHubId}/`;
    await FileSystem.deleteAsync(hubDir, { idempotent: true }).catch(() => {});

    await persist(currentHubId, {});
    set({ downloads: {} });
  },

  downloadAll: async (gymnasts) => {
    set({ bulkDownloading: true, _cancelBulk: false });
    let downloaded = 0;
    let failed = 0;

    for (const g of gymnasts) {
      if (get()._cancelBulk) break;

      // Skip already downloaded
      if (get().isDownloaded(g.id, g.floor_music_url)) {
        downloaded++;
        continue;
      }

      const success = await get().downloadFile(
        g.id,
        g.floor_music_url,
        g.floor_music_name || 'floor-music'
      );
      if (success) downloaded++;
      else failed++;
    }

    set({ bulkDownloading: false, _cancelBulk: false });
    return { downloaded, failed };
  },

  cancelBulkDownload: () => {
    set({ _cancelBulk: true });
  },
}));
