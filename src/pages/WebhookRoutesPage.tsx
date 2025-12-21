import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Search, ExternalLink } from 'lucide-react';
import { api, WebhookRoute, CreateWebhookRouteRequest, UpdateWebhookRouteRequest } from '../api/client';

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate('/')}
      className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium border border-slate-200 dark:border-slate-700 transition-all"
    >
      <ArrowLeft size={16} />
      Back to Home
    </button>
  );
};

const WebhookRouteForm: React.FC<{
  route?: WebhookRoute;
  onSubmit: (data: CreateWebhookRouteRequest | UpdateWebhookRouteRequest) => Promise<void>;
  onCancel: () => void;
}> = ({ route, onSubmit, onCancel }) => {
  const [routeType, setRouteType] = useState<'workflow' | 'backend'>(
    route?.backend && !route?.workflow_name ? 'backend' : 'workflow'
  );
  const [formData, setFormData] = useState<CreateWebhookRouteRequest>({
    path: route?.path || '',
    method: route?.method || 'POST',
    backend: route?.backend || '',
    workflow_name: route?.workflow_name || '',
    timeout: route?.timeout || 30,
    max_retry: route?.max_retry || 3
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate that either workflow_name or backend is provided
    if (routeType === 'workflow' && !formData.workflow_name) {
      setError('Workflow Name is required');
      return;
    }
    if (routeType === 'backend' && !formData.backend) {
      setError('Backend Service is required');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare data based on route type
      const submitData = {
        ...formData,
        workflow_name: routeType === 'workflow' ? formData.workflow_name : '',
        backend: routeType === 'backend' ? formData.backend : ''
      };
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {route ? 'Edit Webhook Route' : 'Create Webhook Route'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Path <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="/api/webhook/example"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              HTTP Method <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Route Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="routeType"
                  value="workflow"
                  checked={routeType === 'workflow'}
                  onChange={() => setRouteType('workflow')}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Workflow</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="routeType"
                  value="backend"
                  checked={routeType === 'backend'}
                  onChange={() => setRouteType('backend')}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Backend Service</span>
              </label>
            </div>
          </div>

          {routeType === 'workflow' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Workflow Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="workflow-name"
                value={formData.workflow_name}
                onChange={(e) => setFormData({ ...formData, workflow_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Backend Service <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="http://backend-service:8080"
                value={formData.backend}
                onChange={(e) => setFormData({ ...formData, backend: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                min="1"
                value={formData.timeout}
                onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Retry
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_retry}
                onChange={(e) => setFormData({ ...formData, max_retry: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Saving...' : route ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const WebhookRoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<WebhookRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<WebhookRoute | undefined>();

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await api.getWebhookRoutes({
        keyword,
        page_num: page,
        page_size: pageSize
      });
      setRoutes(data.list);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load webhook routes:', error);
      alert(error.message || 'Failed to load webhook routes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateWebhookRouteRequest) => {
    await api.createWebhookRoute(data);
    setShowForm(false);
    loadRoutes();
  };

  const handleUpdate = async (data: UpdateWebhookRouteRequest) => {
    if (!editingRoute) return;
    await api.updateWebhookRoute(editingRoute.id, data);
    setShowForm(false);
    setEditingRoute(undefined);
    loadRoutes();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this webhook route?')) return;
    
    try {
      await api.deleteWebhookRoute(id);
      loadRoutes();
    } catch (error: any) {
      console.error('Failed to delete webhook route:', error);
      alert(error.message || 'Failed to delete webhook route');
    }
  };

  const handleWorkflowClick = async (workflowName: string) => {
    if (!workflowName) return;
    // Navigate to editor with workflow name parameter
    navigate(`/editor?workflow=${encodeURIComponent(workflowName)}`);
  };

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  useEffect(() => {
    loadRoutes();
  }, [page, keyword]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-40 overflow-hidden flex flex-col">
      <BackButton />
      
      <div className="flex-1 mt-16 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Webhook Routes
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage webhook routes to trigger workflows
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-3">
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Search by path or workflow name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Search size={16} />
                  Search
                </button>
              </div>
              <button
                onClick={() => {
                  setEditingRoute(undefined);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Create Route
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>
            ) : routes.length === 0 ? (
              <div className="p-8 text-center text-slate-600 dark:text-slate-400">
                No webhook routes found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Path
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Timeout
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Retry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {routes.map((route) => (
                      <tr key={route.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {route.id}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-mono">
                          {route.path}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                            {route.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {route.workflow_name ? (
                            <button
                              onClick={() => handleWorkflowClick(route.workflow_name)}
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                              title="Open workflow in editor"
                            >
                              {route.workflow_name}
                              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 italic">Backend Service</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {route.timeout}s
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {route.max_retry}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(route.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingRoute(route);
                                setShowForm(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(route.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} of {totalPages} ({total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 rounded text-sm font-medium transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 rounded text-sm font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <WebhookRouteForm
          route={editingRoute}
          onSubmit={editingRoute ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingRoute(undefined);
          }}
        />
      )}
    </div>
  );
};

export default WebhookRoutesPage;
