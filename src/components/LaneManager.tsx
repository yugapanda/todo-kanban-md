import React, { useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { RESTRICTED_LANES } from '../types';

interface LaneManagerProps {
  laneName: string;
  isRestricted: boolean;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onAddLane: (name: string) => void;
  isLastLane?: boolean;
}

export const LaneManager: React.FC<LaneManagerProps> = ({
  laneName,
  isRestricted,
  onRename,
  onDelete,
  onAddLane,
  isLastLane
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(laneName);
  const [isAddingLane, setIsAddingLane] = useState(false);
  const [newLaneName, setNewLaneName] = useState('');

  const handleRename = () => {
    if (editName.trim() && editName !== laneName) {
      // Check if trying to rename to a restricted name
      if (!isRestricted && RESTRICTED_LANES.includes(editName.trim())) {
        alert(`Cannot rename to "${editName.trim()}" - this is a restricted lane name`);
        setEditName(laneName);
        setIsEditing(false);
        return;
      }
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleAddLane = () => {
    if (newLaneName.trim()) {
      // Check if trying to create a restricted lane name
      if (RESTRICTED_LANES.includes(newLaneName.trim())) {
        alert(`Cannot create lane "${newLaneName.trim()}" - this is a reserved lane name`);
        setNewLaneName('');
        setIsAddingLane(false);
        return;
      }
      onAddLane(newLaneName.trim());
      setNewLaneName('');
      setIsAddingLane(false);
    }
  };

  return (
    <div className="lane-manager">
      <div className="lane-header-controls">
        {isEditing ? (
          <div className="lane-edit-container">
            <input
              type="text"
              className="lane-name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setEditName(laneName);
                  setIsEditing(false);
                }
              }}
              autoFocus
            />
            <button className="lane-action-btn" onClick={handleRename}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <>
            <h3>{laneName}</h3>
            {!isRestricted && (
              <button
                className="lane-action-btn"
                onClick={() => setIsEditing(true)}
                title="Rename lane"
              >
                <Edit2 size={14} />
              </button>
            )}
          </>
        )}

        {!isRestricted && (
          <button
            className="lane-action-btn delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            title="Delete lane"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isLastLane && (
        <div className="add-lane-section">
          {!isAddingLane ? (
            <button
              className="add-lane-btn"
              onClick={() => setIsAddingLane(true)}
              title="Add new lane"
            >
              <Plus size={16} />
            </button>
          ) : (
            <div className="add-lane-input-wrapper">
              <input
                type="text"
                className="add-lane-input"
                placeholder="New lane name..."
                value={newLaneName}
                onChange={(e) => setNewLaneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddLane();
                  if (e.key === 'Escape') {
                    setNewLaneName('');
                    setIsAddingLane(false);
                  }
                }}
                autoFocus
              />
              <div className="add-lane-actions">
                <button onClick={handleAddLane} className="add-btn">Add</button>
                <button
                  onClick={() => {
                    setNewLaneName('');
                    setIsAddingLane(false);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};