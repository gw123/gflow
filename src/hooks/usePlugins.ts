import { useState, useCallback } from 'react';
import { api, Plugin, CreatePluginRequest, UpdatePluginRequest, PaginatedPlugins } from '../api/client';

interface UsePluginsState {
  plugins: Plugin[];
  loading: boolean;
  error: string | null;
  pagination: {
    total_count: number;
    page_num: number;
    page_size: number;
    has_more: boolean;
  };
}

export const usePlugins = () => {
  const [state, setState] = useState<UsePluginsState>({
    plugins: [],
    loading: false,
    error: null,
    pagination: {
      total_count: 0,
      page_num: 1,
      page_size: 10,
      has_more: false
    }
  });

  const loadPlugins = useCallback(async (pageNum: number = 1, pageSize: number = 10) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result: PaginatedPlugins = await api.getPlugins({
        page_num: pageNum,
        page_size: pageSize
      });
      setState(prev => ({
        ...prev,
        plugins: result.data,
        pagination: result.pagination,
        loading: false
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to load plugins',
        loading: false
      }));
    }
  }, []);

  const createPlugin = useCallback(async (plugin: CreatePluginRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const newPlugin = await api.createPlugin(plugin);
      setState(prev => ({
        ...prev,
        plugins: [newPlugin, ...prev.plugins],
        loading: false
      }));
      return newPlugin;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to create plugin',
        loading: false
      }));
      throw err;
    }
  }, []);

  const updatePlugin = useCallback(async (id: number, plugin: UpdatePluginRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const updated = await api.updatePlugin(id, plugin);
      setState(prev => ({
        ...prev,
        plugins: prev.plugins.map(p => p.id === id ? updated : p),
        loading: false
      }));
      return updated;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to update plugin',
        loading: false
      }));
      throw err;
    }
  }, []);

  const deletePlugin = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await api.deletePlugin(id);
      setState(prev => ({
        ...prev,
        plugins: prev.plugins.filter(p => p.id !== id),
        loading: false
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to delete plugin',
        loading: false
      }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadPlugins,
    createPlugin,
    updatePlugin,
    deletePlugin,
    clearError
  };
};
