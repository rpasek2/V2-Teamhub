import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Gymnast Details page
 */
export class GymnastDetailsPage {
  readonly page: Page;
  readonly gymnastName: Locator;
  readonly gymnastLevel: Locator;
  readonly backButton: Locator;
  readonly tabProfile: Locator;
  readonly tabGoals: Locator;
  readonly tabAssessment: Locator;
  readonly tabAssignments: Locator;
  readonly tabSkills: Locator;
  readonly tabScores: Locator;
  readonly tabAttendance: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gymnastName = page.locator('h1').first();
    this.gymnastLevel = page.locator('.badge, .text-slate-600').first();
    this.backButton = page.locator('button:has-text("Back"), a:has-text("Back")').first();
    this.tabProfile = page.locator('button:has-text("Profile")');
    this.tabGoals = page.locator('button:has-text("Goals")');
    this.tabAssessment = page.locator('button:has-text("Assessment")');
    this.tabAssignments = page.locator('button:has-text("Assignments")');
    this.tabSkills = page.locator('button:has-text("Skills")');
    this.tabScores = page.locator('button:has-text("Scores")');
    this.tabAttendance = page.locator('button:has-text("Attendance")');
    this.loadingSpinner = page.locator('.animate-spin');
  }

  async goto(hubId: string, gymnastId: string) {
    await this.page.goto(`/hub/${hubId}/roster/${gymnastId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageLoad() {
    await expect(this.loadingSpinner).toBeHidden({ timeout: 15000 });
    await expect(this.gymnastName).toBeVisible();
  }

  async expectToBeOnGymnastDetailsPage() {
    await expect(this.page).toHaveURL(/\/roster\/[^/]+$/);
    await expect(this.gymnastName).toBeVisible();
  }

  async getGymnastName(): Promise<string> {
    return await this.gymnastName.textContent() || '';
  }

  async selectTab(tab: 'Profile' | 'Goals' | 'Assessment' | 'Assignments' | 'Skills' | 'Scores' | 'Attendance') {
    const tabLocator = this.page.locator(`button:has-text("${tab}")`);
    await tabLocator.click();
    // Wait for tab content to load
    await this.page.waitForTimeout(500);
  }

  async expectProfileTab() {
    // Profile tab should show basic info sections
    await expect(this.page.locator('text=Guardian, text=Contact, text=Medical').first()).toBeVisible();
  }

  async expectSkillsTab() {
    // Skills tab should show skill matrix or event buttons
    await expect(this.page.locator('text=Vault, text=Bars, text=Beam, text=Floor').first()).toBeVisible();
  }

  async expectScoresTab() {
    // Scores tab should show competition scores or season picker
    await expect(this.page.locator('text=Competition, text=Season, text=Score').first()).toBeVisible();
  }

  async expectAttendanceTab() {
    // Attendance tab should show attendance records
    await expect(this.page.locator('text=Attendance, text=Present, text=Absent').first()).toBeVisible();
  }

  async goBack() {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/\/roster$/);
  }
}
