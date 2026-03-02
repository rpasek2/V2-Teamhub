import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Roster page
 */
export class RosterPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly addMemberButton: Locator;
  readonly manageLevelsButton: Locator;
  readonly tabAll: Locator;
  readonly tabAdmins: Locator;
  readonly tabCoaches: Locator;
  readonly tabGymnasts: Locator;
  readonly tabParents: Locator;
  readonly rosterTable: Locator;
  readonly rosterRows: Locator;
  readonly loadingText: Locator;
  readonly noMembersText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Roster")');
    this.searchInput = page.locator('input.input[placeholder="Search members..."]');
    this.addMemberButton = page.locator('button.btn-primary:has-text("Add Member")');
    this.manageLevelsButton = page.locator('button.btn-secondary:has-text("Manage Levels")');
    // Tabs are inside a flex container with rounded-lg bg-slate-100
    this.tabAll = page.locator('.bg-slate-100 button:has-text("All")');
    this.tabAdmins = page.locator('.bg-slate-100 button:has-text("Admins")');
    this.tabCoaches = page.locator('.bg-slate-100 button:has-text("Coaches")');
    this.tabGymnasts = page.locator('.bg-slate-100 button:has-text("Gymnasts")');
    this.tabParents = page.locator('.bg-slate-100 button:has-text("Parents")');
    this.rosterTable = page.locator('table');
    this.rosterRows = page.locator('tbody tr');
    this.loadingText = page.locator('text=Loading roster...');
    this.noMembersText = page.locator('text=No members found in this category');
  }

  async goto(hubId: string) {
    await this.page.goto(`/hub/${hubId}/roster`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForRosterLoad() {
    // Wait for loading to finish
    try {
      await expect(this.loadingText).toBeHidden({ timeout: 15000 });
    } catch {
      // Loading text may not exist if page loaded quickly
    }
    // Either roster table or no members message should be visible
    await expect(this.rosterTable.or(this.noMembersText)).toBeVisible();
    await this.page.waitForTimeout(300);
  }

  async expectToBeOnRosterPage() {
    await expect(this.page).toHaveURL(/\/roster$/);
    await expect(this.pageTitle).toBeVisible();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce/filtering
    await this.page.waitForTimeout(300);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  async selectTab(tab: 'All' | 'Admins' | 'Coaches' | 'Gymnasts' | 'Parents') {
    const tabLocator = this.page.locator(`.bg-slate-100 button:has-text("${tab}")`);
    await tabLocator.click();
    await this.page.waitForTimeout(300);
  }

  async getMemberCount(): Promise<number> {
    const count = await this.rosterRows.count();
    // Subtract 1 if there's a "no members found" row
    const hasNoMembers = await this.noMembersText.isVisible().catch(() => false);
    return hasNoMembers ? 0 : count;
  }

  async clickMember(name: string) {
    const row = this.rosterRows.filter({ hasText: name }).first();
    await row.click();
    await expect(this.page).toHaveURL(/\/roster\/[^/]+$/);
  }

  async clickMemberByIndex(index: number) {
    // Only click if the row is clickable (gymnast profile)
    const row = this.rosterRows.nth(index);
    await row.click();
  }

  async openAddMemberModal() {
    await this.addMemberButton.click();
    // Wait for modal to appear
    await expect(this.page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();
  }

  async sortByColumn(column: 'ID' | 'Name' | 'Role' | 'Level' | 'Guardian' | 'Contact') {
    const header = this.page.locator(`th:has-text("${column}")`);
    await header.click();
  }

  async getMemberNames(): Promise<string[]> {
    const names: string[] = [];
    const count = await this.rosterRows.count();
    for (let i = 0; i < count; i++) {
      const nameCell = this.rosterRows.nth(i).locator('td').nth(1);
      const name = await nameCell.textContent();
      if (name) names.push(name.trim());
    }
    return names;
  }
}
