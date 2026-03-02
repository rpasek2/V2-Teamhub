import { useEffect } from 'react';
import { Loader2, Plus, Link, Copy, Check, Trash2, UserPlus } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useInviteCodes } from '../../hooks/useInviteCodes';
import type { HubRole } from '../../types';

interface InviteCodesSectionProps {
    hubId: string | undefined;
}

const getRoleColor = (role: HubRole): string => {
    switch (role) {
        case 'owner':
            return 'bg-purple-500/10 text-purple-600';
        case 'director':
            return 'bg-indigo-500/10 text-indigo-600';
        case 'admin':
            return 'bg-blue-500/10 text-blue-600';
        case 'coach':
            return 'bg-green-500/10 text-green-600';
        case 'parent':
            return 'bg-amber-500/10 text-amber-600';
        case 'athlete':
            return 'bg-pink-500/10 text-pink-600';
        default:
            return 'bg-surface-hover text-body';
    }
};

export function InviteCodesSection({ hubId }: InviteCodesSectionProps) {
    const {
        invites,
        loadingInvites,
        creatingInvite,
        newInviteRole,
        newInviteMaxUses,
        copiedCode,
        message,
        setNewInviteRole,
        setNewInviteMaxUses,
        fetchInvites,
        handleCreateInvite,
        handleCopyCode,
        handleToggleInvite,
        handleDeleteInvite,
    } = useInviteCodes({ hubId });

    useEffect(() => {
        if (hubId) {
            fetchInvites();
        }
    }, [hubId, fetchInvites]);

    return (
        <CollapsibleSection
            title="Invite Codes"
            icon={UserPlus}
            description="Create invite codes to allow new members to join your hub"
        >
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            {/* Create new invite */}
            <div className="flex flex-wrap gap-2 mb-4 items-end">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-subtle mb-1">Role</label>
                    <select
                        value={newInviteRole}
                        onChange={(e) => setNewInviteRole(e.target.value as HubRole)}
                        className="input"
                    >
                        <option value="director">Director</option>
                        <option value="admin">Admin</option>
                        <option value="coach">Coach</option>
                        <option value="parent">Parent</option>
                        <option value="athlete">Athlete</option>
                    </select>
                </div>
                <div className="w-32">
                    <label className="block text-xs font-medium text-subtle mb-1">Max Uses</label>
                    <input
                        type="number"
                        min="1"
                        value={newInviteMaxUses}
                        onChange={(e) => setNewInviteMaxUses(e.target.value)}
                        placeholder="Unlimited"
                        className="input"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreateInvite}
                    disabled={creatingInvite}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50"
                >
                    {creatingInvite ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                        <>
                            <Plus className="h-4 w-4 mr-1" />
                            Create Invite
                        </>
                    )}
                </button>
            </div>

            {/* Invites list */}
            {loadingInvites ? (
                <div className="text-center py-6">
                    <Loader2 className="animate-spin h-6 w-6 text-faint mx-auto" />
                </div>
            ) : invites.length === 0 ? (
                <div className="text-center py-6 bg-surface-alt rounded-lg border-2 border-dashed border-line">
                    <Link className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-2 text-sm text-muted">No invite codes yet.</p>
                    <p className="text-xs text-faint">Create an invite code above to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {invites.map((invite) => (
                        <div
                            key={invite.id}
                            className={`flex items-center justify-between rounded-lg px-4 py-3 border ${invite.is_active ? 'bg-surface border-line' : 'bg-surface-alt border-line opacity-60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <code className="text-lg font-mono font-bold text-heading tracking-wider">
                                        {invite.code}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(invite.code)}
                                        className="p-1 text-faint hover:text-accent-600 transition-colors"
                                        title="Copy code"
                                    >
                                        {copiedCode === invite.code ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getRoleColor(invite.role)}`}>
                                    {invite.role}
                                </span>
                                <span className="text-xs text-muted">
                                    {invite.max_uses ? `${invite.uses}/${invite.max_uses} uses` : `${invite.uses} uses`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleToggleInvite(invite.id, invite.is_active)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${invite.is_active ? 'bg-green-500/10 text-green-600 hover:bg-green-500/15' : 'bg-surface-hover text-subtle hover:bg-surface-active'}`}
                                >
                                    {invite.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteInvite(invite.id, invite.code)}
                                    className="p-1 text-faint hover:text-red-600 transition-colors"
                                    title="Delete invite"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CollapsibleSection>
    );
}
