# TeamHub V2 E2E Tests

End-to-end tests for TeamHub V2 using Playwright.

## Setup

The tests are already configured. To install Playwright browsers:

```bash
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with debugger
npm run test:e2e:debug

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

## Test Structure

```
tests/
├── e2e/                    # E2E test files
│   ├── auth/               # Authentication tests
│   │   ├── auth.setup.ts   # Auth setup for authenticated tests
│   │   ├── login.spec.ts   # Login page tests
│   │   └── register.spec.ts# Registration page tests
│   ├── dashboard/          # Dashboard tests
│   │   └── dashboard.spec.ts
│   ├── roster/             # Roster and gymnast details tests
│   │   └── roster.spec.ts
│   ├── calendar/           # Calendar and event tests
│   │   └── calendar.spec.ts
│   └── marketplace/        # Marketplace tests
│       └── marketplace.spec.ts
├── pages/                  # Page Object Models
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   ├── DashboardPage.ts
│   ├── RosterPage.ts
│   ├── GymnastDetailsPage.ts
│   ├── CalendarPage.ts
│   └── MarketplacePage.ts
├── fixtures/               # Test data and helpers
│   └── test-data.ts
└── README.md
```

## Configuration

### Environment Variables

For authenticated tests, set the following environment variables:

```bash
# Test user credentials
TEST_OWNER_EMAIL=owner@example.com
TEST_OWNER_PASSWORD=password123
TEST_COACH_EMAIL=coach@example.com
TEST_COACH_PASSWORD=password123
TEST_PARENT_EMAIL=parent@example.com
TEST_PARENT_PASSWORD=password123

# Test hub and gymnast IDs
TEST_HUB_ID=your-hub-uuid
TEST_GYMNAST_ID=your-gymnast-uuid
```

### Running Authenticated Tests

1. Create a `.env.test` file with the credentials above
2. Run tests with the environment file:

```bash
# Windows
set TEST_OWNER_EMAIL=your@email.com && set TEST_OWNER_PASSWORD=yourpassword && npm run test:e2e

# Unix/Mac
TEST_OWNER_EMAIL=your@email.com TEST_OWNER_PASSWORD=yourpassword npm run test:e2e
```

## Test Coverage

### Unauthenticated Tests (Always Run)
- Login page display and validation
- Registration page display and validation
- Password strength indicator
- Form validation
- Navigation between auth pages
- Protected route redirects

### Authenticated Tests (Require Credentials)
- Dashboard views (staff vs parent)
- Roster list and filtering
- Gymnast details and tabs
- Calendar navigation and event creation
- Marketplace browsing and listing creation

## Writing New Tests

### Using Page Objects

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test('example test', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
});
```

### Best Practices

1. Use Page Object Models for reusable selectors and actions
2. Wait for network idle or specific elements before assertions
3. Use `data-testid` attributes for stable selectors (when available)
4. Skip tests that require unavailable resources (credentials, specific data)
5. Use descriptive test names that explain the user journey

## Artifacts

Test artifacts are saved to:
- `test-results/` - Screenshots, videos, traces on failure
- `playwright-report/` - HTML test report

View the report:
```bash
npm run test:e2e:report
```
