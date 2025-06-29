import { Page, Locator } from '@playwright/test';

export async function dragAndDrop(page: Page, source: Locator, target: Locator) {
  // Use Playwright's built-in dragTo method which works better with dnd-kit
  await source.dragTo(target);
  await page.waitForTimeout(1000);
}

export async function dragTodoToLane(page: Page, todoText: string, targetLaneName: string) {
  // Find the todo card by text
  const todoCard = page.locator('.todo-card').filter({ hasText: todoText });
  const dragHandle = todoCard.locator('svg').first();

  // Find the target lane
  const targetLane = page.locator('.lane').filter({ hasText: targetLaneName });

  // Wait for elements to be visible
  await dragHandle.waitFor({ state: 'visible' });
  await targetLane.waitFor({ state: 'visible' });

  // Perform drag and drop
  await dragAndDrop(page, dragHandle, targetLane);

  // Wait for the move to complete
  await page.waitForTimeout(1000);

  // Verify the todo is now in the target lane
  const movedTodo = targetLane.locator('.todo-card').filter({ hasText: todoText });
  await movedTodo.waitFor({ state: 'visible', timeout: 5000 });
}