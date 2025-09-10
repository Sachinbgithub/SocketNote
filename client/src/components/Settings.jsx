import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Save, Upload, Info } from 'lucide-react';
import { apiService } from '../utils/api';

const Settings = ({ onClose }) => {
  const [uploadConfig, setUploadConfig] = useState({
    preset: 'office',
    customSize: 50
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const presets = [
    {
      id: 'office',
      name: 'Office Use',
      description: 'Moderate files for office work',
      fileSize: 50,
      files: 10,
      totalSize: 500
    },
    {
      id: 'images',
      name: 'High-Res Images',
      description: 'Larger files for high-resolution images',
      fileSize: 100,
      files: 5,
      totalSize: 500
    },
    {
      id: 'large',
      name: 'Large Files',
      description: 'Maximum safe limit for large files',
      fileSize: 200,
      files: 3,
      totalSize: 600
    },
    {
      id: 'maximum',
      name: 'Maximum',
      description: 'Absolute maximum limit (use with caution)',
      fileSize: 500,
      files: 2,
      totalSize: 1000
    }
  ];

  const handlePresetChange = (presetId) => {
    const preset = presets.find(p => p.id === presetId);
    setUploadConfig({
      preset: presetId,
      customSize: preset.fileSize
    });
  };

  const handleCustomSizeChange = (size) => {
    setUploadConfig(prev => ({
      ...prev,
      customSize: Math.max(1, Math.min(500, parseInt(size) || 1))
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Here you would typically send the configuration to the server
      // For now, we'll just save it to localStorage
      localStorage.setItem('uploadConfig', JSON.stringify(uploadConfig));
      
      setMessage({
        type: 'success',
        text: 'Upload settings saved successfully!'
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save settings: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load saved configuration
    const saved = localStorage.getItem('uploadConfig');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setUploadConfig(config);
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }
  }, []);

  const currentPreset = presets.find(p => p.id === uploadConfig.preset);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2 text-blue-600" />
              File Upload Settings
            </h3>

            {/* Preset Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Upload Preset
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      uploadConfig.preset === preset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="preset"
                        value={preset.id}
                        checked={uploadConfig.preset === preset.id}
                        onChange={() => handlePresetChange(preset.id)}
                        className="text-blue-600"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        <div className="text-sm text-gray-600">{preset.description}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Max file: {preset.fileSize}MB • Max files: {preset.files} • Total: {preset.totalSize}MB
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Size Override */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom File Size Limit (MB)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={uploadConfig.customSize}
                  onChange={(e) => handleCustomSizeChange(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">MB per file</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Override the preset file size limit (1-500 MB)
              </p>
            </div>

            {/* Current Configuration Display */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-1 text-blue-600" />
                Current Configuration
              </h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Preset: <span className="font-medium">{currentPreset?.name}</span></div>
                <div>Max file size: <span className="font-medium">{uploadConfig.customSize}MB</span></div>
                <div>Max files per upload: <span className="font-medium">{currentPreset?.files}</span></div>
                <div>Max total size: <span className="font-medium">{currentPreset?.totalSize}MB</span></div>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 