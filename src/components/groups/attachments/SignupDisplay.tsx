import { useState, useEffect } from 'react';
import { ClipboardList, Check, Loader2, User, Plus, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useHub } from '../../../context/HubContext';
import type { SignupSlot, SignupResponse, Profile, SignupSettings } from '../../../types';

interface SignupDisplayProps {
    postId: string;
    title: string;
    description?: string;
    slots: SignupSlot[];
    settings?: SignupSettings;
    onSlotsUpdated?: (newSlots: SignupSlot[]) => void;
}

interface SignupResponseWithProfile extends SignupResponse {
    profiles?: Profile;
}

export function SignupDisplay({ postId, title, description, slots: initialSlots, settings, onSlotsUpdated }: SignupDisplayProps) {
    const { user } = useHub();
    const [slots, setSlots] = useState<SignupSlot[]>(initialSlots);
    const [responses, setResponses] = useState<SignupResponseWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [signingUp, setSigningUp] = useState<number | null>(null);
    const [showAddSlot, setShowAddSlot] = useState(false);
    const [newSlotName, setNewSlotName] = useState('');
    const [addingSlot, setAddingSlot] = useState(false);

    useEffect(() => {
        fetchResponses();
    }, [postId]);

    // Update local slots when props change
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
        if (!user || signingUp !== null) return;

        setSigningUp(slotIndex);
        try {
            const isSignedUp = responses.some(
                r => r.user_id === user.id && r.slot_index === slotIndex
            );

            if (isSignedUp) {
                // Remove signup
                const { error } = await supabase
                    .from('signup_responses')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', user.id)
                    .eq('slot_index', slotIndex);

                if (error) throw error;

                // Optimistic update
                setResponses(prev => prev.filter(
                    r => !(r.user_id === user.id && r.slot_index === slotIndex)
                ));
            } else {
                // Check if slot is full
                const slot = slots[slotIndex];
                const slotResponses = responses.filter(r => r.slot_index === slotIndex);
                if (slot.maxSignups && slotResponses.length >= slot.maxSignups) {
                    return; // Slot is full
                }

                // Add signup
                const { error } = await supabase
                    .from('signup_responses')
                    .insert({
                        post_id: postId,
                        user_id: user.id,
                        slot_index: slotIndex
                    });

                if (error) throw error;

                // Optimistic update
                setResponses(prev => [...prev, {
                    id: crypto.randomUUID(),
                    post_id: postId,
                    user_id: user.id,
                    slot_index: slotIndex,
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (err) {
            console.error('Error signing up:', err);
            // Refresh to get accurate state
            fetchResponses();
        } finally {
            setSigningUp(null);
        }
    };

    const handleAddSlot = async () => {
        if (!user || !newSlotName.trim() || addingSlot) return;

        setAddingSlot(true);
        try {
            // First, get the current post to get its attachments
            const { data: post, error: fetchError } = await supabase
                .from('posts')
                .select('attachments')
                .eq('id', postId)
                .single();

            if (fetchError) throw fetchError;

            // Find the signup attachment and add the new slot
            const attachments = post.attachments || [];
            const updatedAttachments = attachments.map((att: any) => {
                if (att.type === 'signup') {
                    return {
                        ...att,
                        slots: [...(att.slots || []), { name: newSlotName.trim(), addedBy: user.id }]
                    };
                }
                return att;
            });

            // Update the post with new slots
            const { error: updateError } = await supabase
                .from('posts')
                .update({ attachments: updatedAttachments })
                .eq('id', postId);

            if (updateError) throw updateError;

            // Update local state
            const newSlot: SignupSlot = { name: newSlotName.trim(), addedBy: user.id };
            const newSlots = [...slots, newSlot];
            setSlots(newSlots);

            // Notify parent if callback provided
            if (onSlotsUpdated) {
                onSlotsUpdated(newSlots);
            }

            // Auto sign up for the slot they just created
            const newSlotIndex = newSlots.length - 1;
            const { error: signupError } = await supabase
                .from('signup_responses')
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    slot_index: newSlotIndex
                });

            if (!signupError) {
                setResponses(prev => [...prev, {
                    id: crypto.randomUUID(),
                    post_id: postId,
                    user_id: user.id,
                    slot_index: newSlotIndex,
                    created_at: new Date().toISOString()
                }]);
            }

            setNewSlotName('');
            setShowAddSlot(false);
        } catch (err) {
            console.error('Error adding slot:', err);
        } finally {
            setAddingSlot(false);
        }
    };

    const handleRemoveUserSlot = async (slotIndex: number) => {
        if (!user) return;

        const slot = slots[slotIndex];
        // Only allow removing slots that the user added and that have no other signups
        if (slot.addedBy !== user.id) return;

        const slotResponses = responses.filter(r => r.slot_index === slotIndex);
        const otherSignups = slotResponses.filter(r => r.user_id !== user.id);
        if (otherSignups.length > 0) return; // Can't remove if others signed up

        try {
            // Remove user's signup for this slot first
            await supabase
                .from('signup_responses')
                .delete()
                .eq('post_id', postId)
                .eq('slot_index', slotIndex);

            // Get current post attachments
            const { data: post, error: fetchError } = await supabase
                .from('posts')
                .select('attachments')
                .eq('id', postId)
                .single();

            if (fetchError) throw fetchError;

            // Remove the slot and reindex responses
            const attachments = post.attachments || [];
            const updatedAttachments = attachments.map((att: any) => {
                if (att.type === 'signup') {
                    const newSlots = att.slots.filter((_: any, i: number) => i !== slotIndex);
                    return { ...att, slots: newSlots };
                }
                return att;
            });

            // Update post
            const { error: updateError } = await supabase
                .from('posts')
                .update({ attachments: updatedAttachments })
                .eq('id', postId);

            if (updateError) throw updateError;

            // Update local state - remove slot and adjust response indices
            const newSlots = slots.filter((_, i) => i !== slotIndex);
            setSlots(newSlots);

            // Remove responses for this slot and adjust indices for slots after it
            setResponses(prev => prev
                .filter(r => r.slot_index !== slotIndex)
                .map(r => ({
                    ...r,
                    slot_index: r.slot_index > slotIndex ? r.slot_index - 1 : r.slot_index
                }))
            );

            if (onSlotsUpdated) {
                onSlotsUpdated(newSlots);
            }
        } catch (err) {
            console.error('Error removing slot:', err);
        }
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                </div>
            </div>
        );
    }

    const allowUserSlots = settings?.allowUserSlots || false;

    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-100 border-b border-emerald-200">
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Sign-Up</span>
                {allowUserSlots && (
                    <span className="text-xs text-emerald-600 bg-emerald-200 px-2 py-0.5 rounded-full ml-auto">
                        Open list
                    </span>
                )}
            </div>
            <div className="p-4">
                <p className="font-medium text-slate-900">{title}</p>
                {description && (
                    <p className="text-sm text-slate-600 mt-1">{description}</p>
                )}

                <div className="mt-4 space-y-3">
                    {slots.map((slot, index) => {
                        const slotResponses = responses.filter(r => r.slot_index === index);
                        const isSignedUp = user ? slotResponses.some(r => r.user_id === user.id) : false;
                        const isFull = slot.maxSignups ? slotResponses.length >= slot.maxSignups : false;
                        const canSignUp = !isFull || isSignedUp;
                        const isUserAdded = !!slot.addedBy;
                        const canRemove = slot.addedBy === user?.id &&
                            slotResponses.filter(r => r.user_id !== user?.id).length === 0;

                        return (
                            <div key={index} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium text-slate-900 truncate">{slot.name}</span>
                                        {isUserAdded && (
                                            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex-shrink-0">
                                                added
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500 flex-shrink-0">
                                            {slotResponses.length}{slot.maxSignups ? `/${slot.maxSignups}` : ''} signed up
                                        </span>
                                        {isFull && !isSignedUp && (
                                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full flex-shrink-0">Full</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {canRemove && (
                                            <button
                                                onClick={() => handleRemoveUserSlot(index)}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded"
                                                title="Remove this item"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleSignup(index)}
                                            disabled={!canSignUp || signingUp !== null}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                isSignedUp
                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                    : canSignUp
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            {signingUp === index ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : isSignedUp ? (
                                                <span className="flex items-center gap-1">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Signed Up
                                                </span>
                                            ) : (
                                                'Sign Up'
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Show who signed up */}
                                {slotResponses.length > 0 && (
                                    <div className="px-4 py-2 bg-slate-50">
                                        <div className="flex flex-wrap gap-2">
                                            {slotResponses.map((response) => (
                                                <div
                                                    key={response.id}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-200 text-xs"
                                                >
                                                    {response.profiles?.avatar_url ? (
                                                        <img
                                                            src={response.profiles.avatar_url}
                                                            alt=""
                                                            className="h-4 w-4 rounded-full"
                                                        />
                                                    ) : (
                                                        <User className="h-3 w-3 text-slate-400" />
                                                    )}
                                                    <span className="text-slate-700">
                                                        {response.profiles?.full_name || 'Unknown'}
                                                    </span>
                                                    {response.user_id === user?.id && (
                                                        <span className="text-emerald-600">(you)</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Add New Slot (if allowed) */}
                    {allowUserSlots && user && (
                        <div className="mt-3">
                            {showAddSlot ? (
                                <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newSlotName}
                                            onChange={(e) => setNewSlotName(e.target.value)}
                                            placeholder="What will you bring?"
                                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newSlotName.trim()) {
                                                    handleAddSlot();
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleAddSlot}
                                            disabled={!newSlotName.trim() || addingSlot}
                                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {addingSlot ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                'Add & Sign Up'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddSlot(false);
                                                setNewSlotName('');
                                            }}
                                            className="p-2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAddSlot(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="text-sm font-medium">Add something to bring</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Empty state when no slots and user slots allowed */}
                    {slots.length === 0 && allowUserSlots && (
                        <p className="text-sm text-slate-500 text-center py-2">
                            No items yet. Be the first to add something!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
