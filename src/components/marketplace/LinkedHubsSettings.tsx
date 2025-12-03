import { useState, useEffect } from 'react';
import { Link2, Plus, Check, X, Loader2, Trash2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import { LinkHubModal } from './LinkHubModal';

interface LinkedHub {
    id: string;
    name: string;
    link_id: string;
    status: 'active' | 'pending';
    is_incoming: boolean; // true if we received the request, false if we sent it
}

export function LinkedHubsSettings() {
    const { user } = useAuth();
    const { hub, currentRole } = useHub();
    const [linkedHubs, setLinkedHubs] = useState<LinkedHub[]>([]);
    const [pendingRequests, setPendingRequests] = useState<LinkedHub[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const isOwner = currentRole === 'owner';

    useEffect(() => {
        if (hub && isOwner) {
            fetchLinkedHubs();
        }
    }, [hub, isOwner]);

    const fetchLinkedHubs = async () => {
        if (!hub?.id) return;
        setLoading(true);

        try {
            // Get all links involving this hub
            const { data, error } = await supabase
                .from('marketplace_hub_links')
                .select(`
                    id,
                    requester_hub_id,
                    target_hub_id,
                    status,
                    requester_hub:requester_hub_id (id, name),
                    target_hub:target_hub_id (id, name)
                `)
                .or(`requester_hub_id.eq.${hub.id},target_hub_id.eq.${hub.id}`);

            if (error) throw error;

            const active: LinkedHub[] = [];
            const pending: LinkedHub[] = [];

            (data || []).forEach((link: any) => {
                const isRequester = link.requester_hub_id === hub.id;
                const otherHub = isRequester ? link.target_hub : link.requester_hub;

                const linkedHubEntry: LinkedHub = {
                    id: otherHub.id,
                    name: otherHub.name,
                    link_id: link.id,
                    status: link.status,
                    is_incoming: !isRequester
                };

                if (link.status === 'active') {
                    active.push(linkedHubEntry);
                } else if (link.status === 'pending') {
                    pending.push(linkedHubEntry);
                }
            });

            setLinkedHubs(active);
            setPendingRequests(pending);
        } catch (error) {
            console.error('Error fetching linked hubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveLink = async (linkId: string) => {
        if (!user) return;
        setProcessingId(linkId);

        try {
            const { error } = await supabase
                .from('marketplace_hub_links')
                .update({
                    status: 'active',
                    approved_by: user.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', linkId);

            if (error) throw error;
            fetchLinkedHubs();
        } catch (error) {
            console.error('Error approving link:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectLink = async (linkId: string) => {
        setProcessingId(linkId);

        try {
            const { error } = await supabase
                .from('marketplace_hub_links')
                .update({
                    status: 'rejected',
                    updated_at: new Date().toISOString()
                })
                .eq('id', linkId);

            if (error) throw error;
            fetchLinkedHubs();
        } catch (error) {
            console.error('Error rejecting link:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRemoveLink = async (linkId: string) => {
        setProcessingId(linkId);

        try {
            const { error } = await supabase
                .from('marketplace_hub_links')
                .delete()
                .eq('id', linkId);

            if (error) throw error;
            fetchLinkedHubs();
        } catch (error) {
            console.error('Error removing link:', error);
        } finally {
            setProcessingId(null);
        }
    };

    if (!isOwner) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                        <Link2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Linked Marketplaces</h3>
                        <p className="text-sm text-slate-500">
                            Share your marketplace with other hubs you manage
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                    <Plus className="h-4 w-4" />
                    Link Hub
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Pending Incoming Requests */}
                    {pendingRequests.filter(r => r.is_incoming).length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                Pending Requests
                            </h4>
                            <div className="space-y-2">
                                {pendingRequests.filter(r => r.is_incoming).map((request) => (
                                    <div
                                        key={request.link_id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">{request.name}</p>
                                            <p className="text-xs text-slate-500">
                                                Wants to link their marketplace with yours
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApproveLink(request.link_id)}
                                                disabled={processingId === request.link_id}
                                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {processingId === request.link_id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Check className="h-3 w-3" />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectLink(request.link_id)}
                                                disabled={processingId === request.link_id}
                                                className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                                            >
                                                <X className="h-3 w-3" />
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Outgoing Requests */}
                    {pendingRequests.filter(r => !r.is_incoming).length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                Awaiting Approval
                            </h4>
                            <div className="space-y-2">
                                {pendingRequests.filter(r => !r.is_incoming).map((request) => (
                                    <div
                                        key={request.link_id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                                    >
                                        <div>
                                            <p className="font-medium text-slate-900">{request.name}</p>
                                            <p className="text-xs text-slate-500">
                                                Waiting for their approval
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveLink(request.link_id)}
                                            disabled={processingId === request.link_id}
                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            {processingId === request.link_id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            Cancel
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active Links */}
                    {linkedHubs.length > 0 ? (
                        <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-3">
                                Active Links ({linkedHubs.length})
                            </h4>
                            <div className="space-y-2">
                                {linkedHubs.map((linkedHub) => (
                                    <div
                                        key={linkedHub.link_id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Link2 className="h-4 w-4 text-purple-600" />
                                            <p className="font-medium text-slate-900">{linkedHub.name}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveLink(linkedHub.link_id)}
                                            disabled={processingId === linkedHub.link_id}
                                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            {processingId === linkedHub.link_id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3 w-3" />
                                            )}
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="text-center py-8">
                            <Link2 className="mx-auto h-10 w-10 text-slate-300" />
                            <p className="mt-3 text-sm text-slate-500">
                                No linked hubs yet. Link your other hubs to share marketplace items.
                            </p>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Link Hub Modal */}
            <LinkHubModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onLinkRequested={fetchLinkedHubs}
                existingLinkIds={[...linkedHubs.map(h => h.id), ...pendingRequests.map(h => h.id)]}
            />
        </div>
    );
}
