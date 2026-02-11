/**
 * Shared permission logic for TeamHub
 * Used by both web (HubContext) and mobile (hubStore) applications
 */

import type { HubPermissions as ImportedHubPermissions } from '../types';

export type PermissionScope = 'all' | 'own' | 'none';
export type HubRole = 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'athlete';

export const STAFF_ROLES: HubRole[] = ['owner', 'director', 'admin', 'coach'];
export const MANAGE_ROLES: HubRole[] = ['owner', 'director', 'admin'];

export const DEFAULT_PERMISSIONS: Record<string, Record<HubRole, PermissionScope>> = {
    roster: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    calendar: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'all' },
    messages: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'all' },
    groups: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'all' },
    assignments: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    attendance: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'none' },
    skills: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    scores: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    competitions: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    schedule: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'none', athlete: 'none' },
    staff: { owner: 'all', director: 'all', admin: 'all', coach: 'own', parent: 'none', athlete: 'none' },
    marketplace: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'all' },
    mentorship: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', athlete: 'own' },
    resources: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'all' },
    settings: { owner: 'all', director: 'all', admin: 'all', coach: 'none', parent: 'none', athlete: 'none' },
    privateLessons: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', athlete: 'none' },
};

/**
 * Normalize legacy 'gymnast' role to 'athlete'
 */
export function normalizeRole(role: string): HubRole {
    return (role === 'gymnast' ? 'athlete' : role) as HubRole;
}

/**
 * Get default permission scope for a role when not explicitly configured
 */
export function getDefaultScope(role: string): PermissionScope {
    if (role === 'director') return 'all'; // Director defaults to full access but is configurable
    if (['admin', 'coach'].includes(role)) return 'all';
    if (role === 'parent') return 'own';
    if (role === 'athlete' || role === 'gymnast') return 'own'; // Handle legacy 'gymnast' role
    return 'none';
}

// Type for configured permissions (supports HubPermissions interface from types/index.ts)
export type ConfiguredPermissions = ImportedHubPermissions | null | undefined;

/**
 * Get permission scope for a feature and role
 * @param feature - The feature to check (e.g., 'roster', 'calendar')
 * @param role - The user's role (e.g., 'owner', 'coach', 'parent')
 * @param configuredPermissions - Optional configured permissions from hub settings
 * @returns The permission scope ('all', 'own', or 'none')
 */
export function getPermissionScope(
    feature: string,
    role: string | null,
    configuredPermissions?: ConfiguredPermissions
): PermissionScope {
    if (!role) return 'none';

    // Owner ALWAYS has full access (hardcoded, not configurable)
    if (role === 'owner') return 'all';

    // Normalize legacy 'gymnast' role
    const normalizedRole = normalizeRole(role);

    // Use configured permissions if available, otherwise fall back to defaults
    const permissions = configuredPermissions || DEFAULT_PERMISSIONS;
    const featurePermissions = permissions[feature] || DEFAULT_PERMISSIONS[feature];

    // If feature permissions exist, check for the role's scope
    // Cast to access by role string - owner is already handled above
    if (featurePermissions) {
        const scope = (featurePermissions as Record<string, PermissionScope | undefined>)[normalizedRole];
        if (scope) return scope;
    }

    // Fall back to default scope for the role
    return getDefaultScope(normalizedRole);
}

/**
 * Check if user has any permission (all or own) for a feature
 */
export function hasPermission(
    feature: string,
    role: string | null,
    configuredPermissions?: ConfiguredPermissions
): boolean {
    const scope = getPermissionScope(feature, role, configuredPermissions);
    return scope === 'all' || scope === 'own';
}

/**
 * Check if role is a staff role (owner, director, admin, coach)
 */
export function isStaffRole(role: string | null): boolean {
    if (!role) return false;
    return STAFF_ROLES.includes(normalizeRole(role));
}

/**
 * Check if role is a parent role
 */
export function isParentRole(role: string | null): boolean {
    return role === 'parent';
}

/**
 * Check if role can manage (owner, director, admin)
 */
export function canManageRole(role: string | null): boolean {
    if (!role) return false;
    return MANAGE_ROLES.includes(normalizeRole(role));
}

/**
 * Tab dependencies: when a parent tab is disabled, its dependent tabs
 * must also be treated as disabled.
 */
const TAB_DEPENDENCIES: Record<string, string[]> = {
    schedule: ['attendance'],
};

/**
 * Check if a feature tab is enabled in hub settings.
 * Returns true if enabledTabs is not configured (all tabs enabled by default).
 * Also enforces tab dependencies (e.g., schedule OFF → attendance OFF).
 */
export function isTabEnabled(tabId: string, enabledTabs?: string[] | null): boolean {
    if (!enabledTabs) return true;
    if (!enabledTabs.includes(tabId)) return false;

    // Check if any parent tab dependency is disabled
    for (const [parent, dependents] of Object.entries(TAB_DEPENDENCIES)) {
        if (dependents.includes(tabId) && !enabledTabs.includes(parent)) {
            return false;
        }
    }

    return true;
}

/**
 * Get dependent tabs that should be disabled when a parent tab is toggled off.
 * Used by Settings UI to auto-disable dependents.
 */
export function getTabDependents(tabId: string): string[] {
    return TAB_DEPENDENCIES[tabId] || [];
}
