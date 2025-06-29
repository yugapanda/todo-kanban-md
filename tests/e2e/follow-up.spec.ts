import { test, expect } from './test-setup';
import { dragTodoToLane } from './helpers/drag-drop';

test.describe('Ask/Request Todo Follow-up Creation', () => {
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

  test.skip('should create follow-up todo for "ask" tag when moved to Done', async ({ page }) => {
    // Create a todo with "ask" tag
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Ask the team about deployment');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add "ask" tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask the team about deployment' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('ask');
    await todoCard.locator('.tag-input').press('Enter');
    
    // Move to Doing
    await dragTodoToLane(page, 'Ask the team about deployment', 'Doing');
    
    // Move to Done
    await dragTodoToLane(page, 'Ask the team about deployment', 'Done');
    
    // Check that original is in Done
    await expect(doneLane.locator('.todo-card').filter({ hasText: 'Ask the team about deployment' })).toBeVisible();
    
    // Check that follow-up todo was created in Todo lane
    const followUpCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask the team about deployment' });
    await expect(followUpCard).toBeVisible();
    
    // Follow-up should have "follow" tag
    await expect(followUpCard.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
  });

  test.skip('should create follow-up todo for "request" tag when moved to Done', async ({ page }) => {
    // Create a todo with "request" tag
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Request budget approval');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add "request" tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Request budget approval' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('request');
    await todoCard.locator('.tag-input').press('Enter');
    
    // Move to Doing
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await todoCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Move to Done
    const doingCard = doingLane.locator('.todo-card').filter({ hasText: 'Request budget approval' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    await doingCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Check that follow-up was created
    const followUpCard = todoLane.locator('.todo-card').filter({ hasText: 'Request budget approval' }).last();
    await expect(followUpCard).toBeVisible();
    await expect(followUpCard.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
  });

  test.skip('should create follow-up for todo with both ask and request tags', async ({ page }) => {
    // Create a todo with both tags
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Ask and request for resources');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add both tags
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask and request for resources' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('ask');
    await tagInput.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Click outside to close tag input
    await page.locator('.app-header').click();
    await page.waitForTimeout(500);
    
    await todoCard.locator('.add-tag-btn').click();
    const tagInput2 = page.locator('.tag-input');
    await expect(tagInput2).toBeVisible();
    await tagInput2.fill('request');
    await tagInput2.press('Enter');
    
    // Move through workflow
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await todoCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    const doingCard = doingLane.locator('.todo-card').filter({ hasText: 'Ask and request for resources' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    await doingCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Should create follow-up
    const followUpCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask and request for resources' }).last();
    await expect(followUpCard).toBeVisible();
    await expect(followUpCard.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
  });

  test.skip('should not create follow-up for todos without ask/request tags', async ({ page }) => {
    // Create a regular todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Regular task');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add a different tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Regular task' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('feature');
    await todoCard.locator('.tag-input').press('Enter');
    
    // Count todos before moving
    const todosBeforeCount = await todoLane.locator('.todo-card').count();
    
    // Move through workflow
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await todoCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    const doingCard = doingLane.locator('.todo-card').filter({ hasText: 'Regular task' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    await doingCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Count todos after moving - should be one less (moved to Done)
    const todosAfterCount = await todoLane.locator('.todo-card').count();
    expect(todosAfterCount).toBe(todosBeforeCount - 1);
    
    // Should not have any todo with "follow" tag
    await expect(todoLane.locator('.todo-tag-badge').filter({ hasText: '#follow' })).not.toBeVisible();
  });

  test.skip('should not create follow-up when moving to Reject', async ({ page }) => {
    // Create a todo with "ask" tag
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Ask for permission');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add "ask" tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask for permission' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('ask');
    await todoCard.locator('.tag-input').press('Enter');
    
    // Count todos before
    const todosBeforeCount = await todoLane.locator('.todo-card').count();
    
    // Move to Doing
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await todoCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Move to Reject instead of Done
    const doingCard = doingLane.locator('.todo-card').filter({ hasText: 'Ask for permission' });
    const rejectLane = page.locator('.lane').filter({ hasText: 'Reject' });
    await doingCard.locator('svg').first().hover();
    await page.mouse.down();
    await rejectLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Count todos after - should be one less (no follow-up created)
    const todosAfterCount = await todoLane.locator('.todo-card').count();
    expect(todosAfterCount).toBe(todosBeforeCount - 1);
    
    // Should not have any todo with "follow" tag
    await expect(todoLane.locator('.todo-tag-badge').filter({ hasText: '#follow' })).not.toBeVisible();
  });

  test.skip('should preserve other attributes in follow-up todo', async ({ page }) => {
    // Create a todo with ask tag and type
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Ask about API changes');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    // Add ask tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask about API changes' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('ask');
    await todoCard.locator('.tag-input').press('Enter');
    
    // Add another tag
    await page.waitForTimeout(500);
    
    // Click outside to close tag input
    await page.locator('.app-header').click();
    await page.waitForTimeout(500);
    
    await todoCard.locator('.add-tag-btn').click();
    const tagInput2 = page.locator('.tag-input');
    await expect(tagInput2).toBeVisible();
    await tagInput2.fill('backend');
    await tagInput2.press('Enter');
    
    // Add type
    await todoCard.locator('.add-type-btn').click();
    const typeInput = page.locator('.type-input');
    await expect(typeInput).toBeVisible();
    await typeInput.fill('Technical');
    await todoCard.locator('.type-input').press('Enter');
    
    // Move through workflow
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await todoCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    const doingCard = doingLane.locator('.todo-card').filter({ hasText: 'Ask about API changes' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    await doingCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Check follow-up todo
    const followUpCard = todoLane.locator('.todo-card').filter({ hasText: 'Ask about API changes' });
    await expect(followUpCard).toBeVisible();
    
    // Should have follow tag but not the original tags or type
    await expect(followUpCard.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
    await expect(followUpCard.locator('.todo-tag-badge')).toHaveCount(1); // Only follow tag
    await expect(followUpCard.locator('.todo-type-badge')).not.toBeVisible();
  });

  test.skip('should handle case-insensitive ask/request tags', async ({ page }) => {
    // Create todos with different case tags
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    // Todo with "ASK" tag
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Uppercase ASK todo');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    const askCard = todoLane.locator('.todo-card').filter({ hasText: 'Uppercase ASK todo' });
    await askCard.locator('.add-tag-btn').click();
    await askCard.locator('.tag-input').fill('ASK');
    await askCard.locator('.tag-input').press('Enter');
    
    // Todo with "Request" tag
    await todoLane.locator('.add-todo-btn').click();
    const todoInput2 = page.locator('.add-todo-input');
    await expect(todoInput2).toBeVisible();
    await todoInput2.fill('Mixed case Request todo');
    await todoInput2.press('Control+Enter');
    
    const requestCard = todoLane.locator('.todo-card').filter({ hasText: 'Mixed case Request todo' });
    await requestCard.locator('.add-tag-btn').click();
    await requestCard.locator('.tag-input').fill('Request');
    await requestCard.locator('.tag-input').press('Enter');
    
    // Move both through workflow
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    
    // Move ASK todo
    await askCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    const doingAskCard = doingLane.locator('.todo-card').filter({ hasText: 'Uppercase ASK todo' });
    await doingAskCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Move Request todo
    await requestCard.locator('svg').first().hover();
    await page.mouse.down();
    await doingLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    const doingRequestCard = doingLane.locator('.todo-card').filter({ hasText: 'Mixed case Request todo' });
    await doingRequestCard.locator('svg').first().hover();
    await page.mouse.down();
    await doneLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Both should have created follow-ups
    const followUpAsk = todoLane.locator('.todo-card').filter({ hasText: 'Uppercase ASK todo' });
    const followUpRequest = todoLane.locator('.todo-card').filter({ hasText: 'Mixed case Request todo' });
    
    await expect(followUpAsk).toBeVisible();
    await expect(followUpRequest).toBeVisible();
    await expect(followUpAsk.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
    await expect(followUpRequest.locator('.todo-tag-badge').filter({ hasText: '#follow' })).toBeVisible();
  });
});