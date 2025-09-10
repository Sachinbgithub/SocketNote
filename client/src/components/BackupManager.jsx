import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Trash2, Clock, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { apiService, formatFileSize, formatDate } from '../utils/api';

const BackupManager = ({ onClose }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const response = await apiService.backup.history();
      setBackups(response.data.data || []);
    } catch (error) {
      console.error('Error loading backups:', error);
      showMessage('Failed to load backup history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await apiService.backup.export(includeAttachments);
      showMessage('Backup exported successfully!', 'success');
      await loadBackups(); // Refresh the list
    } catch (error) {
      console.error('Error exporting backup:', error);
      showMessage('Failed to export backup', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showMessage('Please select a backup file', 'error');
      return;
    }

    try {
      setImporting(true);
      const fileContent = await readFileAsText(selectedFile);
      const backupData = JSON.parse(fileContent);
      
      await apiService.backup.import(backupData, overwrite);
      showMessage('Backup imported successfully!', 'success');
      setSelectedFile(null);
      setOverwrite(false);
    } catch (error) {
      console.error('Error importing backup:', error);
      showMessage('Failed to import backup', 'error');
    } finally {
      setImporting(false);
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.json')) {
      setSelectedFile(file);
    } else {
      showMessage('Please select a valid JSON backup file', 'error');
    }
  };

  const handleDeleteBackup = async (filename) => {
    if (window.confirm('Are you sure you want to delete this backup?')) {
      try {
        await apiService.backup.delete(filename);
        showMessage('Backup deleted successfully!', 'success');
        await loadBackups();
      } catch (error) {
        console.error('Error deleting backup:', error);
        showMessage('Failed to delete backup', 'error');
      }
    }
  };

  const downloadBackup = (backup) => {
    // Create a download link for the backup file
    const link = document.createElement('a');
    link.href = `/api/backup/${backup.filename}`;
    link.download = backup.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Backup Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="sr-only">Close</span>
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Section */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Download className="h-5 w-5 mr-2 text-green-600" />
              Export Data
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeAttachments"
                  checked={includeAttachments}
                  onChange={(e) => setIncludeAttachments(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="includeAttachments" className="text-sm text-gray-700">
                  Include file attachments (larger backup size)
                </label>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="btn btn-primary"
              >
                {exporting ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export Backup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-blue-600" />
              Import Data
            </h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="overwrite"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="overwrite" className="text-sm text-gray-700">
                  Overwrite existing data (be careful!)
                </label>
              </div>
              <button
                onClick={handleImport}
                disabled={importing || !selectedFile}
                className="btn btn-primary"
              >
                {importing ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Backup
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup History */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-600" />
              Backup History
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="loading-spinner mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No backups found</p>
                <p className="text-xs">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {backups.map((backup) => (
                  <div key={backup.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {backup.filename}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatFileSize(backup.size)}</span>
                          <span>{formatDate(backup.created_at)}</span>
                          {backup.meta && (
                            <span>
                              {backup.meta.total_notes} notes, {backup.meta.total_folders} folders
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => downloadBackup(backup)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Download backup"
                      >
                        <Download className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.filename)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete backup"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            message.type === 'success' ? 'bg-green-500 text-white' :
            message.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' && <CheckCircle className="h-4 w-4 mr-2" />}
              {message.type === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupManager; 