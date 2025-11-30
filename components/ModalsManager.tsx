
import React from 'react';
import { WorkflowDefinition, CredentialItem } from '../types';
import { User, api } from '../api/client';
import { TestReport } from '../tester';
import { Edge } from 'reactflow';

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

interface ModalsManagerProps {
  // Config Modal
  configModalOpen: boolean;
  setConfigModalOpen: (open: boolean) => void;
  workflowData: WorkflowDefinition;
  onConfigSave: (partial: Partial<WorkflowDefinition>) => void;

  // Secrets Manager
  secretsManagerOpen: boolean;
  setSecretsManagerOpen: (open: boolean) => void;
  credentials: CredentialItem[];
  setCredentials: (creds: CredentialItem[]) => void;
  user: User | null;
  notify: (msg: string, type: 'success'|'error'|'info') => void;

  // Tools Manager
  toolsManagerOpen: boolean;
  setToolsManagerOpen: (open: boolean) => void;
  onToolsSave: (tools: any[]) => void;

  // API Manager
  apiManagerOpen: boolean;
  setApiManagerOpen: (open: boolean) => void;

  // AI Copilot
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  currentYaml: string;
  onApplyYaml: (yaml: string) => boolean;

  // Help Modal
  helpModalOpen: boolean;
  setHelpModalOpen: (open: boolean) => void;

  // Condition Modal
  conditionModalOpen: boolean;
  setConditionModalOpen: (open: boolean) => void;
  selectedEdge: Edge | null;
  onSaveConnection: (edgeId: string, conditions: string[]) => void;
  onDeleteConnection: (edgeId: string) => void;

  // Test Report
  testReportOpen: boolean;
  setTestReportOpen: (open: boolean) => void;
  testReport: TestReport | null;

  // Workflow List
  workflowListOpen: boolean;
  setWorkflowListOpen: (open: boolean) => void;
  onLoadWorkflow: (wf: WorkflowDefinition, id: string) => void;
  currentWorkflowId: string | null;

  // Auth & Profile
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  onLoginSuccess: (user: User) => void;
  
  userProfileOpen: boolean;
  setUserProfileOpen: (open: boolean) => void;
  onLogout: () => void;
}

export const ModalsManager: React.FC<ModalsManagerProps> = (props) => {
  return (
    <>
      <ConfigModal 
        isOpen={props.configModalOpen} 
        onClose={() => props.setConfigModalOpen(false)} 
        workflow={props.workflowData}
        onSave={props.onConfigSave}
      />
      
      <SecretsManager
         isOpen={props.secretsManagerOpen}
         onClose={() => props.setSecretsManagerOpen(false)}
         credentials={props.credentials}
         onSave={props.setCredentials}
         onCredentialUpdate={() => {}}
         notify={props.notify}
         isServerMode={!!props.user}
         onServerCreate={props.user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerUpdate={props.user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerDelete={props.user ? (id) => api.deleteSecret(id).then(() => {}) : undefined}
      />

      <ToolsManager 
          isOpen={props.toolsManagerOpen}
          onClose={() => props.setToolsManagerOpen(false)}
          workflow={props.workflowData}
          onSave={props.onToolsSave}
      />

      <ApiManager 
          isOpen={props.apiManagerOpen} 
          onClose={() => props.setApiManagerOpen(false)} 
          notify={props.notify} 
      />

      <AICopilot 
          isOpen={props.copilotOpen} 
          onClose={() => props.setCopilotOpen(false)}
          currentYaml={props.currentYaml}
          onApplyYaml={props.onApplyYaml}
      />
      
      <HelpModal 
          isOpen={props.helpModalOpen}
          onClose={() => props.setHelpModalOpen(false)}
      />

      <ConditionModal
          isOpen={props.conditionModalOpen}
          onClose={() => props.setConditionModalOpen(false)}
          edge={props.selectedEdge}
          onSave={props.onSaveConnection}
          onDelete={props.onDeleteConnection}
      />

      <TestReportModal 
          isOpen={props.testReportOpen}
          onClose={() => props.setTestReportOpen(false)}
          report={props.testReport}
      />

      <WorkflowListModal
          isOpen={props.workflowListOpen}
          onClose={() => props.setWorkflowListOpen(false)}
          onLoadWorkflow={props.onLoadWorkflow}
          currentWorkflowId={props.currentWorkflowId}
          notify={props.notify}
      />

      <AuthModal
          isOpen={props.authModalOpen}
          onClose={() => props.setAuthModalOpen(false)}
          onLoginSuccess={props.onLoginSuccess}
      />

      <UserProfileModal
          isOpen={props.userProfileOpen}
          onClose={() => props.setUserProfileOpen(false)}
          user={props.user}
          onLogout={props.onLogout}
      />
    </>
  );
};
