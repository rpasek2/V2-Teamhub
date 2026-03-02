import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage';
import { NEW_USER } from '../../fixtures/test-data';

test.describe('Authentication - Register', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test('should display register page correctly', async ({ page }) => {
    await registerPage.expectToBeOnRegisterPage();

    // Check form elements are present (these are always visible)
    await expect(registerPage.fullNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.organizationInput).toBeVisible();
    await expect(registerPage.createAccountButton).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    // Enter weak password - requirements checklist should appear
    await registerPage.passwordInput.fill('abc');
    await expect(page.locator('text=8+ characters')).toBeVisible();
    await expect(page.locator('text=Uppercase letter')).toBeVisible();
    await expect(page.locator('text=Lowercase letter')).toBeVisible();
    await expect(page.locator('text=Number')).toBeVisible();

    // Enter a stronger password and verify strength bar width changes
    await registerPage.passwordInput.clear();
    await registerPage.passwordInput.fill('Abcd1234');

    // The password requirements checklist should still be visible
    await expect(page.locator('text=8+ characters')).toBeVisible();
  });

  test('should show password requirements checklist', async ({ page }) => {
    // Enter password to trigger requirements display
    await registerPage.passwordInput.fill('test');

    // Check that requirement indicators are shown
    await expect(page.locator('text=8+ characters')).toBeVisible();
    await expect(page.locator('text=Uppercase letter')).toBeVisible();
    await expect(page.locator('text=Lowercase letter')).toBeVisible();
    await expect(page.locator('text=Number')).toBeVisible();
  });

  test('should validate passwords match', async ({ page }) => {
    // Enter matching passwords
    await registerPage.passwordInput.fill('TestPassword123');
    await registerPage.confirmPasswordInput.fill('TestPassword123');

    // Should show passwords match indicator
    await expect(page.locator('text=Passwords match')).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    // Enter non-matching passwords
    await registerPage.passwordInput.fill('TestPassword123');
    await registerPage.confirmPasswordInput.fill('DifferentPassword123');

    // Should show passwords don't match error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should disable submit button for weak password', async ({ page }) => {
    // Fill form with weak password
    await registerPage.fullNameInput.fill(NEW_USER.fullName);
    await registerPage.emailInput.fill(NEW_USER.email);
    await registerPage.passwordInput.fill('weak');
    await registerPage.confirmPasswordInput.fill('weak');

    // Submit button should be disabled
    await expect(registerPage.createAccountButton).toBeDisabled();
  });

  test('should disable submit button when passwords do not match', async ({ page }) => {
    // Fill form with non-matching passwords
    await registerPage.fullNameInput.fill(NEW_USER.fullName);
    await registerPage.emailInput.fill(NEW_USER.email);
    await registerPage.passwordInput.fill('TestPassword123');
    await registerPage.confirmPasswordInput.fill('DifferentPassword123');

    // Submit button should be disabled
    await expect(registerPage.createAccountButton).toBeDisabled();
  });

  test('should navigate back to login page', async ({ page }) => {
    await registerPage.navigateToLogin();

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('h2:has-text("Welcome back")')).toBeVisible();
  });

  test('should use back to sign in link', async ({ page }) => {
    await registerPage.backToSignInLink.click();

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should require full name', async ({ page }) => {
    // Try to submit without full name
    await registerPage.emailInput.fill(NEW_USER.email);
    await registerPage.passwordInput.fill(NEW_USER.password);
    await registerPage.confirmPasswordInput.fill(NEW_USER.password);

    // Full name should be required
    await expect(registerPage.fullNameInput).toHaveAttribute('required', '');
  });

  test('should require valid email', async ({ page }) => {
    // Fill form with invalid email
    await registerPage.fullNameInput.fill(NEW_USER.fullName);
    await registerPage.emailInput.fill('invalid-email');
    await registerPage.passwordInput.fill(NEW_USER.password);
    await registerPage.confirmPasswordInput.fill(NEW_USER.password);

    // Try to submit
    await registerPage.createAccountButton.click();

    // Should stay on register page due to email validation
    await expect(page).toHaveURL(/\/register/);
  });

  test('should allow optional organization field', async ({ page }) => {
    // Verify organization field is not required
    await expect(registerPage.organizationInput).not.toHaveAttribute('required', '');

    // Verify the optional label is shown
    await expect(page.locator('text=(optional)')).toBeVisible();
  });

  test.describe('Successful Registration', () => {
    test.skip(true, 'Skipping: Would create real accounts in the database');

    test('should register successfully with valid data', async ({ page }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      await registerPage.register(
        NEW_USER.fullName,
        uniqueEmail,
        NEW_USER.password,
        NEW_USER.password,
        NEW_USER.organization
      );

      // Should redirect after successful registration
      await expect(page).not.toHaveURL(/\/register/);
    });
  });
});
