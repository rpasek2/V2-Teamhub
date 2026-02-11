import { MobileTabGuard } from '../../src/components/ui';
import SkillsScreen from '../skills/index';

export default function SkillsTab() {
  return (
    <MobileTabGuard tabId="skills">
      <SkillsScreen />
    </MobileTabGuard>
  );
}
