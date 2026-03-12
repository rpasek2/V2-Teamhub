import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHub } from '../../context/HubContext';
import { isTabEnabled } from '../../lib/permissions';

// Map tab IDs to permission feature names where they differ
const TAB_TO_FEATURE: Record<string, string> = {
    private_lessons: 'privateLessons',
    progress_reports: 'progressReports',
};

interface TabGuardProps {
    tabId: string;
    children: React.ReactNode;
}

/**
 * Route-level guard that redirects to the hub dashboard
 * when a user navigates directly to a disabled or permission-blocked feature tab.
 */
export function TabGuard({ tabId, children }: TabGuardProps) {
    const { hub, hasPermission: hasFeaturePermission } = useHub();
    const { hubId } = useParams();
    const navigate = useNavigate();
    const enabled = isTabEnabled(tabId, hub?.settings?.enabledTabs);
    const featureName = TAB_TO_FEATURE[tabId] || tabId;
    const hasAccess = hasFeaturePermission(featureName);

    useEffect(() => {
        if (hub && (!enabled || !hasAccess)) {
            navigate(`/hub/${hubId}`, { replace: true });
        }
    }, [enabled, hasAccess, hub, hubId, navigate]);

    if (!hub || !enabled || !hasAccess) return null;

    return <>{children}</>;
}
