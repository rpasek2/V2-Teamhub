import { useMemo } from 'react';
import { useHub } from '../context/HubContext';

interface RoleChecks {
    isOwner: boolean;
    isDirector: boolean;
    isAdmin: boolean;
    isCoach: boolean;
    isParent: boolean;
    isAthlete: boolean;
    isStaff: boolean;
    canManage: boolean;
    canEdit: boolean;
}

/**
 * Hook to get memoized role checks based on current user's role in the hub.
 * Prevents recalculating role booleans on every render.
 *
 * @returns Memoized role check booleans
 */
export function useRoleChecks(): RoleChecks {
    const { currentRole } = useHub();

    return useMemo(() => ({
        isOwner: currentRole === 'owner',
        isDirector: currentRole === 'director',
        isAdmin: currentRole === 'admin',
        isCoach: currentRole === 'coach',
        isParent: currentRole === 'parent',
        isAthlete: currentRole === 'athlete' || currentRole === 'gymnast',
        // Staff includes owner, director, admin, and coach
        isStaff: ['owner', 'director', 'admin', 'coach'].includes(currentRole || ''),
        // Can manage includes owner and director (admin is view-only + messaging/groups/calendar/marketplace)
        canManage: ['owner', 'director'].includes(currentRole || ''),
        // Can edit includes owner, director, and coach (not admin)
        canEdit: ['owner', 'director', 'coach'].includes(currentRole || ''),
    }), [currentRole]);
}
