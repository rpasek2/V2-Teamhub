import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function MarketplaceLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTintColor: colors.slate[900],
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Marketplace',
        }}
      />
      <Stack.Screen
        name="[itemId]"
        options={{
          title: 'Item Details',
        }}
      />
    </Stack>
  );
}
