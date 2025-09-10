import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, File, AlertCircle, CheckCircle, Archive } from 'lucide-react';
import { formatFileSize } from '../utils/api';

const FileUpload = ({ onUpload, onClose, loading }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending'
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Handle rejected files
    const newErrors = rejectedFiles.map(({ file, errors }) => ({
      filename: file.name,
      errors: errors.map(error => {
        switch (error.code) {
          case 'file-too-large':
            return 'File is too large (max 50MB)';
          case 'file-invalid-type':
            return 'Invalid file type (images, PDFs, Office documents, text files, archive files allowed)';
          case 'too-many-files':
            return 'Too many files (max 10)';
          default:
            return error.message;
        }
      })
    }));

    setErrors(prev => [...prev, ...newErrors]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Images
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
      // Documents
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      // Archives
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz'],
      'application/x-gzip': ['.gz'],
      'application/octet-stream': ['.zip', '.rar', '.7z', '.tar', '.gz']
    },
    maxSize: 50 * 1024 * 1024, // 50MB (office preset)
    maxFiles: 10,
    disabled: loading
  });

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;

    try {
      const files = uploadedFiles.map(f => f.file);
      await onUpload(files);
    } catch (error) {
      console.error('Upload failed:', error);
      // Update file status to error
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeError = (index) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Images
    if (fileType.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    
    // PDFs
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return <File className="h-8 w-8 text-red-500" />;
    }
    
    // Word documents
    if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      return <File className="h-8 w-8 text-blue-600" />;
    }
    
    // Excel files
    if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      return <File className="h-8 w-8 text-green-600" />;
    }
    
    // PowerPoint files
    if (fileType.includes('powerpoint') || fileType.includes('presentation') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
      return <File className="h-8 w-8 text-orange-500" />;
    }
    
    // Text files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return <File className="h-8 w-8 text-gray-600" />;
    }
    
    // Archive files
    if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed' || 
        fileType === 'application/x-rar-compressed' || fileType === 'application/x-7z-compressed' ||
        fileType === 'application/x-tar' || fileType === 'application/gzip' || fileType === 'application/x-gzip' ||
        fileName.endsWith('.zip') || fileName.endsWith('.rar') || fileName.endsWith('.7z') || 
        fileName.endsWith('.tar') || fileName.endsWith('.gz')) {
      return <Archive className="h-8 w-8 text-purple-500" />;
    }
    
    // Default
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getFilePreview = (file) => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
      );
    }
    return getFileIcon(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`file-upload-zone ${isDragActive ? 'dragover' : ''} ${
              loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium text-primary-600">
                Drop the files here...
              </p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag & drop files here
                </p>
                <p className="text-sm text-gray-500">
                  or click to select files
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supported: Images, PDFs, Office documents, text files, archive files (max 50MB each, up to 10 files)
                </p>
              </div>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Upload Errors
              </h3>
              {errors.map((error, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        {error.filename}
                      </p>
                      <ul className="text-xs text-red-600 mt-1">
                        {error.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => removeError(index)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">
                Selected Files ({uploadedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((fileInfo) => (
                  <div
                    key={fileInfo.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {getFilePreview(fileInfo.file)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileInfo.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(fileInfo.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(fileInfo.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                      disabled={loading}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="btn btn-primary"
            disabled={loading || uploadedFiles.length === 0}
          >
            {loading ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 