/**
 * React Hook for Plugin Loading
 * 
 * Provides a convenient way to load and manage plugins and node templates in React components
 */

import { useState, useCallback } from 'react';
import { reloadAllServerResources, reloadServerNodeTemplates, reloadServerPlugins, getPluginStats } from '../utils/pluginLoader';

interface PluginLoaderState {
  isLoading: boolean;
  error: string | null;
  lastLoadTime: number | null;
}

export function usePluginLoader() {
  const [state, setState] = useState<PluginLoaderState>({
    isLoading: false,
    error: null,
    lastLoadTime: null
  });

  /**
   * Load or reload all server resources (node templates + gRPC plugins)
   */
  const loadAll = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await reloadAllServerResources();
      setState({
        isLoading: false,
        error: null,
        lastLoadTime: Date.now()
      });
      return true;
    } catch (error: any) {
      setState({
        isLoading: false,
        error: error.message || 'Failed to load server resources',
        lastLoadTime: null
      });
      return false;
    }
  }, []);

  /**
   * Load or reload only node templates
   */
  const loadTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await reloadServerNodeTemplates();
      setState({
        isLoading: false,
        error: null,
        lastLoadTime: Date.now()
      });
      return true;
    } catch (error: any) {
      setState({
        isLoading: false,
        error: error.message || 'Failed to load node templates',
        lastLoadTime: null
      });
      return false;
    }
  }, []);

  /**
   * Load or reload only gRPC plugins
   */
  const loadPlugins = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await reloadServerPlugins();
      setState({
        isLoading: false,
        error: null,
        lastLoadTime: Date.now()
      });
      return true;
    } catch (error: any) {
      setState({
        isLoading: false,
        error: error.message || 'Failed to load gRPC plugins',
        lastLoadTime: null
      });
      return false;
    }
  }, []);

  /**
   * Get current plugin statistics
   */
  const getStats = useCallback(() => {
    return getPluginStats();
  }, []);

  return {
    ...state,
    loadAll,
    loadTemplates,
    loadPlugins,
    getStats
  };
}
