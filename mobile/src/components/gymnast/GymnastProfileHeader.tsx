import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { Camera } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../ui';
import type { GymnastProfile } from './types';

interface Props {
  gymnast: GymnastProfile;
  age: number | null;
  canUploadAvatar: boolean;
  uploadingAvatar: boolean;
  onAvatarUpload: () => void;
}

export function GymnastProfileHeader({ gymnast, age, canUploadAvatar, uploadingAvatar, onAvatarUpload }: Props) {
  const { t, isDark } = useTheme();

  return (
    <View style={[styles.profileHeader, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
      <TouchableOpacity
        activeOpacity={canUploadAvatar ? 0.7 : 1}
        onPress={canUploadAvatar ? onAvatarUpload : undefined}
        style={[
          styles.avatar,
          { backgroundColor: isDark
            ? (gymnast.gender === 'Female' ? colors.pink[700] + '30' : colors.blue[700] + '30')
            : (gymnast.gender === 'Female' ? colors.pink[100] : colors.blue[100]) },
        ]}
      >
        {gymnast.avatar_url ? (
          <Image source={{ uri: gymnast.avatar_url, cache: 'force-cache' }} style={styles.avatarImage} />
        ) : (
          <Text
            style={[
              styles.avatarText,
              { color: isDark
                ? (gymnast.gender === 'Female' ? colors.pink[400] : colors.blue[400])
                : (gymnast.gender === 'Female' ? colors.pink[600] : colors.blue[600]) },
            ]}
          >
            {gymnast.first_name[0]}{gymnast.last_name[0]}
          </Text>
        )}
        {canUploadAvatar && (
          <View style={styles.avatarOverlay}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Camera size={16} color={colors.white} />
            )}
          </View>
        )}
      </TouchableOpacity>
      <Text style={[styles.gymnastName, { color: t.text }]}>
        {gymnast.first_name} {gymnast.last_name}
      </Text>
      <View style={styles.badgeRow}>
        {gymnast.level && <Badge label={gymnast.level} variant="primary" />}
        {age && <Badge label={`${age} years old`} variant="neutral" />}
        {gymnast.gender && <Badge label={gymnast.gender} variant="neutral" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  gymnastName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
