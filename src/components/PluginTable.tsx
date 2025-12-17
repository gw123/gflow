import React from 'react';
import { Plugin } from '../api/client';

interface PluginTableProps {
  plugins: Plugin[];
  loading: boolean;
  onEdit: (plugin: Plugin) => void;
  onDelete: (id: number) => void;
}

export const PluginTable: React.FC<PluginTableProps> = ({
  plugins,
  loading,
  onEdit,
  onDelete
}) => {
  if (plugins.length === 0) {
    return (
      <div className="empty-state">
        <p>No plugins found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <table className="plugin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Kind</th>
          <th>Endpoint</th>
          <th>Version</th>
          <th>Status</th>
          <th>Health Check</th>
          <th>Description</th>
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
            <td className="description" title={plugin.description}>
              {plugin.description || '-'}
            </td>
            <td className="actions">
              <button
                className="btn btn-sm btn-edit"
                onClick={() => onEdit(plugin)}
                disabled={loading}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-delete"
                onClick={() => onDelete(plugin.id)}
                disabled={loading}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
