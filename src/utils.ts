
import { Edge, Node, Position, MarkerType } from 'reactflow';
import * as dagre from 'dagre';
import { WorkflowDefinition, NodeDefinition, WorkflowConnections } from './types';
import { glog } from './core/Logger';

// Constants for Layout
export const NODE_WIDTH = 240; 
export const NODE_HEIGHT = 100; // Increased height for custom node

/**
 * Auto-layout the graph using Dagre
 * robustly handling different import types for dagre
 */
export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  try {
    // @ts-ignore - Handle potential default export inconsistency in CDN
    const dagreLib = dagre.default || dagre;
    const dagreGraph = new dagreLib.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagreLib.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      // Set handle positions based on direction
      node.targetPosition = isHorizontal ? Position.Left : Position.Top;
      node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

      // Shift position to match React Flow anchor (top-left) vs Dagre (center)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    glog.error("Layout calculation failed:", error);
    // Fallback: return original nodes if dagre fails
    return { nodes, edges };
  }
};

/**
 * Convert the custom YAML JSON structure to React Flow Nodes and Edges
 */
export const workflowToFlow = (workflow: WorkflowDefinition) => {
  // Default to LR layout logic for initial load
  const nodes: Node[] = (workflow.nodes || []).map((node) => ({
    id: node.name,
    type: 'custom', // Changed from 'default' to 'custom'
    data: { label: node.name, ...node }, 
    position: { x: 0, y: 0 }, 
    targetPosition: Position.Left,
    sourcePosition: Position.Right,
  }));

  const edges: Edge[] = [];

  if (workflow.connections) {
    Object.entries(workflow.connections).forEach(([sourceId, connectionGroups]) => {
      if (Array.isArray(connectionGroups)) {
        connectionGroups.forEach((group) => {
          if (Array.isArray(group)) {
            group.forEach((conn) => {
              edges.push({
                id: `e-${sourceId}-${conn.node}-${Math.random()}`,
                source: sourceId,
                target: conn.node,
                type: 'default', // Smoother looking edge for workflows
                animated: true,
                label: conn.when ? 'Condition' : undefined,
                data: { when: conn.when },
                style: conn.when ? { stroke: '#eab308', strokeWidth: 2 } : { stroke: '#64748b', strokeWidth: 2 }, 
                markerEnd: {
                    type: MarkerType.ArrowClosed, 
                    color: conn.when ? '#eab308' : '#64748b',
                    width: 24,
                    height: 24,
                }
              });
            });
          }
        });
      }
    });
  }

  return getLayoutedElements(nodes, edges, 'LR');
};

/**
 * Convert React Flow Nodes/Edges back to the specific YAML JSON structure
 */
export const flowToWorkflow = (
  currentWorkflow: WorkflowDefinition,
  nodes: Node[],
  edges: Edge[]
): WorkflowDefinition => {
  // Update Nodes list
  const updatedNodes: NodeDefinition[] = nodes.map((n) => {
    // Extract original data, excluding React Flow specific fields
    const { label, executionStatus, ...restData } = n.data;
    return {
      ...restData,
      name: n.id, // Ensure ID matches name
    };
  });

  // Reconstruct Connections
  const newConnections: WorkflowConnections = {};

  edges.forEach((edge) => {
    const source = edge.source;
    const target = edge.target;
    const when = edge.data?.when;

    if (!newConnections[source]) {
      newConnections[source] = [];
    }

    // Reconstruct structure `Source: [[{node: Target}]]`
    newConnections[source].push([{ node: target, when }]);
  });

  return {
    ...currentWorkflow,
    nodes: updatedNodes,
    connections: newConnections,
  };
};
