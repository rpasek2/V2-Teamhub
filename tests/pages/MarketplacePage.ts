import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Marketplace page
 */
export class MarketplacePage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly createListingButton: Locator;
  readonly filterButton: Locator;
  readonly categoryFilter: Locator;
  readonly sortDropdown: Locator;
  readonly hubFilter: Locator;
  readonly itemCards: Locator;
  readonly loadingSpinner: Locator;
  readonly noItemsMessage: Locator;

  // Create Item Modal
  readonly itemTitleInput: Locator;
  readonly itemDescriptionInput: Locator;
  readonly itemPriceInput: Locator;
  readonly itemCategorySelect: Locator;
  readonly itemConditionSelect: Locator;
  readonly itemSizeInput: Locator;
  readonly itemBrandInput: Locator;
  readonly createItemSubmitButton: Locator;
  readonly cancelCreateButton: Locator;

  // Item Detail Modal
  readonly itemDetailModal: Locator;
  readonly itemDetailTitle: Locator;
  readonly itemDetailPrice: Locator;
  readonly itemDetailDescription: Locator;
  readonly contactSellerButton: Locator;
  readonly closeItemDetailButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.locator('h1:has-text("Marketplace")');
    this.searchInput = page.locator('input[placeholder="Search items..."]');
    this.createListingButton = page.locator('button.btn-primary:has-text("List an Item")').first();
    this.filterButton = page.locator('button:has-text("Filters")');
    this.categoryFilter = page.locator('select:has-text("All Categories")').first();
    this.sortDropdown = page.locator('select:has-text("Newest First")').first();
    this.hubFilter = page.locator('select:has-text("All Linked Hubs")');
    this.itemCards = page.locator('.grid > div:has(img)');
    this.loadingSpinner = page.locator('.animate-pulse');
    this.noItemsMessage = page.locator('text=No items listed yet, text=No items found');

    // Create Item Modal - fields inside fixed modal
    this.itemTitleInput = page.locator('div.fixed.inset-0.z-50 input[type="text"]').first();
    this.itemDescriptionInput = page.locator('div.fixed.inset-0.z-50 textarea').first();
    this.itemPriceInput = page.locator('div.fixed.inset-0.z-50 input[type="number"]').first();
    this.itemCategorySelect = page.locator('div.fixed.inset-0.z-50 select').first();
    this.itemConditionSelect = page.locator('div.fixed.inset-0.z-50 select').nth(1);
    this.itemSizeInput = page.locator('div.fixed.inset-0.z-50 input[placeholder*="size" i]');
    this.itemBrandInput = page.locator('div.fixed.inset-0.z-50 input[placeholder*="brand" i]');
    this.createItemSubmitButton = page.locator('div.fixed.inset-0.z-50 button[type="submit"]');
    this.cancelCreateButton = page.locator('div.fixed.inset-0.z-50 button:has-text("Cancel")');

    // Item Detail Modal
    this.itemDetailModal = page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)');
    this.itemDetailTitle = page.locator('div.fixed.inset-0.z-50 h2, div.fixed.inset-0.z-50 h3').first();
    this.itemDetailPrice = page.locator('div.fixed.inset-0.z-50 .text-2xl, div.fixed.inset-0.z-50 .text-xl');
    this.itemDetailDescription = page.locator('div.fixed.inset-0.z-50 p.text-slate-600');
    this.contactSellerButton = page.locator('div.fixed.inset-0.z-50 button:has-text("Contact Seller"), div.fixed.inset-0.z-50 button:has-text("Message")');
    this.closeItemDetailButton = page.locator('div.fixed.inset-0.z-50 button:has(.lucide-x)').first();
  }

  async goto(hubId: string) {
    await this.page.goto(`/hub/${hubId}/marketplace`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForMarketplaceLoad() {
    // Wait for either loading skeleton to disappear or page to stabilize
    try {
      await expect(this.loadingSpinner).toBeHidden({ timeout: 15000 });
    } catch {
      // Spinner may not exist if page loaded quickly
    }
    await this.page.waitForTimeout(500);
  }

  async expectToBeOnMarketplacePage() {
    await expect(this.page).toHaveURL(/\/marketplace/);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  async openCreateListingModal() {
    await this.createListingButton.click();
    await expect(this.page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeVisible();
  }

  async createListing(title: string, options: {
    description: string;
    price: string;
    category: string;
    condition?: string;
    size?: string;
    brand?: string;
  }) {
    await this.itemTitleInput.fill(title);
    await this.itemDescriptionInput.fill(options.description);
    await this.itemPriceInput.fill(options.price);
    await this.itemCategorySelect.selectOption(options.category);

    if (options.condition) {
      await this.itemConditionSelect.selectOption(options.condition);
    }

    if (options.size) {
      await this.itemSizeInput.fill(options.size);
    }

    if (options.brand) {
      await this.itemBrandInput.fill(options.brand);
    }

    await this.createItemSubmitButton.click();
  }

  async cancelCreateListing() {
    await this.cancelCreateButton.click();
    await expect(this.page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl, .bg-white)')).toBeHidden();
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
    await this.page.waitForTimeout(500);
  }

  async sortBy(option: 'newest' | 'price_low' | 'price_high') {
    // Map option names to actual select option values
    const optionMap: Record<string, string> = {
      'newest': 'newest',
      'price_low': 'price_low',
      'price_high': 'price_high'
    };
    await this.sortDropdown.selectOption(optionMap[option]);
    await this.page.waitForTimeout(500);
  }

  async clickItem(title: string) {
    const item = this.page.locator(`.card:has-text("${title}")`).first();
    await item.click();
    await this.page.waitForTimeout(500);
  }

  async clickItemByIndex(index: number) {
    await this.itemCards.nth(index).click();
    await this.page.waitForTimeout(500);
  }

  async closeItemDetail() {
    await this.closeItemDetailButton.click();
    await this.page.waitForTimeout(300);
  }

  async getItemCount(): Promise<number> {
    const hasNoItems = await this.noItemsMessage.isVisible().catch(() => false);
    if (hasNoItems) return 0;
    return await this.itemCards.count();
  }

  async getItemTitles(): Promise<string[]> {
    const titles: string[] = [];
    const count = await this.itemCards.count();
    for (let i = 0; i < count; i++) {
      const title = await this.itemCards.nth(i).locator('h3, .font-semibold').first().textContent();
      if (title) titles.push(title.trim());
    }
    return titles;
  }
}
