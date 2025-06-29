import { test, expect } from './test-setup';

test.describe('Lane Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for either the welcome screen or the app to load
    await page.waitForSelector('.welcome-container, .app-header', { timeout: 10000 });
    
    // If welcome screen is shown, click select folder
    const welcomeVisible = await page.locator('.welcome-container').isVisible();
    if (welcomeVisible) {
      await page.click('.select-folder-btn');
      // Wait for the app to load after folder selection
      await page.waitForSelector('.app-header', { timeout: 10000 });
    }
    
    // Ensure we're on the kanban board view
    await expect(page.locator('.app-header')).toBeVisible();
  });

  test('should display default lanes', async ({ page }) => {
    // Check that all default lanes are present
    const lanes = ['Todo', 'Doing', 'Pending', 'Done', 'Reject'];
    
    for (const laneName of lanes) {
      await expect(page.locator('.lane').filter({ hasText: laneName })).toBeVisible();
    }
  });

  test('should not allow editing restricted lanes', async ({ page }) => {
    // Restricted lanes should not have edit button
    const restrictedLanes = ['Doing', 'Pending', 'Done', 'Reject'];
    
    for (const laneName of restrictedLanes) {
      const lane = page.locator('.lane').filter({ hasText: laneName });
      const editButton = lane.locator('.lane-action-btn[title="Rename lane"]');
      await expect(editButton).toHaveCount(0);
    }
  });

  test('should allow editing custom lanes', async ({ page }) => {
    // Todo lane should have edit button
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const editButton = todoLane.locator('.lane-action-btn[title="Rename lane"]');
    await expect(editButton).toBeVisible();
  });

  test('should rename a custom lane', async ({ page }) => {
    // Find Todo lane and click edit
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const editButton = todoLane.locator('.lane-action-btn[title="Rename lane"]');
    await editButton.click();
    
    // Wait for input to appear and fill it
    const input = page.locator('.lane-name-input');
    await expect(input).toBeVisible();
    await input.fill('Backlog');
    await input.press('Enter');
    
    // Wait for the rename to complete
    await page.waitForTimeout(500);
    
    // Verify the lane was renamed
    await expect(page.locator('.lane').filter({ hasText: 'Backlog' })).toBeVisible();
    await expect(page.locator('.lane').filter({ hasText: 'Todo' })).not.toBeVisible();
  });

  test('should not allow renaming to restricted lane names', async ({ page }) => {
    // Find Todo lane and click edit
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const editButton = todoLane.locator('.lane-action-btn[title="Rename lane"]');
    await editButton.click();
    
    // Try to rename to a restricted name
    const input = page.locator('.lane-name-input');
    await expect(input).toBeVisible();
    await input.fill('Doing');
    await input.press('Enter');
    
    // Wait a bit for the validation
    await page.waitForTimeout(500);
    
    // Lane should still be Todo (rename should be rejected)
    await expect(page.locator('.lane').filter({ hasText: 'Todo' })).toBeVisible();
  });

  test('should add a new lane', async ({ page }) => {
    // Find the add lane button - it should be in the last lane area
    const addLaneButton = page.locator('.add-lane-btn').last();
    await expect(addLaneButton).toBeVisible();
    await addLaneButton.click();
    
    // Enter new lane name
    const input = page.locator('.add-lane-input');
    await expect(input).toBeVisible();
    await input.fill('In Review');
    await input.press('Enter');
    
    // Wait for the new lane to be added
    await page.waitForTimeout(500);
    
    // Verify the new lane was added
    await expect(page.locator('.lane').filter({ hasText: 'In Review' })).toBeVisible();
  });

  test('should not allow creating lanes with restricted names', async ({ page }) => {
    // Click add lane button
    const addLaneButton = page.locator('.add-lane-btn').last();
    await addLaneButton.click();
    
    // Try to create a lane with restricted name
    const input = page.locator('.add-lane-input');
    await expect(input).toBeVisible();
    await input.fill('Done');
    await input.press('Enter');
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // The input should be cleared but still visible (rejected)
    // Or the lane should not be created
    await expect(page.locator('.lane').filter({ hasText: 'Done' })).toHaveCount(1); // Only the original Done lane
    
    // Press Escape to cancel if input is still visible
    if (await input.isVisible()) {
      await input.press('Escape');
    }
  });

  test('should delete a custom lane', async ({ page }) => {
    // First add a new lane
    const addLaneButton = page.locator('.add-lane-btn').last();
    await addLaneButton.click();
    
    const input = page.locator('.add-lane-input');
    await expect(input).toBeVisible();
    await input.fill('Temporary');
    await input.press('Enter');
    
    // Wait for the lane to be added
    await page.waitForTimeout(500);
    await expect(page.locator('.lane').filter({ hasText: 'Temporary' })).toBeVisible();
    
    // Delete the lane
    const tempLane = page.locator('.lane').filter({ hasText: 'Temporary' });
    const deleteButton = tempLane.locator('.lane-action-btn.delete');
    await deleteButton.click();
    
    // Wait for deletion
    await page.waitForTimeout(500);
    
    // Verify the lane was deleted
    await expect(page.locator('.lane').filter({ hasText: 'Temporary' })).not.toBeVisible();
  });

  test('should delete lane even with todos', async ({ page }) => {
    // Note: This test confirms that lanes can be deleted even if they contain todos
    // This is the actual behavior of the application
    
    // First create a custom lane that we can delete
    const addLaneButton = page.locator('.add-lane-btn').last();
    await addLaneButton.click();
    
    const laneInput = page.locator('.add-lane-input');
    await expect(laneInput).toBeVisible();
    await laneInput.fill('Test Lane');
    await laneInput.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Add a todo to the new lane
    const testLane = page.locator('.lane').filter({ hasText: 'Test Lane' });
    const addTodoButton = testLane.locator('.add-todo-btn');
    await addTodoButton.click();
    
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Test todo');
    await todoInput.press('Control+Enter');
    
    // Wait for todo to be added
    await page.waitForTimeout(500);
    await expect(testLane.locator('.todo-card')).toHaveCount(1);
    
    // Delete the lane with todo
    const deleteButton = testLane.locator('.lane-action-btn.delete');
    await deleteButton.click();
    
    // Wait for deletion
    await page.waitForTimeout(500);
    
    // Lane should be deleted (even though it had todos)
    await expect(page.locator('.lane').filter({ hasText: 'Test Lane' })).not.toBeVisible();
  });

  test.skip('should reorder lanes by dragging', async ({ page }) => {
    // Get initial lane order
    const lanesBeforeDrag = await page.locator('.lane h3').allTextContents();
    
    // Drag Todo lane to after Doing lane
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' }).first();
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' }).first();
    
    const todoDragHandle = todoLane.locator('svg').first();
    const doingDragHandle = doingLane.locator('svg').first();
    
    // Perform drag operation
    await todoDragHandle.hover();
    await page.mouse.down();
    await doingDragHandle.hover();
    await page.mouse.up();
    
    // Get new lane order
    const lanesAfterDrag = await page.locator('.lane h3').allTextContents();
    
    // Verify order changed
    expect(lanesAfterDrag).not.toEqual(lanesBeforeDrag);
    
    // Todo should now be after Doing
    const todoIndex = lanesAfterDrag.indexOf('Todo');
    const doingIndex = lanesAfterDrag.indexOf('Doing');
    expect(todoIndex).toBeGreaterThan(doingIndex);
  });
});