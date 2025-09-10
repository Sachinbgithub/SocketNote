import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Trash2, Upload, Download, Eye, EyeOff, Code, FileText, Image, File, ExternalLink, Archive } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import { apiService, debounce, formatFileSize, formatDate } from '../utils/api';
import FileUpload from './FileUpload';

const NoteEditor = ({ note, onNoteUpdate, onNoteDelete }) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [stats, setStats] = useState(null);
  
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const autoSaveRef = useRef(null);

  // Load note details and attachments
  useEffect(() => {
    loadNoteDetails();
  }, [note.id]);

  // Update local state when note changes
  useEffect(() => {
    console.log('Note changed, updating local state:', { id: note.id, title: note.title, content: note.content });
    setTitle(note.title);
    setContent(note.content || '');
    setIsEditing(false);
    setShowPreview(false);
  }, [note.id, note.title, note.content]);

  // Create auto-save function with proper cleanup
  const createAutoSave = useCallback(() => {
    return debounce(async (content) => {
      if (content !== note.content) {
        try {
          setSaving(true);
          await apiService.notes.autoSave(note.id, content);
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setSaving(false);
        }
      }
    }, 2000);
  }, [note.id, note.content]);

  // Initialize auto-save on mount and cleanup on unmount
  useEffect(() => {
    autoSaveRef.current = createAutoSave();
    
    return () => {
      if (autoSaveRef.current && autoSaveRef.current.cancel) {
        autoSaveRef.current.cancel();
      }
    };
  }, [createAutoSave]);

  // Handle content changes with auto-save
  useEffect(() => {
    if (content !== note.content && autoSaveRef.current) {
      autoSaveRef.current(content);
    }
  }, [content, note.content]);

  // Load note details
  const loadNoteDetails = async () => {
    try {
      setLoading(true);
      const [noteResponse, attachmentsResponse, statsResponse] = await Promise.all([
        apiService.notes.getById(note.id),
        apiService.upload.getByNote(note.id),
        apiService.notes.getStats(note.id)
      ]);

      setAttachments(attachmentsResponse.data.data || []);
      setStats(statsResponse.data.data.stats);
    } catch (error) {
      console.error('Error loading note details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle title update
  const handleTitleUpdate = async () => {
    if (title.trim() && title !== note.title) {
      try {
        await onNoteUpdate(note.id, { title: title.trim() });
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating title:', error);
      }
    } else {
      setTitle(note.title);
      setIsEditing(false);
    }
  };

  // Handle content update
  const handleContentUpdate = async () => {
    try {
      await onNoteUpdate(note.id, { title: note.title, content });
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  // Handle note deletion
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      try {
        await onNoteDelete(note.id);
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  // Handle attachment upload
  const handleFileUpload = async (files) => {
    try {
      setLoading(true);
      console.log('Starting file upload for note:', note.id);
      console.log('Files to upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
      
      const response = await apiService.upload.multiple(files, note.id);
      console.log('Upload response:', response.data);
      
      if (response.data.success) {
        setAttachments(prev => [...prev, ...response.data.data]);
        setShowUpload(false);
        console.log('Files uploaded successfully:', response.data.data.length);
      } else {
        console.error('Upload failed:', response.data.error);
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to upload files';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // You could add a toast notification here
      alert(`Upload Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle attachment deletion
  const handleAttachmentDelete = async (attachmentId) => {
    try {
      await apiService.upload.delete(attachmentId);
      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleContentUpdate();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTitle(note.title);
    }
  };

  // Detect code blocks and apply syntax highlighting
  const renderContent = () => {
    if (showPreview) {
      return (
        <div className="markdown-content p-4">
          <ReactMarkdown
            components={{
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={tomorrow}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Start writing your note... (Use Markdown for formatting)"
        className="textarea flex-1 p-4 resize-none focus:outline-none"
        style={{ minHeight: '400px' }}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleUpdate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTitleUpdate();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setTitle(note.title);
                  }
                }}
                className="text-2xl font-bold text-gray-900 w-full border-none outline-none bg-transparent"
                autoFocus
              />
            ) : (
              <h1 
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                onClick={() => setIsEditing(true)}
              >
                {note.title}
              </h1>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {saving && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="loading-spinner mr-2"></div>
                Saving...
              </div>
            )}

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn btn-ghost"
              title={showPreview ? 'Edit Mode' : 'Preview Mode'}
            >
              {showPreview ? <FileText className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setShowUpload(true)}
              className="btn btn-ghost"
              title="Upload Files"
            >
              <Upload className="h-4 w-4" />
            </button>

            <button
              onClick={handleContentUpdate}
              className="btn btn-primary"
              title="Save (Cmd+Enter)"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>

            <button
              onClick={handleDelete}
              className="btn btn-danger"
              title="Delete Note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Note Info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Created: {formatDate(note.created_at)}</span>
            <span>Updated: {formatDate(note.updated_at)}</span>
            {note.folder_name && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {note.folder_name}
              </span>
            )}
          </div>

          {stats && (
            <div className="flex items-center space-x-4">
              <span>{stats.words} words</span>
              <span>{stats.characters} characters</span>
              {stats.attachments > 0 && (
                <span>{stats.attachments} attachments</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map(attachment => {
              const fileName = attachment.original_name.toLowerCase();
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(fileName);
              
              const getFileIcon = () => {
                if (isImage) {
                  return <Image className="h-16 w-16 text-blue-500" />;
                }
                
                if (fileName.endsWith('.pdf')) {
                  return <File className="h-16 w-16 text-red-500" />;
                }
                
                if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                  return <File className="h-16 w-16 text-blue-600" />;
                }
                
                if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                  return <File className="h-16 w-16 text-green-600" />;
                }
                
                if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
                  return <File className="h-16 w-16 text-orange-500" />;
                }
                
                if (fileName.endsWith('.txt')) {
                  return <File className="h-16 w-16 text-gray-600" />;
                }
                
                if (fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z') || 
                    fileName.endsWith('.tar') || fileName.endsWith('.gz')) {
                  return <Archive className="h-16 w-16 text-purple-500" />;
                }
                
                return <File className="h-16 w-16 text-gray-500" />;
              };
              
              return (
                <div key={attachment.id} className="attachment-item">
                  {isImage ? (
                    <img
                      src={`/uploads/${attachment.filename}`}
                      alt={attachment.original_name}
                      className="attachment-item-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : (
                    <div className="attachment-item-image flex items-center justify-center bg-gray-100 rounded-lg">
                      {getFileIcon()}
                    </div>
                  )}
                  <div className="attachment-item-info">
                    <div className="attachment-item-name">
                      {attachment.original_name}
                    </div>
                    <div className="attachment-item-size">
                      {formatFileSize(attachment.size || 0)} • {formatDate(attachment.uploaded_at)}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <a
                      href={`/uploads/${attachment.filename}`}
                      download={attachment.original_name}
                      className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                      title="Download attachment"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleAttachmentDelete(attachment.id)}
                      className="p-1 hover:bg-red-100 text-red-600 rounded"
                      title="Delete attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showUpload && (
        <FileUpload
          onUpload={handleFileUpload}
          onClose={() => setShowUpload(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default NoteEditor; 