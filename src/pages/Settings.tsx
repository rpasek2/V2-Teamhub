import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { supabase } from '../lib/supabase';
import {
    Loader2, Trash2, MessageSquare, UserPlus, Building2, User, Info,
    AlertTriangle, Cake, ShieldAlert, Bug, MessageSquarePlus,
    Send, Palette, LayoutGrid, ListOrdered, CalendarDays, Trophy,
    Link2, Shield, Award, SlidersHorizontal
} from 'lucide-react';
import type { HubPermissions, HubFeatureTab, SeasonConfig } from '../types';
import { HUB_FEATURE_TABS } from '../types';
import { LinkedHubsSettings } from '../components/marketplace/LinkedHubsSettings';
import { DeleteHubModal } from '../components/hubs/DeleteHubModal';
import { ScoresSettingsSection } from '../components/settings/ScoresSettingsSection';
import { PermissionsSection } from '../components/settings/PermissionsSection';
import { FeatureTabsSection } from '../components/settings/FeatureTabsSection';
import { LevelsSection } from '../components/settings/LevelsSection';
import { SeasonsSection } from '../components/settings/SeasonsSection';
import { ChannelsSection } from '../components/settings/ChannelsSection';
import { InviteCodesSection } from '../components/settings/InviteCodesSection';
import { ParentPrivacySection } from '../components/settings/ParentPrivacySection';
import { SettingsCard } from '../components/settings/SettingsCard';
import { DEFAULT_SEASON_CONFIG } from '../lib/seasons';
import { ACCENT_PRESETS, ACCENT_LABELS, applyAccentColor } from '../lib/accentColors';

const FEATURES = ['roster', 'calendar', 'messages', 'competitions', 'scores', 'skills', 'marketplace', 'groups', 'mentorship'] as const;

type SettingsTab = 'hub' | 'program' | 'access';

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: typeof Info }[] = [
    { id: 'hub', label: 'Hub Settings', icon: Info },
    { id: 'program', label: 'Program Settings', icon: Award },
    { id: 'access', label: 'Access & Roles', icon: Shield },
];

export function Settings() {
    const navigate = useNavigate();
    const { hub, currentRole, refreshHub } = useHub();
    const { user } = useAuth();
    const { isParent } = useRoleChecks();

    // Tab state
    const [activeTab, setActiveTab] = useState<SettingsTab>('hub');

    // Delete hub modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [permissions, setPermissions] = useState<HubPermissions>({});
    const [levels, setLevels] = useState<string[]>([]);

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

        if (hub?.settings?.levels) {
            setLevels(hub.settings.levels);
        } else {
            setLevels([]);
        }

        if (hub?.settings?.enabledTabs) {
            setEnabledTabs(new Set(hub.settings.enabledTabs));
        } else {
            setEnabledTabs(new Set(HUB_FEATURE_TABS.map(t => t.id)));
        }

        if (hub?.settings?.showBirthdays !== undefined) {
            setShowBirthdays(hub.settings.showBirthdays);
        } else {
            setShowBirthdays(false);
        }

        if (hub?.settings?.anonymous_reports_enabled !== undefined) {
            setAnonymousReportsEnabled(hub.settings.anonymous_reports_enabled);
        } else {
            setAnonymousReportsEnabled(true);
        }

        if (hub?.settings?.seasonConfig) {
            setSeasonConfig(hub.settings.seasonConfig);
        } else {
            setSeasonConfig(DEFAULT_SEASON_CONFIG);
        }

        if (hub?.settings?.accentColor) {
            setAccentColor(hub.settings.accentColor);
        } else {
            setAccentColor('mint');
        }

        if (hub) {
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

    const isStaff = currentRole === 'admin' || currentRole === 'coach';

    // Reusable hub info content (shared across parent, staff, owner views)
    const hubInfoContent = (showHubId = false) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <label className="block text-sm font-medium text-muted">Hub Name</label>
                <div className="mt-1 text-sm text-heading">{hub?.name}</div>
            </div>
            {showHubId && (
                <div>
                    <label className="block text-sm font-medium text-muted">Hub ID</label>
                    <div className="mt-1 text-sm text-muted font-mono text-xs">{hub?.id}</div>
                </div>
            )}
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
    );

    // Reusable feedback form content
    const feedbackContent = (
        <>
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
        </>
    );

    // Parent Settings View
    if (isParent) {
        return (
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-heading">Settings</h1>
                    <p className="text-muted">Manage your privacy and preferences.</p>
                </div>

                <ParentPrivacySection />

                <SettingsCard title="Hub Information" icon={Info} description="Information about this hub">
                    {hubInfoContent()}
                </SettingsCard>

                <SettingsCard title="Feedback & Support" icon={Bug} description="Report bugs or request features">
                    {feedbackContent}
                </SettingsCard>
            </div>
        );
    }

    // Staff view (admin/coach) - flat, no tabs
    if (isStaff) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-heading">Settings</h1>
                    <p className="text-muted">Hub information and support.</p>
                </div>

                <SettingsCard title="Hub Information" icon={Info} description="Basic information about your hub">
                    {hubInfoContent()}
                </SettingsCard>

                <SettingsCard title="Feedback & Support" icon={Bug} description="Report bugs or request features">
                    {feedbackContent}
                </SettingsCard>
            </div>
        );
    }

    // Owner/Director Settings View — tabbed layout
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-heading">Settings</h1>
                <p className="text-muted">Manage your hub settings.</p>
            </div>

            {/* Tab Bar */}
            <div className="border-b border-line">
                <nav className="-mb-px flex gap-2 sm:gap-6">
                    {SETTINGS_TABS.map(tab => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-accent-500 text-accent-600'
                                        : 'border-transparent text-muted hover:text-heading hover:border-line'
                                }`}
                            >
                                <TabIcon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Hub Settings Tab */}
            {activeTab === 'hub' && (
                <div className="space-y-6">
                    <SettingsCard title="Hub Information" icon={Info} description="Basic information about your hub">
                        {hubInfoContent(true)}

                        {/* Accent Color Picker */}
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
                    </SettingsCard>

                    <SettingsCard title="Feature Tabs" icon={LayoutGrid} description="Choose which features are available in your hub">
                        <FeatureTabsSection enabledTabs={enabledTabs} setEnabledTabs={setEnabledTabs} bare />
                    </SettingsCard>

                    <SettingsCard title="Invite Codes" icon={UserPlus} description="Create invite codes to allow new members to join your hub">
                        <InviteCodesSection hubId={hub?.id} bare />
                    </SettingsCard>

                    <SettingsCard title="Hub Channels" icon={MessageSquare} description="Manage hub-wide channels that all members can access">
                        <ChannelsSection hubId={hub?.id} bare />
                    </SettingsCard>
                </div>
            )}

            {/* Program Settings Tab */}
            {activeTab === 'program' && (
                <div className="space-y-6">
                    <SettingsCard title="Levels" icon={ListOrdered} description="Define the competition levels for your program">
                        <LevelsSection levels={levels} setLevels={setLevels} bare />
                    </SettingsCard>

                    <SettingsCard title="Seasons" icon={CalendarDays} description="Configure competition seasons for organizing scores and competitions">
                        <SeasonsSection seasonConfig={seasonConfig} setSeasonConfig={setSeasonConfig} bare />
                    </SettingsCard>

                    <SettingsCard title="Qualifying Scores" icon={Trophy} description="Configure qualifying score thresholds for competitions">
                        <ScoresSettingsSection bare />
                    </SettingsCard>
                </div>
            )}

            {/* Access & Roles Tab */}
            {activeTab === 'access' && (
                <div className="space-y-6">
                    <SettingsCard title="Preferences" icon={SlidersHorizontal} description="Calendar and messaging options">
                        {calendarSettingsMessage && (
                            <div className={`mb-4 p-4 rounded-md ${calendarSettingsMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                {calendarSettingsMessage.text}
                            </div>
                        )}
                        {messagingSettingsMessage && (
                            <div className={`mb-4 p-4 rounded-md ${messagingSettingsMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                                {messagingSettingsMessage.text}
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
                    </SettingsCard>

                    <SettingsCard title="Linked Marketplaces" icon={Link2} description="Share your marketplace with other hubs you manage">
                        <LinkedHubsSettings bare />
                    </SettingsCard>

                    <SettingsCard title="Permissions" icon={Shield} description="Control what each role can access">
                        <PermissionsSection permissions={permissions} setPermissions={setPermissions} bare />
                    </SettingsCard>
                </div>
            )}

            {/* Always visible below tabs */}
            <SettingsCard title="Feedback & Support" icon={Bug} description="Report bugs or request features">
                {feedbackContent}
            </SettingsCard>

            {currentRole === 'owner' && hub && (
                <SettingsCard title="Danger Zone" icon={AlertTriangle} description="Irreversible actions for your hub" variant="danger">
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
                </SettingsCard>
            )}

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
