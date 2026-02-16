import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHub } from '../context/HubContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Hash, Trash2, MessageSquare, Link, Copy, Check, UserPlus, Building2, User, Info, AlertTriangle, Calendar, Cake, ShieldAlert } from 'lucide-react';
import type { HubPermissions, HubInvite, HubRole, HubFeatureTab, SeasonConfig } from '../types';
import { HUB_FEATURE_TABS } from '../types';
import { LinkedHubsSettings } from '../components/marketplace/LinkedHubsSettings';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { DeleteHubModal } from '../components/hubs/DeleteHubModal';
import { ScoresSettingsSection } from '../components/settings/ScoresSettingsSection';
import { PermissionsSection } from '../components/settings/PermissionsSection';
import { FeatureTabsSection } from '../components/settings/FeatureTabsSection';
import { LevelsSection } from '../components/settings/LevelsSection';
import { SeasonsSection } from '../components/settings/SeasonsSection';
import { ParentPrivacySection } from '../components/settings/ParentPrivacySection';
import { DEFAULT_SEASON_CONFIG } from '../lib/seasons';

const FEATURES = ['roster', 'calendar', 'messages', 'competitions', 'scores', 'skills', 'marketplace', 'groups', 'mentorship'] as const;

interface HubChannel {
    id: string;
    name: string;
    type: 'public' | 'private';
    group_id: string | null;
    dm_participant_ids: string[] | null;
    created_at: string;
}

export function Settings() {
    const navigate = useNavigate();
    const { hub, currentRole, refreshHub } = useHub();
    const { isParent } = useRoleChecks();

    // Delete hub modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [permissions, setPermissions] = useState<HubPermissions>({});
    const [levels, setLevels] = useState<string[]>([]);

    // Channels state
    const [channels, setChannels] = useState<HubChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [addingChannel, setAddingChannel] = useState(false);
    const [channelsMessage, setChannelsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Invite codes state
    const [invites, setInvites] = useState<HubInvite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [newInviteRole, setNewInviteRole] = useState<HubRole>('parent');
    const [newInviteMaxUses, setNewInviteMaxUses] = useState<string>('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [invitesMessage, setInvitesMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Owner info state
    const [ownerInfo, setOwnerInfo] = useState<{ name: string; organization: string | null } | null>(null);

    // Enabled tabs state
    const [enabledTabs, setEnabledTabs] = useState<Set<HubFeatureTab>>(new Set(HUB_FEATURE_TABS.map(t => t.id)));

    // Calendar settings state
    const [showBirthdays, setShowBirthdays] = useState(false);
    const [savingCalendarSettings, setSavingCalendarSettings] = useState(false);
    const [calendarSettingsMessage, setCalendarSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Messaging settings state
    const [anonymousReportsEnabled, setAnonymousReportsEnabled] = useState(true);
    const [savingMessagingSettings, setSavingMessagingSettings] = useState(false);
    const [messagingSettingsMessage, setMessagingSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Season settings state
    const [seasonConfig, setSeasonConfig] = useState<SeasonConfig>(DEFAULT_SEASON_CONFIG);

    useEffect(() => {
        if (hub?.settings?.permissions) {
            setPermissions(hub.settings.permissions);
        } else {
            // Initialize with defaults if empty
            const defaults: HubPermissions = {};
            FEATURES.forEach(feature => {
                defaults[feature] = {
                    admin: 'all',
                    coach: 'all',
                    parent: 'own'
                };
            });
            setPermissions(defaults);
        }

        // Load levels
        if (hub?.settings?.levels) {
            setLevels(hub.settings.levels);
        } else {
            setLevels([]);
        }

        // Load enabled tabs
        if (hub?.settings?.enabledTabs) {
            setEnabledTabs(new Set(hub.settings.enabledTabs));
        } else {
            // Default: all tabs enabled
            setEnabledTabs(new Set(HUB_FEATURE_TABS.map(t => t.id)));
        }

        // Load calendar settings
        if (hub?.settings?.showBirthdays !== undefined) {
            setShowBirthdays(hub.settings.showBirthdays);
        } else {
            setShowBirthdays(false);
        }

        // Load messaging settings
        if (hub?.settings?.anonymous_reports_enabled !== undefined) {
            setAnonymousReportsEnabled(hub.settings.anonymous_reports_enabled);
        } else {
            setAnonymousReportsEnabled(true); // Default to enabled
        }

        // Load season config
        if (hub?.settings?.seasonConfig) {
            setSeasonConfig(hub.settings.seasonConfig);
        } else {
            setSeasonConfig(DEFAULT_SEASON_CONFIG);
        }

        // Load channels, invites, and owner info
        if (hub) {
            fetchChannels();
            fetchInvites();
            fetchOwnerInfo();
        }
    }, [hub]);

    const fetchOwnerInfo = async () => {
        if (!hub) return;

        const { data, error } = await supabase
            .from('hub_members')
            .select(`
                user:profiles (
                    full_name,
                    organization
                )
            `)
            .eq('hub_id', hub.id)
            .eq('role', 'owner')
            .single();

        if (error) {
            console.error('Error fetching owner info:', error);
            return;
        }

        if (data?.user) {
            const userProfile = Array.isArray(data.user) ? data.user[0] : data.user as any;
            setOwnerInfo({
                name: userProfile?.full_name || '',
                organization: userProfile?.organization || null
            });
        }
    };

    const fetchChannels = async () => {
        if (!hub) return;
        setLoadingChannels(true);

        const { data, error } = await supabase
            .from('channels')
            .select('id, name, type, group_id, dm_participant_ids, created_at')
            .eq('hub_id', hub.id)
            .is('group_id', null)
            .is('dm_participant_ids', null)
            .order('name');

        if (error) {
            console.error('Error fetching channels:', error);
        } else {
            setChannels(data || []);
        }
        setLoadingChannels(false);
    };

    const fetchInvites = async () => {
        if (!hub) return;
        setLoadingInvites(true);

        const { data, error } = await supabase
            .from('hub_invites')
            .select('*, profiles:created_by(full_name)')
            .eq('hub_id', hub.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching invites:', error);
        } else {
            setInvites(data || []);
        }
        setLoadingInvites(false);
    };

    const generateInviteCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, I, 1
        const randomValues = crypto.getRandomValues(new Uint8Array(6));
        return Array.from(randomValues, (byte) => chars[byte % chars.length]).join('');
    };

    const handleCreateInvite = async () => {
        if (!hub) return;
        setCreatingInvite(true);
        setInvitesMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const code = generateInviteCode();
            const maxUses = newInviteMaxUses ? parseInt(newInviteMaxUses) : null;

            const { error } = await supabase
                .from('hub_invites')
                .insert([{
                    hub_id: hub.id,
                    code,
                    role: newInviteRole,
                    created_by: user.id,
                    max_uses: maxUses,
                    uses: 0,
                    is_active: true
                }]);

            if (error) throw error;

            setNewInviteMaxUses('');
            await fetchInvites();
            setInvitesMessage({ type: 'success', text: `Invite code created: ${code}` });
        } catch (err: unknown) {
            console.error('Error creating invite:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create invite.';
            setInvitesMessage({ type: 'error', text: errorMessage });
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleToggleInvite = async (inviteId: string, currentActive: boolean) => {
        try {
            const { error } = await supabase
                .from('hub_invites')
                .update({ is_active: !currentActive })
                .eq('id', inviteId);

            if (error) throw error;
            await fetchInvites();
        } catch (err) {
            console.error('Error toggling invite:', err);
        }
    };

    const handleDeleteInvite = async (inviteId: string, code: string) => {
        if (!confirm(`Are you sure you want to delete invite code ${code}?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('hub_invites')
                .delete()
                .eq('id', inviteId);

            if (error) throw error;
            await fetchInvites();
            setInvitesMessage({ type: 'success', text: 'Invite deleted successfully.' });
        } catch (err: unknown) {
            console.error('Error deleting invite:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete invite.';
            setInvitesMessage({ type: 'error', text: errorMessage });
        }
    };

    const getRoleColor = (role: HubRole) => {
        const colors: Record<HubRole, string> = {
            owner: 'bg-purple-100 text-purple-700',
            director: 'bg-indigo-100 text-indigo-700',
            admin: 'bg-blue-100 text-blue-700',
            coach: 'bg-green-100 text-green-700',
            parent: 'bg-amber-100 text-amber-700',
            athlete: 'bg-pink-100 text-pink-700'
        };
        return colors[role] || 'bg-slate-100 text-slate-600';
    };

    const handleAddChannel = async () => {
        if (!hub || !newChannelName.trim()) return;
        setAddingChannel(true);
        setChannelsMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('channels')
                .insert([{
                    hub_id: hub.id,
                    name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
                    type: 'public',
                    created_by: user.id
                }]);

            if (error) throw error;

            setNewChannelName('');
            await fetchChannels();
            setChannelsMessage({ type: 'success', text: 'Channel created successfully.' });
        } catch (err: unknown) {
            console.error('Error creating channel:', err);
            setChannelsMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create channel.' });
        } finally {
            setAddingChannel(false);
        }
    };

    const handleDeleteChannel = async (channelId: string, channelName: string) => {
        if (!confirm(`Are you sure you want to delete #${channelName}? All messages in this channel will be permanently deleted.`)) {
            return;
        }

        setChannelsMessage(null);

        try {
            const { error } = await supabase
                .from('channels')
                .delete()
                .eq('id', channelId);

            if (error) throw error;

            await fetchChannels();
            setChannelsMessage({ type: 'success', text: 'Channel deleted successfully.' });
        } catch (err: unknown) {
            console.error('Error deleting channel:', err);
            setChannelsMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete channel.' });
        }
    };

    // Only owner can manage permissions (director permissions are now configurable by owner)
    const canManagePermissions = currentRole === 'owner';

    const handleToggleBirthdays = async () => {
        if (!hub) return;
        setSavingCalendarSettings(true);
        setCalendarSettingsMessage(null);

        const newValue = !showBirthdays;

        try {
            const updatedSettings = {
                ...hub.settings,
                showBirthdays: newValue
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            setShowBirthdays(newValue);
            await refreshHub();
            setCalendarSettingsMessage({ type: 'success', text: `Birthdays ${newValue ? 'enabled' : 'disabled'} on calendar.` });
        } catch (err: unknown) {
            console.error('Error saving calendar settings:', err);
            setCalendarSettingsMessage({ type: 'error', text: 'Failed to save calendar settings.' });
        } finally {
            setSavingCalendarSettings(false);
        }
    };

    const handleToggleAnonymousReports = async () => {
        if (!hub) return;
        setSavingMessagingSettings(true);
        setMessagingSettingsMessage(null);

        const newValue = !anonymousReportsEnabled;

        try {
            const updatedSettings = {
                ...hub.settings,
                anonymous_reports_enabled: newValue
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            setAnonymousReportsEnabled(newValue);
            await refreshHub();
            setMessagingSettingsMessage({ type: 'success', text: `Anonymous reports ${newValue ? 'enabled' : 'disabled'}.` });
        } catch (err: unknown) {
            console.error('Error saving messaging settings:', err);
            setMessagingSettingsMessage({ type: 'error', text: 'Failed to save messaging settings.' });
        } finally {
            setSavingMessagingSettings(false);
        }
    };

    // Parent Settings View
    if (isParent) {
        return (
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500">Manage your privacy and preferences.</p>
                </div>

                {/* Privacy Settings for Parents */}
                <ParentPrivacySection />

                {/* Hub Information for Parents */}
                <CollapsibleSection
                    title="Hub Information"
                    icon={Info}
                    description="Information about this hub"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-500">Hub Name</label>
                            <div className="mt-1 text-sm text-slate-900">{hub?.name}</div>
                        </div>
                        {ownerInfo && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500">Owner</label>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-900">
                                        <User className="h-4 w-4 text-slate-400" />
                                        {ownerInfo.name}
                                    </div>
                                </div>
                                {ownerInfo.organization && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500">Organization</label>
                                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-900">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            {ownerInfo.organization}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CollapsibleSection>
            </div>
        );
    }

    // Owner/Admin/Coach Settings View (original view)
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your hub settings.</p>
            </div>

            {/* Hub Information - Always visible, not collapsible */}
            <CollapsibleSection
                title="Hub Information"
                icon={Info}
                defaultOpen={true}
                description="Basic information about your hub"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-500">Hub Name</label>
                        <div className="mt-1 text-sm text-slate-900">{hub?.name}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500">Hub ID</label>
                        <div className="mt-1 text-sm text-slate-500 font-mono text-xs">{hub?.id}</div>
                    </div>
                    {ownerInfo && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-500">Owner</label>
                                <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-900">
                                    <User className="h-4 w-4 text-slate-400" />
                                    {ownerInfo.name}
                                </div>
                            </div>
                            {ownerInfo.organization && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-500">Organization</label>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-900">
                                        <Building2 className="h-4 w-4 text-slate-400" />
                                        {ownerInfo.organization}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CollapsibleSection>

            {/* Feature Tabs Section */}
            {canManagePermissions && (
                <FeatureTabsSection enabledTabs={enabledTabs} setEnabledTabs={setEnabledTabs} />
            )}

            {/* Calendar Settings Section */}
            {canManagePermissions && (
                <CollapsibleSection
                    title="Calendar Settings"
                    icon={Calendar}
                    description="Configure calendar display options"
                >
                    {calendarSettingsMessage && (
                        <div className={`mb-4 p-4 rounded-md ${calendarSettingsMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {calendarSettingsMessage.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Show Birthdays Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-100 rounded-lg">
                                    <Cake className="h-5 w-5 text-pink-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Show Birthdays</p>
                                    <p className="text-xs text-slate-500">Display roster birthdays on the calendar</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showBirthdays}
                                onClick={handleToggleBirthdays}
                                disabled={savingCalendarSettings}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                                    showBirthdays ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        showBirthdays ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Messaging Settings Section - Owner only */}
            {currentRole === 'owner' && (
                <CollapsibleSection
                    title="Messaging Settings"
                    icon={MessageSquare}
                    description="Configure messaging and reporting options"
                >
                    {messagingSettingsMessage && (
                        <div className={`mb-4 p-4 rounded-md ${messagingSettingsMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {messagingSettingsMessage.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Anonymous Reports Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <ShieldAlert className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Anonymous Reports</p>
                                    <p className="text-xs text-slate-500">Allow members to submit anonymous reports to you</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={anonymousReportsEnabled}
                                onClick={handleToggleAnonymousReports}
                                disabled={savingMessagingSettings}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
                                    anonymousReportsEnabled ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        anonymousReportsEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Invite Codes Section */}
            {canManagePermissions && (
                <CollapsibleSection
                    title="Invite Codes"
                    icon={UserPlus}
                    description="Create invite codes to allow new members to join your hub"
                >
                    {invitesMessage && (
                        <div className={`mb-4 p-4 rounded-md ${invitesMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {invitesMessage.text}
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
            )}

            {canManagePermissions && (
                <LevelsSection levels={levels} setLevels={setLevels} />
            )}

            {/* Seasons Settings Section */}
            {canManagePermissions && (
                <SeasonsSection seasonConfig={seasonConfig} setSeasonConfig={setSeasonConfig} />
            )}

            {/* Scores Settings Section */}
            {canManagePermissions && <ScoresSettingsSection />}

            {/* Channels Management Section */}
            {canManagePermissions && (
                <CollapsibleSection
                    title="Hub Channels"
                    icon={MessageSquare}
                    description="Manage hub-wide channels that all members can access"
                >
                    {channelsMessage && (
                        <div className={`mb-4 p-4 rounded-md ${channelsMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                            {channelsMessage.text}
                        </div>
                    )}

                    {/* Add new channel input */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <Hash className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChannel())}
                                placeholder="channel-name"
                                className="input w-full pl-9"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddChannel}
                            disabled={!newChannelName.trim() || addingChannel}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {addingChannel ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </>
                            )}
                        </button>
                    </div>

                    {/* Channels list */}
                    {loadingChannels ? (
                        <div className="text-center py-6">
                            <Loader2 className="animate-spin h-6 w-6 text-slate-400 mx-auto" />
                        </div>
                    ) : channels.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                            <Hash className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500">No channels yet.</p>
                            <p className="text-xs text-slate-400">Add a channel above to get started.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {channels.map((channel) => (
                                <li
                                    key={channel.id}
                                    className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200"
                                >
                                    <div className="flex items-center">
                                        <Hash className="h-4 w-4 text-slate-400 mr-2" />
                                        <span className="text-sm font-medium text-slate-900">{channel.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteChannel(channel.id, channel.name)}
                                        className="p-1 text-slate-400 hover:text-red-600"
                                        title="Delete channel"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CollapsibleSection>
            )}

            {/* Linked Marketplaces - Only visible to hub owners */}
            <LinkedHubsSettings />

            {canManagePermissions && (
                <PermissionsSection permissions={permissions} setPermissions={setPermissions} />
            )}

            {/* Danger Zone - Only visible to hub owner */}
            {currentRole === 'owner' && hub && (
                <CollapsibleSection
                    title="Danger Zone"
                    icon={AlertTriangle}
                    description="Irreversible actions for your hub"
                >
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Delete Hub</p>
                                <p className="text-xs text-slate-500">Permanently delete this hub and all its data</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Hub
                        </button>
                    </div>
                </CollapsibleSection>
            )}

            {/* Delete Hub Modal */}
            {hub && (
                <DeleteHubModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    hub={{ id: hub.id, name: hub.name, role: currentRole || '' }}
                    onHubDeleted={() => navigate('/')}
                />
            )}
        </div>
    );
}
