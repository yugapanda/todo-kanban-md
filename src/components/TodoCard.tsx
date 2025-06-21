import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '../types';
import { Calendar, Clock, Tag, Package, CheckCircle, XCircle, Timer, GripVertical, X, Plus, FileText, ExternalLink } from 'lucide-react';
import { format, parse } from 'date-fns';
import { invoke } from '@tauri-apps/api/core';

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
  folderPath?: string;
  onUpdateTodo?: (todoId: string, newText: string) => void;
  onUpdateTags?: (todoId: string, newTags: string[]) => void;
  onUpdateType?: (todoId: string, newType: string | undefined) => void;
  onUpdateNote?: (todoId: string, notePath: string) => void;
}

const getTagColor = (tag: string) => {
  // Generate consistent color based on tag name
  const colors = [
    { bg: '#e8f5e9', text: '#2e7d32', border: '#c8e6c9' }, // Green
    { bg: '#e3f2fd', text: '#1565c0', border: '#bbdefb' }, // Blue
    { bg: '#fce4ec', text: '#c2185b', border: '#f8bbd0' }, // Pink
    { bg: '#fff3e0', text: '#e65100', border: '#ffe0b2' }, // Orange
    { bg: '#f3e5f5', text: '#6a1b9a', border: '#e1bee7' }, // Purple
    { bg: '#e0f2f1', text: '#00695c', border: '#b2dfdb' }, // Teal
    { bg: '#fef3e2', text: '#f57c00', border: '#ffcc80' }, // Amber
    { bg: '#efebe9', text: '#4e342e', border: '#d7ccc8' }, // Brown
  ];

  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const TodoCard: React.FC<TodoCardProps> = ({ todo, isDragging, folderPath, onUpdateTodo, onUpdateTags, onUpdateType, onUpdateNote }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isEditingType, setIsEditingType] = useState(false);
  const [newType, setNewType] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditingTags && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isEditingTags]);

  useEffect(() => {
    if (isEditingType && typeInputRef.current) {
      typeInputRef.current.focus();
      typeInputRef.current.select();
    }
  }, [isEditingType]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Prevent dragging while editing
    if (!isDragging && !isSortableDragging) {
      e.stopPropagation();
      setIsEditing(true);
      setEditText(todo.text);
    }
  };

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== todo.text && onUpdateTodo) {
      onUpdateTodo(todo.id, trimmedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !todo.tags.includes(trimmedTag) && onUpdateTags) {
      onUpdateTags(todo.id, [...todo.tags, trimmedTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (onUpdateTags) {
      onUpdateTags(todo.id, todo.tags.filter(tag => tag !== tagToRemove));
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsEditingTags(false);
      setNewTag('');
    }
  };

  const handleSaveType = () => {
    const trimmedType = newType.trim();
    if (onUpdateType) {
      onUpdateType(todo.id, trimmedType || undefined);
    }
    setIsEditingType(false);
  };

  const handleRemoveType = () => {
    if (onUpdateType) {
      onUpdateType(todo.id, undefined);
    }
    setIsEditingType(false);
  };

  const handleTypeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveType();
    } else if (e.key === 'Escape') {
      setNewType(todo.type || '');
      setIsEditingType(false);
    }
  };

  const handleCreateNote = async () => {
    if (!folderPath || !onUpdateNote) return;
    
    try {
      const notePath = await invoke<string>('create_note_file', {
        folderPath,
        todoText: todo.text
      });
      onUpdateNote(todo.id, notePath);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleOpenNote = async () => {
    if (!folderPath || !todo.note) return;
    
    try {
      await invoke('open_in_obsidian', {
        folderPath,
        notePath: todo.note
      });
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  };

  const formatDeadline = (deadline: string) => {
    try {
      const date = parse(deadline, 'yyyyMMdd', new Date());
      return format(date, 'MMM d, yyyy');
    } catch {
      return deadline;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = parse(timestamp, 'yyyyMMddHHmm', new Date());
      return format(date, 'MMM d, yyyy HH:mm');
    } catch {
      return timestamp;
    }
  };

  // Calculate total working time from doing/pending history
  const calculateTotalTime = () => {
    let totalMinutes = 0;

    todo.doingPendingHistory.forEach(entry => {
      if (entry.doing && entry.pending) {
        try {
          const doingTime = parse(entry.doing, 'yyyyMMddHHmm', new Date());
          const pendingTime = parse(entry.pending, 'yyyyMMddHHmm', new Date());
          const diffMinutes = Math.floor((pendingTime.getTime() - doingTime.getTime()) / (1000 * 60));
          totalMinutes += diffMinutes;
        } catch {
          // Skip invalid entries
        }
      }
    });

    // Add current working time if todo is in Doing
    if (todo.doingPendingHistory.length > 0) {
      const lastEntry = todo.doingPendingHistory[todo.doingPendingHistory.length - 1];
      if (lastEntry.doing && !lastEntry.pending) {
        try {
          const doingTime = parse(lastEntry.doing, 'yyyyMMddHHmm', new Date());
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - doingTime.getTime()) / (1000 * 60));
          totalMinutes += diffMinutes;
        } catch {
          // Skip invalid entries
        }
      }
    }

    if (totalMinutes === 0) return null;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`todo-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="todo-drag-section">
        <div className="todo-actions">
          {todo.note ? (
            <button
              className="note-link-btn"
              onClick={handleOpenNote}
              title="Open note in Obsidian"
            >
              <ExternalLink size={14} />
            </button>
          ) : (
            <button
              className="create-note-btn"
              onClick={handleCreateNote}
              title="Create note"
            >
              <FileText size={14} />
            </button>
          )}
        </div>
        <div className="todo-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
      </div>
      <div className="todo-card-content">
      {/* Tags and Type at the top */}
      <div className="todo-header-badges">
        {isEditingType ? (
          <div className="type-input-wrapper">
            <input
              ref={typeInputRef}
              type="text"
              className="type-input"
              placeholder="Type name..."
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={handleTypeKeyDown}
              onBlur={handleSaveType}
            />
            <button
              type="button"
              className="type-remove-btn"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveType();
              }}
              title="Remove type"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          todo.type ? (
            <span 
              className="todo-type-badge"
              onDoubleClick={() => {
                setIsEditingType(true);
                setNewType(todo.type || '');
              }}
              title="Double-click to edit"
            >
              <Package size={12} />
              {todo.type}
            </span>
          ) : (
            <button
              className="add-type-btn"
              onClick={() => {
                setIsEditingType(true);
                setNewType('');
              }}
              title="Add type"
            >
              <Package size={12} />
              Add type
            </button>
          )
        )}
        {todo.tags.map((tag, index) => {
          const color = getTagColor(tag);
          return (
            <span
              key={index}
              className="todo-tag-badge"
              style={{
                backgroundColor: color.bg,
                color: color.text,
                borderColor: color.border
              }}
            >
              #{tag}
              {isEditingTags && (
                <button
                  type="button"
                  className="tag-remove-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  title="Remove tag"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}
        {isEditingTags ? (
          <div className="tag-input-wrapper">
            <input
              ref={tagInputRef}
              type="text"
              className="tag-input"
              placeholder="New tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={(e) => {
                // Check if the blur is moving to a tag remove button
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (relatedTarget && relatedTarget.classList.contains('tag-remove-btn')) {
                  return;
                }
                
                if (!newTag.trim()) {
                  setTimeout(() => setIsEditingTags(false), 200);
                }
              }}
            />
          </div>
        ) : (
          <button
            className="add-tag-btn"
            onClick={() => setIsEditingTags(true)}
            title="Add tag"
          >
            <Plus size={12} />
            Add tag
          </button>
        )}
      </div>

      <div className="todo-content" onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="todo-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          todo.text
        )}
      </div>

      <div className="todo-metadata">
        {todo.deadline && (
          <div className="todo-deadline">
            <Calendar size={14} />
            <span>{formatDeadline(todo.deadline)}</span>
            {todo.deadlineTime && (
              <>
                <Clock size={14} />
                <span>{todo.deadlineTime}</span>
              </>
            )}
          </div>
        )}

        {calculateTotalTime() && (
          <div className="todo-total-time">
            <Timer size={14} />
            <span>{calculateTotalTime()}</span>
          </div>
        )}

        {todo.doneAt && (
          <div className="todo-done">
            <CheckCircle size={14} />
            <span>{formatTimestamp(todo.doneAt)}</span>
          </div>
        )}

        {todo.rejectAt && (
          <div className="todo-reject">
            <XCircle size={14} />
            <span>{formatTimestamp(todo.rejectAt)}</span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};