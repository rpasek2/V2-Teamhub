import { colors } from '../../constants/colors';
import type { DetailedSkill } from './types';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
export const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

// Sections parents can edit for their own gymnasts
export const PARENT_EDITABLE_SECTIONS = ['apparel', 'membership', 'emergency', 'medical'];

export const ASSIGNMENT_EVENTS = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

export const DEFAULT_WAG_EVENTS = ['vault', 'bars', 'beam', 'floor'];
export const DEFAULT_MAG_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

export const EVENT_LABELS: Record<string, string> = {
  vault: 'VT', bars: 'UB', beam: 'BB', floor: 'FX',
  pommel: 'PH', rings: 'SR', pbars: 'PB', highbar: 'HB',
};

export const getEventLabel = (event: string) => EVENT_LABELS[event] || event;

export const getStatusConfig = (dark: boolean) => ({
  present: { label: 'Present', color: dark ? colors.emerald[400] : colors.emerald[700], bgColor: dark ? colors.emerald[700] + '30' : colors.emerald[100] },
  late: { label: 'Late', color: dark ? colors.amber[500] : colors.amber[700], bgColor: dark ? colors.amber[700] + '30' : colors.amber[100] },
  left_early: { label: 'Left Early', color: dark ? colors.blue[400] : colors.blue[700], bgColor: dark ? colors.blue[700] + '30' : colors.blue[100] },
  absent: { label: 'Absent', color: dark ? colors.error[400] : colors.error[700], bgColor: dark ? colors.error[700] + '30' : colors.error[100] },
});

export const SKILL_STATUS_ORDER: (DetailedSkill['status'])[] = ['none', 'learning', 'achieved', 'mastered', 'injured'];

export const SKILL_STATUS_LABELS: Record<string, string> = {
  'null': 'Not Started',
  'none': 'Not Started',
  'learning': 'Learning',
  'achieved': 'Achieved',
  'mastered': 'Mastered',
  'injured': 'Injured',
};

export const getSkillStatusColors = (isDark: boolean): Record<string, { bg: string; text: string }> => isDark ? {
  'null': { bg: colors.slate[700], text: colors.slate[300] },
  'none': { bg: colors.slate[700], text: colors.slate[300] },
  'learning': { bg: colors.amber[700] + '30', text: colors.amber[500] },
  'achieved': { bg: colors.emerald[700] + '30', text: colors.emerald[400] },
  'mastered': { bg: colors.amber[700] + '30', text: colors.amber[500] },
  'injured': { bg: colors.error[700] + '30', text: colors.error[400] },
} : {
  'null': { bg: colors.slate[100], text: colors.slate[500] },
  'none': { bg: colors.slate[100], text: colors.slate[500] },
  'learning': { bg: colors.amber[100], text: colors.amber[700] },
  'achieved': { bg: colors.emerald[100], text: colors.emerald[700] },
  'mastered': { bg: colors.amber[100], text: colors.amber[700] },
  'injured': { bg: colors.error[100], text: colors.error[700] },
};

export const ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'wma'];
