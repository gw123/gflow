
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
  MarkerType
} from 'reactflow';
// CSS is imported in index.html now to prevent ESM loader issues
import yaml from 'js-yaml';
import { Settings, FileJson, Braces, Box, LayoutDashboard, Database, Upload, Download, Key, Sparkles, Play, HelpCircle, Beaker } from 'lucide-react';

import { WorkflowDefinition, NodeDefinition, CredentialItem, WorkflowExecutionState } from './types';
import { workflowToFlow, flowToWorkflow, getLayoutedElements } from './utils';
import { SAMPLE_YAML } from './constants';
import { NODE_TEMPLATES } from './nodes';
import { WorkflowRunner } from './runner';
import { WorkflowTester, TestReport } from './tester';

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

const AppContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowData, setWorkflowData] = useState<WorkflowDefinition>({ name: 'Untitled', nodes: [] });
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); // Closed by default to show drag space
  const [showYamlView, setShowYamlView] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configTab, setConfigTab] = useState<'global'|'storages'|'codes'|'pinData'>('global');
  const [secretsManagerOpen, setSecretsManagerOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  
  // Test & Execution State
  const [executionState, setExecutionState] = useState<WorkflowExecutionState>({ isRunning: false, nodeResults: {}, logs: [] });
  const [executionPanelOpen, setExecutionPanelOpen] = useState(false);
  const [testReportOpen, setTestReportOpen] = useState(false);
  const [testReport, setTestReport] = useState<TestReport | null>(null);

  // Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const { project } = useReactFlow();

  // Ref for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Helper
  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  const closeToast = () => setToast(null);

  // Register Custom Node
  const nodeTypes = useMemo(() => ({
      custom: CustomNode
  }), []);

  // Define default edge styles for the whole graph
  const defaultEdgeOptions = useMemo(() => ({
    type: 'default',
    animated: true,
    style: { strokeWidth: 2, stroke: '#64748b' },
    markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 24,
        height: 24,
        color: '#64748b',
    },
  }), []);

  // Load initial data
  useEffect(() => {
    parseAndLoadYaml(SAMPLE_YAML, true);
  }, []);

  // Apply Execution Status to Nodes
  useEffect(() => {
    setNodes((nds) => nds.map((node) => {
        const result = executionState.nodeResults[node.id];
        // Update data.executionStatus so the CustomNode can render styling
        if (node.data.executionStatus !== result?.status) {
             return {
                 ...node,
                 data: {
                     ...node.data,
                     executionStatus: result ? result.status : undefined
                 }
             };
        }
        return node;
    }));
  }, [executionState, setNodes]);

  const parseAndLoadYaml = (yamlString: string, silent = false) => {
    try {
      const parsed = yaml.load(yamlString) as WorkflowDefinition;
      
      if (!parsed || typeof parsed !== 'object') {
          throw new Error("Invalid YAML format: Root must be an object.");
      }

      // Basic structural validation
      if (!parsed.nodes && !parsed.name) {
          console.warn("YAML might be missing standard fields, but proceeding.");
      }

      setWorkflowData(parsed);
      
      const { nodes: initialNodes, edges: initialEdges } = workflowToFlow(parsed);
      setNodes(initialNodes);
      setEdges(initialEdges);

      // Reset selection, execution state, and UI panels on new load to ensure a clean slate
      setSelectedNodeId(null);
      setSelectedEdge(null);
      setIsRightPanelOpen(false);
      setExecutionState({ isRunning: false, nodeResults: {}, logs: [] });

      if (!silent) {
          notify("Workflow loaded successfully", "success");
      }
      return true;
    } catch (e: any) {
      console.error("Failed to parse YAML", e);
      notify(`Failed to parse YAML: ${e.message || 'Unknown error'}`, "error");
      return false;
    }
  };

  const handleLayout = useCallback(() => {
    try {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      notify("Auto-layout applied", "info");
    } catch (e) {
      notify("Failed to apply layout", "error");
    }
  }, [nodes, edges, setNodes, setEdges, notify]);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ 
        ...params, 
        type: 'default', 
        animated: true,
        style: { strokeWidth: 2 },
        markerEnd: { 
            type: MarkerType.ArrowClosed,
            width: 24,
            height: 24 
        }
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation(); // Prevent triggering onPaneClick
    setSelectedNodeId(node.id);
    setIsRightPanelOpen(true);
    setShowYamlView(false);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setConditionModalOpen(true);
    setSelectedNodeId(null);
    setIsRightPanelOpen(false);
  }, []);
  
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdge(null);
  }, []);

  const handleSaveNode = (updatedNodeData: NodeDefinition) => {
    try {
      // Update the React Flow node data
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === updatedNodeData.name) {
              return {
                  ...node,
                  data: { ...updatedNodeData, label: updatedNodeData.name }
              };
          }
          return node;
        })
      );

      // Update internal workflow data node list
      const updatedNodesList = workflowData.nodes.map(n => n.name === updatedNodeData.name ? updatedNodeData : n);
      setWorkflowData({ ...workflowData, nodes: updatedNodesList });
    } catch (e: any) {
      notify(`Error saving node: ${e.message}`, "error");
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!window.confirm(`Are you sure you want to delete node "${nodeId}"?`)) return;

    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    
    // Remove from workflow data
    setWorkflowData(prev => ({
        ...prev,
        nodes: prev.nodes.filter(n => n.name !== nodeId)
    }));
    
    setSelectedNodeId(null);
    setIsRightPanelOpen(false);
    notify(`Node "${nodeId}" deleted`, "info");
  };

  const handleConditionSave = (edgeId: string, conditions: string[]) => {
      const updatedEdges = edges.map((e) => {
          if (e.id === edgeId) {
              const hasConditions = conditions.length > 0;
              return {
                  ...e,
                  data: { ...e.data, when: hasConditions ? conditions : undefined },
                  label: hasConditions ? 'Condition' : undefined,
                  animated: true,
                  style: hasConditions 
                    ? { stroke: '#eab308', strokeWidth: 2 } 
                    : { stroke: '#64748b', strokeWidth: 2 },
                  markerEnd: {
                      type: MarkerType.ArrowClosed,
                      width: 24,
                      height: 24,
                      color: hasConditions ? '#eab308' : '#64748b',
                  }
              };
          }
          return e;
      });
      
      setEdges(updatedEdges);
      setConditionModalOpen(false);
      
      // Sync to workflow structure
      const newWorkflow = flowToWorkflow(workflowData, nodes, updatedEdges);
      setWorkflowData(newWorkflow);
      
      notify("Connection updated", "success");
  };

  const handleEdgeDelete = (edgeId: string) => {
      if (!window.confirm("Are you sure you want to delete this connection?")) return;

      const updatedEdges = edges.filter(e => e.id !== edgeId);
      setEdges(updatedEdges);
      setConditionModalOpen(false);
      
      const newWorkflow = flowToWorkflow(workflowData, nodes, updatedEdges);
      setWorkflowData(newWorkflow);
      
      notify("Connection removed", "info");
  };

  const handleConfigSave = (partialUpdate: Partial<WorkflowDefinition>) => {
    setWorkflowData(prev => ({ ...prev, ...partialUpdate }));
  };

  // Credential synchronization
  const handleCredentialsSave = (updatedCredentials: CredentialItem[]) => {
    setWorkflowData(prev => ({ ...prev, credentials: updatedCredentials }));
  };

  const handleCredentialSync = (updatedItem: CredentialItem) => {
     const nodesToUpdate: NodeDefinition[] = [];
     
     const updatedNodes = nodes.map(node => {
        const data = node.data as NodeDefinition;
        // Loose equality check for IDs (string vs number issues from YAML)
        if (data.secret && String(data.secret.secret_id) === String(updatedItem.id)) {
           const updatedData = { 
               ...data, 
               secret: { 
                   secret_id: updatedItem.id,
                   secret_name: updatedItem.name,
                   secret_type: updatedItem.type
               }
           };
           nodesToUpdate.push(updatedData);
           return { ...node, data: updatedData };
        }
        return node;
     });

     if (nodesToUpdate.length > 0) {
        setNodes(updatedNodes);
        setWorkflowData(prev => ({
           ...prev,
           nodes: prev.nodes.map(n => {
              const match = nodesToUpdate.find(u => u.name === n.name);
              return match || n;
           })
        }));
        notify(`Updated ${nodesToUpdate.length} nodes linked to "${updatedItem.name}"`, "success");
     }
  };

  // Drag and Drop Handlers
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Handle File Drop (Import YAML)
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) parseAndLoadYaml(content);
            };
            reader.readAsText(file);
            return;
        } else {
            notify("Please drop a valid .yaml or .yml file", "error");
            return;
        }
      }

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const template = NODE_TEMPLATES[type];
      if (!template) {
          notify(`Template for type "${type}" not found.`, "error");
          return;
      }

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      
      if (!reactFlowBounds) return;

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      let name = type;
      let counter = 1;
      while (nodes.some(n => n.id === name)) {
          name = `${type}_${counter}`;
          counter++;
      }

      const newNodeDefinition: NodeDefinition = {
          name: name,
          type: type,
          parameters: JSON.parse(JSON.stringify(template.parameters || {})),
          global: JSON.parse(JSON.stringify(template.global || {})),
          credentials: template.credentials ? JSON.parse(JSON.stringify(template.credentials)) : undefined,
          credentialType: template.credentialType, 
      };

      const newNode: Node = {
        id: name,
        type: 'custom', // Changed from 'default' to 'custom'
        position,
        data: { label: name, ...newNodeDefinition },
      };

      setNodes((nds) => nds.concat(newNode));
      
      setWorkflowData(prev => ({
          ...prev,
          nodes: [...prev.nodes, newNodeDefinition]
      }));
      
      setSelectedNodeId(name);
      setIsRightPanelOpen(true);
      notify(`Node "${name}" added`, "success");
    },
    [project, nodes, setNodes, notify]
  );

  const currentYamlString = useMemo(() => {
    try {
      const currentFlowStruct = flowToWorkflow(workflowData, nodes, edges);
      return yaml.dump(currentFlowStruct, {
        lineWidth: -1, 
        noRefs: true,
      });
    } catch (e) {
      return "# Error generating YAML";
    }
  }, [nodes, edges, workflowData]);

  const handleYamlUpdate = (newYaml: string) => {
    return parseAndLoadYaml(newYaml);
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
          const content = e.target?.result as string;
          parseAndLoadYaml(content);
      } catch(err) {
          notify("Failed to read file content", "error");
      }
    };
    reader.onerror = () => {
        notify("Error reading file", "error");
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportClick = () => {
    try {
      if (currentYamlString.startsWith("# Error")) {
          throw new Error("Invalid YAML state. Cannot export.");
      }
      const blob = new Blob([currentYamlString], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflowData.name || 'workflow'}.yaml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify("Workflow exported successfully", "success");
    } catch (e: any) {
      notify(`Export failed: ${e.message}`, "error");
    }
  };

  const handleTestWorkflow = () => {
      const currentFlowStruct = flowToWorkflow(workflowData, nodes, edges);
      const tester = new WorkflowTester(currentFlowStruct);
      const report = tester.runTest();
      setTestReport(report);
      setTestReportOpen(true);
  };

  const handleRunWorkflow = async () => {
    // Sync current nodes/edges to workflowData first to ensure latest graph
    const currentFlowStruct = flowToWorkflow(workflowData, nodes, edges);
    
    const runner = new WorkflowRunner(currentFlowStruct, (newState) => {
        setExecutionState(newState);
    });
    
    setExecutionPanelOpen(true);
    await runner.execute();
  };

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find(n => n.id === selectedNodeId);
    return node ? (node.data as NodeDefinition) : null;
  }, [selectedNodeId, nodes]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shadow-md z-20 relative">
        {/* Left: Branding */}
        <div className="flex items-center gap-3 min-w-[200px]">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/20">
                <Box size={22} className="stroke-[2.5]" />
            </div>
            <div className="hidden md:block">
                <h1 className="font-bold text-lg leading-tight text-slate-100 tracking-tight">
                  {workflowData.name || 'Workflow Editor'}
                </h1>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Visual Editor</p>
            </div>
        </div>

        {/* Right: Tools & Actions */}
        <div className="flex items-center gap-1.5">
            
            {/* Configuration Group */}
            <div className="flex items-center bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 mr-2">
              <button 
                  onClick={() => setSecretsManagerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="Secrets"
              >
                  <Key size={14} className="text-amber-400" /> <span className="hidden xl:inline">Secrets</span>
              </button>
              <button 
                  onClick={() => { setConfigTab('storages'); setConfigModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="Storages"
              >
                  <Database size={14} className="text-blue-400" /> <span className="hidden xl:inline">Storages</span>
              </button>
              <button 
                  onClick={() => { setConfigTab('codes'); setConfigModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="Codes"
              >
                  <Braces size={14} className="text-purple-400" /> <span className="hidden xl:inline">Codes</span>
              </button>
              <button 
                  onClick={() => { setConfigTab('global'); setConfigModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                  title="Global"
              >
                  <Settings size={14} className="text-slate-400" /> <span className="hidden xl:inline">Global</span>
              </button>
            </div>

            {/* Action: Test */}
             <button 
                onClick={handleTestWorkflow}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                title="Test Configuration"
            >
                <Beaker size={16} />
                <span className="hidden lg:inline">Test</span>
            </button>

            {/* Primary Action: Run */}
            <div>
                 <button 
                    onClick={handleRunWorkflow}
                    className={`group relative flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 shadow-lg ${
                      executionState.isRunning 
                      ? 'bg-slate-800 text-blue-400 ring-1 ring-blue-500/50 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/20 hover:shadow-green-600/30 hover:-translate-y-0.5'
                    }`}
                    disabled={executionState.isRunning}
                >
                    <Play size={16} className={`${executionState.isRunning ? "animate-spin" : "fill-current"}`} />
                    <span className="hidden lg:inline">{executionState.isRunning ? 'Running...' : 'Run Workflow'}</span>
                    <span className="inline lg:hidden">{executionState.isRunning ? '...' : 'Run'}</span>
                    
                    {!executionState.isRunning && (
                      <span className="absolute inset-0 rounded-full ring-1 ring-white/20 group-hover:ring-white/40 transition-all"></span>
                    )}
                </button>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            
            {/* Layout */}
             <button 
                onClick={handleLayout}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors relative group"
                title="Auto Layout"
            >
                <LayoutDashboard size={18} />
            </button>
            
            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>
            
            {/* File Actions */}
            <input 
                type="file" 
                ref={fileInputRef}
                accept=".yaml,.yml"
                className="hidden" 
                onChange={handleFileChange} 
            />
            <div className="flex gap-1">
              <button 
                  onClick={handleImportClick}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Import YAML"
              >
                  <Upload size={18} />
              </button>
              
              <button 
                  onClick={handleExportClick}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Export YAML"
              >
                  <Download size={18} />
              </button>

              <button 
                  onClick={() => { setShowYamlView(!showYamlView); setIsRightPanelOpen(!showYamlView ? false : true); }}
                  className={`p-2 rounded-md transition-colors ${showYamlView ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                  title="Toggle YAML View"
              >
                  <FileJson size={18} />
              </button>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>

            {/* Help Button */}
            <button 
                onClick={() => setHelpModalOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Help & Instructions"
            >
                <HelpCircle size={18} />
            </button>

            <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>

            {/* AI Copilot */}
            <button 
                onClick={() => setCopilotOpen(!copilotOpen)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full shadow-sm transition-all border ${
                  copilotOpen 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/30' 
                  : 'bg-slate-800 text-indigo-300 border-slate-700 hover:border-indigo-500/50 hover:text-white hover:bg-slate-700'
                }`}
            >
                <Sparkles size={16} className={copilotOpen ? "text-yellow-300" : "text-indigo-400"} />
                <span className="hidden lg:inline">Copilot</span>
            </button>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar />

        {/* Canvas / Center Area */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 z-0" ref={reactFlowWrapper} onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onEdgeClick={onEdgeClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background gap={16} size={1} color="#cbd5e1" />
              <Controls className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-sm" />
              <Panel position="bottom-left" className="!m-4">
                  <div className="text-[10px] text-slate-400 bg-white/50 dark:bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm border border-slate-200 dark:border-slate-800">
                      {nodes.length} Nodes • {edges.length} Connections
                  </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Yaml View Overlay */}
          {showYamlView && (
             <div className="absolute inset-0 z-10 animate-in slide-in-from-right-10 duration-200">
                <YamlView 
                    yamlContent={currentYamlString} 
                    onUpdate={handleYamlUpdate} 
                    notify={notify}
                />
             </div>
          )}

          {/* Execution Panel Overlay */}
          <ExecutionPanel 
              isOpen={executionPanelOpen} 
              onClose={() => setExecutionPanelOpen(false)}
              state={executionState}
          />

          {/* Node Hover Info Tooltip */}
          <NodeInfoTooltip />
        </div>

        {/* Right Panel (Editor) */}
        {isRightPanelOpen && (
          <div className="w-[400px] flex-shrink-0 z-10 transition-all duration-300 ease-in-out shadow-2xl relative">
            <EditorPanel
              selectedNode={selectedNodeData}
              onClose={() => {
                  setSelectedNodeId(null);
                  setIsRightPanelOpen(false);
              }}
              onSave={handleSaveNode}
              onDelete={handleDeleteNode}
              availableCredentials={workflowData.credentials}
              onOpenSecretsManager={() => setSecretsManagerOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      <ConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        workflow={workflowData}
        onSave={handleConfigSave}
        initialTab={configTab}
      />

      <SecretsManager
        isOpen={secretsManagerOpen}
        onClose={() => setSecretsManagerOpen(false)}
        credentials={workflowData.credentials || []}
        onSave={handleCredentialsSave}
        onCredentialUpdate={handleCredentialSync}
        notify={notify}
      />
      
      <AICopilot 
         isOpen={copilotOpen}
         onClose={() => setCopilotOpen(false)}
         currentYaml={currentYamlString}
         onApplyYaml={handleYamlUpdate}
      />
      
      <HelpModal 
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      <ConditionModal
        isOpen={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        edge={selectedEdge}
        onSave={handleConditionSave}
        onDelete={handleEdgeDelete}
      />

      <TestReportModal 
         isOpen={testReportOpen}
         onClose={() => setTestReportOpen(false)}
         report={testReport}
      />

      {/* Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
};

const App: React.FC = () => (
  <ReactFlowProvider>
    <AppContent />
  </ReactFlowProvider>
);

export default App;
