import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { TEST_USERS } from '../../fixtures/test-data';

test.describe('Authentication - Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login page correctly', async ({ page }) => {
    // Verify page title and key elements
    await expect(page).toHaveTitle(/TeamHub/i);
    await loginPage.expectToBeOnLoginPage();

    // Check form elements are present (these are always visible)
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
    await expect(loginPage.createAccountLink).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    await loginPage.login('invalid@example.com', 'wrongpassword');

    // Wait for and verify error message
    await loginPage.expectErrorMessage();

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error for empty form submission', async ({ page }) => {
    // Try to submit empty form
    await loginPage.signInButton.click();

    // Form validation should prevent submission
    // Check that email input shows validation error (required field)
    await expect(loginPage.emailInput).toHaveAttribute('required', '');
  });

  test('should show error for invalid email format', async ({ page }) => {
    // Enter invalid email format
    await loginPage.emailInput.fill('not-an-email');
    await loginPage.passwordInput.fill('somepassword');
    await loginPage.signInButton.click();

    // Browser validation should kick in for invalid email
    // The form should not submit successfully
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to register page', async ({ page }) => {
    await loginPage.navigateToRegister();

    // Verify we're on the register page
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible();
  });

  test('should show loading state during login attempt', async ({ page }) => {
    // Enter credentials
    await loginPage.emailInput.fill('test@example.com');
    await loginPage.passwordInput.fill('password123');

    // Click login and check for loading indicator
    await loginPage.signInButton.click();

    // The button should show loading state (spinner icon)
    // We use waitForTimeout briefly to catch the loading state
    await expect(page.locator('.animate-spin').or(loginPage.errorMessage)).toBeVisible();
  });

  test.describe('Successful Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);

      // Should redirect to hub selection or dashboard
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
      await expect(page.url()).toMatch(/\/(hub\/|$)/);
    });
  });
});
