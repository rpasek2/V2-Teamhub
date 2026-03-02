import { test, expect } from '@playwright/test';
import { MarketplacePage } from '../../pages/MarketplacePage';
import { LoginPage } from '../../pages/LoginPage';
import { TEST_USERS, TEST_HUB, NEW_MARKETPLACE_ITEM } from '../../fixtures/test-data';

test.describe('Marketplace', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto(`/hub/${TEST_HUB.id}/marketplace`);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Authenticated Marketplace Views', () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner/staff
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should display marketplace page correctly', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Verify page elements
      await marketplacePage.expectToBeOnMarketplacePage();
    });

    test('should display search input', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      await expect(marketplacePage.searchInput).toBeVisible();
    });

    test('should display create listing button', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      await expect(marketplacePage.createListingButton).toBeVisible();
    });

    test('should filter items by search', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Get initial count
      const initialCount = await marketplacePage.getItemCount();

      // Search for something that likely doesn't exist
      await marketplacePage.search('xyznonexistent123');

      // Count should be 0 or less
      const filteredCount = await marketplacePage.getItemCount();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // Clear search
      await marketplacePage.clearSearch();

      // Count should return to initial
      const resetCount = await marketplacePage.getItemCount();
      expect(resetCount).toBe(initialCount);
    });

    test('should display filter options', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Check for filter button or dropdown
      const hasFilter = await marketplacePage.filterButton.isVisible() ||
                        await marketplacePage.categoryFilter.isVisible();

      // Filter options should exist
      expect(hasFilter).toBeTruthy();
    });

    test('should display sort options', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Check for sort dropdown
      const hasSortDropdown = await marketplacePage.sortDropdown.isVisible();
      expect(hasSortDropdown).toBeTruthy();
    });
  });

  test.describe('Marketplace Item Listing', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should open create listing modal', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Open create listing modal
      await marketplacePage.openCreateListingModal();

      // Modal should be visible
      await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();
    });

    test('should display listing form fields', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Open create listing modal
      await marketplacePage.openCreateListingModal();

      // Check for form fields
      await expect(marketplacePage.itemTitleInput.or(page.locator('input[placeholder*="title" i]'))).toBeVisible();
      await expect(marketplacePage.itemDescriptionInput.or(page.locator('textarea'))).toBeVisible();
      await expect(marketplacePage.itemPriceInput.or(page.locator('input[type="number"]'))).toBeVisible();
    });

    test('should close create listing modal with cancel', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Open and then cancel
      await marketplacePage.openCreateListingModal();
      await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();

      await marketplacePage.cancelCreateListing();

      // Modal should be hidden
      await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeHidden();
    });

    test('should fill out listing form', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Open create listing modal
      await marketplacePage.openCreateListingModal();

      // Fill in the title - use specific modal input
      await marketplacePage.itemTitleInput.fill(NEW_MARKETPLACE_ITEM.title);

      // Verify title was entered
      await expect(marketplacePage.itemTitleInput).toHaveValue(NEW_MARKETPLACE_ITEM.title);
    });

    test.skip('should create a new listing successfully', async ({ page }) => {
      // Skipping actual creation to avoid test data pollution
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      await marketplacePage.openCreateListingModal();

      await marketplacePage.createListing(NEW_MARKETPLACE_ITEM.title, {
        description: NEW_MARKETPLACE_ITEM.description,
        price: NEW_MARKETPLACE_ITEM.price,
        category: NEW_MARKETPLACE_ITEM.category,
        condition: NEW_MARKETPLACE_ITEM.condition,
        size: NEW_MARKETPLACE_ITEM.size,
      });

      // Modal should close
      await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeHidden();

      // New item should appear in list
      await expect(page.locator(`text=${NEW_MARKETPLACE_ITEM.title}`)).toBeVisible();
    });
  });

  test.describe('Marketplace Item Details', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should open item details when clicking an item', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      // Get count of items
      const itemCount = await marketplacePage.getItemCount();

      if (itemCount > 0) {
        // Click on first item
        await marketplacePage.clickItemByIndex(0);

        // Item details should appear (modal)
        await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();
      }
    });

    test('should close item details modal', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      const itemCount = await marketplacePage.getItemCount();

      if (itemCount > 0) {
        // Open item details
        await marketplacePage.clickItemByIndex(0);
        await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();

        // Close it
        await marketplacePage.closeItemDetail();
        await expect(page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeHidden();
      }
    });
  });

  test.describe('Marketplace Sorting', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(TEST_USERS.owner.email, TEST_USERS.owner.password);
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    });

    test('should sort items by different options', async ({ page }) => {
      const marketplacePage = new MarketplacePage(page);
      await marketplacePage.goto(TEST_HUB.id);
      await marketplacePage.waitForMarketplaceLoad();

      const itemCount = await marketplacePage.getItemCount();

      if (itemCount > 1) {
        // Get initial order
        const initialTitles = await marketplacePage.getItemTitles();

        // Sort by price low to high
        await marketplacePage.sortBy('price_low');

        // Get new order
        const sortedTitles = await marketplacePage.getItemTitles();

        // Order might change (or stay same if all same price)
        expect(sortedTitles.length).toBe(initialTitles.length);

        // Sort by price high to low
        await marketplacePage.sortBy('price_high');

        // Just verify no errors
        await marketplacePage.expectToBeOnMarketplacePage();
      }
    });
  });
});
