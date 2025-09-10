import React, { useState } from 'react';
import { Folder, ChevronRight, ChevronDown, MoreVertical, Edit, Trash2, Plus } from 'lucide-react';
import { formatRelativeTime } from '../utils/api';

const FolderTreeItem = ({ 
  folder, 
  level = 0, 
  selectedFolder, 
  onFolderSelect, 
  onFolderCreate, 
  onFolderUpdate, 
  onFolderDelete 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolder?.id === folder.id;

  const handleToggle = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    }
    onFolderSelect(folder);
  };

  const handleEdit = async () => {
    if (editName.trim() && editName !== folder.name) {
      try {
        await onFolderUpdate(folder.id, { name: editName.trim() });
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating folder:', error);
      }
    } else {
      setIsEditing(false);
      setEditName(folder.name);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${folder.name}" and all its contents?`)) {
      try {
        await onFolderDelete(folder.id);
      } catch (error) {
        console.error('Error deleting folder:', error);
        // Re-throw the error so the parent component can handle it
        throw error;
      }
    }
  };

  const handleCreate = async () => {
    if (newFolderName.trim()) {
      try {
        await onFolderCreate({ 
          name: newFolderName.trim(), 
          parent_id: folder.id 
        });
        setShowCreateInput(false);
        setNewFolderName('');
        setExpanded(true);
      } catch (error) {
        console.error('Error creating folder:', error);
        // Re-throw the error so the parent component can handle it
        throw error;
      }
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'edit') {
        handleEdit();
      } else if (action === 'create') {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      if (action === 'edit') {
        setIsEditing(false);
        setEditName(folder.name);
      } else if (action === 'create') {
        setShowCreateInput(false);
        setNewFolderName('');
      }
    }
  };

  return (
    <div>
      <div 
        className={`folder-tree-item ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <div className="flex items-center flex-1" onClick={handleToggle}>
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {expanded ? (
                <ChevronDown className="folder-tree-item-icon" />
              ) : (
                <ChevronRight className="folder-tree-item-icon" />
              )}
            </button>
          )}
          
          <Folder className="folder-tree-item-icon text-blue-500" />
          
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleEdit}
              onKeyDown={(e) => handleKeyPress(e, 'edit')}
              className="flex-1 ml-2 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          ) : (
            <span className="flex-1 ml-2 truncate">{folder.name}</span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowCreateInput(true);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subfolder
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  handleDelete();
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreateInput && (
        <div 
          className="px-3 py-2"
          style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
        >
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => handleKeyPress(e, 'create')}
            placeholder="Folder name..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>
      )}

      {expanded && hasChildren && (
        <div className="folder-tree-item-children">
          {folder.children.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              onFolderSelect={onFolderSelect}
              onFolderCreate={onFolderCreate}
              onFolderUpdate={onFolderUpdate}
              onFolderDelete={onFolderDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderTree = ({ 
  folders, 
  selectedFolder, 
  onFolderSelect, 
  onFolderCreate, 
  onFolderUpdate, 
  onFolderDelete,
  loading 
}) => {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateRoot = async () => {
    if (newFolderName.trim()) {
      try {
        await onFolderCreate({ name: newFolderName.trim() });
        setShowCreateInput(false);
        setNewFolderName('');
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateRoot();
    } else if (e.key === 'Escape') {
      setShowCreateInput(false);
      setNewFolderName('');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {showCreateInput && (
        <div className="mb-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleCreateRoot}
            onKeyDown={handleKeyPress}
            placeholder="Root folder name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        </div>
      )}

      <div className="space-y-1">
        {folders.map(folder => (
          <div key={folder.id} className="group">
            <FolderTreeItem
              folder={folder}
              selectedFolder={selectedFolder}
              onFolderSelect={onFolderSelect}
              onFolderCreate={onFolderCreate}
              onFolderUpdate={onFolderUpdate}
              onFolderDelete={onFolderDelete}
            />
          </div>
        ))}
      </div>

      {folders.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Folder className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No folders yet</p>
          <p className="text-xs">Create your first folder to get started</p>
        </div>
      )}
    </div>
  );
};

export default FolderTree; 