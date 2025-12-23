
import React from 'react';
import { useUIStore, useWorkflowStore, useUserStore } from '../stores';
import { api } from '../api/client';

import ConfigModal from './ConfigModal';
import SecretsManager from './SecretsManager';
import ToolsManager from './ToolsManager';
import ApiManager from './ApiManager';
import AICopilot from './AICopilot';
import HelpModal from './HelpModal';
import ConditionModal from './ConditionModal';
import TestReportModal from './TestReportModal';
import WorkflowListModal from './WorkflowListModal';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';

export const ModalsManager: React.FC = () => {
  const ui = useUIStore();
  const wfStore = useWorkflowStore();
  const userStore = useUserStore();

  return (
    <>
      <ConfigModal 
        isOpen={ui.configModalOpen} 
        onClose={() => ui.setModalOpen('configModalOpen', false)} 
        workflow={wfStore.workflowData}
        onSave={wfStore.updateWorkflowData}
      />
      
      <SecretsManager
         isOpen={ui.secretsManagerOpen}
         onClose={() => ui.setModalOpen('secretsManagerOpen', false)}
         credentials={userStore.credentials}
         onSave={userStore.setCredentials}
         onCredentialUpdate={() => {}} // Could trigger refresh
         notify={ui.showToast}
         isServerMode={!!userStore.user}
         onServerCreate={userStore.user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerUpdate={userStore.user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerDelete={userStore.user ? (id) => api.deleteSecret(id).then(() => {}) : undefined}
         onServerFetch={userStore.user ? (id) => api.getSecret(id) : undefined}
      />

      <ToolsManager 
          isOpen={ui.toolsManagerOpen}
          onClose={() => ui.setModalOpen('toolsManagerOpen', false)}
          workflow={wfStore.workflowData}
          onSave={(tools) => wfStore.updateWorkflowData({ tools })}
      />

      <ApiManager 
          isOpen={ui.apiManagerOpen} 
          onClose={() => ui.setModalOpen('apiManagerOpen', false)} 
          notify={ui.showToast} 
      />

      <AICopilot 
          isOpen={ui.copilotOpen} 
          onClose={() => ui.setModalOpen('copilotOpen', false)}
          currentYaml={wfStore.getWorkflowAsYaml()}
          onApplyYaml={wfStore.setWorkflowFromYaml}
      />
      
      <HelpModal 
          isOpen={ui.helpModalOpen}
          onClose={() => ui.setModalOpen('helpModalOpen', false)}
      />

      <ConditionModal
          isOpen={ui.conditionModalOpen}
          onClose={() => ui.setModalOpen('conditionModalOpen', false)}
          edge={ui.selectedEdge}
          onSave={(edgeId, conditions) => {
              // We need to update edges in store
              // Complex edge update logic logic is best handled in App or store custom action
              // For now, simpler to access edges from store and update
              const edge = wfStore.edges.find(e => e.id === edgeId);
              if(edge) {
                  // Update logic logic is specific to react flow edge data
                  const newEdges = wfStore.edges.map(e => e.id === edgeId ? { ...e, data: { ...e.data, when: conditions }, label: conditions.length > 0 ? 'Condition' : undefined, style: conditions.length > 0 ? { stroke: '#eab308', strokeWidth: 2 } : { stroke: '#64748b', strokeWidth: 2 } } : e);
                  wfStore.setEdges(newEdges);
                  // Sync workflow data
                  // flowToWorkflow call needed...
                  // Ideally ConditionModal calls a store action "updateConnectionCondition"
              }
              ui.setModalOpen('conditionModalOpen', false);
          }}
          onDelete={(edgeId) => {
              const newEdges = wfStore.edges.filter(e => e.id !== edgeId);
              wfStore.setEdges(newEdges);
              ui.setModalOpen('conditionModalOpen', false);
          }}
      />

      <TestReportModal 
          isOpen={ui.testReportOpen}
          onClose={() => ui.setModalOpen('testReportOpen', false)}
          report={ui.testReport}
      />

      <WorkflowListModal
          isOpen={ui.workflowListOpen}
          onClose={() => ui.setModalOpen('workflowListOpen', false)}
          onLoadWorkflow={wfStore.loadWorkflow}
          currentWorkflowId={wfStore.currentWorkflowId}
          notify={ui.showToast}
      />

      <AuthModal
          isOpen={ui.authModalOpen}
          onClose={() => ui.setModalOpen('authModalOpen', false)}
          onLoginSuccess={(user) => {
            // Set user in store
            userStore.setUser(user);
            // Also verify token by calling getMe
            api.getMe().then((userInfo) => {
              const updatedUser = {
                user_id: userInfo.user_id,
                username: userInfo.username,
                avatar: userInfo.avatar,
                roles: userInfo.roles,
                permissions: userInfo.permissions
              };
              userStore.setUser(updatedUser);
            }).catch((err) => {
              console.error('[ModalsManager] Failed to verify user after login:', err);
            });
          }}
      />

      <UserProfileModal
          isOpen={ui.userProfileOpen}
          onClose={() => ui.setModalOpen('userProfileOpen', false)}
          user={userStore.user}
          onLogout={userStore.logout}
      />
    </>
  );
};
