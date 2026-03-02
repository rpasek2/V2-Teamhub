import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Dashboard page
 */
export class DashboardPage {
  readonly page: Page;
  readonly greeting: Locator;
  readonly hubName: Locator;
  readonly statCards: Locator;
  readonly teamMembersCard: Locator;
  readonly upcomingEventsCard: Locator;
  readonly competitionsCard: Locator;
  readonly recentActivitySection: Locator;
  readonly upcomingScheduleSection: Locator;
  readonly viewCalendarButton: Locator;
  readonly linkedGymnastCards: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    // Greeting includes time-based message (Good morning/afternoon/evening)
    this.greeting = page.locator('h1.text-2xl').first();
    this.hubName = page.locator('p.text-slate-500.mt-1').first();
    this.statCards = page.locator('.stat-block');
    this.teamMembersCard = page.locator('.stat-block:has-text("Team Members")');
    this.upcomingEventsCard = page.locator('.stat-block:has-text("Upcoming Events")');
    this.competitionsCard = page.locator('.stat-block:has-text("Competitions")');
    this.recentActivitySection = page.locator('.card:has(h2:has-text("Recent Activity"))');
    this.upcomingScheduleSection = page.locator('.card:has(h2:has-text("Upcoming Schedule"))');
    this.viewCalendarButton = page.locator('a[href*="calendar"]:has-text("View Full Calendar")');
    this.linkedGymnastCards = page.locator('h2:has-text("Your Gymnast")').locator('..').locator('a.card, div.card');
    this.loadingSpinner = page.locator('.animate-spin');
  }

  async goto(hubId: string) {
    await this.page.goto(`/hub/${hubId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDashboardLoad() {
    // Wait for loading to finish
    try {
      await expect(this.loadingSpinner).toBeHidden({ timeout: 15000 });
    } catch {
      // Spinner may not exist if page loaded quickly
    }
    // Wait for greeting to be visible
    await expect(this.greeting).toBeVisible();
    await this.page.waitForTimeout(500);
  }

  async expectToBeOnDashboard() {
    // Check that we're on a hub dashboard page
    await expect(this.page).toHaveURL(/\/hub\/[^/]+$/);
    await expect(this.greeting).toBeVisible();
  }

  async expectStaffDashboard() {
    // Staff should see stat cards
    await expect(this.statCards.first()).toBeVisible();
    await expect(this.teamMembersCard).toBeVisible();
    await expect(this.upcomingEventsCard).toBeVisible();
    await expect(this.competitionsCard).toBeVisible();
  }

  async expectParentDashboard() {
    // Parents should see their linked gymnasts
    await expect(this.linkedGymnastCards.first()).toBeVisible();
  }

  async getTeamMembersCount(): Promise<string> {
    const valueElement = this.teamMembersCard.locator('.stat-value');
    return await valueElement.textContent() || '0';
  }

  async getUpcomingEventsCount(): Promise<string> {
    const valueElement = this.upcomingEventsCard.locator('.stat-value');
    return await valueElement.textContent() || '0';
  }

  async navigateToCalendar() {
    await this.viewCalendarButton.click();
    await expect(this.page).toHaveURL(/\/calendar/);
  }

  async clickLinkedGymnast(index: number = 0) {
    await this.linkedGymnastCards.nth(index).click();
    await expect(this.page).toHaveURL(/\/roster\//);
  }
}
