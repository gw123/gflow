
import { WorkflowDefinition, NodeDefinition, WorkflowExecutionState, NodeExecutionResult } from '../core/types';

// Messages sent FROM Main Thread TO Worker
export type MainMessage = 
  | { type: 'INIT'; workflow: WorkflowDefinition; initialState?: Partial<WorkflowExecutionState> }
  | { type: 'EXECUTE'; mode: 'run' | 'step' }
  | { type: 'NEXT_STEP' }
  | { type: 'RESUME' }
  | { type: 'SUBMIT_INPUT'; data: any }
  | { type: 'UI_NODE_RESULT'; nodeName: string; result: Partial<NodeExecutionResult> };

// Messages sent FROM Worker TO Main Thread
export type WorkerMessage = 
  | { type: 'STATE_UPDATE'; state: WorkflowExecutionState }
  | { type: 'REQUEST_UI_EXECUTION'; node: NodeDefinition; contextData: any }
  | { type: 'LOG'; message: string };
