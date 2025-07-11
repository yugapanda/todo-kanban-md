import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Todo } from '../types';
import { Clock, Package, CheckCircle, XCircle, Timer, GripVertical, X, Plus, FileText, ExternalLink, CalendarDays } from 'lucide-react';
import { format, parse, isBefore, isToday, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { invoke } from '@tauri-apps/api/core';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface TodoCardProps {
  todo: Todo;
  isDragging?: boolean;
  folderPath?: string;
  onUpdateTodo?: (todoId: string, newText: string) => void;
  onUpdateTags?: (todoId: string, newTags: string[]) => void;
  onUpdateType?: (todoId: string, newType: string | undefined) => void;
  onUpdateNote?: (todoId: string, notePath: string) => void;
  onUpdateDeadline?: (todoId: string, deadline: string | undefined, deadlineTime: string | undefined) => void;
  isOver?: boolean;
  index?: number;
  allTags?: string[];
  allTypes?: string[];
}

/**
 * タグ名に基づいて一貫した色を生成する
 * @param tag - タグ名
 * @returns タグの背景色、テキスト色、ボーダー色を含むオブジェクト
 */
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

export const TodoCard: React.FC<TodoCardProps> = ({ todo, isDragging, folderPath, onUpdateTodo, onUpdateTags, onUpdateType, onUpdateNote, onUpdateDeadline, isOver, allTags = [], allTypes = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [isEditingType, setIsEditingType] = useState(false);
  const [newType, setNewType] = useState('');
  const [typeSuggestions, setTypeSuggestions] = useState<string[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(-1);
  const [isEditingDeadline, setIsEditingDeadline] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    todo.deadline ? parse(todo.deadline, 'yyyyMMdd', new Date()) : null
  );
  const [selectedTime, setSelectedTime] = useState(todo.deadlineTime || '');
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLDivElement>(null);
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

  // Update tag suggestions when typing
  useEffect(() => {
    if (newTag && isEditingTags) {
      const filtered = allTags
        .filter(tag =>
          tag.toLowerCase().includes(newTag.toLowerCase()) &&
          !todo.tags.includes(tag)
        )
        .slice(0, 5);
      setTagSuggestions(filtered);
      setSelectedTagIndex(-1);
    } else {
      setTagSuggestions([]);
    }
  }, [newTag, allTags, todo.tags, isEditingTags]);

  // Update type suggestions when typing
  useEffect(() => {
    if (newType && isEditingType) {
      const filtered = allTypes
        .filter(type =>
          type.toLowerCase().includes(newType.toLowerCase())
        )
        .slice(0, 5);
      setTypeSuggestions(filtered);
      setSelectedTypeIndex(-1);
    } else {
      setTypeSuggestions([]);
    }
  }, [newType, allTypes, isEditingType]);


  /**
   * TODOテキストのダブルクリックハンドラー - 編集モードに切り替える
   * @param e - マウスイベント
   */
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Prevent dragging while editing
    if (!isDragging && !isSortableDragging) {
      e.stopPropagation();
      setIsEditing(true);
      setEditText(todo.text);
    }
  };

  /**
   * 編集中のTODOテキストを保存する
   */
  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== todo.text && onUpdateTodo) {
      onUpdateTodo(todo.id, trimmedText);
    }
    setIsEditing(false);
  };

  /**
   * TODOテキストの編集をキャンセルして元のテキストに戻す
   */
  const handleCancel = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  /**
   * TODOテキスト編集時のキーボードイベントハンドラー
   * @param e - キーボードイベント (Cmd/Ctrl+Enter: 保存, Esc: キャンセル)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  /**
   * TODOテキスト入力欄のフォーカスが外れた時に保存する
   */
  const handleBlur = () => {
    handleSave();
  };

  /**
   * 新しいタグをTODOに追加する
   */
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !todo.tags.includes(trimmedTag) && onUpdateTags) {
      onUpdateTags(todo.id, [...todo.tags, trimmedTag]);
      setNewTag('');
    }
  };

  /**
   * 指定されたタグをTODOから削除する
   * @param tagToRemove - 削除するタグ名
   */
  const handleRemoveTag = (tagToRemove: string) => {
    if (onUpdateTags) {
      onUpdateTags(todo.id, todo.tags.filter(tag => tag !== tagToRemove));
    }
  };

  /**
   * タグ入力時のキーボードイベントハンドラー
   * @param e - キーボードイベント (Enter: タグ追加, Esc: キャンセル, 矢印: 候補選択, Tab: オートコンプリート)
   */
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedTagIndex >= 0 && tagSuggestions[selectedTagIndex]) {
        const selectedTag = tagSuggestions[selectedTagIndex];
        if (onUpdateTags) {
          onUpdateTags(todo.id, [...todo.tags, selectedTag]);
          setNewTag('');
        }
      } else {
        handleAddTag();
      }
    } else if (e.key === 'Escape') {
      setIsEditingTags(false);
      setNewTag('');
      setTagSuggestions([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTagIndex(prev =>
        prev < tagSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTagIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Tab' && tagSuggestions.length > 0) {
      e.preventDefault();
      const suggestion = tagSuggestions[selectedTagIndex >= 0 ? selectedTagIndex : 0];
      setNewTag(suggestion);
    }
  };

  /**
   * 編集中のタイプを保存する
   */
  const handleSaveType = () => {
    const trimmedType = newType.trim();
    if (onUpdateType) {
      onUpdateType(todo.id, trimmedType || undefined);
    }
    setIsEditingType(false);
  };

  /**
   * TODOのタイプを削除する
   */
  const handleRemoveType = () => {
    if (onUpdateType) {
      onUpdateType(todo.id, undefined);
    }
    setIsEditingType(false);
  };

  /**
   * タイプ入力時のキーボードイベントハンドラー
   * @param e - キーボードイベント (Enter: タイプ設定, Esc: キャンセル, 矢印: 候補選択, Tab: オートコンプリート)
   */
  const handleTypeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedTypeIndex >= 0 && typeSuggestions[selectedTypeIndex]) {
        const selectedType = typeSuggestions[selectedTypeIndex];
        if (onUpdateType) {
          onUpdateType(todo.id, selectedType);
          setIsEditingType(false);
          setNewType('');
        }
      } else {
        handleSaveType();
      }
    } else if (e.key === 'Escape') {
      setNewType(todo.type || '');
      setIsEditingType(false);
      setTypeSuggestions([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedTypeIndex(prev =>
        prev < typeSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedTypeIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Tab' && typeSuggestions.length > 0) {
      e.preventDefault();
      const suggestion = typeSuggestions[selectedTypeIndex >= 0 ? selectedTypeIndex : 0];
      setNewType(suggestion);
    }
  };

  /**
   * TODOに関連するノートファイルを作成または既存のノートを開く
   * ノートが存在しない場合は新規作成し、存在する場合はそのままObsidianで開く
   */
  const handleCreateNote = async () => {
    if (!folderPath || !onUpdateNote) return;

    try {
      const notePath = await invoke<string>('create_note_file', {
        folderPath,
        todoText: todo.text
      });
      onUpdateNote(todo.id, notePath);

      // Open the note immediately after creating/finding it
      await invoke('open_in_obsidian', {
        folderPath,
        notePath: notePath
      });
    } catch (error) {
      console.error('Failed to create/open note:', error);
    }
  };

  /**
   * 既存のノートファイルをObsidianで開く
   */
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

  /**
   * 締切日を変更する
   * @param date - 新しい締切日 (nullの場合は締切を削除)
   */
  const handleDeadlineChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date && onUpdateDeadline) {
      const deadlineStr = format(date, 'yyyyMMdd');
      onUpdateDeadline(todo.id, deadlineStr, selectedTime || undefined);
    } else if (!date && onUpdateDeadline) {
      onUpdateDeadline(todo.id, undefined, undefined);
      setSelectedTime('');
    }
  };

  /**
   * 締切時刻を変更する
   * @param e - 時刻入力の変更イベント
   */
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    setSelectedTime(time);
    if (selectedDate && onUpdateDeadline) {
      const deadlineStr = format(selectedDate, 'yyyyMMdd');
      onUpdateDeadline(todo.id, deadlineStr, time || undefined);
    }
  };

  /**
   * カレンダーピッカーを開く
   * @param e - マウスイベント
   */
  const handleOpenCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deadlineRef.current) {
      const rect = deadlineRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + 5,
        left: rect.left
      });
    }
    setIsEditingDeadline(true);
  };

  /**
   * 締切日のステータスを判定する
   * @returns 'overdue' (期限切れ), 'today' (今日), 'soon' (3日以内), 'future' (それ以降), または null
   */
  const getDeadlineStatus = () => {
    if (!todo.deadline) return null;

    try {
      const deadlineDate = parse(todo.deadline, 'yyyyMMdd', new Date());
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);

      if (isBefore(deadlineDate, today)) {
        return 'overdue';
      } else if (isToday(deadlineDate)) {
        return 'today';
      } else if (isBefore(deadlineDate, addDays(today, 3))) {
        return 'soon';
      }
      return 'future';
    } catch {
      return null;
    }
  };

  /**
   * 締切日を日本語形式でフォーマットする
   * @param deadline - yyyyMMdd形式の締切日文字列
   * @returns フォーマットされた日付文字列 (例: "3月15日(金)")
   */
  const formatDeadline = (deadline: string) => {
    try {
      const date = parse(deadline, 'yyyyMMdd', new Date());
      return format(date, 'M月d日(E)', { locale: ja });
    } catch {
      return deadline;
    }
  };

  /**
   * タイムスタンプを読みやすい形式にフォーマットする
   * @param timestamp - yyyyMMddHHmm形式のタイムスタンプ文字列
   * @returns フォーマットされた日時文字列 (例: "Mar 15, 2024 14:30")
   */
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = parse(timestamp, 'yyyyMMddHHmm', new Date());
      return format(date, 'MMM d, yyyy HH:mm');
    } catch {
      return timestamp;
    }
  };

  /**
   * TODOの作業履歴から合計作業時間を計算する
   * @returns フォーマットされた時間文字列 (例: "2h 30m") または null
   */
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
    <>
      {isOver && <div className="drop-indicator" />}
      <div
        ref={setNodeRef}
        style={style}
        className={`todo-card ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
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
                  onBlur={(e) => {
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (relatedTarget && relatedTarget.classList.contains('suggestion-item')) {
                      return;
                    }
                    setTimeout(() => {
                      handleSaveType();
                      setTypeSuggestions([]);
                    }, 200);
                  }}
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
                {typeSuggestions.length > 0 && (
                  <div className="autocomplete-dropdown type-dropdown">
                    {typeSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`suggestion-item ${index === selectedTypeIndex ? 'selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (onUpdateType) {
                            onUpdateType(todo.id, suggestion);
                            setIsEditingType(false);
                            setNewType('');
                          }
                        }}
                        onMouseEnter={() => setSelectedTypeIndex(index)}
                      >
                        <Package size={12} />
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
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
                    // Check if the blur is moving to a tag remove button or suggestion
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (relatedTarget && (relatedTarget.classList.contains('tag-remove-btn') || relatedTarget.classList.contains('suggestion-item'))) {
                      return;
                    }

                    if (!newTag.trim()) {
                      setTimeout(() => {
                        setIsEditingTags(false);
                        setTagSuggestions([]);
                      }, 200);
                    }
                  }}
                />
                {tagSuggestions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {tagSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`suggestion-item ${index === selectedTagIndex ? 'selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (onUpdateTags) {
                            onUpdateTags(todo.id, [...todo.tags, suggestion]);
                            setNewTag('');
                          }
                        }}
                        onMouseEnter={() => setSelectedTagIndex(index)}
                      >
                        #{suggestion}
                      </div>
                    ))}
                  </div>
                )}
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
            <div className="todo-deadline-section">
              <div
                ref={deadlineRef}
                className={`todo-deadline ${todo.deadline ? `deadline-${getDeadlineStatus()}` : ''}`}
                onClick={handleOpenCalendar}
                title="クリックして締切を設定"
              >
                <CalendarDays size={14} />
                {todo.deadline ? (
                  <>
                    <span>{formatDeadline(todo.deadline)}</span>
                    {todo.deadlineTime && (
                      <>
                        <Clock size={14} />
                        <span>{todo.deadlineTime}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="deadline-placeholder">締切を設定</span>
                )}
              </div>
              {isEditingDeadline && ReactDOM.createPortal(
                <>
                  <div
                    className="deadline-picker-backdrop"
                    onClick={() => setIsEditingDeadline(false)}
                  />
                  <div
                    className="deadline-picker-wrapper"
                    style={{
                      top: `${calendarPosition.top}px`,
                      left: `${calendarPosition.left}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DatePicker
                      selected={selectedDate}
                      onChange={handleDeadlineChange}
                      dateFormat="yyyy/MM/dd"
                      locale={ja}
                      placeholderText="締切日を選択"
                      isClearable
                      inline
                      calendarClassName="deadline-calendar"
                    />
                    <div className="deadline-time-section">
                      <Clock size={14} />
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={handleTimeChange}
                        className="deadline-time-input"
                        placeholder="時刻"
                      />
                    </div>
                    <button
                      className="deadline-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDeadline(false);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </>,
                document.body
              )}
            </div>

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
    </>
  );
};