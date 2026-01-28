import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  ShoppingBag,
  User,
  Phone,
  MessageCircle,
  Tag,
  Package,
  Ruler,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface MarketplaceItem {
  id: string;
  hub_id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  size: string | null;
  brand: string | null;
  images: string[];
  phone: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  hubs?: {
    id: string;
    name: string;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  leos: 'Leotards',
  warmups: 'Warm-ups',
  grips: 'Grips',
  equipment: 'Equipment',
  bags: 'Bags',
  accessories: 'Accessories',
  other: 'Other',
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New with tags',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MarketplaceItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { currentHub } = useHubStore();

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select(`
          *,
          profiles:seller_id (full_name, avatar_url),
          hubs:hub_id (id, name)
        `)
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching item:', error);
      } else {
        setItem(data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const handleCall = () => {
    if (!item?.phone) return;
    Linking.openURL(`tel:${item.phone}`);
  };

  const handleText = () => {
    if (!item?.phone) return;
    Linking.openURL(`sms:${item.phone}`);
  };

  const handlePrevImage = () => {
    if (!item?.images || item.images.length <= 1) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? item.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (!item?.images || item.images.length <= 1) return;
    setCurrentImageIndex((prev) =>
      prev === item.images.length - 1 ? 0 : prev + 1
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <ShoppingBag size={48} color={colors.slate[300]} />
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
  const hubData = Array.isArray(item.hubs) ? item.hubs[0] : item.hubs;
  const isFromOtherHub = hubData?.id !== currentHub?.id;
  const hasMultipleImages = item.images && item.images.length > 1;

  return (
    <>
      <Stack.Screen
        options={{
          title: item.title,
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          {item.images && item.images.length > 0 ? (
            <>
              <Image
                source={{ uri: item.images[currentImageIndex] }}
                style={styles.mainImage}
                resizeMode="cover"
              />
              {hasMultipleImages && (
                <>
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavLeft]}
                    onPress={handlePrevImage}
                  >
                    <ChevronLeft size={24} color={colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageNavButton, styles.imageNavRight]}
                    onPress={handleNextImage}
                  >
                    <ChevronRight size={24} color={colors.white} />
                  </TouchableOpacity>
                  <View style={styles.imageIndicators}>
                    {item.images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.imageIndicator,
                          index === currentImageIndex && styles.imageIndicatorActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <View style={styles.noImage}>
              <ShoppingBag size={64} color={colors.slate[300]} />
              <Text style={styles.noImageText}>No image available</Text>
            </View>
          )}
          {item.price === 0 && (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        {/* Price & Title */}
        <View style={styles.headerSection}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.title}>{item.title}</Text>
          {isFromOtherHub && hubData && (
            <View style={styles.hubTag}>
              <Building2 size={12} color={colors.blue[600]} />
              <Text style={styles.hubTagText}>From {hubData.name}</Text>
            </View>
          )}
        </View>

        {/* Quick Details */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Tag size={16} color={colors.slate[400]} />
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>
              {CATEGORY_LABELS[item.category] || item.category}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Package size={16} color={colors.slate[400]} />
            <Text style={styles.detailLabel}>Condition</Text>
            <Text style={styles.detailValue}>
              {CONDITION_LABELS[item.condition] || item.condition}
            </Text>
          </View>
          {item.size && (
            <View style={styles.detailItem}>
              <Ruler size={16} color={colors.slate[400]} />
              <Text style={styles.detailLabel}>Size</Text>
              <Text style={styles.detailValue}>{item.size}</Text>
            </View>
          )}
          {item.brand && (
            <View style={styles.detailItem}>
              <Tag size={16} color={colors.slate[400]} />
              <Text style={styles.detailLabel}>Brand</Text>
              <Text style={styles.detailValue}>{item.brand}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        {/* Seller Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerCard}>
            {profileData?.avatar_url ? (
              <Image
                source={{ uri: profileData.avatar_url }}
                style={styles.sellerAvatar}
              />
            ) : (
              <View style={styles.sellerAvatarPlaceholder}>
                <User size={20} color={colors.brand[600]} />
              </View>
            )}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>
                {profileData?.full_name || 'Unknown Seller'}
              </Text>
              <Text style={styles.listedDate}>
                Listed {format(parseISO(item.created_at), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        <View style={styles.contactSection}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Phone size={20} color={colors.white} />
            <Text style={styles.callButtonText}>Call Seller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.textButton} onPress={handleText}>
            <MessageCircle size={20} color={theme.light.primary} />
            <Text style={styles.textButtonText}>Send Text</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.slate[500],
    marginTop: 16,
  },

  // Image Section
  imageSection: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: colors.white,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate[100],
  },
  noImageText: {
    fontSize: 14,
    color: colors.slate[400],
    marginTop: 8,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageNavLeft: {
    left: 12,
  },
  imageNavRight: {
    right: 12,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: colors.white,
  },
  freeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.success[500],
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },

  // Header Section
  headerSection: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.light.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.slate[900],
    lineHeight: 26,
  },
  hubTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.blue[50],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  hubTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.blue[600],
  },

  // Details Grid
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  detailItem: {
    width: '47%',
    backgroundColor: colors.slate[50],
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },

  // Section
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: colors.slate[700],
    lineHeight: 22,
  },

  // Seller Card
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.slate[50],
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  listedDate: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },

  // Contact Section
  contactSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.white,
    marginTop: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  textButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[50],
    paddingVertical: 14,
    borderRadius: 12,
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.light.primary,
  },
});
