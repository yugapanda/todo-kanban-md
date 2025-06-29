import { test, expect } from './test-setup';

test.describe('WIP Limit Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.welcome-container, .app-header', { timeout: 10000 });
    
    const welcomeVisible = await page.locator('.welcome-container').isVisible();
    if (welcomeVisible) {
      await page.click('.select-folder-btn');
      await page.waitForSelector('.app-header', { timeout: 10000 });
    }
    
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('should display WIP limit toggle', async ({ page }) => {
    // Check that WIP limit toggle exists
    const wipToggle = page.locator('.wip-limit-toggle');
    await expect(wipToggle).toBeVisible();
    
    // Toggle should be off by default
    const toggleInput = wipToggle.locator('input[type="checkbox"]');
    await expect(toggleInput).not.toBeChecked();
  });

  test('should enable WIP limit', async ({ page }) => {
    // Enable WIP limit
    const wipToggle = page.locator('.wip-limit-toggle');
    await wipToggle.click();
    
    // Verify it's checked
    const toggleInput = wipToggle.locator('input[type="checkbox"]');
    await expect(toggleInput).toBeChecked();
  });

  test.skip('should enforce WIP limit of 1 in Doing lane', async ({ page }) => {
    // Enable WIP limit
    const wipToggle = page.locator('.wip-limit-toggle input[type="checkbox"]');
    await wipToggle.click();
    
    // Create two todos in Todo lane
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    // First todo
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('First task');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Second todo
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('Second task');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Move first todo to Doing
    const firstCard = todoLane.locator('.todo-card').filter({ hasText: 'First task' });
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    
    await firstCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Verify first task is in Doing
    await expect(doingLane.locator('.todo-card').filter({ hasText: 'First task' })).toBeVisible();
    
    // Move second todo to Doing
    const secondCard = todoLane.locator('.todo-card').filter({ hasText: 'Second task' });
    
    await secondCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // WIP limit should move first task to Pending
    const pendingLane = page.locator('.lane').filter({ hasText: 'Pending' });
    await expect(pendingLane.locator('.todo-card').filter({ hasText: 'First task' })).toBeVisible();
    await expect(doingLane.locator('.todo-card').filter({ hasText: 'Second task' })).toBeVisible();
    
    // Only one task should be in Doing
    const doingCards = await doingLane.locator('.todo-card').count();
    expect(doingCards).toBe(1);
  });

  test.skip('should not enforce WIP limit when disabled', async ({ page }) => {
    // Make sure WIP limit is disabled
    const wipToggle = page.locator('.wip-limit-toggle input[type="checkbox"]');
    const isChecked = await wipToggle.isChecked();
    if (isChecked) {
      await wipToggle.click();
    }
    
    // Create two todos
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    // First todo
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('Task 1');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Second todo
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('Task 2');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Move both to Doing
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    
    // Move first
    const firstCard = todoLane.locator('.todo-card').filter({ hasText: 'Task 1' });
    await firstCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Move second
    const secondCard = todoLane.locator('.todo-card').filter({ hasText: 'Task 2' });
    await secondCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Both tasks should be in Doing
    await expect(doingLane.locator('.todo-card').filter({ hasText: 'Task 1' })).toBeVisible();
    await expect(doingLane.locator('.todo-card').filter({ hasText: 'Task 2' })).toBeVisible();
    
    // Two tasks should be in Doing
    const doingCards = await doingLane.locator('.todo-card').count();
    expect(doingCards).toBe(2);
  });

  test.skip('should preserve time tracking when moved by WIP limit', async ({ page }) => {
    // Enable WIP limit
    const wipToggle = page.locator('.wip-limit-toggle input[type="checkbox"]');
    await wipToggle.click();
    
    // Create a todo and move to Doing
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('Timed task');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    const timedCard = todoLane.locator('.todo-card').filter({ hasText: 'Timed task' });
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    
    await timedCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Wait a moment for time tracking
    await page.waitForTimeout(2000);
    
    // Create another todo and move to Doing (should push first to Pending)
    await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
    await todoLane.locator('.add-todo-input').fill('New task');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    const newCard = todoLane.locator('.todo-card').filter({ hasText: 'New task' });
    await newCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Check that timed task is now in Pending with time tracking
    const pendingLane = page.locator('.lane').filter({ hasText: 'Pending' });
    const pendingTimedCard = pendingLane.locator('.todo-card').filter({ hasText: 'Timed task' });
    
    await expect(pendingTimedCard).toBeVisible();
    await expect(pendingTimedCard.locator('.todo-total-time')).toBeVisible();
  });

  test.skip('should toggle WIP limit during active session', async ({ page }) => {
    // Create todos
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    for (let i = 1; i <= 3; i++) {
      await todoLane.locator('.add-todo-btn').filter({ hasText: '+' }).click();
      await todoLane.locator('.add-todo-input').fill(`Task ${i}`);
      await todoLane.locator('.add-todo-input').press('Control+Enter');
    }
    
    // Move two tasks to Doing without WIP limit
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    
    for (let i = 1; i <= 2; i++) {
      const card = todoLane.locator('.todo-card').filter({ hasText: `Task ${i}` });
      await card.locator('svg').first().hover();
      await page.mouse.down();
      await doingLane.hover();
      await page.mouse.up();
    }
    
    // Both should be in Doing
    expect(await doingLane.locator('.todo-card').count()).toBe(2);
    
    // Enable WIP limit
    const wipToggle = page.locator('.wip-limit-toggle input[type="checkbox"]');
    await wipToggle.click();
    
    // Move third task to Doing
    const thirdCard = todoLane.locator('.todo-card').filter({ hasText: 'Task 3' });
    await thirdCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    
    // Should enforce limit and move one task to Pending
    const pendingLane = page.locator('.lane').filter({ hasText: 'Pending' });
    expect(await doingLane.locator('.todo-card').count()).toBe(1);
    expect(await pendingLane.locator('.todo-card').count()).toBeGreaterThan(0);
  });
});