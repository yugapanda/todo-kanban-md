import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TodoCard } from './TodoCard';
import { LaneManager } from './LaneManager';
import { Lane as LaneType } from '../types';
import { Plus, Archive } from 'lucide-react';

interface LaneProps {
  lane: LaneType;
  folderPath?: string;
  onAddTodo: (laneId: string, todoText: string) => void;
  onUpdateTodo?: (todoId: string, newText: string) => void;
  onUpdateTags?: (todoId: string, newTags: string[]) => void;
  onUpdateType?: (todoId: string, newType: string | undefined) => void;
  onUpdateNote?: (todoId: string, notePath: string) => void;
  onUpdateDeadline?: (todoId: string, deadline: string | undefined, deadlineTime: string | undefined) => void;
  onRenameLane?: (laneId: string, newName: string) => void;
  onDeleteLane?: (laneId: string) => void;
  onAddLane?: (name: string, afterLaneId: string) => void;
  onArchiveDone?: () => void;
  isLastLane?: boolean;
  overId?: string | null;
  activeId?: string | null;
  allTags?: string[];
  allTypes?: string[];
}

export const Lane: React.FC<LaneProps> = ({ 
  lane, 
  folderPath,
  onAddTodo,
  onUpdateTodo,
  onUpdateTags,
  onUpdateType,
  onUpdateNote,
  onUpdateDeadline,
  onRenameLane,
  onDeleteLane,
  onAddLane,
  onArchiveDone,
  isLastLane = false,
  overId,
  activeId,
  allTags = [],
  allTypes = []
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
  });

  // Check if this lane is being hovered over during drag
  const isLaneOver = isOver || overId === lane.id;

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo(lane.id, newTodoText.trim());
      setNewTodoText('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddTodo();
    } else if (e.key === 'Escape') {
      setNewTodoText('');
      setIsAdding(false);
    }
  };

  return (
    <div className={`lane ${isLaneOver && activeId ? 'lane-drag-over' : ''}`} ref={setNodeRef}>
      <div className="lane-header">
        <LaneManager
          laneName={lane.name}
          isRestricted={lane.isRestricted}
          onRename={(newName) => onRenameLane?.(lane.id, newName)}
          onDelete={() => onDeleteLane?.(lane.id)}
          onAddLane={(name) => onAddLane?.(name, lane.id)}
          isLastLane={isLastLane}
        />
        <div className="lane-header-actions">
          {lane.name === 'Done' && onArchiveDone && (
            <button
              className="archive-btn"
              onClick={onArchiveDone}
              title="Archive all done tasks"
            >
              <Archive size={16} />
            </button>
          )}
          <span className="todo-count">{lane.todos.length}</span>
        </div>
      </div>
      <div className="lane-content">
        <div className="add-todo-section">
          {!isAdding ? (
            <button
              className="add-todo-btn"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={16} />
            </button>
          ) : (
            <div className="add-todo-input-wrapper">
              <input
                type="text"
                className="add-todo-input"
                placeholder={`新しいTodoを入力... (${/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'}+Enter)`}
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newTodoText.trim()) {
                    setIsAdding(false);
                  }
                }}
                autoFocus
              />
              <div className="add-todo-actions">
                <button onClick={handleAddTodo} className="add-btn">追加</button>
                <button onClick={() => { setNewTodoText(''); setIsAdding(false); }} className="cancel-btn">キャンセル</button>
              </div>
            </div>
          )}
        </div>
        <SortableContext
          items={lane.todos.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {lane.todos.map((todo, index) => (
            <TodoCard 
              key={todo.id} 
              todo={todo} 
              folderPath={folderPath}
              onUpdateTodo={onUpdateTodo} 
              onUpdateTags={onUpdateTags} 
              onUpdateType={onUpdateType}
              onUpdateNote={onUpdateNote}
              onUpdateDeadline={onUpdateDeadline}
              isOver={overId === todo.id}
              index={index}
              allTags={allTags}
              allTypes={allTypes}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};