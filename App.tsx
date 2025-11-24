

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Connection,
  addEdge,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  MarkerType,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import yaml from 'js-yaml';
import { 
  Settings, FileJson, Braces, Box, LayoutDashboard, Database, 
  Upload, Download, Key, Sparkles, Play, HelpCircle, 
  Beaker, Save, FolderOpen, UserCircle, LogIn, StepForward, LogOut 
} from 'lucide-react';

import { WorkflowDefinition, NodeDefinition, CredentialItem, WorkflowExecutionState } from './types';
import { workflowToFlow, flowToWorkflow, getLayoutedElements, NODE_WIDTH, NODE_HEIGHT } from './utils';
import { SAMPLE_YAML } from './constants';
import { NODE_TEMPLATES } from './nodes';
import { WorkflowRunner } from './runner';
import { WorkflowTester, TestReport } from './tester';
import { api, User } from './api/client';

import EditorPanel from './components/EditorPanel';
import ConfigModal from './components/ConfigModal';
import YamlView from './components/YamlView';
import Sidebar from './components/Sidebar';
import SecretsManager from './components/SecretsManager';
import Toast from './components/Toast';
import AICopilot from './components/AICopilot';
import NodeInfoTooltip from './components/NodeInfoTooltip';
import ExecutionPanel from './components/ExecutionPanel';
import HelpModal from './components/HelpModal';
import ConditionModal from './components/ConditionModal';
import CustomNode from './components/CustomNode';
import TestReportModal from './components/TestReportModal';
import WorkflowListModal from './components/WorkflowListModal';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';

const AppContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowData, setWorkflowData] = useState<WorkflowDefinition>({ name: 'Untitled', nodes: [] });
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [showYamlView, setShowYamlView] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'global'|'storages'|'codes'|'pinData'>('global');
  const [secretsManagerOpen, setSecretsManagerOpen] = useState(false);
  const [workflowListOpen, setWorkflowListOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  
  // Auth & Server State
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);

  // Execution State
  const [executionPanelOpen, setExecutionPanelOpen] = useState(false);
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>({
    isRunning: false,
    isPaused: false,
    waitingForInput: false,
    nodeResults: {},
    logs: []
  });
  const runnerRef = useRef<WorkflowRunner | null>(null);

  // Test Report
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [testReportOpen, setTestReportOpen] = useState(false);

  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);
  const { project } = useReactFlow();

  // --- Initialization ---

  useEffect(() => {
    // Initial Load
    try {
      const parsed = yaml.load(SAMPLE_YAML) as WorkflowDefinition;
      const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsed);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setWorkflowData(parsed);
    } catch (e) {
      console.error("Failed to parse initial sample YAML", e);
    }

    // Check Auth
    api.getMe().then(setUser).catch(() => {}); // Silent fail on auth check
  }, [setNodes, setEdges]);

  // Sync Creds on open
  useEffect(() => {
    if (secretsManagerOpen) {
       if (user) {
           api.getSecrets().then(setCredentials).catch(err => {
               showToast("Failed to load server secrets: " + err.message, "error");
           });
       } else {
           // Local mode secrets (could load from localstorage if we wanted, for now empty or memory)
       }
    }
  }, [secretsManagerOpen, user]);

  // --- Handlers ---

  const showToast = (message: string, type: 'success'|'error'|'info') => {
    setToast({ message, type });
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdge(null);
    setIsRightPanelOpen(true);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    setSelectedEdge(null);
    setIsRightPanelOpen(false);
  };

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      setConditionModalOpen(true);
  };

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
        ...params, 
        type: 'default', 
        animated: true, 
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#64748b' }
    }, eds));
    
    // Sync to data model
    setWorkflowData(prev => {
        const newData = flowToWorkflow(prev, nodes, [...edges, { ...params, id: `e-${params.source}-${params.target}` } as Edge]);
        return newData;
    });
  }, [nodes, edges, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = project({
        x: event.clientX - (reactFlowWrapper.current?.getBoundingClientRect().left || 0),
        y: event.clientY - (reactFlowWrapper.current?.getBoundingClientRect().top || 0),
      });

      const template = NODE_TEMPLATES[type] || { name: `New ${type}`, type, parameters: {} };
      
      const newNode: Node = {
        id: `${template.name}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'custom',
        position,
        data: { 
            label: template.name, 
            name: template.name, // Will be overwritten by ID logic in flowToWorkflow to ensure uniqueness if we want
            ...template 
        },
      };

      setNodes((nds) => {
          const newNodes = nds.concat(newNode);
          // Update workflow data immediately
          const newData = flowToWorkflow(workflowData, newNodes, edges);
          setWorkflowData(newData);
          return newNodes;
      });
    },
    [project, setNodes, edges, workflowData]
  );

  const handleSaveNode = (updatedNode: NodeDefinition) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
            // ID change check
            if (updatedNode.name !== node.data.name) {
                // If name changes, we need to update ID and connections... complicated in simple mapping.
                // For simplicity, we sync ID to Name in flowToWorkflow, so here we assume name change updates ID logic eventually.
                // But changing ID in ReactFlow requires re-building edges.
                // We will just update data for now.
            }
            return {
                ...node,
                id: updatedNode.name, // Rename node ID to match name
                data: { ...node.data, ...updatedNode },
            };
        }
        return node;
      })
    );
    
    // Defer the workflowData update slightly or do it now:
    setWorkflowData(prev => {
        // We need to construct based on the updated nodes list
        // This is a bit circular since we are inside setNodes callback above, 
        // so we can't access the *result* of setNodes yet.
        // We will do a manual update:
        const updatedNodes = prev.nodes.map(n => n.name === selectedNodeId ? updatedNode : n);
        
        // If name changed, we need to update connections map keys...
        if (updatedNode.name !== selectedNodeId) {
             const newConns = { ...prev.connections };
             if (selectedNodeId && newConns[selectedNodeId]) {
                 newConns[updatedNode.name] = newConns[selectedNodeId];
                 delete newConns[selectedNodeId];
             }
             // Also update targets in other connections
             Object.keys(newConns).forEach(key => {
                 newConns[key].forEach(group => {
                     group.forEach(rule => {
                         if (rule.node === selectedNodeId) rule.node = updatedNode.name;
                     });
                 });
             });
             return { ...prev, nodes: updatedNodes, connections: newConns };
        }
        return { ...prev, nodes: updatedNodes };
    });

    if (updatedNode.name !== selectedNodeId) {
        setSelectedNodeId(updatedNode.name);
    }
  };

  const handleDeleteNode = (nodeName: string) => {
    if (!confirm(`Delete node ${nodeName}?`)) return;
    setNodes((nds) => nds.filter((n) => n.id !== nodeName));
    setEdges((eds) => eds.filter((e) => e.source !== nodeName && e.target !== nodeName));
    setWorkflowData(prev => {
        const newNodes = prev.nodes.filter(n => n.name !== nodeName);
        const newConns = { ...prev.connections };
        delete newConns[nodeName];
        // Remove incoming edges
        Object.keys(newConns).forEach(key => {
            newConns[key] = newConns[key].map(group => group.filter(rule => rule.node !== nodeName)).filter(g => g.length > 0);
            if (newConns[key].length === 0) delete newConns[key];
        });
        return { ...prev, nodes: newNodes, connections: newConns };
    });
    setIsRightPanelOpen(false);
    showToast("Node deleted", "info");
  };

  const updateYaml = (newContent: string): boolean => {
    try {
      const parsed = yaml.load(newContent) as WorkflowDefinition;
      // Validate minimal structure
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid YAML");
      
      setWorkflowData(parsed);
      const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(parsed);
      setNodes(flowNodes);
      setEdges(flowEdges);
      return true;
    } catch (e: any) {
      showToast(`YAML Error: ${e.message}`, "error");
      return false;
    }
  };

  const handleLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  };

  // --- Execution ---

  const handleRunWorkflow = async (mode: 'run' | 'step' = 'run') => {
    if (executionState.isRunning && !executionState.isPaused && !executionState.waitingForInput) {
        showToast("Workflow is already running", "info");
        return;
    }

    // Refresh data from flow to ensure latest state
    const currentData = flowToWorkflow(workflowData, nodes, edges);
    
    // Validate
    const tester = new WorkflowTester(currentData);
    const report = tester.runTest();
    if (!report.isValid) {
        setTestReport(report);
        setTestReportOpen(true);
        showToast("Validation failed. Check report.", "error");
        return;
    }

    setExecutionPanelOpen(true);
    
    // Start Runner
    const runner = new WorkflowRunner(currentData, (state) => {
        // Sync ReactFlow nodes status
        setNodes(nds => nds.map(n => {
            const res = state.nodeResults[n.id];
            if (res) {
                return { ...n, data: { ...n.data, executionStatus: res.status } };
            }
            return { ...n, data: { ...n.data, executionStatus: undefined } };
        }));
        setExecutionState(state);
    });

    runnerRef.current = runner;
    setExecutionState({ ...runner['state'], isRunning: true }); // Initial state
    
    try {
        await runner.execute(mode);
    } catch (e) {
        console.error(e);
    } finally {
        // Only clear runner if we are completely done and not paused/waiting
        if (!runner.state.waitingForInput && !runner.state.isPaused) {
             runnerRef.current = null;
        }
    }
  };

  const handleNextStep = () => {
    if (runnerRef.current) {
        runnerRef.current.nextStep();
    }
  };

  const handleResume = () => {
    if (runnerRef.current) {
        runnerRef.current.resume();
    }
  };

  const handleSubmitInput = (data: any) => {
    if (runnerRef.current) {
        runnerRef.current.submitInput(data);
    }
  };

  const handleSaveConnection = (edgeId: string, conditions: string[]) => {
      setEdges(eds => eds.map(e => {
          if (e.id === edgeId) {
              return {
                  ...e,
                  label: conditions.length > 0 ? 'Condition' : undefined,
                  data: { ...e.data, when: conditions },
                  style: conditions.length > 0 ? { stroke: '#eab308', strokeWidth: 2 } : { stroke: '#64748b', strokeWidth: 2 },
                  markerEnd: {
                    type: MarkerType.ArrowClosed, 
                    color: conditions.length > 0 ? '#eab308' : '#64748b',
                    width: 20,
                    height: 20,
                  }
              };
          }
          return e;
      }));
      setConditionModalOpen(false);
      // Sync workflow data
      setWorkflowData(prev => {
          // This is complex to sync back efficiently without full recalc, 
          // but relying on flowToWorkflow before save/run is safer.
          return prev; 
      });
  };

  const handleDeleteConnection = (edgeId: string) => {
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      setConditionModalOpen(false);
  };

  const handleConfigSave = (partial: Partial<WorkflowDefinition>) => {
      setWorkflowData(prev => ({ ...prev, ...partial }));
  };

  // --- Auth & Server Operations ---

  const handleLogin = (u: User) => {
      setUser(u);
      showToast(`Welcome back, ${u.username}`, "success");
  };

  const handleLogout = () => {
      api.logout();
      setUser(null);
      setCredentials([]); // Clear secrets
      showToast("Logged out successfully", "info");
  };

  const handleSaveWorkflow = async () => {
      if (!user) {
          showToast("Please login to save workflows to server", "info");
          setAuthModalOpen(true);
          return;
      }
      
      const currentData = flowToWorkflow(workflowData, nodes, edges);
      try {
          if (currentWorkflowId) {
              await api.updateWorkflow(currentWorkflowId, currentData.name, currentData);
              showToast("Workflow saved to server", "success");
          } else {
              const created = await api.createWorkflow(currentData.name, currentData);
              setCurrentWorkflowId(created.id);
              showToast("New workflow created on server", "success");
          }
      } catch (e: any) {
          showToast(e.message, "error");
      }
  };

  const handleLoadWorkflow = (wf: WorkflowDefinition, id: string) => {
      setWorkflowData(wf);
      const { nodes: flowNodes, edges: flowEdges } = workflowToFlow(wf);
      setNodes(flowNodes);
      setEdges(flowEdges);
      setCurrentWorkflowId(id);
      showToast(`Loaded workflow: ${wf.name}`, "success");
  };

  // --- Render ---

  // Get current node for editor
  const selectedNodeData = useMemo(() => {
      if (!selectedNodeId) return null;
      const node = nodes.find(n => n.id === selectedNodeId);
      return node ? { ...node.data, name: node.id } as NodeDefinition : null;
  }, [selectedNodeId, nodes]);

  const availableCreds = useMemo(() => {
      return [...credentials]; // Could merge with local creds if we had them
  }, [credentials]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Header Toolbar */}
      <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 font-bold text-lg tracking-tight">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <LayoutDashboard size={20} />
             </div>
             G-Flow
          </div>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
          
          <div className="flex items-center gap-1">
             <button 
                onClick={handleLayout}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title="Auto Layout"
             >
                <Box size={18} />
             </button>
             <button 
                onClick={() => setWorkflowListOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title="Open Workflow"
             >
                <FolderOpen size={18} />
             </button>
             <button 
                onClick={handleSaveWorkflow}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title={user ? "Save to Cloud" : "Login to Save"}
             >
                {user ? <Save size={18} /> : <Upload size={18} />}
             </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <button 
              onClick={() => handleRunWorkflow('run')}
              disabled={executionState.isRunning && !executionState.isPaused && !executionState.waitingForInput}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm ${
                  executionState.isRunning && !executionState.waitingForInput
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
           >
              <Play size={14} className={executionState.isRunning ? "animate-pulse" : "fill-current"} /> 
              {executionState.isRunning ? 'Running...' : 'Run Workflow'}
           </button>

           <button 
              onClick={() => handleRunWorkflow('step')}
              disabled={executionState.isRunning}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm border ${
                  executionState.isRunning 
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800' 
                  : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-slate-700'
              }`}
              title="Step Run (Debug)"
           >
              <StepForward size={14} /> 
           </button>

           <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

           <button 
                onClick={() => setSecretsManagerOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
           >
                <Key size={14} /> Secrets
           </button>

           <button 
                onClick={() => setConfigModalOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                title="Global Config"
           >
                <Settings size={18} />
           </button>

           <button 
                onClick={() => setCopilotOpen(true)}
                className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full shadow-md transition-all text-xs font-bold"
           >
                <Sparkles size={14} /> Copilot
           </button>

           {user ? (
               <button onClick={() => setUserProfileOpen(true)} className="ml-2">
                   <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs border border-blue-200 dark:border-blue-800">
                       {user.username.substring(0, 2).toUpperCase()}
                   </div>
               </button>
           ) : (
               <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="ml-2 p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  title="Login"
               >
                   <UserCircle size={22} />
               </button>
           )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-950/50" ref={reactFlowWrapper}>
           <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onEdgeClick={handleEdgeClick}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-right"
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{ type: 'default', animated: true }}
           >
              <Background gap={15} size={1} color="#cbd5e1" className="dark:opacity-20" />
              <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md" />
              <Panel position="bottom-left" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400">
                 {nodes.length} nodes • {edges.length} connections
              </Panel>
              <NodeInfoTooltip />
           </ReactFlow>
           
           {/* Floating Yaml Toggle */}
           <div className="absolute bottom-6 right-6 z-10 flex gap-2">
               <button 
                  onClick={() => setHelpModalOpen(true)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  title="Help"
               >
                   <HelpCircle size={20} />
               </button>
               <button 
                  onClick={() => setShowYamlView(!showYamlView)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg font-bold text-xs transition-all ${
                      showYamlView 
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' 
                      : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
               >
                   {showYamlView ? <Beaker size={16} /> : <FileJson size={16} />}
                   {showYamlView ? 'Visual View' : 'YAML View'}
               </button>
           </div>
           
           {/* Yaml Editor Overlay */}
           {showYamlView && (
               <div className="absolute inset-0 z-20 animate-in slide-in-from-bottom duration-300">
                   <YamlView 
                        yamlContent={yaml.dump(workflowData)} 
                        onUpdate={updateYaml} 
                        notify={showToast}
                   />
               </div>
           )}

           {/* Execution Panel */}
           <ExecutionPanel 
               isOpen={executionPanelOpen} 
               onClose={() => setExecutionPanelOpen(false)}
               state={executionState}
               onNextStep={handleNextStep}
               onResume={handleResume}
               onSubmitInput={handleSubmitInput}
           />
        </div>

        {/* Right Editor Panel */}
        {isRightPanelOpen && selectedNodeData && (
            <div className="w-[400px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-20 flex-shrink-0 animate-in slide-in-from-right duration-300">
                <EditorPanel 
                    selectedNode={selectedNodeData}
                    onClose={() => setIsRightPanelOpen(false)}
                    onSave={handleSaveNode}
                    onDelete={handleDeleteNode}
                    availableCredentials={availableCreds}
                    onOpenSecretsManager={() => setSecretsManagerOpen(true)}
                />
            </div>
        )}
      </div>

      {/* Modals */}
      <ConfigModal 
        isOpen={configModalOpen} 
        onClose={() => setConfigModalOpen(false)} 
        workflow={workflowData}
        onSave={handleConfigSave}
      />
      
      <SecretsManager
         isOpen={secretsManagerOpen}
         onClose={() => setSecretsManagerOpen(false)}
         credentials={credentials}
         onSave={setCredentials}
         onCredentialUpdate={() => {}} // Local update handled by setCredentials
         notify={showToast}
         isServerMode={!!user}
         onServerCreate={user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerUpdate={user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerDelete={user ? (id) => api.deleteSecret(id).then(() => {}) : undefined}
      />

      <AICopilot 
          isOpen={copilotOpen} 
          onClose={() => setCopilotOpen(false)}
          currentYaml={yaml.dump(workflowData)}
          onApplyYaml={updateYaml}
      />
      
      <HelpModal 
          isOpen={helpModalOpen}
          onClose={() => setHelpModalOpen(false)}
      />

      <ConditionModal
          isOpen={conditionModalOpen}
          onClose={() => setConditionModalOpen(false)}
          edge={selectedEdge}
          onSave={handleSaveConnection}
          onDelete={handleDeleteConnection}
      />

      <TestReportModal 
          isOpen={testReportOpen}
          onClose={() => setTestReportOpen(false)}
          report={testReport}
      />

      <WorkflowListModal
          isOpen={workflowListOpen}
          onClose={() => setWorkflowListOpen(false)}
          onLoadWorkflow={handleLoadWorkflow}
          currentWorkflowId={currentWorkflowId}
          notify={showToast}
      />

      <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLogin}
      />

      <UserProfileModal
          isOpen={userProfileOpen}
          onClose={() => setUserProfileOpen(false)}
          user={user}
          onLogout={handleLogout}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

const App = () => (
    <ReactFlowProvider>
        <AppContent />
    </ReactFlowProvider>
);

export default App;