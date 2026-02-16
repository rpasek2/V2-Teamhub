import { useState } from 'react';
import { Loader2, Save, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { HubPermissions, RolePermissions, PermissionScope } from '../../types';

const FEATURES = ['roster', 'calendar', 'messages', 'competitions', 'scores', 'skills', 'marketplace', 'groups', 'mentorship'] as const;
const ROLES = ['director', 'admin', 'coach', 'parent', 'athlete'] as const;
const VALID_PERMISSION_SCOPES: PermissionScope[] = ['all', 'own', 'none'];

interface PermissionsSectionProps {
    permissions: HubPermissions;
    setPermissions: React.Dispatch<React.SetStateAction<HubPermissions>>;
}

export function PermissionsSection({ permissions, setPermissions }: PermissionsSectionProps) {
    const { hub, refreshHub } = useHub();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

    return (
        <CollapsibleSection
            title="Permissions"
            icon={Shield}
            description="Control what each role can access"
            actions={
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
            }
        >
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
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
                                    <td key={role} className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        <select
                                            value={permissions[feature]?.[role as keyof RolePermissions] || 'none'}
                                            onChange={(e) => handlePermissionChange(feature, role, e.target.value as PermissionScope)}
                                            className="input"
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
        </CollapsibleSection>
    );
}
