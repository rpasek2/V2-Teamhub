/**
 * Test data and fixtures for E2E tests
 *
 * NOTE: These are example credentials for testing.
 * In a real scenario, you would use environment variables or a test database
 * with known test accounts.
 */

export const TEST_USERS = {
  owner: {
    email: process.env.TEST_OWNER_EMAIL || 'twotreessoftware@gmail.com',
    password: process.env.TEST_OWNER_PASSWORD || 'TestOwner12345',
    fullName: 'Test Owner 2',
  },
  coach: {
    email: process.env.TEST_COACH_EMAIL || 'test-coach@example.com',
    password: process.env.TEST_COACH_PASSWORD || 'TestPassword123!',
    fullName: 'Test Coach',
  },
  parent: {
    email: process.env.TEST_PARENT_EMAIL || 'test-parent@example.com',
    password: process.env.TEST_PARENT_PASSWORD || 'TestPassword123!',
    fullName: 'Test Parent',
  },
};

export const TEST_HUB = {
  id: process.env.TEST_HUB_ID || '5eaac312-fc8c-4f66-bfa9-543d2ef8b162',
  name: 'test',
};

export const TEST_GYMNAST = {
  id: process.env.TEST_GYMNAST_ID || 'test-gymnast-id',
  firstName: 'Test',
  lastName: 'Gymnast',
  level: 'Level 5',
};

export const NEW_USER = {
  fullName: 'New Test User',
  email: `test-user-${Date.now()}@example.com`,
  password: 'NewTestPass123!',
  organization: 'Test Gym',
};

export const NEW_EVENT = {
  title: `Test Event ${Date.now()}`,
  description: 'This is a test event created by E2E tests',
  type: 'practice',
  location: 'Test Gym',
};

export const NEW_MARKETPLACE_ITEM = {
  title: `Test Item ${Date.now()}`,
  description: 'This is a test marketplace item',
  price: '25.00',
  category: 'leotards',
  condition: 'like_new',
  size: 'Medium',
};

/**
 * Storage state file path for authenticated sessions
 */
export const AUTH_STORAGE_STATE = 'playwright/.auth/user.json';
