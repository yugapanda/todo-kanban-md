# E2E Tests for Todo Kanban

This directory contains end-to-end tests for the Todo Kanban application using Playwright.

## Test Coverage

The E2E tests cover the following features:

1. **Lane Management** (`lane-management.spec.ts`)
   - Display default lanes
   - Edit/rename custom lanes
   - Add new lanes
   - Delete lanes
   - Reorder lanes by dragging
   - Restrict operations on system lanes (Doing, Pending, Done, Reject)

2. **Todo Card Operations** (`todo-operations.spec.ts`)
   - Create new todos
   - Edit todo text
   - Add/remove tags with autocomplete
   - Add/edit todo type
   - Set deadlines with date/time
   - Create notes for todos
   - Move todos between lanes
   - Time tracking when moving between Doing/Pending
   - Movement restrictions (e.g., Done → only Archive allowed)

3. **WIP Limit Functionality** (`wip-limit.spec.ts`)
   - Toggle WIP limit on/off
   - Enforce single task in Doing lane when enabled
   - Automatically move existing task to Pending when new task enters Doing
   - Preserve time tracking when moved by WIP limit

4. **Analytics View** (`analytics.spec.ts`)
   - Open/close analytics view
   - Navigate between months
   - Switch between type and tag view modes
   - Display time tracking charts (bar and pie)
   - Show tasks without type as "その他"
   - Track time for tasks with multiple tags

5. **Follow-up Creation** (`follow-up.spec.ts`)
   - Auto-create follow-up todos for tasks with "ask" tag
   - Auto-create follow-up todos for tasks with "request" tag
   - Handle case-insensitive tags
   - Only create follow-ups when moved to Done (not Reject)
   - Follow-up todos get "follow" tag

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers (if not already done):
   ```bash
   npx playwright install
   ```

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests with UI Mode

```bash
npm run test:e2e:ui
```

### Debug Tests

```bash
npm run test:e2e:debug
```

### View Test Report

After running tests:
```bash
npm run test:e2e:report
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/lane-management.spec.ts
```

### Run Tests in Headed Mode

```bash
npx playwright test --headed
```

## Important Notes

1. **Tauri Application**: These tests are designed for a Tauri application. The tests run against the Vite development server with mocked Tauri APIs.

2. **Test Mode**: The application runs in test mode (`__TEST_MODE__`), which skips the initial folder auto-load and uses mocked Tauri APIs defined in `test-setup.ts`.

3. **Mocked APIs**: All Tauri native APIs are mocked, including:
   - File system operations (`read_todo_file`, `write_todo_file`)
   - Folder selection dialogs
   - File watchers
   - Confirmation dialogs

4. **Test Data**: Tests use predefined mock data (see `test-setup.ts`) with a basic kanban board structure. Tests create additional data as needed.

5. **Timing**: Some tests include small delays (e.g., for time tracking). These are intentional to ensure proper time measurement.

## Troubleshooting

- If tests fail due to timeouts, try increasing the timeout in `playwright.config.ts`
- If the app doesn't start, ensure the Tauri dev server is configured correctly
- For debugging, use the `--debug` flag or UI mode to step through tests visually