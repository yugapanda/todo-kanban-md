import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '../types';
import { Calendar, Clock, Tag, Package, CheckCircle, XCircle, Timer } from 'lucide-react';
import { format, parse } from 'date-fns';

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
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

export const TodoCard: React.FC<TodoCardProps> = ({ todo, isDragging }) => {
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
      {...attributes}
      {...listeners}
    >
      {/* Tags and Type at the top */}
      {(todo.tags.length > 0 || todo.type) && (
        <div className="todo-header-badges">
          {todo.type && (
            <span className="todo-type-badge">
              <Package size={12} />
              {todo.type}
            </span>
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
              </span>
            );
          })}
        </div>
      )}

      <div className="todo-content">{todo.text}</div>

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
  );
};