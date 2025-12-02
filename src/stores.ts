
import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, MarkerType } from 'reactflow';
import { WorkflowDefinition, NodeDefinition, CredentialItem, WorkflowExecutionState } from './types';
import { TestReport } from './tester';
import { User, api } from './api/client';
import { workflowToFlow, flowToWorkflow, getLayoutedElements } from './utils';
import yaml from 'js-yaml';
import { SAMPLE_YAML } from './constants';

// --- UI Store ---
interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  // Modals
  configModalOpen: boolean;
  secretsManagerOpen: boolean;
  toolsManagerOpen: boolean;
  workflowListOpen: boolean;
  copilotOpen: boolean;
  helpModalOpen: boolean;
  conditionModalOpen: boolean;
  apiManagerOpen: boolean;
  authModalOpen: boolean;
  userProfileOpen: boolean;
  testReportOpen: boolean;

  // Actions to toggle modals
  setModalOpen: (modal: keyof Omit<UIState, 'setModalOpen' | 'isRightPanelOpen' | 'executionPanelOpen' | 'showYamlView' | 'selectedNodeId' | 'selectedEdge' | 'toast' | 'showToast' | 'setPanelOpen' | 'setSelectedNodeId' | 'setSelectedEdge'>, isOpen: boolean) => void;

  // Panels
  isRightPanelOpen: boolean;
  executionPanelOpen: boolean;
  showYamlView: boolean;
  setPanelOpen: (panel: 'isRightPanelOpen' | 'executionPanelOpen' | 'showYamlView', isOpen: boolean) => void;

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdge: Edge | null;
  setSelectedEdge: (edge: Edge | null) => void;

  // Toast
  toast: ToastMessage | null;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  
  // Data for Modals
  testReport: TestReport | null;
  setTestReport: (report: TestReport | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  configModalOpen: false,
  secretsManagerOpen: false,
  toolsManagerOpen: false,
  workflowListOpen: false,
  copilotOpen: false,
  helpModalOpen: false,
  conditionModalOpen: false,
  apiManagerOpen: false,
  authModalOpen: false,
  userProfileOpen: false,
  testReportOpen: false,

  setModalOpen: (modal, isOpen) => set({ [modal]: isOpen }),

  isRightPanelOpen: false,
  executionPanelOpen: false,
  showYamlView: false,
  setPanelOpen: (panel, isOpen) => set({ [panel]: isOpen }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id, isRightPanelOpen: !!id, selectedEdge: null }),
  
  selectedEdge: null,
  setSelectedEdge: (edge) => set({ selectedEdge: edge, selectedNodeId: null, conditionModalOpen: !!edge }),

  toast: null,
  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  testReport: null,
  setTestReport: (report) => set({ testReport: report }),
}));

// --- User Store ---
interface UserState {
  user: User | null;
  credentials: CredentialItem[];
  setUser: (user: User | null) => void;
  setCredentials: (creds: CredentialItem[]) => void;
  fetchCredentials: () => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  credentials: [],
  setUser: (user) => {
      set({ user });
      if (user) get().fetchCredentials();
      else set({ credentials: [] });
  },
  setCredentials: (creds) => set({ credentials: creds }),
  fetchCredentials: async () => {
      try {
          const creds = await api.getSecrets();
          set({ credentials: creds });
      } catch (e) {
          console.error("Failed to fetch credentials");
      }
  },
  logout: () => {
      api.logout();
      set({ user: null, credentials: [] });
  }
}));

// --- Workflow Store ---
interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  workflowData: WorkflowDefinition;
  currentWorkflowId: string | null;
  
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: any[]) => void; // Simplified type for now
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => void;
  
  loadWorkflow: (wf: WorkflowDefinition, id?: string | null) => void;
  updateWorkflowData: (partial: Partial<WorkflowDefinition>) => void;
  updateNode: (nodeDef: NodeDefinition) => void;
  deleteNode: (nodeId: string) => void;
  layout: (direction?: string) => void;
  
  // YAML Ops
  setWorkflowFromYaml: (yamlString: string) => boolean;
  getWorkflowAsYaml: () => string;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  workflowData: { name: 'Untitled', nodes: [] },
  currentWorkflowId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {}, 
  onEdgesChange: (changes) => {},
  
  onConnect: (params) => {
      set((state) => {
          const newEdges = addEdge({ 
            ...params, 
            type: 'default', 
            animated: true, 
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#64748b' }
          }, state.edges);
          
          const newWf = flowToWorkflow(state.workflowData, state.nodes, newEdges);
          return { edges: newEdges, workflowData: newWf };
      });
  },

  loadWorkflow: (wf, id = null) => {
      const { nodes, edges } = workflowToFlow(wf);
      set({ workflowData: wf, nodes, edges, currentWorkflowId: id });
  },

  updateWorkflowData: (partial) => {
      set((state) => ({ workflowData: { ...state.workflowData, ...partial } }));
  },

  updateNode: (updatedNode) => {
      set((state) => {
          const newNodes = state.nodes.map((node) => {
            if (node.id === state.workflowData.nodes.find(n => n.name === updatedNode.name)?.name || node.data.name === updatedNode.name) {
                return {
                    ...node,
                    id: updatedNode.name, // Update ID if name changed
                    data: { ...node.data, ...updatedNode }
                };
            }
            return node;
          });
          
          const newWf = flowToWorkflow(state.workflowData, newNodes, state.edges);
          return { nodes: newNodes, workflowData: newWf };
      });
  },

  deleteNode: (nodeId) => {
      set((state) => {
          const newNodes = state.nodes.filter((n) => n.id !== nodeId);
          const newEdges = state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
          const newWf = flowToWorkflow(state.workflowData, newNodes, newEdges);
          return { nodes: newNodes, edges: newEdges, workflowData: newWf };
      });
  },

  layout: (direction = 'LR') => {
      const { nodes, edges } = get().nodes.length > 0 ? getLayoutedElements(get().nodes, get().edges, direction) : { nodes: [], edges: [] };
      set({ nodes: [...nodes], edges: [...edges] });
  },

  setWorkflowFromYaml: (yamlString) => {
      try {
          const parsed = yaml.load(yamlString) as WorkflowDefinition;
          if (!parsed || typeof parsed !== 'object') throw new Error("Invalid YAML");
          
          const { nodes, edges } = workflowToFlow(parsed);
          set({ workflowData: parsed, nodes, edges });
          return true;
      } catch (e) {
          return false;
      }
  },

  getWorkflowAsYaml: () => {
      return yaml.dump(get().workflowData);
  }
}));

// --- Execution Store ---
interface ExecutionStore {
  executionState: WorkflowExecutionState;
  runMode: 'local' | 'cloud';
  setRunMode: (mode: 'local' | 'cloud') => void;
  setExecutionState: (state: WorkflowExecutionState) => void;
  updateExecutionState: (partial: Partial<WorkflowExecutionState>) => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executionState: {
    isRunning: false,
    isPaused: false,
    waitingForInput: false,
    nodeResults: {},
    logs: []
  },
  runMode: 'local',
  setRunMode: (mode) => set({ runMode: mode }),
  setExecutionState: (state) => set({ executionState: state }),
  updateExecutionState: (partial) => set((s) => ({ executionState: { ...s.executionState, ...partial } })),
  resetExecution: () => set({ 
      executionState: {
        isRunning: false,
        isPaused: false,
        waitingForInput: false,
        nodeResults: {},
        logs: []
      } 
  })
}));
