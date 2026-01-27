import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { ClipboardList, Check, User, Plus, X } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { supabase } from '../../services/supabase';

interface SignupSlot {
  name: string;
  maxSignups?: number;
  addedBy?: string;
}

interface SignupSettings {
  allowUserSlots?: boolean;
}

interface SignupResponse {
  id: string;
  post_id: string;
  user_id: string;
  slot_index: number;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface SignupDisplayProps {
  postId: string;
  title: string;
  description?: string;
  slots: SignupSlot[];
  settings?: SignupSettings;
  currentUserId: string;
}

export function SignupDisplay({
  postId,
  title,
  description,
  slots: initialSlots,
  settings,
  currentUserId,
}: SignupDisplayProps) {
  const [slots, setSlots] = useState<SignupSlot[]>(initialSlots);
  const [responses, setResponses] = useState<SignupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState<number | null>(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotName, setNewSlotName] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [postId]);

  useEffect(() => {
    setSlots(initialSlots);
  }, [initialSlots]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('signup_responses')
        .select('*, profiles(full_name, avatar_url)')
        .eq('post_id', postId);

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      console.error('Error fetching signup responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (slotIndex: number) => {
    if (!currentUserId || signingUp !== null) return;

    setSigningUp(slotIndex);
    try {
      const isSignedUp = responses.some(
        (r) => r.user_id === currentUserId && r.slot_index === slotIndex
      );

      if (isSignedUp) {
        // Remove signup
        const { error } = await supabase
          .from('signup_responses')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
          .eq('slot_index', slotIndex);

        if (error) throw error;

        setResponses((prev) =>
          prev.filter((r) => !(r.user_id === currentUserId && r.slot_index === slotIndex))
        );
      } else {
        // Check if slot is full
        const slot = slots[slotIndex];
        const slotResponses = responses.filter((r) => r.slot_index === slotIndex);
        if (slot.maxSignups && slotResponses.length >= slot.maxSignups) {
          return; // Slot is full
        }

        // Add signup
        const { error } = await supabase.from('signup_responses').insert({
          post_id: postId,
          user_id: currentUserId,
          slot_index: slotIndex,
        });

        if (error) throw error;

        setResponses((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            post_id: postId,
            user_id: currentUserId,
            slot_index: slotIndex,
          },
        ]);
      }
    } catch (err) {
      console.error('Error signing up:', err);
      fetchResponses();
    } finally {
      setSigningUp(null);
    }
  };

  const handleAddSlot = async () => {
    if (!currentUserId || !newSlotName.trim() || addingSlot) return;

    setAddingSlot(true);
    try {
      // Get current post attachments
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('attachments')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Add new slot
      const attachments = post.attachments || [];
      const updatedAttachments = attachments.map((att: any) => {
        if (att.type === 'signup') {
          return {
            ...att,
            slots: [...(att.slots || []), { name: newSlotName.trim(), addedBy: currentUserId }],
          };
        }
        return att;
      });

      // Update post
      const { error: updateError } = await supabase
        .from('posts')
        .update({ attachments: updatedAttachments })
        .eq('id', postId);

      if (updateError) throw updateError;

      // Update local state
      const newSlot: SignupSlot = { name: newSlotName.trim(), addedBy: currentUserId };
      const newSlots = [...slots, newSlot];
      setSlots(newSlots);

      // Auto sign up for the slot
      const newSlotIndex = newSlots.length - 1;
      await supabase.from('signup_responses').insert({
        post_id: postId,
        user_id: currentUserId,
        slot_index: newSlotIndex,
      });

      setResponses((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          post_id: postId,
          user_id: currentUserId,
          slot_index: newSlotIndex,
        },
      ]);

      setNewSlotName('');
      setShowAddSlot(false);
    } catch (err) {
      console.error('Error adding slot:', err);
    } finally {
      setAddingSlot(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.emerald[500]} />
        </View>
      </View>
    );
  }

  const allowUserSlots = settings?.allowUserSlots || false;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ClipboardList size={14} color={colors.emerald[600]} />
        <Text style={styles.headerTitle}>Sign-Up</Text>
        {allowUserSlots && (
          <View style={styles.openListBadge}>
            <Text style={styles.openListText}>Open list</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}

        {/* Slots */}
        <View style={styles.slotsContainer}>
          {slots.map((slot, index) => {
            const slotResponses = responses.filter((r) => r.slot_index === index);
            const isSignedUp = slotResponses.some((r) => r.user_id === currentUserId);
            const isFull = slot.maxSignups ? slotResponses.length >= slot.maxSignups : false;
            const canSignUp = !isFull || isSignedUp;

            return (
              <View key={index} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <View style={styles.slotInfo}>
                    <Text style={styles.slotName} numberOfLines={1}>
                      {slot.name}
                    </Text>
                    {slot.addedBy && (
                      <View style={styles.addedBadge}>
                        <Text style={styles.addedText}>added</Text>
                      </View>
                    )}
                    <Text style={styles.slotCount}>
                      {slotResponses.length}
                      {slot.maxSignups ? `/${slot.maxSignups}` : ''} signed up
                    </Text>
                    {isFull && !isSignedUp && (
                      <View style={styles.fullBadge}>
                        <Text style={styles.fullText}>Full</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.signupButton,
                      isSignedUp && styles.signupButtonActive,
                      !canSignUp && styles.signupButtonDisabled,
                    ]}
                    onPress={() => handleSignup(index)}
                    disabled={!canSignUp || signingUp !== null}
                  >
                    {signingUp === index ? (
                      <ActivityIndicator size="small" color={isSignedUp ? colors.emerald[700] : colors.white} />
                    ) : isSignedUp ? (
                      <>
                        <Check size={14} color={colors.emerald[700]} />
                        <Text style={styles.signupButtonTextActive}>Signed Up</Text>
                      </>
                    ) : (
                      <Text style={styles.signupButtonText}>Sign Up</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Show who signed up */}
                {slotResponses.length > 0 && (
                  <View style={styles.responsesList}>
                    {slotResponses.map((response) => (
                      <View key={response.id} style={styles.responseChip}>
                        <User size={12} color={colors.slate[400]} />
                        <Text style={styles.responseName}>
                          {response.profiles?.full_name || 'Unknown'}
                        </Text>
                        {response.user_id === currentUserId && (
                          <Text style={styles.youText}>(you)</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add New Slot */}
          {allowUserSlots && currentUserId && (
            <View style={styles.addSlotContainer}>
              {showAddSlot ? (
                <View style={styles.addSlotForm}>
                  <TextInput
                    style={styles.addSlotInput}
                    placeholder="What will you bring?"
                    placeholderTextColor={colors.slate[400]}
                    value={newSlotName}
                    onChangeText={setNewSlotName}
                    autoFocus
                    onSubmitEditing={() => {
                      if (newSlotName.trim()) handleAddSlot();
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.addSlotButton, (!newSlotName.trim() || addingSlot) && styles.addSlotButtonDisabled]}
                    onPress={handleAddSlot}
                    disabled={!newSlotName.trim() || addingSlot}
                  >
                    {addingSlot ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.addSlotButtonText}>Add</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddSlot(false);
                      setNewSlotName('');
                    }}
                    style={styles.cancelAddButton}
                  >
                    <X size={18} color={colors.slate[400]} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.showAddButton} onPress={() => setShowAddSlot(true)}>
                  <Plus size={16} color={colors.emerald[600]} />
                  <Text style={styles.showAddButtonText}>Add something to bring</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Empty state */}
          {slots.length === 0 && allowUserSlots && (
            <Text style={styles.emptyText}>No items yet. Be the first to add something!</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.emerald[200],
    backgroundColor: colors.emerald[50],
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.emerald[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.emerald[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.emerald[700],
  },
  openListBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.emerald[200],
    borderRadius: 10,
  },
  openListText: {
    fontSize: 11,
    color: colors.emerald[700],
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  description: {
    fontSize: 13,
    color: colors.slate[600],
    marginTop: 4,
  },
  slotsContainer: {
    marginTop: 12,
    gap: 10,
  },
  slotCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  slotName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
    maxWidth: '40%',
  },
  addedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.emerald[50],
    borderRadius: 4,
  },
  addedText: {
    fontSize: 10,
    color: colors.emerald[600],
  },
  slotCount: {
    fontSize: 11,
    color: colors.slate[500],
  },
  fullBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.error[100],
    borderRadius: 10,
  },
  fullText: {
    fontSize: 10,
    color: colors.error[600],
  },
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.emerald[600],
  },
  signupButtonActive: {
    backgroundColor: colors.emerald[100],
  },
  signupButtonDisabled: {
    backgroundColor: colors.slate[100],
  },
  signupButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.white,
  },
  signupButtonTextActive: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.emerald[700],
  },
  responsesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.slate[50],
  },
  responseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  responseName: {
    fontSize: 12,
    color: colors.slate[700],
  },
  youText: {
    fontSize: 12,
    color: colors.emerald[600],
  },
  addSlotContainer: {
    marginTop: 4,
  },
  addSlotForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.emerald[300],
    backgroundColor: colors.emerald[50],
  },
  addSlotInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.slate[900],
  },
  addSlotButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.emerald[600],
    borderRadius: 8,
  },
  addSlotButtonDisabled: {
    opacity: 0.5,
  },
  addSlotButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.white,
  },
  cancelAddButton: {
    padding: 4,
  },
  showAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.emerald[300],
  },
  showAddButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.emerald[600],
  },
  emptyText: {
    fontSize: 13,
    color: colors.slate[500],
    textAlign: 'center',
    paddingVertical: 8,
  },
});
