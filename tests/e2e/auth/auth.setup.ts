import { test as setup, expect } from '@playwright/test';
import { TEST_USERS, AUTH_STORAGE_STATE } from '../../fixtures/test-data';
import { LoginPage } from '../../pages/LoginPage';

/**
 * Setup file for authenticated tests.
 * This logs in once and saves the authentication state for reuse.
 *
 * To use authenticated state in tests, add dependencies: ['setup'] to the project
 * and use storageState in the test file.
 *
 * NOTE: This requires valid test credentials in environment variables:
 * - TEST_OWNER_EMAIL
 * - TEST_OWNER_PASSWORD
 */
setup('authenticate', async ({ page }) => {
  // Use configured credentials (defaults are set in test-data.ts)
  const email = TEST_USERS.owner.email;
  const password = TEST_USERS.owner.password;

  if (!email || !password) {
    console.log('Skipping authentication setup: Test credentials not configured');
    return;
  }

  console.log(`Authenticating as: ${email}`);

  const loginPage = new LoginPage(page);

  // Navigate to login page
  await loginPage.goto();

  // Perform login
  await loginPage.login(email, password);

  // Wait for successful navigation away from login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

  // Verify we're logged in (either on hub selection or a hub page)
  await expect(page.url()).toMatch(/\/(hub\/|$)/);

  // Save authentication state
  await page.context().storageState({ path: AUTH_STORAGE_STATE });
});
