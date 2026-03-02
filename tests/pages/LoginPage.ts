import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Login page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly createAccountLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly welcomeHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.signInButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-red-50');
    this.createAccountLink = page.locator('a[href="/register"]');
    this.forgotPasswordLink = page.locator('button:has-text("Forgot password?")');
    this.welcomeHeading = page.locator('h2:has-text("Welcome back")');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectToBeOnLoginPage() {
    await expect(this.welcomeHeading).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }

  async expectErrorMessage(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async navigateToRegister() {
    await this.createAccountLink.click();
    await expect(this.page).toHaveURL(/\/register/);
  }
}
