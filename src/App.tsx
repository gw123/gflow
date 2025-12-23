import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';

// Import Pages
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';
import { SecretsPage, ToolsPage, ApiPage, WorkflowsPage, StoragePage, PluginsPage, WebhookRoutesPage } from './pages/Wrappers';
import { DebugNodeTemplatesPage } from './pages/DebugNodeTemplatesPage';
import { useUserStore } from './stores';
import { api, User } from './api/client';
import { loadAllServerResources } from './builtins';

const AppContent = () => {
  const userStore = useUserStore();

  useEffect(() => {
    // Initialize token from localStorage on app startup
    api.initializeToken();
    api.debugTokenStatus();
    
    // Check auth on app load
    api.getMe().then((userInfo) => {
      const user: User = {
        user_id: userInfo.user_id,
        username: userInfo.username,
        avatar: userInfo.avatar,
        roles: userInfo.roles,
        permissions: userInfo.permissions
      };
      userStore.setUser(user);
      
      // Load server resources (node templates + gRPC plugins) after successful authentication
      console.log('[App] User authenticated, loading server resources...');
      const headers = api.getAuthHeaders();
      console.log('[App] Auth headers:', Object.keys(headers));
      
      loadAllServerResources(headers)
        .then(() => {
          console.log('[App] ✓ Server resources loaded successfully');
        })
        .catch((err) => {
          console.error('[App] ✗ Failed to load server resources:', err);
          console.error('[App] Error message:', err.message);
          // Continue with built-in plugins only
        });
    }).catch((err) => {
      // Not authenticated, user will need to login
      console.log('[App] User not authenticated:', err.message);
    });
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/secrets" element={<SecretsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/apis" element={<ApiPage />} />
        <Route path="/plugins" element={<PluginsPage />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/webhook-routes" element={<WebhookRoutesPage />} />
        <Route path="/debug/node-templates" element={<DebugNodeTemplatesPage />} />
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <ReactFlowProvider>
    <AppContent />
  </ReactFlowProvider>
);

export default App;
