import { MobileTabGuard } from '../../src/components/ui';
import RosterScreen from '../roster/index';

export default function RosterTab() {
  return (
    <MobileTabGuard tabId="roster">
      <RosterScreen />
    </MobileTabGuard>
  );
}
