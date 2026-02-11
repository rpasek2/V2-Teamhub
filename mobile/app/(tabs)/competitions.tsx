import { MobileTabGuard } from '../../src/components/ui';
import CompetitionsScreen from '../competitions/index';

export default function CompetitionsTab() {
  return (
    <MobileTabGuard tabId="competitions">
      <CompetitionsScreen />
    </MobileTabGuard>
  );
}
