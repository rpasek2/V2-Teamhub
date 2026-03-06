import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, Trash2, Check, ChevronDown, ChevronRight, ClipboardCheck, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../services/supabase';
import { useHubStore } from '../../stores/hubStore';

interface Checklist {
  id: string;
  hub_id: string;
  title: string;
  checked_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Gymnast {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
}

interface QuickChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  gymnasts: Gymnast[];
  levels: string[];
  hubId: string;
}

interface Section {
  title: string;
  data: Gymnast[];
}

export function QuickChecklistModal({ visible, onClose, gymnasts, levels, hubId }: QuickChecklistModalProps) {
  const { t, isDark } = useTheme();
  const currentUser = useHubStore((state) => state.currentMember);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const titleRef = useRef<TextInput>(null);

  const active = checklists.find(c => c.id === activeId) || null;

  useEffect(() => {
    if (visible && hubId) {
      fetchChecklists();
    }
  }, [visible, hubId]);

  const fetchChecklists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('roster_checklists')
      .select('*')
      .eq('hub_id', hubId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChecklists(data);
      if (!activeId && data.length > 0) {
        setActiveId(data[0].id);
      }
    }
    setLoading(false);
  };

  const createChecklist = async () => {
    if (!currentUser?.user_id) return;
    const { data, error } = await supabase
      .from('roster_checklists')
      .insert({ hub_id: hubId, title: '', checked_ids: [], created_by: currentUser.user_id })
      .select()
      .single();

    if (!error && data) {
      setChecklists(prev => [data, ...prev]);
      setActiveId(data.id);
      setShowList(false);
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  };

  const updateTitle = async (title: string) => {
    if (!active) return;
    setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, title } : c));
    await supabase
      .from('roster_checklists')
      .update({ title })
      .eq('id', active.id);
  };

  const toggleGymnast = async (gymnastId: string) => {
    if (!active) return;
    const isChecked = active.checked_ids.includes(gymnastId);
    const newIds = isChecked
      ? active.checked_ids.filter(id => id !== gymnastId)
      : [...active.checked_ids, gymnastId];

    setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, checked_ids: newIds } : c));
    await supabase
      .from('roster_checklists')
      .update({ checked_ids: newIds })
      .eq('id', active.id);
  };

  const toggleLevel = async (levelGymnasts: Gymnast[]) => {
    if (!active) return;
    const allChecked = levelGymnasts.every(g => active.checked_ids.includes(g.id));
    let newIds: string[];
    if (allChecked) {
      const removeSet = new Set(levelGymnasts.map(g => g.id));
      newIds = active.checked_ids.filter(id => !removeSet.has(id));
    } else {
      const addSet = new Set([...active.checked_ids, ...levelGymnasts.map(g => g.id)]);
      newIds = Array.from(addSet);
    }
    setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, checked_ids: newIds } : c));
    await supabase
      .from('roster_checklists')
      .update({ checked_ids: newIds })
      .eq('id', active.id);
  };

  const deleteChecklist = () => {
    if (!active) return;
    Alert.alert('Delete Checklist', `Delete "${active.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const deleteId = active.id;
          setChecklists(prev => prev.filter(c => c.id !== deleteId));
          setActiveId(checklists.find(c => c.id !== deleteId)?.id || null);
          await supabase.from('roster_checklists').delete().eq('id', deleteId);
        }
      },
    ]);
  };

  const toggleCollapse = (level: string) => {
    setCollapsedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  // Group gymnasts by level into sections
  const sections = useMemo(() => {
    const grouped: Record<string, Gymnast[]> = {};
    grouped['No Level'] = [];
    levels.forEach(l => { grouped[l] = []; });

    const query = searchQuery.toLowerCase().trim();
    gymnasts.forEach(g => {
      if (query && !`${g.first_name} ${g.last_name}`.toLowerCase().includes(query)) return;
      const level = g.level || 'No Level';
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(g);
    });

    Object.values(grouped).forEach(arr =>
      arr.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    );

    const ordered = [...levels];
    Object.keys(grouped).forEach(l => { if (!ordered.includes(l)) ordered.push(l); });

    return ordered
      .filter(l => (grouped[l]?.length || 0) > 0)
      .map(l => ({ title: l, data: grouped[l] }));
  }, [gymnasts, levels, searchQuery]);

  const checkedCount = active ? active.checked_ids.length : 0;
  const totalCount = gymnasts.length;

  const renderSectionHeader = ({ section }: { section: Section }) => {
    if (!active) return null;
    const isCollapsed = collapsedLevels.has(section.title);
    const allChecked = section.data.length > 0 && section.data.every(g => active.checked_ids.includes(g.id));
    const someChecked = section.data.some(g => active.checked_ids.includes(g.id));
    const count = section.data.filter(g => active.checked_ids.includes(g.id)).length;

    return (
      <View style={[s.sectionHeader, { backgroundColor: t.surfaceSecondary }]}>
        <TouchableOpacity style={s.collapseBtn} onPress={() => toggleCollapse(section.title)}>
          {isCollapsed
            ? <ChevronRight size={18} color={t.textMuted} />
            : <ChevronDown size={18} color={t.textMuted} />
          }
        </TouchableOpacity>
        <TouchableOpacity style={s.sectionHeaderContent} onPress={() => toggleLevel(section.data)}>
          <View style={s.sectionHeaderLeft}>
            <Text style={[s.sectionTitle, { color: t.text }]}>{section.title}</Text>
            <View style={[s.sectionCount, { backgroundColor: isDark ? colors.slate[600] : colors.slate[200] }]}>
              <Text style={[s.sectionCountText, { color: t.textSecondary }]}>{count}/{section.data.length}</Text>
            </View>
          </View>
          <View style={[
            s.checkbox,
            { borderColor: isDark ? colors.slate[500] : colors.slate[300], backgroundColor: isDark ? colors.slate[700] : colors.white },
            allChecked && { backgroundColor: t.primary, borderColor: t.primary },
            someChecked && !allChecked && { borderColor: t.primary },
          ]}>
            {allChecked && <Check size={12} color={colors.white} />}
            {someChecked && !allChecked && <View style={[s.partialDot, { backgroundColor: t.primary }]} />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = useCallback(({ item, section }: { item: Gymnast; section: Section }) => {
    if (collapsedLevels.has(section.title) || !active) return null;
    const isChecked = active.checked_ids.includes(item.id);

    return (
      <TouchableOpacity
        style={[s.gymnastRow, { backgroundColor: t.surface, borderColor: t.border }, isChecked && { borderColor: t.primary, backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
        onPress={() => toggleGymnast(item.id)}
      >
        <Text style={[s.gymnastName, { color: t.text }, isChecked && { textDecorationLine: 'line-through', color: t.textMuted }]}>
          {item.first_name} {item.last_name}
        </Text>
        <View style={[
          s.checkbox,
          { borderColor: isDark ? colors.slate[500] : colors.slate[300] },
          isChecked && { backgroundColor: t.primary, borderColor: t.primary },
        ]}>
          {isChecked && <Check size={14} color={colors.white} />}
        </View>
      </TouchableOpacity>
    );
  }, [collapsedLevels, active, toggleGymnast, t, isDark]);

  // Checklist picker view
  const renderChecklistPicker = () => (
    <View style={{ flex: 1 }}>
      <View style={[s.pickerHeader, { borderBottomColor: t.border }]}>
        <Text style={[s.pickerTitle, { color: t.text }]}>Your Checklists</Text>
        <TouchableOpacity onPress={createChecklist} style={[s.newBtn, { backgroundColor: t.primary }]}>
          <Plus size={16} color={colors.white} />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>
      {checklists.length === 0 ? (
        <View style={s.emptyContainer}>
          <ClipboardCheck size={40} color={t.textFaint} />
          <Text style={[s.emptyText, { color: t.textSecondary }]}>No checklists yet</Text>
          <Text style={[s.emptySubtext, { color: t.textMuted }]}>Tap "New" to create one</Text>
        </View>
      ) : (
        checklists.map(c => {
          const count = c.checked_ids.length;
          return (
            <TouchableOpacity
              key={c.id}
              style={[s.checklistItem, { borderBottomColor: t.border }]}
              onPress={() => { setActiveId(c.id); setShowList(false); }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.checklistItemTitle, { color: t.text }]} numberOfLines={1}>
                  {c.title || 'Untitled'}
                </Text>
                <Text style={[s.checklistItemCount, { color: t.textMuted }]}>
                  {count}/{totalCount} checked
                </Text>
              </View>
              <ChevronRight size={18} color={t.textFaint} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  // Active checklist view
  const renderActiveChecklist = () => {
    if (!active) return null;
    return (
      <View style={{ flex: 1 }}>
        {/* Title input */}
        <View style={[s.titleContainer, { borderBottomColor: t.border }]}>
          <Text style={[s.titleLabel, { color: t.textMuted }]}>Checklist name</Text>
          <TextInput
            ref={titleRef}
            style={[s.titleInput, { color: t.text, borderColor: t.border, backgroundColor: isDark ? colors.slate[700] : colors.slate[50] }]}
            value={active.title}
            onChangeText={updateTitle}
            placeholder="e.g. Permission slips, Secret Santa..."
            placeholderTextColor={t.textFaint}
          />
          {/* Search */}
          <View style={[s.searchBar, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}>
            <Search size={16} color={t.textFaint} />
            <TextInput
              style={[s.searchInput, { color: t.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search gymnasts..."
              placeholderTextColor={t.textFaint}
            />
          </View>
          <View style={s.titleRow}>
            <Text style={[s.progressText, { color: t.textMuted }]}>{checkedCount}/{totalCount} checked</Text>
          </View>
        </View>

        {/* Gymnast list */}
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          stickySectionHeadersEnabled={false}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={5}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={[s.emptyText, { color: t.textSecondary }]}>No gymnasts found</Text>
            </View>
          }
        />

        {/* Footer */}
        <View style={[s.footer, { backgroundColor: t.surfaceSecondary, borderTopColor: t.border }]}>
          <TouchableOpacity onPress={deleteChecklist} style={s.deleteBtn}>
            <Trash2 size={16} color={colors.red[500]} />
            <Text style={[s.deleteBtnText, { color: colors.red[500] }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[s.container, { backgroundColor: t.surface }]} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={[s.header, { borderBottomColor: t.border }]}>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <X size={24} color={t.textSecondary} />
            </TouchableOpacity>
            <Text style={[s.headerTitle, { color: t.text }]}>Quick Checklist</Text>
            {active && !showList ? (
              <TouchableOpacity
                style={[s.switchBtn, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}
                onPress={() => setShowList(true)}
              >
                <Text style={[s.switchBtnText, { color: t.textSecondary }]}>All</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          {loading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="large" color={t.primary} />
            </View>
          ) : showList || !active ? (
            renderChecklistPicker()
          ) : (
            renderActiveChecklist()
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  switchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Picker
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checklistItemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  checklistItemCount: {
    fontSize: 12,
    marginTop: 2,
  },
  // Title area
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  titleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderRadius: 8,
  },
  collapseBtn: {
    padding: 2,
    marginRight: 4,
  },
  sectionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialDot: {
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  // Gymnast rows
  gymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  gymnastName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // List
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
