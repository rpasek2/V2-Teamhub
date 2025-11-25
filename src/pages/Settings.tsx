import { useState, useEffect } from 'react';
import { useHub } from '../context/HubContext';
import { supabase } from '../lib/supabase';
import { Loader2, Save, Shield, ListOrdered, Plus, X, GripVertical, Hash, Trash2, MessageSquare } from 'lucide-react';
import type { HubPermissions, RolePermissions, PermissionScope } from '../types';

const FEATURES = ['roster', 'calendar', 'competitions', 'groups'] as const;
const ROLES = ['admin', 'coach', 'parent'] as const;

interface HubChannel {
    id: string;
    name: string;
    type: 'public' | 'private';
    group_id: string | null;
    dm_participant_ids: string[] | null;
    created_at: string;
}

export function Settings() {
    const { hub, currentRole, refreshHub } = useHub();
    const [permissions, setPermissions] = useState<HubPermissions>({});
    const [levels, setLevels] = useState<string[]>([]);
    const [newLevel, setNewLevel] = useState('');
    const [saving, setSaving] = useState(false);
    const [savingLevels, setSavingLevels] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [levelsMessage, setLevelsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Channels state
    const [channels, setChannels] = useState<HubChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [addingChannel, setAddingChannel] = useState(false);
    const [channelsMessage, setChannelsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

        // Load channels
        if (hub) {
            fetchChannels();
        }
    }, [hub]);

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
        } catch (err: any) {
            console.error('Error creating channel:', err);
            setChannelsMessage({ type: 'error', text: err.message || 'Failed to create channel.' });
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
        } catch (err: any) {
            console.error('Error deleting channel:', err);
            setChannelsMessage({ type: 'error', text: err.message || 'Failed to delete channel.' });
        }
    };

    const handlePermissionChange = (feature: string, role: string, value: PermissionScope) => {
        setPermissions((prev: HubPermissions) => ({
            ...prev,
            [feature]: {
                ...prev[feature],
                [role]: value
            }
        }));
    };

    const handleAddLevel = () => {
        const trimmed = newLevel.trim();
        if (trimmed && !levels.includes(trimmed)) {
            setLevels([...levels, trimmed]);
            setNewLevel('');
        }
    };

    const handleRemoveLevel = (levelToRemove: string) => {
        setLevels(levels.filter(l => l !== levelToRemove));
    };

    const handleMoveLevel = (index: number, direction: 'up' | 'down') => {
        const newLevels = [...levels];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLevels.length) return;
        [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];
        setLevels(newLevels);
    };

    const handleSaveLevels = async () => {
        if (!hub) return;
        setSavingLevels(true);
        setLevelsMessage(null);

        try {
            const updatedSettings = {
                ...hub.settings,
                levels
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setLevelsMessage({ type: 'success', text: 'Levels saved successfully.' });
        } catch (err: any) {
            console.error('Error saving levels:', err);
            setLevelsMessage({ type: 'error', text: 'Failed to save levels.' });
        } finally {
            setSavingLevels(false);
        }
    };

    const handleSave = async () => {
        if (!hub) return;
        setSaving(true);
        setMessage(null);

        try {
            const updatedSettings = {
                ...hub.settings,
                permissions
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setMessage({ type: 'success', text: 'Permissions saved successfully.' });
        } catch (err: any) {
            console.error('Error saving permissions:', err);
            setMessage({ type: 'error', text: 'Failed to save permissions.' });
        } finally {
            setSaving(false);
        }
    };

    const canManagePermissions = currentRole === 'owner' || currentRole === 'director';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-600">Manage your hub settings.</p>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-slate-900 mb-4">Hub Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Hub Name</label>
                        <div className="mt-1 text-sm text-slate-900">{hub?.name}</div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Hub ID</label>
                        <div className="mt-1 text-sm text-slate-900">{hub?.id}</div>
                    </div>
                </div>
            </div>

            {canManagePermissions && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <ListOrdered className="h-5 w-5 text-brand-600 mr-2" />
                            <h2 className="text-lg font-medium text-slate-900">Levels</h2>
                        </div>
                        <button
                            onClick={handleSaveLevels}
                            disabled={savingLevels}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                            {savingLevels ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="-ml-1 mr-2 h-4 w-4" />
                                    Save Levels
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">
                        Define the competition levels for your program. These will be available when assigning levels to gymnasts.
                    </p>

                    {levelsMessage && (
                        <div className={`mb-4 p-4 rounded-md ${levelsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {levelsMessage.text}
                        </div>
                    )}

                    {/* Add new level input */}
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newLevel}
                            onChange={(e) => setNewLevel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLevel())}
                            placeholder="Enter level name (e.g., Level 3, Xcel Gold)"
                            className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleAddLevel}
                            disabled={!newLevel.trim()}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </button>
                    </div>

                    {/* Levels list */}
                    {levels.length === 0 ? (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                            <ListOrdered className="mx-auto h-8 w-8 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-500">No levels defined yet.</p>
                            <p className="text-xs text-slate-400">Add levels above to get started.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {levels.map((level, index) => (
                                <li
                                    key={level}
                                    className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200"
                                >
                                    <div className="flex items-center">
                                        <GripVertical className="h-4 w-4 text-slate-400 mr-3" />
                                        <span className="text-sm font-medium text-slate-900">{level}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveLevel(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move up"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveLevel(index, 'down')}
                                            disabled={index === levels.length - 1}
                                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Move down"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLevel(level)}
                                            className="p-1 text-slate-400 hover:text-red-600 ml-2"
                                            title="Remove level"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Channels Management Section */}
            {canManagePermissions && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <MessageSquare className="h-5 w-5 text-brand-600 mr-2" />
                            <h2 className="text-lg font-medium text-slate-900">Hub Channels</h2>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">
                        Manage hub-wide channels that all members can access. Group channels are created automatically when groups are made.
                    </p>

                    {channelsMessage && (
                        <div className={`mb-4 p-4 rounded-md ${channelsMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
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
                                className="w-full pl-9 rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddChannel}
                            disabled={!newChannelName.trim() || addingChannel}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200"
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
                </div>
            )}

            {canManagePermissions && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <Shield className="h-5 w-5 text-brand-600 mr-2" />
                            <h2 className="text-lg font-medium text-slate-900">Permissions</h2>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="-ml-1 mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-sm text-slate-600 mb-4">
                        Control what each role can access. Owners and Directors always have full access.
                    </p>

                    {message && (
                        <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                        Feature
                                    </th>
                                    {ROLES.map(role => (
                                        <th key={role} className="px-6 py-3 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {role}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {FEATURES.map(feature => (
                                    <tr key={feature}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 capitalize">
                                            {feature}
                                        </td>
                                        {ROLES.map(role => (
                                            <td key={role} className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                <select
                                                    value={permissions[feature]?.[role as keyof RolePermissions] || 'none'}
                                                    onChange={(e) => handlePermissionChange(feature, role, e.target.value as PermissionScope)}
                                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                                                >
                                                    <option value="none">No Access</option>
                                                    <option value="all">View All</option>
                                                    {role === 'parent' && (
                                                        <option value="own">View Own</option>
                                                    )}
                                                </select>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
