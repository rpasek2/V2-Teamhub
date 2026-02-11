import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useHub } from '../../context/HubContext';
import { isTabEnabled } from '../../lib/permissions';

interface TabGuardProps {
    tabId: string;
    children: React.ReactNode;
}

/**
 * Route-level guard that redirects to the hub dashboard
 * when a user navigates directly to a disabled feature tab.
 */
export function TabGuard({ tabId, children }: TabGuardProps) {
    const { hub } = useHub();
    const { hubId } = useParams();
    const navigate = useNavigate();
    const enabled = isTabEnabled(tabId, hub?.settings?.enabledTabs);

    useEffect(() => {
        if (hub && !enabled) {
            navigate(`/hub/${hubId}`, { replace: true });
        }
    }, [enabled, hub, hubId, navigate]);

    if (!hub || !enabled) return null;

    return <>{children}</>;
}
