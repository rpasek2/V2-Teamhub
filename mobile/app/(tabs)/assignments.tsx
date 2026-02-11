import { MobileTabGuard } from '../../src/components/ui';
import AssignmentsScreen from '../assignments/index';

export default function AssignmentsTab() {
  return (
    <MobileTabGuard tabId="assignments">
      <AssignmentsScreen />
    </MobileTabGuard>
  );
}
