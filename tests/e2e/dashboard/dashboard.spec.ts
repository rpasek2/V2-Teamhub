import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { LoginPage } from '../../pages/LoginPage';
import { TEST_USERS, TEST_HUB } from '../../fixtures/test-data';

test.describe('Dashboard', () => {
  /**
   * These tests require authentication.
   * Using configured test credentials from test-data.ts
   */

  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto(`/hub/${TEST_HUB.id}`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Staff Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner/staff
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);

      // Wait for redirect and navigate to hub
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should display staff dashboard with stat cards', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify staff dashboard elements
      await dashboardPage.expectToBeOnDashboard();
      await dashboardPage.expectStaffDashboard();

      // Check greeting is displayed
      await expect(dashboardPage.greeting).toContainText(/Good (morning|afternoon|evening)/);
    });

    test('should display team member count', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify team members card shows a number
      const count = await dashboardPage.getTeamMembersCount();
      expect(parseInt(count)).toBeGreaterThanOrEqual(0);
    });

    test('should display upcoming events count', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify events card shows a number
      const count = await dashboardPage.getUpcomingEventsCount();
      expect(parseInt(count)).toBeGreaterThanOrEqual(0);
    });

    test('should display recent activity section', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify recent activity section exists
      await expect(dashboardPage.recentActivitySection).toBeVisible();
    });

    test('should display upcoming schedule section', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify upcoming schedule section exists
      await expect(dashboardPage.upcomingScheduleSection).toBeVisible();
    });

    test('should navigate to calendar from dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Click View Full Calendar button (if visible)
      const calendarButton = dashboardPage.viewCalendarButton;
      if (await calendarButton.isVisible()) {
        await dashboardPage.navigateToCalendar();
        await expect(page).toHaveURL(/\/calendar/);
      }
    });
  });

  test.describe('Parent Dashboard', () => {
    // Skip parent tests for now - no parent test account configured
    test.skip(true, 'Skipping: Parent test credentials not configured');

    test.beforeEach(async ({ page }) => {
      // Login as parent
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.parent.email, TEST_USERS.parent.password);

      // Wait for redirect
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should display parent dashboard with linked gymnasts', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Verify parent dashboard elements
      await dashboardPage.expectToBeOnDashboard();
      await dashboardPage.expectParentDashboard();
    });

    test('should navigate to gymnast details from dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto(TEST_HUB.id);
      await dashboardPage.waitForDashboardLoad();

      // Click on a linked gymnast card
      await dashboardPage.clickLinkedGymnast(0);

      // Should navigate to gymnast details
      await expect(page).toHaveURL(/\/roster\//);
    });
  });
});
