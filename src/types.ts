export interface Todo {
  id: string;
  text: string;
  laneId: string;
  deadline?: string; // @YYYYMMDD
  deadlineTime?: string; // @@hh:mm
  doingPendingHistory: Array<{ doing: string | null, pending: string | null }>; // [(YYYYMMDDhhmm,YYYYMMDDhhmm)]
  doneAt?: string; // !YYYYMMDDhhmm
  rejectAt?: string; // !!YYYYMMDDhhmm
  tags: string[]; // #tag
  type?: string; // $type
  order: number;
}

export interface Lane {
  id: string;
  name: string;
  todos: Todo[];
  isRestricted: boolean;
  order: number;
}

export interface Automation {
  type: string;
  lane: string;
  todos: string[];
}

export interface KanbanData {
  lanes: Lane[];
  automations: Automation[];
}

export const RESTRICTED_LANES = ['Doing', 'Pending', 'Done', 'Reject'];