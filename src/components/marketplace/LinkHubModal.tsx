import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, Loader2, Search, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';

interface OtherHub {
    id: string;
    name: string;
}

interface LinkHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLinkRequested: () => void;
    existingLinkIds: string[]; // Hub IDs that are already linked or have pending requests
}

export function LinkHubModal({ isOpen, onClose, onLinkRequested, existingLinkIds }: LinkHubModalProps) {
    const { user } = useAuth();
    const { hub } = useHub();
    const [otherHubs, setOtherHubs] = useState<OtherHub[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchOtherHubs();
        }
    }, [isOpen, user]);

    const fetchOtherHubs = async () => {
        if (!user || !hub?.id) return;
        setLoading(true);
        setError(null);

        try {
            // Get all hubs where the user is an owner (excluding current hub)
            const { data, error } = await supabase
                .from('hub_members')
                .select(`
                    hub_id,
                    hubs:hub_id (id, name)
                `)
                .eq('user_id', user.id)
                .eq('role', 'owner')
                .neq('hub_id', hub.id);

            if (error) throw error;

            // Extract hub info, filtering out already linked hubs
            const hubs = (data || [])
                .map((m: any) => m.hubs)
                .filter((h: OtherHub | null) => h && !existingLinkIds.includes(h.id)) as OtherHub[];

            setOtherHubs(hubs);
        } catch (error) {
            console.error('Error fetching other hubs:', error);
            setError('Failed to load your other hubs');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedHubId || !user || !hub?.id) return;
        setSubmitting(true);
        setError(null);

        try {
            // Create link request
            const { error } = await supabase
                .from('marketplace_hub_links')
                .insert({
                    requester_hub_id: hub.id,
                    target_hub_id: selectedHubId,
                    requested_by: user.id,
                    status: 'pending'
                });

            if (error) {
                if (error.code === '23505') {
                    // Unique constraint violation - link already exists
                    setError('A link request already exists between these hubs');
                    return;
                }
                throw error;
            }

            onLinkRequested();
            handleClose();
        } catch (error) {
            console.error('Error creating link request:', error);
            setError('Failed to create link request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedHubId(null);
        setSearchQuery('');
        setError(null);
        onClose();
    };

    const filteredHubs = otherHubs.filter(h =>
        h.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={handleClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                                <Link2 className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Link Marketplace</h2>
                                <p className="text-sm text-slate-500">Share items with another hub</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-6 py-4">
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : otherHubs.length === 0 ? (
                            <div className="text-center py-8">
                                <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-3 text-sm text-slate-500">
                                    You don't own any other hubs to link with.
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    You can only link marketplaces between hubs you own.
                                </p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600 mb-4">
                                    Select one of your other hubs to share marketplace items with.
                                    The other hub's owner will need to approve the link.
                                </p>

                                {/* Search */}
                                {otherHubs.length > 3 && (
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search hubs..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                        />
                                    </div>
                                )}

                                {/* Hub List */}
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {filteredHubs.map((otherHub) => (
                                        <button
                                            key={otherHub.id}
                                            onClick={() => setSelectedHubId(otherHub.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                                                selectedHubId === otherHub.id
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                                selectedHubId === otherHub.id
                                                    ? 'bg-purple-100'
                                                    : 'bg-slate-100'
                                            }`}>
                                                <Building2 className={`h-5 w-5 ${
                                                    selectedHubId === otherHub.id
                                                        ? 'text-purple-600'
                                                        : 'text-slate-500'
                                                }`} />
                                            </div>
                                            <span className={`font-medium ${
                                                selectedHubId === otherHub.id
                                                    ? 'text-purple-900'
                                                    : 'text-slate-900'
                                            }`}>
                                                {otherHub.name}
                                            </span>
                                        </button>
                                    ))}
                                    {filteredHubs.length === 0 && searchQuery && (
                                        <p className="text-center py-4 text-sm text-slate-500">
                                            No hubs match "{searchQuery}"
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {otherHubs.length > 0 && (
                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                onClick={handleClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedHubId || submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Link2 className="h-4 w-4" />
                                        Send Link Request
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
