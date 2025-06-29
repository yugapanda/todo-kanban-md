import { test, expect } from './test-setup';
import { dragTodoToLane } from './helpers/drag-drop';

test.describe('Analytics View and Time Tracking', () => {
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

  test('should open analytics view', async ({ page }) => {
    // Click analytics button
    const analyticsButton = page.locator('.analytics-btn');
    await expect(analyticsButton).toBeVisible();
    await analyticsButton.click();
    
    // Analytics view should be visible
    await expect(page.locator('.analytics-container')).toBeVisible();
    
    // Should show current month
    const currentMonth = new Date();
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const expectedText = `${currentMonth.getFullYear()}年${monthNames[currentMonth.getMonth()]}`;
    await expect(page.locator('.analytics-header h2')).toContainText(expectedText);
  });

  test('should close analytics view', async ({ page }) => {
    // Open analytics
    await page.locator('.analytics-btn').click();
    await expect(page.locator('.analytics-container')).toBeVisible();
    
    // Close analytics
    const closeButton = page.locator('.close-analytics-btn');
    await closeButton.click();
    
    // Should return to kanban board
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.analytics-container')).not.toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Get current month text
    const currentMonthText = await page.locator('.analytics-header h2').textContent();
    
    // Navigate to previous month
    const prevButton = page.locator('.month-nav-btn').first();
    await prevButton.click();
    
    // Month should change
    const prevMonthText = await page.locator('.analytics-header h2').textContent();
    expect(prevMonthText).not.toBe(currentMonthText);
    
    // Navigate to next month (back to current)
    const nextButton = page.locator('.month-nav-btn').last();
    await nextButton.click();
    
    // Should be back to original month
    const backMonthText = await page.locator('.analytics-header h2').textContent();
    expect(backMonthText).toBe(currentMonthText);
  });

  test('should switch between type and tag view modes', async ({ page }) => {
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Should be in type view by default
    const typeButton = page.locator('.view-mode-btn').filter({ hasText: 'タイプ別' });
    const tagButton = page.locator('.view-mode-btn').filter({ hasText: 'タグ別' });
    
    await expect(typeButton).toHaveAttribute('class', /active/);
    await expect(tagButton).not.toHaveAttribute('class', /active/);
    
    // Switch to tag view
    await tagButton.click();
    
    await expect(tagButton).toHaveAttribute('class', /active/);
    await expect(typeButton).not.toHaveAttribute('class', /active/);
    
    // Switch back to type view
    await typeButton.click();
    
    await expect(typeButton).toHaveAttribute('class', /active/);
    await expect(tagButton).not.toHaveAttribute('class', /active/);
  });

  test('should show no data message for empty month', async ({ page }) => {
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Navigate to a future month (likely no data)
    const nextButton = page.locator('.month-nav-btn').last();
    for (let i = 0; i < 12; i++) {
      await nextButton.click();
    }
    
    // Should show no data message
    await expect(page.locator('.no-data')).toBeVisible();
    await expect(page.locator('.no-data')).toContainText('この月のデータはありません');
  });

  test.skip('should track time for tasks', async ({ page }) => {
    // Create a task with type
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Timed task');
    await todoInput.press('Control+Enter');
    
    // Wait for todo to be added
    await page.waitForTimeout(500);
    
    // Add type
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Timed task' });
    await todoCard.locator('.add-type-btn').click();
    const typeInput = page.locator('.type-input');
    await expect(typeInput).toBeVisible();
    await typeInput.fill('Development');
    await typeInput.press('Enter');
    
    // Wait for type to be added
    await page.waitForTimeout(500);
    
    // Move to Doing
    await dragTodoToLane(page, 'Timed task', 'Doing');
    
    // Wait for some time tracking
    await page.waitForTimeout(3000);
    
    // Move to Done
    await dragTodoToLane(page, 'Timed task', 'Done');
    
    // Wait for move to complete
    await page.waitForTimeout(500);
    
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Wait for analytics to load
    await expect(page.locator('.analytics-container')).toBeVisible();
    
    // Should show time data
    await expect(page.locator('.chart-section')).toBeVisible();
    await expect(page.locator('.total-hours')).toBeVisible();
    
    // Should have Development type in the data
    await expect(page.locator('.legend-item').filter({ hasText: 'Development' })).toBeVisible();
  });

  test.skip('should display time tracking charts', async ({ page }) => {
    // Create and track some tasks
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    const doneLane = page.locator('.lane').filter({ hasText: 'Done' });
    
    // Create task 1
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Task 1');
    await todoInput.press('Control+Enter');
    
    await page.waitForTimeout(500);
    
    const task1 = todoLane.locator('.todo-card').filter({ hasText: 'Task 1' });
    await task1.locator('.add-type-btn').click();
    const typeInput = page.locator('.type-input');
    await expect(typeInput).toBeVisible();
    await typeInput.fill('Feature');
    await typeInput.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Track task 1
    await dragTodoToLane(page, 'Task 1', 'Doing');
    
    await page.waitForTimeout(2000);
    
    await dragTodoToLane(page, 'Task 1', 'Done');
    
    await page.waitForTimeout(500);
    
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Wait for analytics to load
    await expect(page.locator('.analytics-container')).toBeVisible();
    
    // Check for chart elements
    await expect(page.locator('.chart-section')).toHaveCount(2); // Bar chart and Pie chart
    
    // Bar chart section
    const barChartSection = page.locator('.chart-section').filter({ hasText: '日別' });
    await expect(barChartSection).toBeVisible();
    await expect(barChartSection.locator('svg.recharts-surface')).toBeVisible();
    
    // Pie chart section
    const pieChartSection = page.locator('.chart-section').filter({ hasText: '時間配分' });
    await expect(pieChartSection).toBeVisible();
    await expect(pieChartSection.locator('svg.recharts-surface')).toBeVisible();
    
    // Legend should show Feature type
    await expect(page.locator('.legend-item').filter({ hasText: 'Feature' })).toBeVisible();
  });

  test.skip('should show time tracking with tags', async ({ page }) => {
    // Create task with tags
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Tagged task');
    await todoInput.press('Control+Enter');
    
    await page.waitForTimeout(500);
    
    // Add tags
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Tagged task' });
    await todoCard.locator('.add-tag-btn').click();
    const tagInput = page.locator('.tag-input');
    await expect(tagInput).toBeVisible();
    await tagInput.fill('frontend');
    await tagInput.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Click outside to close tag input
    await page.locator('.app-header').click();
    await page.waitForTimeout(500);
    
    await todoCard.locator('.add-tag-btn').click();
    const tagInput2 = page.locator('.tag-input');
    await expect(tagInput2).toBeVisible();
    await tagInput2.fill('urgent');
    await tagInput2.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Track time
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await dragTodoToLane(page, 'Task 1', 'Doing');
    
    await page.waitForTimeout(2000);
    
    // Move to Done
    await dragTodoToLane(page, 'Tagged task', 'Done');
    
    await page.waitForTimeout(500);
    
    // Open analytics and switch to tag view
    await page.locator('.analytics-btn').click();
    await expect(page.locator('.analytics-container')).toBeVisible();
    await page.locator('.view-mode-btn').filter({ hasText: 'タグ別' }).click();
    
    await page.waitForTimeout(500);
    
    // Should show tags in legend
    await expect(page.locator('.legend-item').filter({ hasText: 'frontend' })).toBeVisible();
    await expect(page.locator('.legend-item').filter({ hasText: 'urgent' })).toBeVisible();
  });

  test.skip('should show tasks without type as "その他"', async ({ page }) => {
    // Create task without type
    const todoLane = page.locator('.lane').filter({ hasText: 'Todo' });
    await todoLane.locator('.add-todo-btn').click();
    const todoInput = page.locator('.add-todo-input');
    await expect(todoInput).toBeVisible();
    await todoInput.fill('Untyped task');
    await todoInput.press('Control+Enter');
    
    await page.waitForTimeout(500);
    
    // Track time
    const todoCard = todoLane.locator('.todo-card').filter({ hasText: 'Untyped task' });
    const doingLane = page.locator('.lane').filter({ hasText: 'Doing' });
    await dragTodoToLane(page, 'Task 1', 'Doing');
    
    await page.waitForTimeout(2000);
    
    // Move to Done
    await dragTodoToLane(page, 'Untyped task', 'Done');
    
    await page.waitForTimeout(500);
    
    // Open analytics
    await page.locator('.analytics-btn').click();
    
    // Wait for analytics to load
    await expect(page.locator('.analytics-container')).toBeVisible();
    
    // Should show "その他" (Other) in legend
    await expect(page.locator('.legend-item').filter({ hasText: 'その他' })).toBeVisible();
  });
});