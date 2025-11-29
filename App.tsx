
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
  Beaker, Save, FolderOpen, UserCircle, LogIn, StepForward, LogOut, Cloud, Laptop, Globe
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
import ApiManager from './components/ApiManager';

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
  const [apiManagerOpen, setApiManagerOpen] = useState(false);
  
  // Auth & Server State
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);

  // Execution State
  const [executionPanelOpen, setExecutionPanelOpen] = useState(false);
  const [runMode, setRunMode] = useState<'local' | 'cloud'>('local');
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
           // Local mode secrets
       }
    }
  }, [secretsManagerOpen, user]);

  // --- Handlers ---

  const showToast = (message: string, type: 'success'|'error'|'info') => {
    setToast({ message, type });
  };

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdge(null);
    setIsRightPanelOpen(true);
    // Execute single node handling: handled by Editor Panel actions
  }, []);
  
  const handleRunNode = async (nodeName: string) => {
     if (!runnerRef.current) {
         // Create a temporary runner just for this op context
         const currentData = flowToWorkflow(workflowData, nodes, edges);
         const runner = new WorkflowRunner(currentData, (state) => {
             // We don't update full execution UI for single node runs usually,
             // but here we can partial update if needed.
         });
         // This is a bit complex without refactoring Runner to be stateless.
         // For now, let's assume global runner is fine or create on fly.
         await runner.executeNode(nodeName); 
         // Update UI logs?
     } else {
         await runnerRef.current.executeNode(nodeName);
     }
  };
  
  const handlePinNode = (nodeName: string) => {
      setWorkflowData(prev => {
         const newPin = { ...(prev.pinData || {}) };
         // Toggle: if exists remove, else add from current execution if avail
         if (newPin[nodeName]) {
             delete newPin[nodeName];
             showToast(`Unpinned data for ${nodeName}`, "info");
         } else {
             const result = executionState.nodeResults[nodeName]?.output;
             if (result) {
                 newPin[nodeName] = result;
                 showToast(`Pinned data for ${nodeName}`, "success");
             } else {
                 showToast("No execution data available to pin", "error");
                 return prev;
             }
         }
         return { ...prev, pinData: newPin };
      });
  };

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdge(null);
    setIsRightPanelOpen(false);
  }, []);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge);
      setConditionModalOpen(true);
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
        ...params, 
        type: 'default', 
        animated: true, 
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#64748b' }
    }, eds));
    
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
            name: template.name, 
            ...template 
        },
      };

      setNodes((nds) => {
          const newNodes = nds.concat(newNode);
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
            return {
                ...node,
                id: updatedNode.name, 
                data: { ...node.data, ...updatedNode },
            };
        }
        return node;
      })
    );
    
    setWorkflowData(prev => {
        const updatedNodes = prev.nodes.map(n => n.name === selectedNodeId ? updatedNode : n);
        
        if (updatedNode.name !== selectedNodeId) {
             const newConns = { ...prev.connections };
             if (selectedNodeId && newConns[selectedNodeId]) {
                 newConns[updatedNode.name] = newConns[selectedNodeId];
                 delete newConns[selectedNodeId];
             }
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

    const currentData = flowToWorkflow(workflowData, nodes, edges);
    
    // Validation
    const tester = new WorkflowTester(currentData);
    const report = tester.runTest();
    if (!report.isValid) {
        setTestReport(report);
        setTestReportOpen(true);
        showToast("Validation failed. Check report.", "error");
        return;
    }

    setExecutionPanelOpen(true);
    
    if (runMode === 'cloud') {
        // --- Server Side Execution ---
        if (!user) {
            showToast("Login required for cloud execution", "error");
            setAuthModalOpen(true);
            return;
        }

        setExecutionState(prev => ({ 
            ...prev, 
            isRunning: true, 
            isPaused: false, 
            waitingForInput: false,
            logs: ["Submitting to server..."] 
        }));

        try {
            const response = await api.executeWorkflow(currentData, currentWorkflowId || undefined);
            
            // Map server results to local state format
            setExecutionState({
                isRunning: false,
                isPaused: false,
                waitingForInput: false,
                nodeResults: response.results,
                logs: response.logs
            });
            
            // Sync status visual
            setNodes(nds => nds.map(n => {
                const res = response.results[n.id];
                if (res) {
                    return { ...n, data: { ...n.data, executionStatus: res.status } };
                }
                return { ...n, data: { ...n.data, executionStatus: undefined } };
            }));

        } catch (e: any) {
            setExecutionState(prev => ({
                ...prev,
                isRunning: false,
                logs: [...prev.logs, `Server Error: ${e.message}`]
            }));
            showToast("Server execution failed", "error");
        }

    } else {
        // --- Browser Side Execution ---
        
        // Preserve previous results to allow partial re-runs or single node runs to build up
        const previousResults = executionState.nodeResults;
        
        const runner = new WorkflowRunner(currentData, (state) => {
            setNodes(nds => nds.map(n => {
                const res = state.nodeResults[n.id];
                if (res) {
                    return { ...n, data: { ...n.data, executionStatus: res.status } };
                }
                return { ...n, data: { ...n.data, executionStatus: undefined } };
            }));
            setExecutionState(state);
        }, previousResults);

        runnerRef.current = runner;
        setExecutionState({ ...runner['state'], isRunning: true });
        
        try {
            await runner.execute(mode);
        } catch (e) {
            console.error(e);
        } finally {
            if (!runner.state.waitingForInput && !runner.state.isPaused) {
                runnerRef.current = null;
            }
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
      setCredentials([]);
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

  const selectedNodeData = useMemo(() => {
      if (!selectedNodeId) return null;
      const node = nodes.find(n => n.id === selectedNodeId);
      return node ? { ...node.data, name: node.id } as NodeDefinition : null;
  }, [selectedNodeId, nodes]);

  const availableCreds = useMemo(() => {
      return [...credentials];
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
           {/* Run Mode Switch */}
           <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 border border-slate-200 dark:border-slate-700 mr-2">
               <button 
                  onClick={() => setRunMode('local')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${runMode === 'local' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
               >
                   <Laptop size={12} /> Local
               </button>
               <button 
                  onClick={() => setRunMode('cloud')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${runMode === 'cloud' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
               >
                   <Cloud size={12} /> Cloud
               </button>
           </div>

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
              {executionState.isRunning ? 'Running...' : `Run (${runMode})`}
           </button>

           <button 
              onClick={() => handleRunWorkflow('step')}
              disabled={executionState.isRunning || runMode === 'cloud'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-sm border ${
                  (executionState.isRunning || runMode === 'cloud')
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-900 dark:border-slate-800' 
                  : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 dark:bg-slate-800 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-slate-700'
              }`}
              title="Step Run (Debug Local)"
           >
              <StepForward size={14} /> 
           </button>

           <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

           <button 
                onClick={() => setApiManagerOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                title="API Manager"
           >
                <Globe size={14} /> APIs
           </button>

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
            <div className="w-[450px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-20 flex-shrink-0 animate-in slide-in-from-right duration-300">
                <EditorPanel 
                    selectedNode={selectedNodeData}
                    onClose={() => setIsRightPanelOpen(false)}
                    onSave={handleSaveNode}
                    onDelete={handleDeleteNode}
                    availableCredentials={availableCreds}
                    onOpenSecretsManager={() => setSecretsManagerOpen(true)}
                    executionState={executionState}
                    workflowData={workflowData}
                    // Pass Single Node execution handlers
                    onRunNode={() => handleRunNode(selectedNodeData.name)}
                    onPinData={() => handlePinNode(selectedNodeData.name)}
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
         onCredentialUpdate={() => {}}
         notify={showToast}
         isServerMode={!!user}
         onServerCreate={user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerUpdate={user ? (s) => api.saveSecret(s).then(() => {}) : undefined}
         onServerDelete={user ? (id) => api.deleteSecret(id).then(() => {}) : undefined}
      />

      <ApiManager 
          isOpen={apiManagerOpen} 
          onClose={() => setApiManagerOpen(false)} 
          notify={showToast} 
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
