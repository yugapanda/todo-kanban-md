import { test as base } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test resource folder path
const TEST_RESOURCE_PATH = path.resolve(__dirname, '../resource/todo');

// Custom test fixture that sets up test environment
export const test = base.extend({
  // Auto-fixture that runs before each test
  page: async ({ page }, use) => {
    // Set test mode flag
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    // Mock the Tauri API for testing with proper paths
    await page.addInitScript((testPath) => {
      // Store test folder path
      const testFolderPath = testPath;
      
      if (!(window as any).__TAURI__) {
        (window as any).__TAURI__ = {
          core: {
            invoke: async (cmd: string, args?: any) => {
              console.log('Mock invoke:', cmd, args);
              // Mock responses for different commands
              switch (cmd) {
                case 'select_folder':
                  return testFolderPath;
                case 'read_todo_file':
                  return `## Todo

## Doing

## Pending

## Done

## Reject
`;
                case 'read_automation_file':
                  return '';
                case 'write_todo_file':
                  console.log('Mock write_todo_file:', args);
                  // Simulate successful write
                  return undefined;
                case 'start_file_watcher':
                  return undefined;
                case 'stop_file_watcher':
                  return undefined;
                case 'create_todo_note':
                  return `${testFolderPath}/notes/test.md`;
                case 'open_file':
                  return undefined;
                case 'open_in_vscode':
                  return undefined;
                case 'save_archive':
                  return undefined;
                default:
                  console.warn('Unknown command:', cmd);
                  return undefined;
              }
            }
          },
          event: {
            listen: async () => {
              return () => {}; // Return unsubscribe function
            }
          },
          plugin: {
            dialog: {
              confirm: async (message: string, options?: any) => {
                console.log('Mock confirm:', message);
                return true;
              },
              open: async (options?: any) => {
                console.log('Mock dialog open:', options);
                return testFolderPath;
              }
            }
          }
        };
      }
    }, TEST_RESOURCE_PATH);

    await use(page);
  },
});

export { expect } from '@playwright/test';