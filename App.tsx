
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
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
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import yaml from 'js-yaml';
import { FileJson, HelpCircle, Beaker } from 'lucide-react';

import { WorkflowDefinition, NodeDefinition } from './types';
import { workflowToFlow, flowToWorkflow } from './utils';
import { SAMPLE_YAML } from './constants';
import { NODE_TEMPLATES } from './nodes';
import { WorkflowRunner } from './runner';
import { WorkflowTester } from './tester';
import { api } from './api/client';

import EditorPanel from './components/EditorPanel';
import YamlView from './components/YamlView';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import NodeInfoTooltip from './components/NodeInfoTooltip';
import ExecutionPanel from './components/ExecutionPanel';
import CustomNode from './components/CustomNode';

import { HeaderToolbar } from './components/HeaderToolbar';
import { ModalsManager } from './components/ModalsManager';

// Import Stores
import { useUIStore, useUserStore, useWorkflowStore, useExecutionStore } from './stores';

const AppContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  
  // Stores
  const ui = useUIStore();
  const userStore = useUserStore();
  const wfStore = useWorkflowStore();
  const execStore = useExecutionStore();

  const runnerRef = useRef<WorkflowRunner | null>(null);

  // Sync React Flow Internal State with Store
  // We allow ReactFlow to handle interactions, but we sync changes back to store
  const onNodesChange = useCallback(
    (changes: any) => {
        const nextNodes = applyNodeChanges(changes, wfStore.nodes);
        wfStore.setNodes(nextNodes);
        
        // If drag ended, update workflow data structure
        if (changes.some((c: any) => c.type === 'position' && !c.dragging)) {
             const newWf = flowToWorkflow(wfStore.workflowData, nextNodes, wfStore.edges);
             wfStore.updateWorkflowData(newWf);
        }
    },
    [wfStore]
  );

  const onEdgesChange = useCallback(
    (changes: any) => {
        const nextEdges = applyEdgeChanges(changes, wfStore.edges);
        wfStore.setEdges(nextEdges);
        const newWf = flowToWorkflow(wfStore.workflowData, wfStore.nodes, nextEdges);
        wfStore.updateWorkflowData(newWf);
    },
    [wfStore]
  );

  const onConnect = useCallback((params: Connection) => {
      wfStore.onConnect(params);
  }, [wfStore]);

  // --- Initialization ---

  useEffect(() => {
    // Initial Load
    try {
      const parsed = yaml.load(SAMPLE_YAML) as WorkflowDefinition;
      wfStore.loadWorkflow(parsed);
    } catch (e) {
      console.error("Failed to parse initial sample YAML", e);
    }

    // Check Auth
    api.getMe().then(userStore.setUser).catch(() => {}); 
  }, []); // Run once

  // --- Handlers ---

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    ui.setSelectedNodeId(node.id);
  }, [ui]);
  
  const handlePaneClick = useCallback(() => {
    ui.setSelectedNodeId(null);
    ui.setSelectedEdge(null);
    ui.setPanelOpen('isRightPanelOpen', false);
  }, [ui]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
      ui.setSelectedEdge(edge);
  }, [ui]);

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

      const newNodes = wfStore.nodes.concat(newNode);
      wfStore.setNodes(newNodes);
      const newData = flowToWorkflow(wfStore.workflowData, newNodes, wfStore.edges);
      wfStore.updateWorkflowData(newData); // This also layouts if needed, or we just set data
    },
    [project, wfStore]
  );

  const updateYaml = (newContent: string): boolean => {
    return wfStore.setWorkflowFromYaml(newContent);
  };

  // --- Execution Logic ---
  // We keep the runner instantiation here as it holds 'runtime' class state not suitable for plain JSON store
  
  const handleRunNode = async (nodeName: string) => {
     if (!runnerRef.current) {
         const currentData = flowToWorkflow(wfStore.workflowData, wfStore.nodes, wfStore.edges);
         const runner = new WorkflowRunner(currentData, (state) => {
             // Optional: Update execution store for single node run visualization?
             // execStore.setExecutionState(state);
         });
         await runner.executeNode(nodeName); 
     } else {
         await runnerRef.current.executeNode(nodeName);
     }
  };

  const handleNextStep = () => runnerRef.current?.nextStep();
  const handleResume = () => runnerRef.current?.resume();
  const handleSubmitInput = (data: any) => runnerRef.current?.submitInput(data);

  const handleRunWorkflow = async (mode: 'run' | 'step' = 'run') => {
    if (execStore.executionState.isRunning && !execStore.executionState.isPaused && !execStore.executionState.waitingForInput) {
        ui.showToast("Workflow is already running", "info");
        return;
    }

    const currentData = flowToWorkflow(wfStore.workflowData, wfStore.nodes, wfStore.edges);
    
    // Validation
    const tester = new WorkflowTester(currentData);
    const report = tester.runTest();
    if (!report.isValid) {
        ui.setTestReport(report);
        ui.setModalOpen('testReportOpen', true);
        ui.showToast("Validation failed. Check report.", "error");
        return;
    }

    ui.setPanelOpen('executionPanelOpen', true);
    
    if (execStore.runMode === 'cloud') {
        if (!userStore.user) {
            ui.showToast("Login required for cloud execution", "error");
            ui.setModalOpen('authModalOpen', true);
            return;
        }

        execStore.setExecutionState({
            ...execStore.executionState,
            isRunning: true, 
            isPaused: false, 
            waitingForInput: false,
            logs: ["Submitting to server..."] 
        });

        try {
            const response = await api.executeWorkflow(currentData, wfStore.currentWorkflowId || undefined);
            execStore.setExecutionState({
                isRunning: false,
                isPaused: false,
                waitingForInput: false,
                nodeResults: response.results,
                logs: response.logs
            });
            // Update node status visuals
            updateNodeStatuses(response.results);

        } catch (e: any) {
            execStore.updateExecutionState({
                isRunning: false,
                logs: [...execStore.executionState.logs, `Server Error: ${e.message}`]
            });
            ui.showToast("Server execution failed", "error");
        }

    } else {
        const previousResults = execStore.executionState.nodeResults;
        const runner = new WorkflowRunner(currentData, (state) => {
            updateNodeStatuses(state.nodeResults);
            execStore.setExecutionState(state);
        }, previousResults);

        runnerRef.current = runner;
        execStore.setExecutionState({ ...runner.state, isRunning: true });
        
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

  const updateNodeStatuses = (results: any) => {
      const newNodes = wfStore.nodes.map(n => {
          const res = results[n.id];
          if (res) {
              return { ...n, data: { ...n.data, executionStatus: res.status } };
          }
          return { ...n, data: { ...n.data, executionStatus: undefined } };
      });
      wfStore.setNodes(newNodes);
  };

  // --- Render ---

  const selectedNodeData = useMemo(() => {
      if (!ui.selectedNodeId) return null;
      const node = wfStore.nodes.find(n => n.id === ui.selectedNodeId);
      return node ? { ...node.data, name: node.id } as NodeDefinition : null;
  }, [ui.selectedNodeId, wfStore.nodes]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Header Toolbar - Now leaner, gets state from Store */}
      <HeaderToolbar onRunWorkflow={handleRunWorkflow} />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar />

        {/* Canvas Area */}
        <div className="flex-1 relative bg-slate-50 dark:bg-slate-950/50" ref={reactFlowWrapper}>
           <ReactFlow
              nodes={wfStore.nodes}
              edges={wfStore.edges}
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
                 {wfStore.nodes.length} nodes • {wfStore.edges.length} connections
              </Panel>
              <NodeInfoTooltip />
           </ReactFlow>
           
           {/* Floating Yaml Toggle */}
           <div className="absolute bottom-6 right-6 z-10 flex gap-2">
               <button 
                  onClick={() => ui.setModalOpen('helpModalOpen', true)}
                  className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                  title="Help"
               >
                   <HelpCircle size={20} />
               </button>
               <button 
                  onClick={() => ui.setPanelOpen('showYamlView', !ui.showYamlView)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg font-bold text-xs transition-all ${
                      ui.showYamlView 
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' 
                      : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
               >
                   {ui.showYamlView ? <Beaker size={16} /> : <FileJson size={16} />}
                   {ui.showYamlView ? 'Visual View' : 'YAML View'}
               </button>
           </div>
           
           {/* Yaml Editor Overlay */}
           {ui.showYamlView && (
               <div className="absolute inset-0 z-20 animate-in slide-in-from-bottom duration-300">
                   <YamlView 
                        yamlContent={yaml.dump(wfStore.workflowData)} 
                        onUpdate={updateYaml} 
                        notify={ui.showToast}
                   />
               </div>
           )}

           {/* Execution Panel */}
           <ExecutionPanel 
               onNextStep={handleNextStep}
               onResume={handleResume}
               onSubmitInput={handleSubmitInput}
           />
        </div>

        {/* Right Editor Panel */}
        {ui.isRightPanelOpen && selectedNodeData && (
            <div className="w-[450px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-20 flex-shrink-0 animate-in slide-in-from-right duration-300">
                <EditorPanel 
                    selectedNode={selectedNodeData}
                    onRunNode={() => handleRunNode(selectedNodeData.name)}
                />
            </div>
        )}
      </div>

      {/* Centralized Modals Manager - Now pure composition without logic */}
      <ModalsManager />

      {/* Toast Notifications */}
      {ui.toast && (
        <Toast 
            message={ui.toast.message} 
            type={ui.toast.type} 
            onClose={() => ui.showToast('', 'info') /* Hacky clear, store handles null */} 
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
