import React, { useState, useEffect } from 'react';
import { Plugin, CreatePluginRequest, UpdatePluginRequest } from '../api/client';

interface PluginFormProps {
  plugin?: Plugin;
  loading: boolean;
  onSubmit: (data: CreatePluginRequest | UpdatePluginRequest) => Promise<void>;
  onCancel: () => void;
}

export const PluginForm: React.FC<PluginFormProps> = ({
  plugin,
  loading,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreatePluginRequest>({
    name: '',
    kind: '',
    endpoint: '',
    enabled: true,
    health_check: true,
    description: '',
    version: '1.0.0'
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plugin) {
      setFormData({
        name: plugin.name,
        kind: plugin.kind,
        endpoint: plugin.endpoint,
        enabled: plugin.enabled,
        health_check: plugin.health_check,
        description: plugin.description,
        version: plugin.version
      });
    }
  }, [plugin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Plugin name is required');
      return;
    }
    if (!formData.kind.trim()) {
      setError('Kind is required');
      return;
    }
    if (!formData.endpoint.trim()) {
      setError('Endpoint is required');
      return;
    }
    if (!formData.version.trim()) {
      setError('Version is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save plugin');
    }
  };

  return (
    <div className="plugin-form-container">
      <h2>{plugin ? 'Edit Plugin' : 'Create New Plugin'}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="plugin-form">
        <div className="form-group">
          <label htmlFor="name">Plugin Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="e.g., my-plugin"
          />
        </div>

        <div className="form-group">
          <label htmlFor="kind">Kind *</label>
          <input
            type="text"
            id="kind"
            name="kind"
            value={formData.kind}
            onChange={handleInputChange}
            required
            placeholder="e.g., database, http, etc."
          />
        </div>

        <div className="form-group">
          <label htmlFor="endpoint">Endpoint *</label>
          <input
            type="text"
            id="endpoint"
            name="endpoint"
            value={formData.endpoint}
            onChange={handleInputChange}
            required
            placeholder="e.g., 127.0.0.1:21212"
          />
        </div>

        <div className="form-group">
          <label htmlFor="version">Version *</label>
          <input
            type="text"
            id="version"
            name="version"
            value={formData.version}
            onChange={handleInputChange}
            required
            placeholder="e.g., 1.0.0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Plugin description"
            rows={3}
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="enabled"
              checked={formData.enabled}
              onChange={handleInputChange}
            />
            Enabled
          </label>
          <label>
            <input
              type="checkbox"
              name="health_check"
              checked={formData.health_check}
              onChange={handleInputChange}
            />
            Health Check
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-success" disabled={loading}>
            {loading ? 'Saving...' : plugin ? 'Update' : 'Create'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
