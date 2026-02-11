import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { FileText, Download, File, User, Calendar } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface FileAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface Post {
  id: string;
  created_at: string;
  attachments: any[];
  profiles?: {
    full_name: string;
  }[];
}

interface FileItem extends FileAttachment {
  postId: string;
  createdAt: string;
  authorName: string;
}

interface GroupFilesProps {
  posts: Post[];
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileExtension = (name: string) => {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
};

const getFileColor = (mimeType: string) => {
  if (mimeType.includes('pdf')) return colors.error[500];
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return colors.emerald[500];
  if (mimeType.includes('word') || mimeType.includes('document')) return colors.blue[500];
  if (mimeType.includes('image')) return colors.purple[500];
  if (mimeType.includes('video')) return colors.pink[500];
  if (mimeType.includes('audio')) return colors.amber[500];
  return colors.slate[400];
};

export function GroupFiles({ posts }: GroupFilesProps) {
  // Extract all files from posts
  const files = useMemo(() => {
    const allFiles: FileItem[] = [];

    posts.forEach((post) => {
      const attachments = post.attachments || [];
      attachments.forEach((att: any) => {
        if (att.type === 'files' && att.files) {
          att.files.forEach((file: FileAttachment) => {
            allFiles.push({
              ...file,
              postId: post.id,
              createdAt: post.created_at,
              authorName: post.profiles?.[0]?.full_name || 'Unknown',
            });
          });
        }
      });
    });

    // Sort by date (newest first)
    return allFiles.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const supported = await Linking.canOpenURL(file.url);
      if (supported) {
        await Linking.openURL(file.url);
      } else {
        Alert.alert('Error', 'Unable to open this file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  if (files.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <FileText size={32} color={colors.blue[400]} />
        </View>
        <Text style={styles.emptyTitle}>No files yet</Text>
        <Text style={styles.emptyText}>Files from posts will appear here</Text>
      </View>
    );
  }

  const renderFile = ({ item }: { item: FileItem }) => (
    <View style={styles.fileItem}>
      <View style={[styles.fileIcon, { backgroundColor: getFileColor(item.mimeType) + '15' }]}>
        <File size={20} color={getFileColor(item.mimeType)} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.fileMeta}>
          <View style={styles.extensionBadge}>
            <Text style={styles.extensionText}>{getFileExtension(item.name)}</Text>
          </View>
          <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
        </View>
        <View style={styles.fileDetails}>
          <View style={styles.detailItem}>
            <User size={12} color={colors.slate[400]} />
            <Text style={styles.detailText}>{item.authorName}</Text>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={12} color={colors.slate[400]} />
            <Text style={styles.detailText}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => handleDownload(item)}
      >
        <Download size={20} color={theme.light.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <FileText size={20} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Shared Files</Text>
          <Text style={styles.headerCount}>
            {files.length} file{files.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* File list */}
      <FlatList
        data={files}
        keyExtractor={(item, index) => `${item.postId}-${index}`}
        renderItem={renderFile}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  headerCount: {
    fontSize: 13,
    color: colors.slate[500],
  },
  listContent: {
    paddingVertical: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate[100],
    marginLeft: 68,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  extensionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.slate[100],
    borderRadius: 4,
  },
  extensionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[600],
  },
  fileSize: {
    fontSize: 12,
    color: colors.slate[500],
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.blue[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
  },
});
