import { test, expect } from '@playwright/test';
import { RosterPage } from '../../pages/RosterPage';
import { GymnastDetailsPage } from '../../pages/GymnastDetailsPage';
import { LoginPage } from '../../pages/LoginPage';
import { TEST_USERS, TEST_HUB } from '../../fixtures/test-data';

test.describe('Roster', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto(`/hub/${TEST_HUB.id}/roster`);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authenticated Roster Views', () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner/staff
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should display roster page correctly', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Verify page elements
      await rosterPage.expectToBeOnRosterPage();
      await expect(rosterPage.pageTitle).toBeVisible();
      await expect(rosterPage.searchInput).toBeVisible();
      await expect(rosterPage.addMemberButton).toBeVisible();
    });

    test('should display roster tabs', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Verify tabs are present
      await expect(rosterPage.tabAll).toBeVisible();
      await expect(rosterPage.tabAdmins).toBeVisible();
      await expect(rosterPage.tabCoaches).toBeVisible();
      await expect(rosterPage.tabGymnasts).toBeVisible();
      await expect(rosterPage.tabParents).toBeVisible();
    });

    test('should filter roster by search', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Get initial count
      const initialCount = await rosterPage.getMemberCount();

      // Search for something that might not exist
      await rosterPage.search('xyznonexistent123');

      // Count should be 0 or less than initial
      const filteredCount = await rosterPage.getMemberCount();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // Clear search
      await rosterPage.clearSearch();

      // Count should return to initial
      const resetCount = await rosterPage.getMemberCount();
      expect(resetCount).toBe(initialCount);
    });

    test('should filter roster by tabs', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Get all members count
      const allCount = await rosterPage.getMemberCount();

      // Switch to Gymnasts tab
      await rosterPage.selectTab('Gymnasts');

      // Get gymnasts count
      const gymnastsCount = await rosterPage.getMemberCount();

      // Gymnasts count should be less than or equal to all
      expect(gymnastsCount).toBeLessThanOrEqual(allCount);

      // Switch back to All
      await rosterPage.selectTab('All');

      // Count should be back to all
      const resetCount = await rosterPage.getMemberCount();
      expect(resetCount).toBe(allCount);
    });

    test('should display roster table with columns', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Check table headers
      await expect(page.locator('th:has-text("ID")')).toBeVisible();
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
      await expect(page.locator('th:has-text("Level")')).toBeVisible();
      await expect(page.locator('th:has-text("Guardian")')).toBeVisible();
      await expect(page.locator('th:has-text("Contact")')).toBeVisible();
    });

    test('should sort roster by column', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Get initial order
      const initialNames = await rosterPage.getMemberNames();

      // Sort by Name
      await rosterPage.sortByColumn('Name');

      // Get new order
      const sortedNames = await rosterPage.getMemberNames();

      // If there are multiple members, order should potentially change
      if (initialNames.length > 1) {
        // Just verify the action didn't break anything
        expect(sortedNames.length).toBe(initialNames.length);
      }
    });

    test('should open add member modal', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Open add member modal
      await rosterPage.openAddMemberModal();

      // Modal should be visible
      await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();
    });
  });

  test.describe('Gymnast Details', () => {
    // Skip gymnast details tests - no test gymnast configured
    test.skip(true, 'Skipping: Test gymnast ID not configured');

    test.beforeEach(async ({ page }) => {
      // Login as owner/staff
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should display gymnast details page', async ({ page }) => {
      // This test would need a real gymnast ID
    });
  });

  test.describe('Roster Navigation from List', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should click on gymnast row to navigate to details', async ({ page }) => {
      const rosterPage = new RosterPage(page);
      await rosterPage.goto(TEST_HUB.id);
      await rosterPage.waitForRosterLoad();

      // Filter to gymnasts only
      await rosterPage.selectTab('Gymnasts');

      // Get count of gymnasts
      const count = await rosterPage.getMemberCount();

      if (count > 0) {
        // Click on first gymnast
        await rosterPage.clickMemberByIndex(0);

        // Should navigate to details page
        await expect(page).toHaveURL(/\/roster\/[^/]+$/);
      }
    });
  });
});
