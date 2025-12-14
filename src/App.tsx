import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';

// Import Pages
import { HomePage } from './pages/HomePage';
import { EditorPage } from './pages/EditorPage';
import { SecretsPage, ToolsPage, ApiPage, WorkflowsPage, StoragePage } from './pages/Wrappers';

const App = () => (
  <ReactFlowProvider>
    <HashRouter>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/secrets" element={<SecretsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/apis" element={<ApiPage />} />
            <Route path="/storage" element={<StoragePage />} />
        </Routes>
    </HashRouter>
  </ReactFlowProvider>
);

export default App;
