import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { formatDistanceToNow, parseISO } from 'date-fns';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with 16px padding and 8px gaps

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  attachments: any[];
  profiles?: {
    full_name: string;
  }[];
}

interface PhotoItem {
  url: string;
  postId: string;
  postContent: string;
  createdAt: string;
  authorName: string;
}

interface GroupPhotosProps {
  posts: Post[];
}

export function GroupPhotos({ posts }: GroupPhotosProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  // Extract all photos from posts
  const photos = useMemo(() => {
    const allPhotos: PhotoItem[] = [];

    posts.forEach((post) => {
      // Legacy image_url
      if (post.image_url) {
        allPhotos.push({
          url: post.image_url,
          postId: post.id,
          postContent: post.content,
          createdAt: post.created_at,
          authorName: post.profiles?.[0]?.full_name || 'Unknown',
        });
      }

      // New attachments format
      const attachments = post.attachments || [];
      attachments.forEach((att: any) => {
        if (att.type === 'images' && att.urls) {
          att.urls.forEach((url: string) => {
            allPhotos.push({
              url,
              postId: post.id,
              postContent: post.content,
              createdAt: post.created_at,
              authorName: post.profiles?.[0]?.full_name || 'Unknown',
            });
          });
        }
      });
    });

    // Sort by date (newest first)
    return allPhotos.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [posts]);

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setImageLoading(true);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setImageLoading(true);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <ImageIcon size={32} color={colors.purple[400]} />
        </View>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptyText}>Photos from posts will appear here</Text>
      </View>
    );
  }

  const renderPhoto = ({ item, index }: { item: PhotoItem; index: number }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => {
        setSelectedIndex(index);
        setImageLoading(true);
      }}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.url }} style={styles.photoImage} />
    </TouchableOpacity>
  );

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(item, index) => `${item.postId}-${index}`}
        renderItem={renderPhoto}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Lightbox Modal */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedIndex(null)}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedIndex(null)}
          >
            <X size={24} color={colors.white} />
          </TouchableOpacity>

          {/* Counter */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {selectedIndex !== null ? selectedIndex + 1 : 0} / {photos.length}
            </Text>
          </View>

          {/* Navigation - Previous */}
          {selectedIndex !== null && selectedIndex > 0 && (
            <TouchableOpacity style={styles.navButtonLeft} onPress={handlePrevious}>
              <ChevronLeft size={32} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Navigation - Next */}
          {selectedIndex !== null && selectedIndex < photos.length - 1 && (
            <TouchableOpacity style={styles.navButtonRight} onPress={handleNext}>
              <ChevronRight size={32} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* Main image */}
          {selectedPhoto && (
            <View style={styles.imageContainer}>
              {imageLoading && (
                <ActivityIndicator
                  size="large"
                  color={colors.white}
                  style={styles.imageLoader}
                />
              )}
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.fullImage}
                resizeMode="contain"
                onLoadEnd={() => setImageLoading(false)}
              />
            </View>
          )}

          {/* Photo info */}
          {selectedPhoto && (
            <View style={styles.photoInfo}>
              <Text style={styles.photoAuthor}>{selectedPhoto.authorName}</Text>
              <Text style={styles.photoTime}>{formatTime(selectedPhoto.createdAt)}</Text>
              {selectedPhoto.postContent && (
                <Text style={styles.photoContent} numberOfLines={2}>
                  {selectedPhoto.postContent}
                </Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.slate[100],
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: colors.purple[100],
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  counter: {
    position: 'absolute',
    top: 50,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  counterText: {
    fontSize: 14,
    color: colors.white,
  },
  navButtonLeft: {
    position: 'absolute',
    left: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navButtonRight: {
    position: 'absolute',
    right: 8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoader: {
    position: 'absolute',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  photoTime: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  photoContent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
});
