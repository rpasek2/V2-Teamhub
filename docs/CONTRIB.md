# Contributing Guide

> **Last Updated:** 2026-02-21
> **Source of Truth:** package.json, .env.example

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- For mobile: Expo CLI, Android Studio or Xcode

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd teamhub-v2
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development
npm run dev
```

## Available Scripts

### Web App (root)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start local dev server (hot reload) |
| `build` | `tsc -b && vite build` | TypeScript check + production build |
| `lint` | `eslint .` | Check code quality issues |
| `preview` | `vite preview` | Preview production build locally |
| `test` | `vitest run` | Run unit tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `test:e2e` | `playwright test` | Run E2E tests headless |
| `test:e2e:headed` | `playwright test --headed` | Run E2E tests with browser visible |
| `test:e2e:debug` | `playwright test --debug` | Debug E2E tests step-by-step |
| `test:e2e:ui` | `playwright test --ui` | Interactive E2E test UI |
| `test:e2e:report` | `playwright show-report` | View E2E test report |

### Mobile App (mobile/)

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `expo start` | Start Expo dev server |
| `android` | `expo run:android` | Build and run on Android |
| `ios` | `expo run:ios` | Build and run on iOS |
| `web` | `expo start --web` | Start for web browser |

### Mobile Production Builds (Gradle)

| Command | Description |
|---------|-------------|
| `cd mobile/android && ./gradlew bundleRelease` | Build release AAB (Play Store) |
| `cd mobile/android && ./gradlew assembleRelease` | Build release APK (direct install) |
| `cd mobile/android && ./gradlew assembleDebug` | Build debug APK |

## Environment Variables

### Web App (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_KEY` | Yes | Supabase anon/public key |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Google Maps API key for address autocomplete |

**Getting Supabase Key:**
1. Go to https://supabase.com/dashboard/project/_/settings/api
2. Copy the "anon public" key

**Getting Google Maps Key:**
1. Go to https://console.cloud.google.com/
2. Create a project and enable "Places API"
3. Create an API key with Places API restriction

### Mobile App (mobile/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

### Mobile Native Files

| File | Required | Description |
|------|----------|-------------|
| `mobile/android/app/google-services.json` | Yes | Firebase config for FCM push notifications (not in source control) |

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Follow existing code patterns
- Use TypeScript strictly (no `any`)
- Use Tailwind CSS (web) or StyleSheet (mobile)
- Keep components small and focused

### 3. Test Locally
```bash
# Web
npm run dev
npm run lint
npm run build  # Verify build passes

# Mobile
cd mobile
npx expo start
```

### 4. Commit Changes
```bash
git add -A
git commit -m "feat: description of changes"
```

### 5. Create Pull Request
- Write clear description
- Link related issues
- Request review

## Code Style

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utils: `camelCase.ts`
- Types: `index.ts` (centralized)

### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types
interface Props {
  value: string;
}

// 3. Component
export function MyComponent({ value }: Props) {
  // State
  const [loading, setLoading] = useState(false);

  // Effects
  useEffect(() => { ... }, []);

  // Handlers
  const handleClick = () => { ... };

  // Render
  return <div>...</div>;
}
```

### Styling (Web)
```tsx
// Use Tailwind classes
<div className="bg-white rounded-lg border border-slate-200 p-4">
  <h2 className="text-lg font-semibold text-slate-900">Title</h2>
</div>
```

### Styling (Mobile)
```tsx
// Use StyleSheet
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
  },
});
```

## Testing

### Unit Tests (Vitest)
```bash
npm run test        # Run once
npm run test:watch  # Watch mode
```

### E2E Tests (Playwright)
```bash
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser
npm run test:e2e:ui      # Interactive UI
```

## Database Changes

1. Create migration in Supabase dashboard or locally
2. Test RLS policies thoroughly
3. Update `docs/CODEMAPS/data.md` if schema changes

## Deployment

See [RUNBOOK.md](RUNBOOK.md) for deployment procedures.
