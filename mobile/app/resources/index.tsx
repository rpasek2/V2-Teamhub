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
  Linking,
  Alert,
} from 'react-native';
import {
  FolderOpen,
  Search,
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  File,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { MobileTabGuard } from '../../src/components/ui';

interface HubResource {
  id: string;
  hub_id: string;
  name: string;
  description: string | null;
  url: string;
  type: 'file' | 'link';
  category: string | null;
  file_type: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null };
}

interface ResourceCategory {
  id: string;
  hub_id: string;
  name: string;
  display_order: number;
}

export default function ResourcesScreen() {
  const { t, isDark } = useTheme();
  const [resources, setResources] = useState<HubResource[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentHub = useHubStore((state) => state.currentHub);

  useEffect(() => {
    if (currentHub?.id) {
      fetchData();
    }
  }, [currentHub?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchResources(), fetchCategories()]);
    setLoading(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const fetchResources = async () => {
    if (!currentHub?.id) return;

    try {
      let query = supabase
        .from('hub_resources')
        .select(`
          id, hub_id, name, description, url, type, category, file_type, file_size, created_by, created_at,
          profiles:created_by (full_name, avatar_url)
        `)
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching resources:', error);
        return;
      }

      setResources((data || []) as unknown as HubResource[]);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchCategories = async () => {
    if (!currentHub?.id) return;

    try {
      const { data, error } = await supabase
        .from('hub_resource_categories')
        .select('id, hub_id, name, display_order')
        .eq('hub_id', currentHub.id)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Re-fetch when category changes
  useEffect(() => {
    if (currentHub?.id) {
      fetchResources();
    }
  }, [selectedCategory]);

  // Filter by search
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const query = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.category?.toLowerCase().includes(query)
    );
  }, [resources, searchQuery]);

  const handleResourcePress = (resource: HubResource) => {
    Linking.openURL(resource.url).catch(() => {
      Alert.alert('Error', 'Could not open this resource');
    });
  };

  const getIconForResource = (resource: HubResource) => {
    if (resource.type === 'link') {
      return { Icon: ExternalLink, bgColor: isDark ? colors.blue[700] + '30' : colors.blue[100], iconColor: isDark ? colors.blue[400] : colors.blue[600] };
    }

    const fileType = resource.file_type?.toLowerCase();
    if (fileType === 'pdf') {
      return { Icon: FileText, bgColor: isDark ? colors.red[700] + '30' : colors.red[100], iconColor: isDark ? colors.red[400] : colors.red[600] };
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType || '')) {
      return { Icon: ImageIcon, bgColor: isDark ? colors.purple[700] + '30' : colors.purple[100], iconColor: isDark ? colors.purple[400] : colors.purple[600] };
    }
    if (['mp4', 'mov', 'webm', 'avi'].includes(fileType || '')) {
      return { Icon: Video, bgColor: isDark ? colors.pink[700] + '30' : colors.pink[100], iconColor: isDark ? colors.pink[400] : colors.pink[600] };
    }
    return { Icon: File, bgColor: isDark ? colors.slate[700] + '30' : colors.slate[100], iconColor: isDark ? colors.slate[400] : colors.slate[600] };
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <MobileTabGuard tabId="resources">
        <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </MobileTabGuard>
    );
  }

  return (
    <MobileTabGuard tabId="resources">
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: t.surfaceSecondary }]}>
          <Search size={18} color={t.textFaint} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            placeholder="Search resources..."
            placeholderTextColor={t.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={t.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={[styles.categoryContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip, { backgroundColor: t.surfaceSecondary },
                selectedCategory === null && { backgroundColor: t.primary },
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryChipText, { color: t.textSecondary },
                  selectedCategory === null && { color: colors.white },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip, { backgroundColor: t.surfaceSecondary },
                  selectedCategory === cat.name && { backgroundColor: t.primary },
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.categoryChipText, { color: t.textSecondary },
                    selectedCategory === cat.name && { color: colors.white },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Resources List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />}
      >
        {filteredResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FolderOpen size={48} color={t.textFaint} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>
              {searchQuery || selectedCategory ? 'No resources found' : 'No resources yet'}
            </Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filter'
                : 'Resources will appear here once they are added.'}
            </Text>
            {(searchQuery || selectedCategory) && (
              <TouchableOpacity
                style={[styles.clearButton, { backgroundColor: t.surfaceSecondary }]}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                <Text style={[styles.clearButtonText, { color: t.textSecondary }]}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredResources.map((resource) => {
            const { Icon, bgColor, iconColor } = getIconForResource(resource);
            const profileData = Array.isArray(resource.profiles)
              ? resource.profiles[0]
              : resource.profiles;

            return (
              <TouchableOpacity
                key={resource.id}
                style={[styles.resourceCard, { backgroundColor: t.surface, borderColor: t.border }]}
                onPress={() => handleResourcePress(resource)}
                activeOpacity={0.7}
              >
                <View style={styles.resourceHeader}>
                  <View style={[styles.resourceIcon, { backgroundColor: bgColor }]}>
                    <Icon size={22} color={iconColor} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={[styles.resourceName, { color: t.text }]} numberOfLines={2}>
                      {resource.name}
                    </Text>
                    {resource.type === 'file' && resource.file_type && (
                      <Text style={[styles.resourceMeta, { color: t.textFaint }]}>
                        {resource.file_type.toUpperCase()}
                        {resource.file_size ? ` • ${formatFileSize(resource.file_size)}` : ''}
                      </Text>
                    )}
                    {resource.type === 'link' && (
                      <Text style={[styles.resourceMeta, { color: t.textFaint }]}>External link</Text>
                    )}
                  </View>
                </View>

                {resource.description && (
                  <Text style={[styles.resourceDescription, { color: t.textSecondary }]} numberOfLines={2}>
                    {resource.description}
                  </Text>
                )}

                <View style={[styles.resourceFooter, { borderTopColor: t.borderSubtle }]}>
                  {resource.category && (
                    <View style={[styles.categoryBadge, { backgroundColor: t.surfaceSecondary }]}>
                      <Text style={[styles.categoryBadgeText, { color: t.textSecondary }]}>{resource.category}</Text>
                    </View>
                  )}
                  <View style={styles.resourceCreatedInfo}>
                    {profileData?.full_name && (
                      <Text style={[styles.createdByText, { color: t.textFaint }]}>
                        Added by {profileData.full_name}
                      </Text>
                    )}
                    <Text style={[styles.createdDateText, { color: t.textFaint }]}>
                      {format(parseISO(resource.created_at), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
    </MobileTabGuard>
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
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchInputWrapper: {
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
    backgroundColor: colors.brand[600],
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  categoryChipTextActive: {
    color: colors.white,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  clearButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.slate[100],
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },

  // Resource Card
  resourceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceInfo: {
    flex: 1,
    minWidth: 0,
  },
  resourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    lineHeight: 20,
  },
  resourceMeta: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  resourceDescription: {
    fontSize: 13,
    color: colors.slate[600],
    marginTop: 10,
    lineHeight: 18,
  },
  resourceFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  categoryBadge: {
    backgroundColor: colors.slate[100],
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.slate[600],
  },
  resourceCreatedInfo: {
    alignItems: 'flex-end',
  },
  createdByText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  createdDateText: {
    fontSize: 11,
    color: colors.slate[400],
  },
});
