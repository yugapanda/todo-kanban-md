// Mock Tauri API for testing
const path = require('path');

const TEST_RESOURCE_PATH = path.resolve(__dirname, '../resource/todo');

// Create global mocks
window.__TAURI_INTERNALS__ = {
  invoke: async (cmd, args) => {
    console.log('Mock invoke:', cmd, args);
    switch (cmd) {
      case 'plugin:dialog|open':
      case 'select_folder':
        return TEST_RESOURCE_PATH;
      case 'read_todo_file':
        return `## IceBox

## Todo

## Doing

## Pending

## Done

## Reject

## Archive
`;
      case 'read_automation_file':
        return '';
      case 'write_todo_file':
        return undefined;
      case 'start_file_watcher':
        return undefined;
      case 'stop_file_watcher':
        return undefined;
      case 'create_todo_note':
        return `${TEST_RESOURCE_PATH}/notes/test.md`;
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
};

// Mock ES modules
window.mockModules = {
  '@tauri-apps/api/core': {
    invoke: window.__TAURI_INTERNALS__.invoke
  },
  '@tauri-apps/plugin-dialog': {
    open: async (options) => {
      console.log('Mock dialog open:', options);
      return TEST_RESOURCE_PATH;
    },
    confirm: async (message, options) => {
      console.log('Mock confirm:', message);
      return true;
    }
  },
  '@tauri-apps/api/event': {
    listen: async () => {
      return () => {}; // Return unsubscribe function
    }
  }
};