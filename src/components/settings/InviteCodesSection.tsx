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
            return 'bg-purple-100 text-purple-700';
        case 'director':
            return 'bg-indigo-100 text-indigo-700';
        case 'admin':
            return 'bg-blue-100 text-blue-700';
        case 'coach':
            return 'bg-green-100 text-green-700';
        case 'parent':
            return 'bg-amber-100 text-amber-700';
        case 'athlete':
            return 'bg-pink-100 text-pink-700';
        default:
            return 'bg-slate-100 text-slate-700';
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
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Create new invite */}
            <div className="flex flex-wrap gap-2 mb-4 items-end">
                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
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
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max Uses</label>
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
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
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
                    <Loader2 className="animate-spin h-6 w-6 text-slate-400 mx-auto" />
                </div>
            ) : invites.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Link className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">No invite codes yet.</p>
                    <p className="text-xs text-slate-400">Create an invite code above to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {invites.map((invite) => (
                        <div
                            key={invite.id}
                            className={`flex items-center justify-between rounded-lg px-4 py-3 border ${invite.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <code className="text-lg font-mono font-bold text-slate-900 tracking-wider">
                                        {invite.code}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyCode(invite.code)}
                                        className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
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
                                <span className="text-xs text-slate-500">
                                    {invite.max_uses ? `${invite.uses}/${invite.max_uses} uses` : `${invite.uses} uses`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleToggleInvite(invite.id, invite.is_active)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${invite.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {invite.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteInvite(invite.id, invite.code)}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
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
