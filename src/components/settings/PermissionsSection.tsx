import { useState } from 'react';
import { Loader2, Save, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { HubPermissions, RolePermissions, PermissionScope } from '../../types';

const FEATURES = ['roster', 'calendar', 'messages', 'groups', 'competitions', 'scores', 'skills', 'assignments', 'attendance', 'schedule', 'staff', 'resources', 'marketplace', 'mentorship', 'privateLessons'] as const;
const FEATURE_LABELS: Record<string, string> = {
    privateLessons: 'Private Lessons',
};
const FEATURE_TO_TAB: Record<string, string> = {
    privateLessons: 'private_lessons',
};
const ROLES = ['director', 'admin', 'coach', 'parent', 'athlete'] as const;
const VALID_PERMISSION_SCOPES: PermissionScope[] = ['all', 'own', 'none'];

interface PermissionsSectionProps {
    permissions: HubPermissions;
    setPermissions: React.Dispatch<React.SetStateAction<HubPermissions>>;
    bare?: boolean;
}

export function PermissionsSection({ permissions, setPermissions, bare }: PermissionsSectionProps) {
    const { hub, refreshHub } = useHub();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const enabledTabs = hub?.settings?.enabledTabs as string[] | undefined;

    const isFeatureEnabled = (feature: string) => {
        if (!enabledTabs) return true;
        const tabId = FEATURE_TO_TAB[feature] || feature;
        return enabledTabs.includes(tabId);
    };

    const handlePermissionChange = (feature: string, role: string, value: PermissionScope) => {
        // Validate inputs to prevent injection of invalid permission data
        if (!FEATURES.includes(feature as typeof FEATURES[number])) {
            console.error(`Invalid feature: ${feature}`);
            return;
        }
        if (!ROLES.includes(role as typeof ROLES[number])) {
            console.error(`Invalid role: ${role}`);
            return;
        }
        if (!VALID_PERMISSION_SCOPES.includes(value)) {
            console.error(`Invalid permission scope: ${value}`);
            return;
        }

        setPermissions((prev: HubPermissions) => ({
            ...prev,
            [feature]: {
                ...prev[feature],
                [role]: value
            }
        }));
    };

    const validatePermissions = (perms: HubPermissions): boolean => {
        for (const [feature, rolePerms] of Object.entries(perms)) {
            if (!FEATURES.includes(feature as typeof FEATURES[number])) {
                console.error(`Invalid feature in permissions: ${feature}`);
                return false;
            }
            if (rolePerms && typeof rolePerms === 'object') {
                for (const [role, scope] of Object.entries(rolePerms)) {
                    if (!ROLES.includes(role as typeof ROLES[number])) {
                        console.error(`Invalid role in permissions: ${role}`);
                        return false;
                    }
                    if (scope && !VALID_PERMISSION_SCOPES.includes(scope as PermissionScope)) {
                        console.error(`Invalid scope in permissions: ${scope}`);
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!hub) return;
        setSaving(true);
        setMessage(null);

        try {
            // Validate permissions before saving
            if (!validatePermissions(permissions)) {
                setMessage({ type: 'error', text: 'Invalid permission configuration detected.' });
                setSaving(false);
                return;
            }

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
        } catch (err: unknown) {
            console.error('Error saving permissions:', err);
            setMessage({ type: 'error', text: 'Failed to save permissions.' });
        } finally {
            setSaving(false);
        }
    };

    const saveButton = (
        <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
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
    );

    const content = (
        <>
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                    <thead>
                        <tr>
                            <th className="px-6 py-3 bg-surface text-left text-xs font-medium text-muted uppercase tracking-wider">
                                Feature
                            </th>
                            {ROLES.map(role => (
                                <th key={role} className="px-6 py-3 bg-surface text-left text-xs font-medium text-muted uppercase tracking-wider">
                                    {role}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-line">
                        {FEATURES.map(feature => {
                            const enabled = isFeatureEnabled(feature);
                            return (
                                <tr key={feature} className={enabled ? '' : 'opacity-40'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-heading capitalize">
                                        {FEATURE_LABELS[feature] || feature}
                                        {!enabled && <span className="ml-2 text-xs text-faint normal-case">(disabled)</span>}
                                    </td>
                                    {ROLES.map(role => (
                                        <td key={role} className="px-6 py-4 whitespace-nowrap text-sm text-faint">
                                            <select
                                                value={permissions[feature]?.[role as keyof RolePermissions] || 'none'}
                                                onChange={(e) => handlePermissionChange(feature, role, e.target.value as PermissionScope)}
                                                disabled={!enabled}
                                                className="input disabled:cursor-not-allowed"
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
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );

    if (bare) {
        return (
            <>
                <div className="flex justify-end mb-4">{saveButton}</div>
                {content}
            </>
        );
    }

    return (
        <CollapsibleSection
            title="Permissions"
            icon={Shield}
            description="Control what each role can access"
            actions={saveButton}
        >
            {content}
        </CollapsibleSection>
    );
}
