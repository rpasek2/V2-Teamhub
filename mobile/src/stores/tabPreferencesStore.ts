import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tab_preferences';

// Available tabs that can be customized (excluding fixed Home and More)
// Only includes tabs that have corresponding screen files in (tabs) folder
export const AVAILABLE_TABS = [
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'messages', label: 'Messages', icon: 'messages' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'roster', label: 'Roster', icon: 'roster' },
  { id: 'assignments', label: 'Assignments', icon: 'assignments' },
  { id: 'attendance', label: 'Attendance', icon: 'attendance' },
  { id: 'competitions', label: 'Competitions', icon: 'competitions' },
  { id: 'scores', label: 'Scores', icon: 'scores' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
] as const;

export type TabId = (typeof AVAILABLE_TABS)[number]['id'];

// Default tabs shown in the middle (between Home and More)
const DEFAULT_TABS: TabId[] = ['calendar', 'messages', 'groups'];

interface TabPreferencesState {
  // The 3 tabs to show in the middle of the tab bar
  selectedTabs: TabId[];
  loading: boolean;

  // Actions
  initialize: () => Promise<void>;
  setSelectedTabs: (tabs: TabId[]) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const useTabPreferencesStore = create<TabPreferencesState>((set) => ({
  selectedTabs: DEFAULT_TABS,
  loading: true,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TabId[];
        // Validate that all stored tabs are still valid
        const validTabs = parsed.filter((t) =>
          AVAILABLE_TABS.some((at) => at.id === t)
        );
        if (validTabs.length === 3) {
          set({ selectedTabs: validTabs, loading: false });
          return;
        }
      }
    } catch (error) {
      console.error('Error loading tab preferences:', error);
    }
    set({ selectedTabs: DEFAULT_TABS, loading: false });
  },

  setSelectedTabs: async (tabs: TabId[]) => {
    if (tabs.length !== 3) {
      console.error('Must select exactly 3 tabs');
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      set({ selectedTabs: tabs });
    } catch (error) {
      console.error('Error saving tab preferences:', error);
    }
  },

  resetToDefault: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ selectedTabs: DEFAULT_TABS });
    } catch (error) {
      console.error('Error resetting tab preferences:', error);
    }
  },
}));
