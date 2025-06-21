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
  onRenameLane?: (laneId: string, newName: string) => void;
  onDeleteLane?: (laneId: string) => void;
  onAddLane?: (name: string, afterLaneId: string) => void;
  onArchiveDone?: () => void;
  isLastLane?: boolean;
}

export const Lane: React.FC<LaneProps> = ({ 
  lane, 
  folderPath,
  onAddTodo,
  onUpdateTodo,
  onUpdateTags,
  onUpdateType,
  onUpdateNote,
  onRenameLane,
  onDeleteLane,
  onAddLane,
  onArchiveDone,
  isLastLane = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');

  const { setNodeRef } = useDroppable({
    id: lane.id,
  });

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo(lane.id, newTodoText.trim());
      setNewTodoText('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    } else if (e.key === 'Escape') {
      setNewTodoText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="lane" ref={setNodeRef}>
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
                placeholder="新しいTodoを入力..."
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
          {lane.todos.map(todo => (
            <TodoCard 
              key={todo.id} 
              todo={todo} 
              folderPath={folderPath}
              onUpdateTodo={onUpdateTodo} 
              onUpdateTags={onUpdateTags} 
              onUpdateType={onUpdateType}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};