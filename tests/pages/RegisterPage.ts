import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Register page
 */
export class RegisterPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly organizationInput: Locator;
  readonly createAccountButton: Locator;
  readonly errorMessage: Locator;
  readonly signInLink: Locator;
  readonly backToSignInLink: Locator;
  readonly createAccountHeading: Locator;
  readonly passwordStrengthBar: Locator;
  readonly passwordStrengthLabel: Locator;
  readonly passwordsMatchIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fullNameInput = page.locator('input#fullName');
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.confirmPasswordInput = page.locator('input#confirmPassword');
    this.organizationInput = page.locator('input#organization');
    this.createAccountButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.bg-red-50');
    this.signInLink = page.locator('a:has-text("Sign in")').last();
    this.backToSignInLink = page.locator('a:has-text("Back to sign in")');
    this.createAccountHeading = page.locator('h2:has-text("Create your account")');
    this.passwordStrengthBar = page.locator('.h-1\\.5.bg-slate-200 > div');
    this.passwordStrengthLabel = page.locator('text=Strong, text=Good, text=Fair, text=Too weak').first();
    this.passwordsMatchIndicator = page.locator('text=Passwords match');
  }

  async goto() {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  async register(fullName: string, email: string, password: string, confirmPassword: string, organization?: string) {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    if (organization) {
      await this.organizationInput.fill(organization);
    }
    await this.createAccountButton.click();
  }

  async expectToBeOnRegisterPage() {
    await expect(this.createAccountHeading).toBeVisible();
    await expect(this.fullNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
  }

  async expectErrorMessage(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  async expectPasswordStrength(strength: 'Too weak' | 'Fair' | 'Good' | 'Strong') {
    await expect(this.page.locator(`text=${strength}`).first()).toBeVisible();
  }

  async expectPasswordsMatch() {
    await expect(this.passwordsMatchIndicator).toBeVisible();
  }

  async navigateToLogin() {
    await this.signInLink.click();
    await expect(this.page).toHaveURL(/\/login/);
  }
}
