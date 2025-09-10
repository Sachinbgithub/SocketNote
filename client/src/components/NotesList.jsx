import React, { useState } from 'react';
import { FileText, Paperclip, MoreVertical, Edit, Trash2, Clock, Folder, FolderPlus } from 'lucide-react';
import { formatRelativeTime, highlightSearchTerm } from '../utils/api';

const NoteItem = ({ 
  note, 
  isSelected, 
  onSelect, 
  onDelete, 
  onMoveToFolder,
  searchQuery,
  folders = []
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      try {
        await onDelete(note.id);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleMoveToFolder = async (folderId) => {
    try {
      await onMoveToFolder(note.id, folderId);
      setShowMoveMenu(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Error moving note:', error);
    }
  };

  const getHighlightedTitle = () => {
    if (!searchQuery) return note.title;
    
    const highlighted = highlightSearchTerm(note.title, searchQuery);
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const getHighlightedContent = () => {
    if (!searchQuery || !note.content) return note.content;
    
    const highlighted = highlightSearchTerm(note.content, searchQuery);
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div 
      className={`note-item ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(note)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {getHighlightedTitle()}
            </h3>
          </div>
          
          {note.content && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {getHighlightedContent()}
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(note.updated_at)}</span>
            </div>
            
            {note.attachment_count > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip className="h-3 w-3" />
                <span>{note.attachment_count}</span>
              </div>
            )}
          </div>
          
          {/* Enhanced folder tag display */}
          {note.folder_name && (
            <div className="flex items-center space-x-1">
              <Folder className="h-3 w-3 text-blue-500" />
              <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                {note.folder_name}
              </span>
            </div>
          )}
          
          {/* Show "No Folder" tag for notes without folders */}
          {!note.folder_name && (
            <div className="flex items-center space-x-1">
              <Folder className="h-3 w-3 text-gray-400" />
              <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                No Folder
              </span>
            </div>
          )}
        </div>

        <div className="relative ml-2">
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
                  // Handle edit - could open in editor
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              
              {/* Move to Folder option for notes without folders */}
              {!note.folder_name && folders.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveMenu(!showMoveMenu);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Move to Folder
                </button>
              )}
              
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

          {/* Move to Folder submenu */}
          {showMoveMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-48">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                Move to Folder:
              </div>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFolder(folder.id);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                >
                  <Folder className="h-4 w-4 mr-2 text-blue-500" />
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotesList = ({ 
  notes, 
  selectedNote, 
  onNoteSelect, 
  onNoteDelete, 
  onNoteMoveToFolder,
  searchQuery,
  loading,
  folders = []
}) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">
            {searchQuery ? 'No search results found' : 'No notes yet'}
          </p>
          <p className="text-xs">
            {searchQuery ? 'Try a different search term' : 'Create your first note to get started'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-0">
        {notes.map(note => (
          <div key={note.id} className="group">
            <NoteItem
              note={note}
              isSelected={selectedNote?.id === note.id}
              onSelect={onNoteSelect}
              onDelete={onNoteDelete}
              onMoveToFolder={onNoteMoveToFolder}
              searchQuery={searchQuery}
              folders={folders}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesList; 