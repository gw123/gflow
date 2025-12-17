import React, { useState, useEffect } from 'react';
import { api, Plugin, CreatePluginRequest, UpdatePluginRequest } from '../api/client';
import '../styles/PluginManagement.css';

interface FormData extends CreatePluginRequest {}

export const PluginManagementPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    total_count: 0,
    page_num: 1,
    page_size: 10,
    has_more: false
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    kind: '',
    endpoint: '',
    enabled: true,
    health_check: true,
    description: '',
    version: '1.0.0'
  });

  useEffect(() => {
    loadPlugins();
  }, [pagination.page_num]);

  const loadPlugins = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getPlugins({
        page_num: pagination.page_num,
        page_size: pagination.page_size
      });
      setPlugins(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

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

    try {
      if (editingId) {
        await api.updatePlugin(editingId, formData as UpdatePluginRequest);
      } else {
        await api.createPlugin(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        kind: '',
        endpoint: '',
        enabled: true,
        health_check: true,
        description: '',
        version: '1.0.0'
      });
      await loadPlugins();
    } catch (err: any) {
      setError(err.message || 'Failed to save plugin');
    }
  };

  const handleEdit = (plugin: Plugin) => {
    setFormData({
      name: plugin.name,
      kind: plugin.kind,
      endpoint: plugin.endpoint,
      enabled: plugin.enabled,
      health_check: plugin.health_check,
      description: plugin.description,
      version: plugin.version
    });
    setEditingId(plugin.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this plugin?')) {
      return;
    }

    setError(null);
    try {
      await api.deletePlugin(id);
      await loadPlugins();
    } catch (err: any) {
      setError(err.message || 'Failed to delete plugin');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      kind: '',
      endpoint: '',
      enabled: true,
      health_check: true,
      description: '',
      version: '1.0.0'
    });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page_num: newPage }));
  };

  return (
    <div className="plugin-management-container">
      <div className="plugin-header">
        <h1>Plugin Management</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Add Plugin'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="plugin-form-container">
          <h2>{editingId ? 'Edit Plugin' : 'Create New Plugin'}</h2>
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
                {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="plugin-list-container">
        {loading && !showForm ? (
          <div className="loading">Loading plugins...</div>
        ) : plugins.length === 0 ? (
          <div className="empty-state">
            <p>No plugins found. Create one to get started.</p>
          </div>
        ) : (
          <>
            <table className="plugin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Endpoint</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Health Check</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plugins.map(plugin => (
                  <tr key={plugin.id}>
                    <td className="plugin-name">{plugin.name}</td>
                    <td>{plugin.kind}</td>
                    <td className="endpoint">{plugin.endpoint}</td>
                    <td>{plugin.version}</td>
                    <td>
                      <span className={`status ${plugin.enabled ? 'enabled' : 'disabled'}`}>
                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <span className={`health-check ${plugin.health_check ? 'active' : 'inactive'}`}>
                        {plugin.health_check ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-sm btn-edit"
                        onClick={() => handleEdit(plugin)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(plugin.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button
                className="btn btn-sm"
                onClick={() => handlePageChange(pagination.page_num - 1)}
                disabled={pagination.page_num === 1 || loading}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page_num} of {Math.ceil(pagination.total_count / pagination.page_size)}
                ({pagination.total_count} total)
              </span>
              <button
                className="btn btn-sm"
                onClick={() => handlePageChange(pagination.page_num + 1)}
                disabled={!pagination.has_more || loading}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
