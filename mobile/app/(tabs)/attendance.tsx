import { MobileTabGuard } from '../../src/components/ui';
import { AttendanceScreen } from '../../src/screens/AttendanceScreen';

export default function AttendanceTab() {
  return (
    <MobileTabGuard tabId="attendance">
      <AttendanceScreen />
    </MobileTabGuard>
  );
}
