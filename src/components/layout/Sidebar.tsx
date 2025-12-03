import { useHub } from '../../context/HubContext';
import { GymnasticsSidebar } from './sports/GymnasticsSidebar';

// Sport-specific sidebar components
// For now, all sports use the GymnasticsSidebar as a base
// Future: Create DanceSidebar, CheerSidebar, etc. with sport-specific features

export function Sidebar() {
    const { hub } = useHub();
    const sportType = hub?.sport_type || 'gymnastics';

    // Route to sport-specific sidebar
    // Currently all use GymnasticsSidebar, but structure is ready for expansion
    switch (sportType) {
        case 'gymnastics':
        case 'dance':
        case 'cheer':
        case 'swimming':
        case 'martial_arts':
        default:
            return <GymnasticsSidebar />;
    }
}
