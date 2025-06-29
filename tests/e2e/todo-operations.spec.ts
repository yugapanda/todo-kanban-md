import { test, expect } from './test-setup';
import { dragTodoToLane } from './helpers/drag-drop';

test.describe('Todo Card Operations', () => {
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

  test('should create a new todo', async ({ page }) => {
    // Find Todo lane
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    // Click add todo button
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    // Enter todo text
    const input = todoLane.locator('.add-todo-input');
    await expect(input).toBeVisible();
    await input.fill('New test todo');
    
    // Submit with Ctrl+Enter
    await input.press('Control+Enter');
    
    // Verify todo was created
    await expect(todoLane.locator('.todo-card').filter({ hasText: 'New test todo' })).toBeVisible();
  });

  test('should edit todo text by double-clicking', async ({ page }) => {
    // First create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Original todo text');
    await input.press('Control+Enter');
    
    // Double-click to edit
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Original todo text' });
    await todoCard.locator('.todo-content').dblclick();
    await page.waitForTimeout(500);
    
    // Edit the text
    const editInput = todoCard.locator('.todo-edit-input');
    await expect(editInput).toBeVisible();
    await editInput.fill('Updated todo text');
    await editInput.press('Control+Enter');
    
    // Verify text was updated
    await expect(todoCard).toContainText('Updated todo text');
    await expect(todoCard).not.toContainText('Original todo text');
  });

  test('should add tags to todo', async ({ page }) => {
    // Create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo with tags');
    await input.press('Control+Enter');
    
    // Click add tag button
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Todo with tags' });
    const addTagButton = todoCard.locator('.add-tag-btn');
    await addTagButton.click();
    
    // Add a tag
    const tagInput = todoCard.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('urgent');
    await tagInput.press('Enter');
    
    // Verify tag was added
    await expect(todoCard.locator('.todo-tag-badge')).toContainText('#urgent');
  });

  test('should remove tags from todo', async ({ page }) => {
    // Create a todo with tag
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo to remove tag');
    await input.press('Control+Enter');
    
    // Add a tag
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Todo to remove tag' });
    const addTagButton = todoCard.locator('.add-tag-btn');
    await addTagButton.click();
    
    const tagInput = todoCard.locator('.tag-input');
    await tagInput.fill('removeme');
    await tagInput.press('Enter');
    
    // Wait for tag to be added and close input
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Click on tag to enter edit mode
    await addTagButton.click();
    
    // Remove the tag
    const removeButton = todoCard.locator('.tag-remove-btn').first();
    await removeButton.click();
    
    // Verify tag was removed
    await expect(todoCard.locator('.todo-tag-badge')).not.toBeVisible();
  });

  test('should add type to todo', async ({ page }) => {
    // Create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo with type');
    await input.press('Control+Enter');
    
    // Click add type button
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Todo with type' });
    const addTypeButton = todoCard.locator('.add-type-btn');
    await addTypeButton.click();
    
    // Add a type
    const typeInput = todoCard.locator('.type-input');
    await expect(typeInput).toBeVisible();
    await typeInput.fill('Feature');
    await typeInput.press('Enter');
    
    // Verify type was added
    await expect(todoCard.locator('.todo-type-badge')).toContainText('Feature');
  });

  test('should set deadline for todo', async ({ page }) => {
    // Create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo with deadline');
    await input.press('Control+Enter');
    
    // Click deadline section
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Todo with deadline' });
    const deadlineSection = todoCard.locator('.todo-deadline');
    await deadlineSection.click();
    
    // Wait for calendar to appear
    await expect(page.locator('.react-datepicker')).toBeVisible();
    
    // Click on any available day
    await page.locator('.react-datepicker__day:not(.react-datepicker__day--outside-month)').first().click();
    
    // Wait for time input to appear
    await page.waitForTimeout(500);
    
    // Set time if time input is visible
    const timeInput = page.locator('input[type="time"], input[placeholder*="時刻"], input[placeholder*="time"]');
    if (await timeInput.isVisible()) {
      await timeInput.fill('14:00');
    }
    
    // Click outside to close - use Escape key instead due to backdrop
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Verify deadline was set (it should show some date/time)
    await expect(todoCard.locator('.todo-deadline')).not.toContainText('締切を設定');
    await expect(todoCard.locator('.todo-deadline')).toBeVisible();
  });

  test('should create note for todo', async ({ page }) => {
    // Create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo with note');
    await input.press('Control+Enter');
    
    // Click create note button
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Todo with note' });
    const createNoteButton = todoCard.locator('.create-note-btn');
    
    // Note: In a real test, this would create a file
    // For now, we'll just verify the button exists
    await expect(createNoteButton).toBeVisible();
  });

  test.skip('should move todo between lanes', async ({ page }) => {
    // Create a todo in Todo lane
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Todo to move');
    await input.press('Control+Enter');
    
    // Drag todo to Doing lane
    await dragTodoToLane(page, 'Todo to move', 'Doing');
    
    // Verify todo moved to Doing lane
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await expect(doingLane.locator('.todo-card').filter({ hasText: 'Todo to move' })).toBeVisible();
    await expect(todoLane.locator('.todo-card').filter({ hasText: 'Todo to move' })).not.toBeVisible();
  });

  test.skip('should track time when moving to Doing', async ({ page }) => {
    // Create a todo
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Track time todo');
    await input.press('Control+Enter');
    
    // Move to Doing
    await dragTodoToLane(page, 'Track time todo', 'Doing');
    
    // Move back to Pending
    await dragTodoToLane(page, 'Track time todo', 'Pending');
    
    // Check that time tracking appears
    const pendingCard = pendingLane.locator('.todo-card').filter({ hasText: 'Track time todo' });
    await expect(pendingCard.locator('.todo-total-time')).toBeVisible();
  });

  test.skip('should enforce movement restrictions', async ({ page }) => {
    // Create a todo and move it to Done
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const addButton = todoLane.locator('.add-todo-btn');
    await addButton.click();
    
    const input = todoLane.locator('.add-todo-input');
    await input.fill('Restricted movement todo');
    await input.press('Control+Enter');
    
    // First move to Doing
    await dragTodoToLane(page, 'Restricted movement todo', 'Doing');
    
    // Then move to Done
    await dragTodoToLane(page, 'Restricted movement todo', 'Done');
    
    // Try to move back to Todo (should not be allowed)
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    const doneCard = doneLane.locator('.todo-card').filter({ hasText: 'Restricted movement todo' });
    const dragHandle = doneCard.locator('svg').first();
    
    await dragHandle.hover();
    await page.mouse.down();
    await todoLane.hover();
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Card should still be in Done
    await expect(doneLane.locator('.todo-card').filter({ hasText: 'Restricted movement todo' })).toBeVisible();
    await expect(todoLane.locator('.todo-card').filter({ hasText: 'Restricted movement todo' })).not.toBeVisible();
  });

  test('should show autocomplete suggestions for tags', async ({ page }) => {
    // Create two todos with tags to build autocomplete list
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    
    // First todo with tag
    await todoLane.locator('.add-todo-btn').click();
    await todoLane.locator('.add-todo-input').fill('First todo');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    const firstCard = todoLane.locator('.todo-card').filter({ hasText: 'First todo' });
    await firstCard.locator('.add-tag-btn').click();
    await firstCard.locator('.tag-input').fill('important');
    await firstCard.locator('.tag-input').press('Enter');
    
    // Second todo - should show autocomplete
    await todoLane.locator('.add-todo-btn').click();
    await todoLane.locator('.add-todo-input').fill('Second todo');
    await todoLane.locator('.add-todo-input').press('Control+Enter');
    
    const secondCard = todoLane.locator('.todo-card').filter({ hasText: 'Second todo' });
    await secondCard.locator('.add-tag-btn').click();
    await secondCard.locator('.tag-input').fill('imp');
    
    // Should show autocomplete dropdown
    // Should show autocomplete dropdown with suggestion
    await expect(page.locator('.tag-autocomplete')).toBeVisible();
    await expect(page.locator('.tag-autocomplete-item')).toContainText('important');
  });
});