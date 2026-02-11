import { MobileTabGuard } from '../../src/components/ui';
import ScoresScreen from '../scores/index';

export default function ScoresTab() {
  return (
    <MobileTabGuard tabId="scores">
      <ScoresScreen />
    </MobileTabGuard>
  );
}
