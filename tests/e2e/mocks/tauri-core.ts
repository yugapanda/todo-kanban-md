import * as path from 'path';

const TEST_RESOURCE_PATH = '/Users/yuga/projects/todo-kanban-md/todo-kanban/tests/resource/todo';

let todoContent = `## IceBox

## Todo

## Doing

## Pending

## Done

## Reject

## Archive
`;

export async function invoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  console.log('Mock invoke:', cmd, args);
  
  switch (cmd) {
    case 'select_folder':
      return TEST_RESOURCE_PATH as T;
      
    case 'read_todo_file':
      return todoContent as T;
      
    case 'read_automation_file':
      return '' as T;
      
    case 'write_todo_file':
      if (args?.content) {
        todoContent = args.content;
      }
      return undefined as T;
      
    case 'start_file_watcher':
    case 'stop_file_watcher':
      return undefined as T;
      
    case 'create_todo_note':
      return `${TEST_RESOURCE_PATH}/notes/test.md` as T;
      
    case 'open_file':
    case 'open_in_vscode':
    case 'save_archive':
      return undefined as T;
      
    default:
      console.warn('Unknown command:', cmd);
      return undefined as T;
  }
}