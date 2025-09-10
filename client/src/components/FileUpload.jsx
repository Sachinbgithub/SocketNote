import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, File, AlertCircle, CheckCircle, Archive } from 'lucide-react';
import { formatFileSize } from '../utils/api';

const FileUpload = ({ onUpload, onClose, loading }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploadConfig, setUploadConfig] = useState({
    preset: 'office',
    customSize: 50
  });

  // Load upload configuration
  useEffect(() => {
    const saved = localStorage.getItem('uploadConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setUploadConfig(config);
      } catch (error) {
        console.error('Failed to load upload config:', error);
      }
    }
  }, []);

  const presets = {
    office: { fileSize: 50, files: 10 },
    images: { fileSize: 100, files: 5 },
    large: { fileSize: 200, files: 3 },
    maximum: { fileSize: 500, files: 2 }
  };

  const currentPreset = presets[uploadConfig.preset];
  const maxFileSize = uploadConfig.customSize * 1024 * 1024; // Convert MB to bytes
  const maxFiles = currentPreset.files;

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
            return `File is too large (max ${uploadConfig.customSize}MB)`;
          case 'file-invalid-type':
            return 'Invalid file type (images, PDFs, Office documents, text files, archive files allowed)';
          case 'too-many-files':
            return `Too many files (max ${maxFiles})`;
          default:
            return error.message;
        }
      })
    }));

    setErrors(prev => [...prev, ...newErrors]);
  }, [uploadConfig.customSize, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    maxFiles: maxFiles,
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
    }
  });

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) return;

    const files = uploadedFiles.map(f => f.file);
    await onUpload(files);
    setUploadedFiles([]);
    setErrors([]);
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeError = (index) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (file.type === 'application/pdf') return <File className="h-5 w-5 text-red-500" />;
    if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z') || file.type.includes('tar') || file.type.includes('gz')) {
      return <Archive className="h-5 w-5 text-purple-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Upload Configuration Display */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Current Limits:</strong> Max {uploadConfig.customSize}MB per file, {maxFiles} files max
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg text-gray-600 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Max {uploadConfig.customSize}MB per file, up to {maxFiles} files
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Selected Files</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((fileData) => (
                  <div
                    key={fileData.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getFileIcon(fileData.file)}
                      <div>
                        <div className="font-medium text-gray-900">{fileData.file.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(fileData.file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(fileData.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-red-600 mb-3 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Upload Errors
              </h3>
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-red-800">{error.filename}</div>
                      <ul className="text-sm text-red-600 mt-1">
                        {error.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => removeError(index)}
                      className="text-red-400 hover:text-red-600 transition-colors ml-2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadedFiles.length === 0 || loading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload {uploadedFiles.length} File{uploadedFiles.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 