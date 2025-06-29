import { test as base } from '@playwright/test';

// Custom test fixture that sets up test environment
export const test = base.extend({
  // Auto-fixture that runs before each test
  page: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';