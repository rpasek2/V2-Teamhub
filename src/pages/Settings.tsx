import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Hash, Trash2, MessageSquare, Link, Copy, Check, UserPlus, Building2, User, Info, AlertTriangle, Calendar, Cake, ShieldAlert, Bug, MessageSquarePlus, Send, Palette } from 'lucide-react';
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
import { ACCENT_PRESETS, ACCENT_LABELS, applyAccentColor } from '../lib/accentColors';

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
    const { user } = useAuth();
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

    // Accent color state
    const [accentColor, setAccentColor] = useState('mint');
    const [savingAccentColor, setSavingAccentColor] = useState(false);

    // Feedback form state
    const [feedbackType, setFeedbackType] = useState<'bug' | 'feature_request'>('bug');
    const [feedbackTitle, setFeedbackTitle] = useState('');
    const [feedbackDescription, setFeedbackDescription] = useState('');
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

        // Load accent color
        if (hub?.settings?.accentColor) {
            setAccentColor(hub.settings.accentColor);
        } else {
            setAccentColor('mint');
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
            owner: 'bg-purple-500/10 text-purple-600',
            director: 'bg-indigo-500/10 text-indigo-600',
            admin: 'bg-blue-500/10 text-blue-600',
            coach: 'bg-green-500/10 text-green-600',
            parent: 'bg-amber-500/10 text-amber-600',
            athlete: 'bg-pink-500/10 text-pink-600'
        };
        return colors[role] || 'bg-surface-hover text-subtle';
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

    const handleAccentColorChange = async (preset: string) => {
        if (!hub || savingAccentColor) return;
        setSavingAccentColor(true);
        setAccentColor(preset);
        applyAccentColor(preset);

        try {
            const updatedSettings = {
                ...hub.settings,
                accentColor: preset,
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;
            await refreshHub();
        } catch (err: unknown) {
            console.error('Error saving accent color:', err);
            // Revert on failure
            const prev = hub.settings?.accentColor || 'mint';
            setAccentColor(prev);
            applyAccentColor(prev);
        } finally {
            setSavingAccentColor(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!user || !feedbackTitle.trim() || !feedbackDescription.trim()) return;
        setSubmittingFeedback(true);
        setFeedbackMessage(null);

        try {
            const { error } = await supabase
                .from('feedback_reports')
                .insert({
                    user_id: user.id,
                    hub_id: hub?.id || null,
                    type: feedbackType,
                    title: feedbackTitle.trim(),
                    description: feedbackDescription.trim(),
                });

            if (error) throw error;

            setFeedbackMessage({ type: 'success', text: 'Thank you! Your feedback has been submitted.' });
            setFeedbackTitle('');
            setFeedbackDescription('');
            setFeedbackType('bug');
        } catch (err: unknown) {
            console.error('Error submitting feedback:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback.';
            setFeedbackMessage({ type: 'error', text: errorMessage });
        } finally {
            setSubmittingFeedback(false);
        }
    };

    // Parent Settings View
    if (isParent) {
        return (
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-heading">Settings</h1>
                    <p className="text-muted">Manage your privacy and preferences.</p>
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
                            <label className="block text-sm font-medium text-muted">Hub Name</label>
                            <div className="mt-1 text-sm text-heading">{hub?.name}</div>
                        </div>
                        {ownerInfo && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-muted">Owner</label>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-heading">
                                        <User className="h-4 w-4 text-faint" />
                                        {ownerInfo.name}
                                    </div>
                                </div>
                                {ownerInfo.organization && (
                                    <div>
                                        <label className="block text-sm font-medium text-muted">Organization</label>
                                        <div className="mt-1 flex items-center gap-1.5 text-sm text-heading">
                                            <Building2 className="h-4 w-4 text-faint" />
                                            {ownerInfo.organization}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Feedback & Support for Parents */}
                <CollapsibleSection
                    title="Feedback & Support"
                    icon={Bug}
                    description="Report bugs or request features"
                >
                    {feedbackMessage && (
                        <div className={`mb-4 p-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                            {feedbackMessage.text}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">Type</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setFeedbackType('bug')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${feedbackType === 'bug' ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'}`}>
                                    <Bug className="h-4 w-4" /> Bug Report
                                </button>
                                <button type="button" onClick={() => setFeedbackType('feature_request')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${feedbackType === 'feature_request' ? 'bg-accent-500/10 border-accent-500/30 text-accent-600' : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'}`}>
                                    <MessageSquarePlus className="h-4 w-4" /> Feature Request
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-body">Title</label>
                            <input type="text" value={feedbackTitle} onChange={(e) => setFeedbackTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm" placeholder={feedbackType === 'bug' ? 'Brief description of the bug' : 'Your feature idea'} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-body">Description</label>
                            <textarea rows={4} value={feedbackDescription} onChange={(e) => setFeedbackDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm" placeholder={feedbackType === 'bug' ? 'What happened? What did you expect to happen?' : 'Describe the feature and how it would help you'} />
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={handleSubmitFeedback} disabled={submittingFeedback || !feedbackTitle.trim() || !feedbackDescription.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                {submittingFeedback ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                Submit Feedback
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>
        );
    }

    // Owner/Admin/Coach Settings View (original view)
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-heading">Settings</h1>
                <p className="text-muted">Manage your hub settings.</p>
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
                        <label className="block text-sm font-medium text-muted">Hub Name</label>
                        <div className="mt-1 text-sm text-heading">{hub?.name}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted">Hub ID</label>
                        <div className="mt-1 text-sm text-muted font-mono text-xs">{hub?.id}</div>
                    </div>
                    {ownerInfo && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-muted">Owner</label>
                                <div className="mt-1 flex items-center gap-1.5 text-sm text-heading">
                                    <User className="h-4 w-4 text-faint" />
                                    {ownerInfo.name}
                                </div>
                            </div>
                            {ownerInfo.organization && (
                                <div>
                                    <label className="block text-sm font-medium text-muted">Organization</label>
                                    <div className="mt-1 flex items-center gap-1.5 text-sm text-heading">
                                        <Building2 className="h-4 w-4 text-faint" />
                                        {ownerInfo.organization}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Accent Color Picker — owner + director only */}
                {(currentRole === 'owner' || currentRole === 'director') && (
                    <div className="mt-6 pt-6 border-t border-line">
                        <div className="flex items-center gap-2 mb-3">
                            <Palette className="h-4 w-4 text-muted" />
                            <label className="text-sm font-medium text-body">Accent Color</label>
                            {savingAccentColor && <Loader2 className="h-3.5 w-3.5 animate-spin text-faint" />}
                        </div>
                        <p className="text-xs text-muted mb-3">Choose your team's accent color for buttons, badges, and highlights.</p>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(ACCENT_PRESETS).map(([name, shades]) => (
                                <button
                                    key={name}
                                    onClick={() => handleAccentColorChange(name)}
                                    disabled={savingAccentColor}
                                    className={`group relative flex flex-col items-center gap-1.5`}
                                    title={ACCENT_LABELS[name]}
                                >
                                    <div
                                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                                            accentColor === name
                                                ? 'border-heading scale-110 shadow-md'
                                                : 'border-line hover:border-line-strong hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: shades['500'] }}
                                    />
                                    <span className={`text-[10px] font-medium ${
                                        accentColor === name ? 'text-heading' : 'text-faint'
                                    }`}>
                                        {ACCENT_LABELS[name]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
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
                        <div className={`mb-4 p-4 rounded-md ${calendarSettingsMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                            {calendarSettingsMessage.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Show Birthdays Toggle */}
                        <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl border border-line">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-500/10 rounded-lg">
                                    <Cake className="h-5 w-5 text-pink-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-heading">Show Birthdays</p>
                                    <p className="text-xs text-muted">Display roster birthdays on the calendar</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={showBirthdays}
                                onClick={handleToggleBirthdays}
                                disabled={savingCalendarSettings}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 ${
                                    showBirthdays ? 'bg-accent-600' : 'bg-surface-active'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
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
                        <div className={`mb-4 p-4 rounded-md ${messagingSettingsMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                            {messagingSettingsMessage.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Anonymous Reports Toggle */}
                        <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl border border-line">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <ShieldAlert className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-heading">Anonymous Reports</p>
                                    <p className="text-xs text-muted">Allow members to submit anonymous reports to you</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={anonymousReportsEnabled}
                                onClick={handleToggleAnonymousReports}
                                disabled={savingMessagingSettings}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 ${
                                    anonymousReportsEnabled ? 'bg-accent-600' : 'bg-surface-active'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
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
                        <div className={`mb-4 p-4 rounded-md ${invitesMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                            {invitesMessage.text}
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
                        <div className={`mb-4 p-4 rounded-md ${channelsMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                            {channelsMessage.text}
                        </div>
                    )}

                    {/* Add new channel input */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-faint">
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
                            <Loader2 className="animate-spin h-6 w-6 text-faint mx-auto" />
                        </div>
                    ) : channels.length === 0 ? (
                        <div className="text-center py-6 bg-surface-alt rounded-lg border-2 border-dashed border-line">
                            <Hash className="mx-auto h-8 w-8 text-faint" />
                            <p className="mt-2 text-sm text-muted">No channels yet.</p>
                            <p className="text-xs text-faint">Add a channel above to get started.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {channels.map((channel) => (
                                <li
                                    key={channel.id}
                                    className="flex items-center justify-between bg-surface rounded-lg px-4 py-3 border border-line"
                                >
                                    <div className="flex items-center">
                                        <Hash className="h-4 w-4 text-faint mr-2" />
                                        <span className="text-sm font-medium text-heading">{channel.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteChannel(channel.id, channel.name)}
                                        className="p-1 text-faint hover:text-red-600"
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

            {/* Feedback & Support */}
            <CollapsibleSection
                title="Feedback & Support"
                icon={Bug}
                description="Report bugs or request features"
            >
                {feedbackMessage && (
                    <div className={`mb-4 p-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                        {feedbackMessage.text}
                    </div>
                )}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-body mb-2">Type</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setFeedbackType('bug')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${feedbackType === 'bug' ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'}`}>
                                <Bug className="h-4 w-4" /> Bug Report
                            </button>
                            <button type="button" onClick={() => setFeedbackType('feature_request')} className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${feedbackType === 'feature_request' ? 'bg-accent-500/10 border-accent-500/30 text-accent-600' : 'bg-surface border-line-strong text-subtle hover:bg-surface-hover'}`}>
                                <MessageSquarePlus className="h-4 w-4" /> Feature Request
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-body">Title</label>
                        <input type="text" value={feedbackTitle} onChange={(e) => setFeedbackTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm" placeholder={feedbackType === 'bug' ? 'Brief description of the bug' : 'Your feature idea'} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-body">Description</label>
                        <textarea rows={4} value={feedbackDescription} onChange={(e) => setFeedbackDescription(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 sm:text-sm" placeholder={feedbackType === 'bug' ? 'What happened? What did you expect to happen?' : 'Describe the feature and how it would help you'} />
                    </div>
                    <div className="flex justify-end">
                        <button type="button" onClick={handleSubmitFeedback} disabled={submittingFeedback || !feedbackTitle.trim() || !feedbackDescription.trim()} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed">
                            {submittingFeedback ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Submit Feedback
                        </button>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Danger Zone - Only visible to hub owner */}
            {currentRole === 'owner' && hub && (
                <CollapsibleSection
                    title="Danger Zone"
                    icon={AlertTriangle}
                    description="Irreversible actions for your hub"
                >
                    <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-heading">Delete Hub</p>
                                <p className="text-xs text-muted">Permanently delete this hub and all its data</p>
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
