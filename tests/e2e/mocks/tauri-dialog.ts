const TEST_RESOURCE_PATH = '/Users/yuga/projects/todo-kanban-md/todo-kanban/tests/resource/todo';

export interface OpenDialogOptions {
  title?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  multiple?: boolean;
  directory?: boolean;
  recursive?: boolean;
  defaultPath?: string;
}

export async function open(options?: OpenDialogOptions): Promise<string | string[] | null> {
  console.log('Mock dialog open:', options);
  return TEST_RESOURCE_PATH;
}

export interface ConfirmDialogOptions {
  title?: string;
  kind?: 'info' | 'warning' | 'error';
}

export async function confirm(message: string, options?: ConfirmDialogOptions): Promise<boolean> {
  console.log('Mock confirm:', message, options);
  return true;
}