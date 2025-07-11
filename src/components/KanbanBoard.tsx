import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Lane } from './Lane';
import { TodoCard } from './TodoCard';
import { KanbanData, Todo } from '../types';
import { generateMarkdown } from '../utils/markdownParser';
import { invoke } from '@tauri-apps/api/core';
import { format } from 'date-fns';
import { confirm } from '@tauri-apps/plugin-dialog';
import { GripVertical } from 'lucide-react';

interface KanbanBoardProps {
  data: KanbanData;
  folderPath: string;
  onDataChange: (data: KanbanData) => void;
  wipLimitEnabled?: boolean;
}

// Pure functions for ID generation
const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

// Pure functions for todo creation
const createTodo = (laneId: string, text: string, order: number): Todo => ({
  id: generateId(),
  text,
  laneId,
  tags: [],
  doingPendingHistory: [],
  order
});

// Pure functions for history management
const createHistoryEntry = (timestamp: string) => ({
  doing: timestamp,
  pending: null
});

const updateLastHistoryEntry = (history: Todo['doingPendingHistory'], timestamp: string): Todo['doingPendingHistory'] => {
  if (history.length === 0) return history;

  const newHistory = [...history];
  const lastEntry = newHistory[newHistory.length - 1];
  if (lastEntry && !lastEntry.pending) {
    newHistory[newHistory.length - 1] = { ...lastEntry, pending: timestamp };
  }
  return newHistory;
};

// Pure functions for todo movement validation
const hasBeenInDoing = (todo: Todo, fromLane: string): boolean =>
  todo.doingPendingHistory.length > 0 || fromLane === 'Doing';

const hasBeenCompleted = (fromLane: string): boolean =>
  fromLane === 'Done' || fromLane === 'Reject';

const canMoveTodo = (todo: Todo, fromLane: string, toLane: string): boolean => {
  // Once in Done or Reject, can only move to Archive
  if (hasBeenCompleted(fromLane)) {
    return toLane === 'Archive';
  }

  // From Pending, can only move to Doing or Reject
  if (fromLane === 'Pending') {
    return ['Doing', 'Reject'].includes(toLane);
  }

  // Once been in Doing, can only move to Pending, Done, or Reject
  if (hasBeenInDoing(todo, fromLane)) {
    return ['Pending', 'Done', 'Reject'].includes(toLane);
  }

  // To Pending, can only come from Doing
  if (toLane === 'Pending') {
    return fromLane === 'Doing';
  }

  // All other lane movements are free
  return true;
};

// Pure function for updating todo history
const updateTodoHistory = (todo: Todo, fromLane: string, toLane: string): Todo => {
  const now = format(new Date(), 'yyyyMMddHHmm');

  const isMovingToDoing = fromLane !== 'Doing' && toLane === 'Doing';
  const isMovingToPending = fromLane === 'Doing' && toLane === 'Pending';
  const isMovingToDone = toLane === 'Done';
  const isMovingToReject = toLane === 'Reject';

  if (isMovingToDoing) {
    return {
      ...todo,
      doingPendingHistory: [...todo.doingPendingHistory, createHistoryEntry(now)]
    };
  }

  if (isMovingToPending) {
    return {
      ...todo,
      doingPendingHistory: updateLastHistoryEntry(todo.doingPendingHistory, now)
    };
  }

  if (isMovingToDone) {
    return {
      ...todo,
      doneAt: now,
      // Clear rejectAt if it exists
      rejectAt: undefined
    };
  }

  if (isMovingToReject) {
    return {
      ...todo,
      rejectAt: now,
      // Clear doneAt if it exists
      doneAt: undefined
    };
  }

  return todo;
};

// Pure function to check if todo needs follow-up
const needsFollowUp = (todo: Todo): boolean => {
  return todo.tags.some(tag => tag.toLowerCase() === 'ask' || tag.toLowerCase() === 'request');
};

// Pure function to create follow-up todo
const createFollowUpTodo = (originalTodo: Todo, todoLaneId: string, order: number): Todo => ({
  id: generateId(),
  text: originalTodo.text,
  laneId: todoLaneId,
  tags: ['follow'],
  doingPendingHistory: [],
  order
});

// Helper function to handle WIP limit
const enforceWipLimit = (lanes: KanbanData['lanes'], movingTodoId: string): KanbanData['lanes'] => {
  const doingLane = lanes.find(lane => lane.name === 'Doing');
  const pendingLane = lanes.find(lane => lane.name === 'Pending');

  if (!doingLane || !pendingLane) return lanes;

  // Find existing todos in Doing (excluding the one being moved)
  const existingDoingTodos = doingLane.todos.filter(todo => todo.id !== movingTodoId);

  if (existingDoingTodos.length === 0) return lanes;

  // Move the first existing todo to Pending
  const todoToMove = existingDoingTodos[0];
  const now = format(new Date(), 'yyyyMMddHHmm');

  // Update the todo's history
  const updatedTodo = {
    ...todoToMove,
    laneId: pendingLane.id,
    doingPendingHistory: updateLastHistoryEntry(todoToMove.doingPendingHistory, now)
  };

  // Update lanes
  return updateMultipleLanes(lanes, [
    { laneId: doingLane.id, updater: lane => removeTodoFromLane(lane, todoToMove.id) },
    { laneId: pendingLane.id, updater: lane => addTodoToLane(lane, updatedTodo) }
  ]);
};

// Pure functions for finding entities
const findLaneById = (lanes: KanbanData['lanes'], laneId: string) =>
  lanes.find(lane => lane.id === laneId);

const findLaneByTodoId = (lanes: KanbanData['lanes'], todoId: string) =>
  lanes.find(lane => lane.todos.some(todo => todo.id === todoId));

const findTodoById = (lanes: KanbanData['lanes'], todoId: string) =>
  lanes.flatMap(lane => lane.todos).find(todo => todo.id === todoId);

// Type alias for Lane data
type LaneData = KanbanData['lanes'][0];

// Pure functions for lane updates
const updateLane = (lane: LaneData, updates: Partial<LaneData>) => ({
  ...lane,
  ...updates
});

const addTodoToLane = (lane: LaneData, todo: Todo) =>
  updateLane(lane, { todos: [...lane.todos, todo] });

const removeTodoFromLane = (lane: LaneData, todoId: string) =>
  updateLane(lane, { todos: lane.todos.filter(t => t.id !== todoId) });

const insertTodoAtIndex = (lane: LaneData, todo: Todo, index: number) => {
  const newTodos = [...lane.todos];
  newTodos.splice(index, 0, todo);
  return updateLane(lane, { todos: newTodos });
};

// Pure function for updating lanes
const updateLanes = (
  lanes: KanbanData['lanes'],
  laneId: string,
  updater: (lane: LaneData) => LaneData
): KanbanData['lanes'] =>
  lanes.map(lane => lane.id === laneId ? updater(lane) : lane);

// Pure function for updating multiple lanes
const updateMultipleLanes = (
  lanes: KanbanData['lanes'],
  updates: Array<{ laneId: string; updater: (lane: LaneData) => LaneData }>
): KanbanData['lanes'] =>
  updates.reduce((acc, { laneId, updater }) => updateLanes(acc, laneId, updater), lanes);


const pipe = <T,>(...fns: Array<(arg: T) => T>): ((arg: T) => T) =>
  (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ data, folderPath, onDataChange, wipLimitEnabled = false }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [activeLane, setActiveLane] = useState<KanbanData['lanes'][0] | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Collect all existing tags and types for autocomplete
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    data.lanes.forEach(lane => {
      lane.todos.forEach(todo => {
        todo.tags.forEach(tag => tagsSet.add(tag));
      });
    });
    return Array.from(tagsSet).sort();
  }, [data]);

  const allTypes = React.useMemo(() => {
    const typesSet = new Set<string>();
    data.lanes.forEach(lane => {
      lane.todos.forEach(todo => {
        if (todo.type) typesSet.add(todo.type);
      });
    });
    return Array.from(typesSet).sort();
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Side effect wrapped in async function
  const saveToFile = async (newData: KanbanData) => {
    const markdown = generateMarkdown(newData);
    await invoke('write_todo_file', { folderPath, content: markdown });
  };

  // Lane management handlers
  const handleRenameLane = async (laneId: string, newName: string) => {
    const newData: KanbanData = {
      ...data,
      lanes: data.lanes.map(lane =>
        lane.id === laneId
          ? { ...lane, name: newName, id: newName.toLowerCase().replace(/\s+/g, '-') }
          : lane
      )
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  const handleDeleteLane = useCallback(async (laneId: string) => {
    const laneToDelete = data.lanes.find(l => l.id === laneId);
    if (!laneToDelete) return;

    // Always confirm deletion
    const confirmMessage = laneToDelete.todos.length > 0
      ? `Lane "${laneToDelete.name}" contains ${laneToDelete.todos.length} todo(s). Are you sure you want to delete it?`
      : `Are you sure you want to delete the lane "${laneToDelete.name}"?`;

    try {
      const userConfirmed = await confirm(confirmMessage, {
        title: 'Delete Lane',
        okLabel: 'Delete',
        cancelLabel: 'Cancel'
      });

      if (userConfirmed) {
        const newData: KanbanData = {
          ...data,
          lanes: data.lanes.filter(lane => lane.id !== laneId)
        };

        onDataChange(newData);
        await saveToFile(newData);
      }
    } catch (error) {
      console.error('Error showing confirm dialog:', error);
    }
  }, [data, onDataChange]);

  const handleAddLane = async (name: string, afterLaneId: string) => {
    const afterLaneIndex = data.lanes.findIndex(l => l.id === afterLaneId);
    if (afterLaneIndex === -1) return;

    const newLane = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      todos: [],
      isRestricted: false,
      order: afterLaneIndex + 1
    };

    const newLanes = [...data.lanes];
    newLanes.splice(afterLaneIndex + 1, 0, newLane);

    // Update order for all lanes
    const reorderedLanes = newLanes.map((lane, index) => ({
      ...lane,
      order: index
    }));

    const newData: KanbanData = {
      ...data,
      lanes: reorderedLanes
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler using functional composition
  const handleAddTodo = async (laneId: string, todoText: string) => {
    const lane = findLaneById(data.lanes, laneId);
    if (!lane) return;

    const newTodo = createTodo(laneId, todoText, lane.todos.length);

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneId, lane => addTodoToLane(lane, newTodo))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for updating todo text
  const handleUpdateTodo = async (todoId: string, newText: string) => {
    // Find the lane containing the todo
    const laneWithTodo = data.lanes.find(lane =>
      lane.todos.some(todo => todo.id === todoId)
    );

    if (!laneWithTodo) return;

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneWithTodo.id, lane => ({
        ...lane,
        todos: lane.todos.map(todo =>
          todo.id === todoId ? { ...todo, text: newText } : todo
        )
      }))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for updating todo tags
  const handleUpdateTags = async (todoId: string, newTags: string[]) => {
    // Find the lane containing the todo
    const laneWithTodo = data.lanes.find(lane =>
      lane.todos.some(todo => todo.id === todoId)
    );

    if (!laneWithTodo) return;

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneWithTodo.id, lane => ({
        ...lane,
        todos: lane.todos.map(todo =>
          todo.id === todoId ? { ...todo, tags: newTags } : todo
        )
      }))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for updating todo type
  const handleUpdateType = async (todoId: string, newType: string | undefined) => {
    // Find the lane containing the todo
    const laneWithTodo = data.lanes.find(lane =>
      lane.todos.some(todo => todo.id === todoId)
    );

    if (!laneWithTodo) return;

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneWithTodo.id, lane => ({
        ...lane,
        todos: lane.todos.map(todo =>
          todo.id === todoId ? { ...todo, type: newType } : todo
        )
      }))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for updating todo note
  const handleUpdateNote = async (todoId: string, notePath: string) => {
    // Find the lane containing the todo
    const laneWithTodo = data.lanes.find(lane =>
      lane.todos.some(todo => todo.id === todoId)
    );

    if (!laneWithTodo) return;

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneWithTodo.id, lane => ({
        ...lane,
        todos: lane.todos.map(todo =>
          todo.id === todoId ? { ...todo, note: notePath } : todo
        )
      }))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for updating todo deadline
  const handleUpdateDeadline = async (todoId: string, deadline: string | undefined, deadlineTime: string | undefined) => {
    // Find the lane containing the todo
    const laneWithTodo = data.lanes.find(lane =>
      lane.todos.some(todo => todo.id === todoId)
    );

    if (!laneWithTodo) return;

    const newData: KanbanData = {
      ...data,
      lanes: updateLanes(data.lanes, laneWithTodo.id, lane => ({
        ...lane,
        todos: lane.todos.map(todo =>
          todo.id === todoId ? { ...todo, deadline, deadlineTime } : todo
        )
      }))
    };

    onDataChange(newData);
    await saveToFile(newData);
  };

  // Handler for archiving done tasks
  const handleArchiveDone = async () => {
    const doneLane = data.lanes.find(lane => lane.name === 'Done');
    if (!doneLane || doneLane.todos.length === 0) return;

    try {
      const userConfirmed = await confirm(
        `Archive ${doneLane.todos.length} completed task${doneLane.todos.length > 1 ? 's' : ''}?`,
        {
          title: 'Archive Done Tasks',
          okLabel: 'Archive',
          cancelLabel: 'Cancel'
        }
      );

      if (!userConfirmed) return;

      const timestamp = format(new Date(), 'yyyyMMddHHmm');
      const archiveFileName = `ARCHIVE_${timestamp}.md`;

      // Create archive content
      let archiveContent = `# Archive - ${format(new Date(), 'yyyy-MM-dd HH:mm')}\n\n`;
      archiveContent += `## Done Tasks\n\n`;

      doneLane.todos.forEach(todo => {
        archiveContent += `- [x] ${todo.text}`;
        if (todo.tags && todo.tags.length > 0) {
          archiveContent += ` [${todo.tags.join(', ')}]`;
        }
        if (todo.type) {
          archiveContent += ` {${todo.type}}`;
        }
        if (todo.doneAt) {
          archiveContent += ` (done: ${todo.doneAt})`;
        }
        archiveContent += '\n';
      });

      // Write archive file
      await invoke('write_archive_file', {
        folderPath,
        fileName: archiveFileName,
        content: archiveContent
      });

      // Remove todos from Done lane
      const newData: KanbanData = {
        ...data,
        lanes: updateLanes(data.lanes, doneLane.id, lane => ({
          ...lane,
          todos: []
        }))
      };

      onDataChange(newData);
      await saveToFile(newData);
    } catch (error) {
      console.error('Error archiving tasks:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id as string;

    setActiveId(activeIdStr);

    // Check if dragging a lane or a todo
    const draggedLane = data.lanes.find(lane => lane.id === activeIdStr);
    if (draggedLane) {
      setActiveLane(draggedLane);
      setActiveTodo(null);
    } else {
      setActiveTodo(findTodoById(data.lanes, activeIdStr) || null);
      setActiveLane(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setOverId(null);

    if (!over) {
      setActiveId(null);
      setActiveTodo(null);
      setActiveLane(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if we're dragging a lane
    const draggingLane = data.lanes.find(lane => lane.id === activeId);
    if (draggingLane) {
      // Handle lane reordering
      if (activeId !== overId) {
        const oldIndex = data.lanes.findIndex(lane => lane.id === activeId);
        const newIndex = data.lanes.findIndex(lane => lane.id === overId);

        const newLanes = arrayMove(data.lanes, oldIndex, newIndex);

        // Update order for all lanes
        const reorderedLanes = newLanes.map((lane, index) => ({
          ...lane,
          order: index
        }));

        const newData: KanbanData = {
          ...data,
          lanes: reorderedLanes
        };

        onDataChange(newData);
        await saveToFile(newData);
      }

      setActiveId(null);
      setActiveLane(null);
      return;
    }

    // Otherwise, handle todo drag
    const activeLane = findLaneByTodoId(data.lanes, activeId);
    if (!activeLane) {
      setActiveId(null);
      setActiveTodo(null);
      setActiveLane(null);
      return;
    }

    const todoToMove = activeLane.todos.find(t => t.id === activeId);
    if (!todoToMove) {
      setActiveId(null);
      setActiveTodo(null);
      setActiveLane(null);
      return;
    }

    // Check if dropping on a lane
    const overLane = findLaneById(data.lanes, overId);
    if (overLane) {
      if (!canMoveTodo(todoToMove, activeLane.name, overLane.name)) {
        setActiveId(null);
        setActiveTodo(null);
        return;
      }

      const updatedTodo = pipe(
        (todo: Todo) => updateTodoHistory(todo, activeLane.name, overLane.name),
        (todo: Todo) => ({ ...todo, laneId: overLane.id })
      )(todoToMove);

      let lanes = updateMultipleLanes(data.lanes, [
        { laneId: activeLane.id, updater: lane => removeTodoFromLane(lane, activeId) },
        { laneId: overLane.id, updater: lane => addTodoToLane(lane, updatedTodo) }
      ]);

      // Check if we need to create a follow-up todo
      if (overLane.name === 'Done' && needsFollowUp(todoToMove)) {
        const todoLane = lanes.find(lane => lane.name === 'Todo');
        if (todoLane) {
          const followUpTodo = createFollowUpTodo(todoToMove, todoLane.id, todoLane.todos.length);
          lanes = updateLanes(lanes, todoLane.id, lane => addTodoToLane(lane, followUpTodo));
        }
      }

      // Apply WIP limit if enabled and moving to Doing
      if (wipLimitEnabled && overLane.name === 'Doing') {
        lanes = enforceWipLimit(lanes, activeId);
      }

      const newData: KanbanData = {
        ...data,
        lanes
      };

      onDataChange(newData);
      await saveToFile(newData);
    } else {
      // Reordering within or between lanes
      const overTodoLane = findLaneByTodoId(data.lanes, overId);

      if (overTodoLane) {
        if (!canMoveTodo(todoToMove, activeLane.name, overTodoLane.name)) {
          setActiveId(null);
          setActiveTodo(null);
          return;
        }

        if (activeLane.id === overTodoLane.id) {
          // Same lane reordering
          const oldIndex = activeLane.todos.findIndex(t => t.id === activeId);
          const newIndex = activeLane.todos.findIndex(t => t.id === overId);

          const newData: KanbanData = {
            ...data,
            lanes: updateLanes(
              data.lanes,
              activeLane.id,
              lane => updateLane(lane, { todos: arrayMove(lane.todos, oldIndex, newIndex) })
            )
          };

          onDataChange(newData);
          await saveToFile(newData);
        } else {
          // Moving between lanes
          const updatedTodo = pipe(
            (todo: Todo) => updateTodoHistory(todo, activeLane.name, overTodoLane.name),
            (todo: Todo) => ({ ...todo, laneId: overTodoLane.id })
          )(todoToMove);

          const overIndex = overTodoLane.todos.findIndex(t => t.id === overId);

          let lanes = updateMultipleLanes(data.lanes, [
            { laneId: activeLane.id, updater: lane => removeTodoFromLane(lane, activeId) },
            { laneId: overTodoLane.id, updater: lane => insertTodoAtIndex(lane, updatedTodo, overIndex) }
          ]);

          // Check if we need to create a follow-up todo
          if (overTodoLane.name === 'Done' && needsFollowUp(todoToMove)) {
            const todoLane = lanes.find(lane => lane.name === 'Todo');
            if (todoLane) {
              const followUpTodo = createFollowUpTodo(todoToMove, todoLane.id, todoLane.todos.length);
              lanes = updateLanes(lanes, todoLane.id, lane => addTodoToLane(lane, followUpTodo));
            }
          }

          // Apply WIP limit if enabled and moving to Doing
          if (wipLimitEnabled && overTodoLane.name === 'Doing') {
            lanes = enforceWipLimit(lanes, activeId);
          }

          const newData: KanbanData = {
            ...data,
            lanes
          };

          onDataChange(newData);
          await saveToFile(newData);
        }
      }
    }

    setActiveId(null);
    setActiveTodo(null);
    setActiveLane(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        <SortableContext
          items={data.lanes.map(lane => lane.id)}
          strategy={horizontalListSortingStrategy}
        >
          {data.lanes.map((lane, index) => (
            <Lane
              key={lane.id}
              lane={lane}
              folderPath={folderPath}
              onAddTodo={handleAddTodo}
              onUpdateTodo={handleUpdateTodo}
              onUpdateTags={handleUpdateTags}
              onUpdateType={handleUpdateType}
              onUpdateNote={handleUpdateNote}
              onUpdateDeadline={handleUpdateDeadline}
              onRenameLane={handleRenameLane}
              onDeleteLane={handleDeleteLane}
              onAddLane={handleAddLane}
              onArchiveDone={handleArchiveDone}
              isLastLane={index === data.lanes.length - 1}
              overId={overId}
              activeId={activeId}
              allTags={allTags}
              allTypes={allTypes}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeId ? (
          activeTodo ? (
            <TodoCard todo={activeTodo} isDragging folderPath={folderPath} />
          ) : activeLane ? (
            <div className="lane lane-dragging" style={{ width: '300px' }}>
              <div className="lane-header">
                <div className="lane-drag-handle">
                  <GripVertical size={16} />
                </div>
                <h3>{activeLane.name}</h3>
                <div className="lane-header-actions">
                  <span className="todo-count">{activeLane.todos.length}</span>
                </div>
              </div>
            </div>
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};