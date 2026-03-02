import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Calendar page
 */
export class CalendarPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly createEventButton: Locator;
  readonly monthViewButton: Locator;
  readonly weekViewButton: Locator;
  readonly agendaViewButton: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly todayButton: Locator;
  readonly currentMonthLabel: Locator;
  readonly calendarGrid: Locator;
  readonly eventItems: Locator;
  readonly filterDropdown: Locator;
  readonly loadingSpinner: Locator;

  // Modal
  readonly modal: Locator;

  // Create Event Modal form fields
  readonly eventTitleInput: Locator;
  readonly eventDescriptionInput: Locator;
  readonly eventTypeSelect: Locator;
  readonly eventLocationInput: Locator;
  readonly eventStartDateInput: Locator;
  readonly eventStartTimeInput: Locator;
  readonly eventEndDateInput: Locator;
  readonly eventEndTimeInput: Locator;
  readonly createEventSubmitButton: Locator;
  readonly cancelEventButton: Locator;

  // Event Details Modal
  readonly eventDetailsModal: Locator;
  readonly eventDetailsTitle: Locator;
  readonly rsvpYesButton: Locator;
  readonly rsvpNoButton: Locator;
  readonly rsvpMaybeButton: Locator;
  readonly closeEventDetailsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The page title/month label is in h1 with text like "January 2026"
    this.pageTitle = page.locator('header h1');
    // Main add event button - look for the btn-primary with "Add Event" text
    this.createEventButton = page.locator('button.btn-primary:has-text("Add Event")').first();
    // View toggle buttons are inside a bg-slate-100 container
    this.monthViewButton = page.locator('.bg-slate-100 button:has-text("Month")').first();
    this.weekViewButton = page.locator('.bg-slate-100 button:has-text("Week")').first();
    this.agendaViewButton = page.locator('.bg-slate-100 button:has-text("Agenda"), .bg-slate-100 button:has(.lucide-list)').first();
    // Navigation buttons with chevron icons inside the nav container
    this.prevButton = page.locator('header button:has(.lucide-chevron-left)').first();
    this.nextButton = page.locator('header button:has(.lucide-chevron-right)').first();
    this.todayButton = page.locator('header button:has-text("Today")');
    // Month label is h1 with time element containing the month text
    this.currentMonthLabel = page.locator('header h1 time');
    this.calendarGrid = page.locator('.grid');
    this.eventItems = page.locator('[class*="cursor-pointer"]:has-text(":")');
    this.filterDropdown = page.locator('button:has(.lucide-filter)');
    this.loadingSpinner = page.locator('.animate-spin');

    // Modal overlay (createPortal renders to body with fixed positioning) - look for the modal content specifically
    this.modal = page.locator('div.fixed.inset-0.z-50:has(.rounded-2xl)');

    // Create Event Modal form fields - using specific IDs
    this.eventTitleInput = page.locator('div.fixed.inset-0.z-50 input#title');
    this.eventDescriptionInput = page.locator('div.fixed.inset-0.z-50 textarea#description');
    this.eventTypeSelect = page.locator('div.fixed.inset-0.z-50 [class*="grid-cols-6"]'); // Event type is buttons, not select
    this.eventLocationInput = page.locator('div.fixed.inset-0.z-50 input#location');
    this.eventStartDateInput = page.locator('div.fixed.inset-0.z-50 input#startDate');
    this.eventStartTimeInput = page.locator('div.fixed.inset-0.z-50 input#startTime');
    this.eventEndDateInput = page.locator('div.fixed.inset-0.z-50 input#endDate');
    this.eventEndTimeInput = page.locator('div.fixed.inset-0.z-50 input#endTime');
    this.createEventSubmitButton = page.locator('div.fixed.inset-0.z-50 button[type="submit"]');
    this.cancelEventButton = page.locator('div.fixed.inset-0.z-50 button:has-text("Cancel")');

    // Event Details Modal
    this.eventDetailsModal = this.modal;
    this.eventDetailsTitle = page.locator('div.fixed.inset-0.z-50 h2, div.fixed.inset-0.z-50 h3');
    this.rsvpYesButton = page.locator('button:has-text("Going")');
    this.rsvpNoButton = page.locator('button:has-text("Not Going")');
    this.rsvpMaybeButton = page.locator('button:has-text("Maybe")');
    this.closeEventDetailsButton = page.locator('div.fixed.inset-0.z-50 button:has(.lucide-x)').first();
  }

  async goto(hubId: string) {
    await this.page.goto(`/hub/${hubId}/calendar`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForCalendarLoad() {
    // Wait for spinner to be hidden or not exist
    try {
      await expect(this.loadingSpinner).toBeHidden({ timeout: 15000 });
    } catch {
      // Spinner may not exist
    }
    await this.page.waitForTimeout(500);
  }

  async expectToBeOnCalendarPage() {
    await expect(this.page).toHaveURL(/\/calendar/);
  }

  async openCreateEventModal() {
    await this.createEventButton.click();
    await expect(this.modal).toBeVisible({ timeout: 5000 });
  }

  async createEvent(title: string, options?: {
    description?: string;
    type?: string;
    location?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  }) {
    await this.eventTitleInput.fill(title);

    if (options?.description) {
      await this.eventDescriptionInput.fill(options.description);
    }

    if (options?.type) {
      // Event type is selected via button click, not dropdown
      // Type labels: Practice, Comp, Mentor, Meeting, Social, Other
      const typeLabels: Record<string, string> = {
        'practice': 'Practice',
        'competition': 'Comp',
        'mentorship': 'Mentor',
        'meeting': 'Meeting',
        'social': 'Social',
        'other': 'Other'
      };
      const label = typeLabels[options.type] || options.type;
      await this.page.locator(`div.fixed.inset-0.z-50 button:has-text("${label}")`).click();
    }

    if (options?.location) {
      await this.eventLocationInput.fill(options.location);
    }

    if (options?.startDate) {
      await this.eventStartDateInput.fill(options.startDate);
    }

    if (options?.startTime) {
      await this.eventStartTimeInput.fill(options.startTime);
    }

    if (options?.endDate) {
      await this.eventEndDateInput.fill(options.endDate);
    }

    if (options?.endTime) {
      await this.eventEndTimeInput.fill(options.endTime);
    }

    await this.createEventSubmitButton.click();
  }

  async cancelCreateEvent() {
    await this.cancelEventButton.click();
    await expect(this.modal).toBeHidden({ timeout: 5000 });
  }

  async switchView(view: 'month' | 'week' | 'agenda') {
    switch (view) {
      case 'month':
        await this.monthViewButton.click();
        break;
      case 'week':
        await this.weekViewButton.click();
        break;
      case 'agenda':
        await this.agendaViewButton.click();
        break;
    }
    await this.page.waitForTimeout(300);
  }

  async navigatePrevious() {
    await this.prevButton.click();
    await this.page.waitForTimeout(300);
  }

  async navigateNext() {
    await this.nextButton.click();
    await this.page.waitForTimeout(300);
  }

  async goToToday() {
    await this.todayButton.click();
    await this.page.waitForTimeout(300);
  }

  async clickEvent(eventTitle: string) {
    const event = this.page.locator(`text=${eventTitle}`).first();
    await event.click();
    await this.page.waitForTimeout(500);
  }

  async rsvp(response: 'yes' | 'no' | 'maybe') {
    switch (response) {
      case 'yes':
        await this.rsvpYesButton.click();
        break;
      case 'no':
        await this.rsvpNoButton.click();
        break;
      case 'maybe':
        await this.rsvpMaybeButton.click();
        break;
    }
    await this.page.waitForTimeout(500);
  }

  async closeEventDetails() {
    await this.closeEventDetailsButton.click();
  }

  async getEventCount(): Promise<number> {
    return await this.eventItems.count();
  }
}
