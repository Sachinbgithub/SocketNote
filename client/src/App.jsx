import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from './utils/api';
import FolderTree from './components/FolderTree';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import SearchBar from './components/SearchBar';
import BackupManager from './components/BackupManager';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { Folder, FileText, Search, Database, Menu, X, Home, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load initial data
  useEffect(() => {
    loadFolders();
    loadNotes();
  }, []);

  // Debug selectedFolder state changes
  useEffect(() => {
    console.log('=== SELECTED FOLDER STATE CHANGED ===');
    console.log('New selectedFolder:', selectedFolder);
    console.log('selectedFolder ID:', selectedFolder?.id);
    console.log('selectedFolder name:', selectedFolder?.name);
  }, [selectedFolder]);

  // Load folders
  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await apiService.folders.getAll();
      setFolders(response.data.data);
      console.log('Folders loaded:', response.data);
    } catch (err) {
      setError('Failed to load folders');
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to flatten folder tree
  const flattenFolders = (folderTree) => {
    const flat = [];
    const flatten = (folders) => {
      folders.forEach(folder => {
        flat.push({ id: folder.id, name: folder.name });
        if (folder.children && folder.children.length > 0) {
          flatten(folder.children);
        }
      });
    };
    flatten(folderTree);
    return flat;
  };

  // Load notes
  const loadNotes = async (folderId = null) => {
    try {
      setLoading(true);
      console.log('Loading notes for folder:', folderId);
      console.log('Folder ID type:', typeof folderId);
      console.log('Folder ID value:', folderId);
      
      let response;
      if (folderId) {
        console.log('Loading notes by folder ID:', folderId);
        response = await apiService.notes.getByFolder(folderId);
      } else {
        console.log('Loading all notes');
        response = await apiService.notes.getAll();
      }
      
      console.log('Notes loaded:', response.data.data);
      console.log('Number of notes loaded:', response.data.data.length);
      
      // Log each note's folder information
      response.data.data.forEach((note, index) => {
        console.log(`Note ${index + 1}:`, {
          id: note.id,
          title: note.title,
          folder_id: note.folder_id,
          folder_name: note.folder_name
        });
      });
      
      setNotes(response.data.data);
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle folder selection
  const handleFolderSelect = useCallback((folder) => {
    console.log('=== FOLDER SELECTION ===');
    console.log('Previous selected folder:', selectedFolder);
    console.log('New folder selected:', folder);
    console.log('Folder ID:', folder?.id);
    console.log('Folder name:', folder?.name);
    
    // Update selected folder state
    setSelectedFolder(folder);
    setSelectedNote(null);
    setIsSearchMode(false);
    setSearchResults(null);
    setSearchQuery('');
    
    // Load notes for the selected folder
    loadNotes(folder?.id);
  }, []); // Remove selectedFolder dependency to prevent infinite loops

  // Handle "All Notes" selection
  const handleAllNotesSelect = useCallback(() => {
    console.log('=== ALL NOTES SELECTION ===');
    console.log('Previous selected folder:', selectedFolder);
    console.log('Switching to All Notes view');
    
    // Clear selected folder state
    setSelectedFolder(null);
    setSelectedNote(null);
    setIsSearchMode(false);
    setSearchResults(null);
    setSearchQuery('');
    
    // Load all notes
    loadNotes();
  }, []); // Remove selectedFolder dependency to prevent infinite loops

  // Handle note selection
  const handleNoteSelect = useCallback((note) => {
    setSelectedNote(note);
  }, []);

  // Handle search
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchQuery('');
      setSearchResults(null);
      setIsSearchMode(false);
      setSelectedFolder(null);
      setSelectedNote(null);
      // Reload notes for current folder or all notes
      loadNotes(selectedFolder?.id);
      return;
    }

    try {
      setSearchQuery(query);
      setIsSearchMode(true);
      setSelectedNote(null);
      setSelectedFolder(null);
      const response = await apiService.search.global(query);
      
      // Handle the search response structure
      const searchData = response.data;
      if (searchData && searchData.data) {
        // Combine all search results
        const allResults = [];
        if (searchData.data.notes) allResults.push(...searchData.data.notes);
        if (searchData.data.folders) allResults.push(...searchData.data.folders);
        if (searchData.data.attachments) allResults.push(...searchData.data.attachments);
        
        setSearchResults({
          notes: searchData.data.notes || [],
          folders: searchData.data.folders || [],
          attachments: searchData.data.attachments || [],
          all: allResults
        });
      } else {
        setSearchResults({ notes: [], folders: [], attachments: [], all: [] });
      }
    } catch (err) {
      setError('Search failed');
      console.error('Error searching:', err);
      setSearchResults({ notes: [], folders: [], attachments: [], all: [] });
    }
  };

  // Handle note creation
  const handleNoteCreate = async (noteData) => {
    try {
      const folderId = selectedFolder?.id || null;
      const noteDataWithFolder = {
        ...noteData,
        folder_id: folderId
      };
      
      console.log('Creating note with data:', noteDataWithFolder);
      console.log('Selected folder:', selectedFolder);
      console.log('Folder ID being sent:', folderId);
      
      const response = await apiService.notes.create(noteDataWithFolder);
      
      const newNote = response.data.data;
      console.log('Note created successfully:', newNote);
      console.log('New note folder_id:', newNote.folder_id);
      console.log('New note folder_name:', newNote.folder_name);
      
      // Reload notes to get the updated list with proper folder filtering
      await loadNotes(selectedFolder?.id);
      
      // Set the newly created note as selected
      setSelectedNote(newNote);
      
      return newNote;
    } catch (err) {
      setError('Failed to create note');
      console.error('Error creating note:', err);
      throw err;
    }
  };

  // Handle note update
  const handleNoteUpdate = async (noteId, noteData) => {
    try {
      const response = await apiService.notes.update(noteId, noteData);
      const updatedNote = response.data.data;
      
      // Update notes list
      setNotes(prev => prev.map(note => 
        note.id === noteId ? updatedNote : note
      ));
      
      // Update selected note
      setSelectedNote(prev => 
        prev?.id === noteId ? updatedNote : prev
      );
      
      return updatedNote;
    } catch (err) {
      setError('Failed to update note');
      console.error('Error updating note:', err);
      throw err;
    }
  };

  // Handle note deletion
  const handleNoteDelete = async (noteId) => {
    try {
      await apiService.notes.delete(noteId);
      
      // Reload notes to get updated list
      await loadNotes(selectedFolder?.id);
      
      // Clear selected note if it was deleted
      setSelectedNote(prev => prev?.id === noteId ? null : prev);
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
      throw err;
    }
  };

  // Handle note move to folder
  const handleNoteMoveToFolder = async (noteId, folderId) => {
    try {
      await apiService.notes.move(noteId, folderId);
      
      // Reload notes to get updated list
      await loadNotes(selectedFolder?.id);
      
      // Update selected note if it was moved
      setSelectedNote(prev => {
        if (prev?.id === noteId) {
          // Reload the selected note to get updated folder info
          apiService.notes.getById(noteId).then(response => {
            setSelectedNote(response.data.data);
          });
        }
        return prev;
      });
    } catch (err) {
      setError('Failed to move note');
      console.error('Error moving note:', err);
      throw err;
    }
  };

  // Handle folder creation
  const handleFolderCreate = async (folderData) => {
    let folderName = folderData.name || 'New Folder';
    let attempt = 1;
    let finalName = folderName;
    
    while (attempt <= 20) {
      try {
        const response = await apiService.folders.create({ 
          ...folderData, 
          name: finalName 
        });
        
        // Successful creation
        await loadFolders();
        return response.data.data;
      } catch (err) {
        // Handle 409 Conflict (duplicate name)
        if (err.response?.status === 409) {
          attempt++;
          finalName = `${folderName} ${attempt}`;
          continue;
        }
        
        // Other errors
        setError(err.response?.data?.error || 'Failed to create folder');
        throw err;
      }
    }
    
    throw new Error('Could not create unique folder name');
  };

  // Handle folder update
  const handleFolderUpdate = async (folderId, folderData) => {
    try {
      const response = await apiService.folders.update(folderId, folderData);
      const updatedFolder = response.data.data;
      
      setFolders(prev => updateFolderInTree(prev, folderId, updatedFolder));
      
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedFolder);
      }
      
      return updatedFolder;
    } catch (err) {
      setError('Failed to update folder');
      console.error('Error updating folder:', err);
      throw err;
    }
  };

  // Handle folder deletion
  const handleFolderDelete = async (folderId) => {
    try {
      console.log('Attempting to delete folder:', folderId);
      const response = await apiService.folders.delete(folderId);
      
      console.log('Folder deleted successfully:', response.data);
      
      // Reload folders after successful deletion
      await loadFolders();
      
      // Clear selection if the deleted folder was selected
      if (selectedFolder?.id === folderId) {
        console.log('Clearing selection for deleted folder');
        setSelectedFolder(null);
        setSelectedNote(null);
      }
      
      // Show success message and clear any errors
      setSuccess('Folder deleted successfully');
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Folder deletion error:', err);
      
      // Parse error response for better user feedback
      let errorMessage = 'Failed to delete folder';
      
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            if (data.error) {
              errorMessage = data.error;
            } else {
              errorMessage = 'Bad request - cannot delete this folder';
            }
            break;
          case 404:
            errorMessage = 'Folder not found';
            break;
          case 500:
            errorMessage = 'Server error - please try again';
            break;
          default:
            errorMessage = `Error ${status}: ${data.error || 'Unknown error'}`;
        }
      } else if (err.request) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      setSuccess(null); // Clear any success messages
      console.error('Detailed error info:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
    }
  };

  // Helper function to update folder in tree structure
  const updateFolderInTree = useCallback((folders, folderId, updatedFolder) => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return updatedFolder;
      }
      if (folder.children) {
        return {
          ...folder,
          children: updateFolderInTree(folder.children, folderId, updatedFolder)
        };
      }
      return folder;
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get current notes to display
  const getCurrentNotes = () => {
    if (isSearchMode && searchResults) {
      return searchResults.notes || [];
    }
    console.log('Current notes:', notes);
    console.log('Selected folder:', selectedFolder);
    console.log('Is search mode:', isSearchMode);
    return notes;
  };

  // Get current title
  const getCurrentTitle = () => {
    if (isSearchMode) {
      return `Search Results for "${searchQuery}"`;
    }
    if (selectedFolder) {
      return selectedFolder.name;
    }
    return 'All Notes';
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
            
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-primary-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                SocketNote
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <SearchBar onSearch={handleSearch} />
            
            <button
              onClick={() => setShowBackupManager(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Backup Manager"
            >
              <Database size={20} />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {!sidebarCollapsed && (
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Folders</h2>
                <div className="space-y-2">
                  <button
                    onClick={handleAllNotesSelect}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
                      !selectedFolder && !isSearchMode 
                        ? 'bg-primary-100 text-primary-700' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Home className="h-4 w-4 mr-2" />
                    All Notes
                  </button>
                  <button
                    onClick={async () => {
                      await handleFolderCreate({ name: 'New Folder' });
                    }}
                    className="btn btn-primary w-full"
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    New Folder
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <FolderTree
                  folders={folders}
                  selectedFolder={selectedFolder}
                  onFolderSelect={handleFolderSelect}
                  onFolderCreate={handleFolderCreate}
                  onFolderUpdate={handleFolderUpdate}
                  onFolderDelete={handleFolderDelete}
                  loading={loading}
                />
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {getCurrentTitle()}
              </h2>
              {!isSearchMode && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNoteCreate({ title: 'New Note', content: '' })}
                    className="btn btn-primary w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {selectedFolder ? `New Note in "${selectedFolder.name}"` : 'New Note (No Folder)'}
                  </button>
                  {!selectedFolder && (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-2">
                        Select a folder to organize your notes
                      </p>
                      <button
                        onClick={() => handleAllNotesSelect()}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Or view all notes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <NotesList
                notes={getCurrentNotes()}
                selectedNote={selectedNote}
                onNoteSelect={handleNoteSelect}
                onNoteDelete={handleNoteDelete}
                onNoteMoveToFolder={handleNoteMoveToFolder}
                searchQuery={searchQuery}
                loading={loading}
                folders={flattenFolders(folders)}
              />
            </div>
          </div>

          {/* Note Editor */}
          <div className="flex-1 flex flex-col">
            {selectedNote ? (
              <NoteEditor
                note={selectedNote}
                onNoteUpdate={handleNoteUpdate}
                onNoteDelete={handleNoteDelete}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a note to edit</p>
                  <p className="text-sm">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 py-3 px-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>SocketNote</span>
              <span>•</span>
              <span>v1.1.0</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Developed by Sachin</span>
            </div>
          </div>
        </footer>

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {success && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <span>{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Backup Manager Modal */}
        {showBackupManager && (
          <BackupManager
            onClose={() => setShowBackupManager(false)}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App; 