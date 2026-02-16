import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ShoppingBag,
  Search,
  Filter,
  X,
  Plus,
  ImagePlus,
  Trash2,
  DollarSign,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/authStore';
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

type CategoryFilter = 'all' | 'leos' | 'warmups' | 'grips' | 'equipment' | 'bags' | 'accessories' | 'other';
type SortOption = 'newest' | 'price_low' | 'price_high';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'leos', label: 'Leotards' },
  { key: 'warmups', label: 'Warm-ups' },
  { key: 'grips', label: 'Grips' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'bags', label: 'Bags' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'other', label: 'Other' },
];

const CONDITIONS: { key: string; label: string }[] = [
  { key: 'new', label: 'New with tags' },
  { key: 'like_new', label: 'Like new' },
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
];

const CONDITION_LABELS: Record<string, string> = {
  new: 'New with tags',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

export default function MarketplaceScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    isFree: false,
    category: 'leos' as CategoryFilter,
    condition: 'good',
    size: '',
    brand: '',
    phone: '',
    images: [] as string[],
  });

  const currentHub = useHubStore((state) => state.currentHub);

  useEffect(() => {
    if (currentHub?.id) {
      fetchItems();
    }
  }, [currentHub?.id]);

  const fetchItems = async () => {
    if (!currentHub) {
      setItems([]);
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
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      isFree: false,
      category: 'leos',
      condition: 'good',
      size: '',
      brand: '',
      phone: '',
      images: [],
    });
    setFormError(null);
  };

  const handleCloseCreateModal = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const pickImage = async () => {
    if (formData.images.length >= 5) {
      Alert.alert('Limit Reached', 'Maximum 5 images allowed');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    setUploadingImage(true);
    try {
      // Get the file extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Fetch the image and convert to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, blob, {
          contentType: `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('marketplace-images')
        .getPublicUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, publicUrl],
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleCreateItem = async () => {
    if (!user || !currentHub) return;

    // Validation
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }
    if (!formData.isFree && (!formData.price || parseFloat(formData.price) < 0)) {
      setFormError('Please enter a valid price');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required');
      return;
    }
    if (formData.images.length === 0) {
      setFormError('Please add at least one image');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const { error } = await supabase.from('marketplace_items').insert({
        hub_id: currentHub.id,
        seller_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.isFree ? 0 : parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        size: formData.size.trim() || null,
        brand: formData.brand.trim() || null,
        phone: formData.phone.trim(),
        images: formData.images,
        status: 'active',
      });

      if (error) throw error;

      handleCloseCreateModal();
      fetchItems();
      Alert.alert('Success', 'Your item has been listed!');
    } catch (err) {
      console.error('Error creating item:', err);
      setFormError('Failed to create listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        result.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [items, searchQuery, selectedCategory, sortBy]);

  const handleItemPress = (itemId: string) => {
    router.push(`/marketplace/${itemId}` as any);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
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
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? colors.white : colors.slate[600]} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options (when filters shown) */}
      {showFilters && (
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortOptions}>
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'price_low', label: 'Price ↑' },
              { key: 'price_high', label: 'Price ↓' },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortChip,
                  sortBy === option.key && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(option.key as SortOption)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === option.key && styles.sortChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredAndSortedItems.length} item{filteredAndSortedItems.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Item Grid */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.gridContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredAndSortedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShoppingBag size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to list an item!'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredAndSortedItems.map((item) => {
              const profileData = Array.isArray(item.profiles)
                ? item.profiles[0]
                : item.profiles;
              const hubData = Array.isArray(item.hubs) ? item.hubs[0] : item.hubs;
              const isFromOtherHub = hubData?.id !== currentHub?.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => handleItemPress(item.id)}
                  activeOpacity={0.7}
                >
                  {/* Image */}
                  <View style={styles.imageContainer}>
                    {item.images && item.images.length > 0 ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noImage}>
                        <ShoppingBag size={32} color={colors.slate[300]} />
                      </View>
                    )}
                    {item.price === 0 && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>FREE</Text>
                      </View>
                    )}
                    {isFromOtherHub && hubData && (
                      <View style={styles.hubBadge}>
                        <Text style={styles.hubBadgeText} numberOfLines={1}>
                          {hubData.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                    <View style={styles.itemMeta}>
                      <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>
                          {CONDITION_LABELS[item.condition] || item.condition}
                        </Text>
                      </View>
                      {item.size && (
                        <Text style={styles.sizeText}>Size: {item.size}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Create Item Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseCreateModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List an Item</Text>
              <TouchableOpacity onPress={handleCloseCreateModal}>
                <X size={24} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Images */}
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>
                Photos <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.imagesRow}>
                {formData.images.map((uri, index) => (
                  <View key={index} style={styles.imageThumb}>
                    <Image source={{ uri }} style={styles.imageThumbImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Trash2 size={14} color={colors.white} />
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.mainImageBadge}>
                        <Text style={styles.mainImageBadgeText}>Main</Text>
                      </View>
                    )}
                  </View>
                ))}
                {formData.images.length < 5 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={pickImage}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={colors.slate[400]} />
                    ) : (
                      <>
                        <ImagePlus size={24} color={colors.slate[400]} />
                        <Text style={styles.addImageText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.inputHint}>Add up to 5 photos. First photo is the main image.</Text>

              {/* Title */}
              <Text style={styles.inputLabel}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., GK Elite Pink Competition Leo"
                placeholderTextColor={colors.slate[400]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                maxLength={100}
              />

              {/* Description */}
              <Text style={styles.inputLabel}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Describe your item, include details about condition, sizing, etc."
                placeholderTextColor={colors.slate[400]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              {/* Price */}
              <Text style={styles.inputLabel}>
                Price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceRow}>
                <View style={styles.priceInputWrapper}>
                  <DollarSign size={16} color={colors.slate[400]} />
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.slate[400]}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    keyboardType="decimal-pad"
                    editable={!formData.isFree}
                  />
                </View>
                <View style={styles.freeToggle}>
                  <Text style={styles.freeToggleText}>Free</Text>
                  <Switch
                    value={formData.isFree}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isFree: value, price: value ? '' : formData.price })
                    }
                    trackColor={{ false: colors.slate[200], true: colors.brand[400] }}
                    thumbColor={formData.isFree ? colors.brand[600] : colors.slate[50]}
                  />
                </View>
              </View>

              {/* Category */}
              <Text style={styles.inputLabel}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionsRow}
              >
                {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.optionChip,
                      formData.category === cat.key && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.key as CategoryFilter })}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.category === cat.key && styles.optionChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Condition */}
              <Text style={styles.inputLabel}>
                Condition <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionsRow}
              >
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond.key}
                    style={[
                      styles.optionChip,
                      formData.condition === cond.key && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, condition: cond.key })}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.condition === cond.key && styles.optionChipTextActive,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Size & Brand */}
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Size</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., CM, AS, 4-6"
                    placeholderTextColor={colors.slate[400]}
                    value={formData.size}
                    onChangeText={(text) => setFormData({ ...formData, size: text })}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Brand</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., GK Elite"
                    placeholderTextColor={colors.slate[400]}
                    value={formData.brand}
                    onChangeText={(text) => setFormData({ ...formData, brand: text })}
                  />
                </View>
              </View>

              {/* Phone */}
              <Text style={styles.inputLabel}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="(555) 123-4567"
                placeholderTextColor={colors.slate[400]}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
              <Text style={styles.inputHint}>Buyers will contact you at this number.</Text>

              {/* Error */}
              {formError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseCreateModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleCreateItem}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Posting...' : 'List Item'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // Search
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate[900],
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: theme.light.primary,
  },

  // Categories
  categoryContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
  },
  categoryChipActive: {
    backgroundColor: theme.light.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  categoryChipTextActive: {
    color: colors.white,
  },

  // Sort
  sortContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortLabel: {
    fontSize: 13,
    color: colors.slate[500],
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.slate[100],
  },
  sortChipActive: {
    backgroundColor: colors.orange[100],
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
  },
  sortChipTextActive: {
    color: colors.orange[700],
  },

  // Results Header
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.slate[50],
  },
  resultsCount: {
    fontSize: 13,
    color: colors.slate[500],
  },

  // List
  listContainer: {
    flex: 1,
  },
  gridContent: {
    padding: 16,
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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

  // Item Card
  itemCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.slate[100],
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.success[500],
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  hubBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.white,
  },
  itemInfo: {
    padding: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
    lineHeight: 18,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.light.primary,
    marginBottom: 6,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  conditionBadge: {
    backgroundColor: colors.slate[100],
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: 10,
    color: colors.slate[600],
  },
  sizeText: {
    fontSize: 11,
    color: colors.slate[500],
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },

  // Form Styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 6,
    marginTop: 16,
  },
  required: {
    color: colors.error[500],
  },
  inputHint: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Images
  imagesRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  imageThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainImageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: theme.light.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  mainImageBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.white,
  },
  addImageButton: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
  },
  freeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  freeToggleText: {
    fontSize: 14,
    color: colors.slate[700],
  },

  // Options
  optionsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  optionChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    backgroundColor: colors.white,
  },
  optionChipActive: {
    borderColor: theme.light.primary,
    backgroundColor: colors.brand[50],
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  optionChipTextActive: {
    color: theme.light.primary,
  },

  // Row Inputs
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },

  // Error
  errorBox: {
    backgroundColor: colors.error[50],
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error[600],
  },

  // Buttons
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[600],
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.light.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
