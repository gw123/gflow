
import { WorkflowDefinition, NodeDefinition } from './types';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface TestIssue {
  id: string;
  nodeName?: string;
  severity: IssueSeverity;
  message: string;
  category: 'connectivity' | 'configuration' | 'variable' | 'security';
}

export interface SimulationStep {
  order: number;
  nodeName: string;
  status: 'reachable' | 'conditional' | 'unreachable';
  note?: string;
}

export interface TestReport {
  isValid: boolean;
  issues: TestIssue[];
  simulation: SimulationStep[];
  summary: {
    totalNodes: number;
    criticalCount: number;
    warningCount: number;
  };
}

export class WorkflowTester {
  private workflow: WorkflowDefinition;

  constructor(workflow: WorkflowDefinition) {
    this.workflow = workflow;
  }

  public runTest(): TestReport {
    const issues: TestIssue[] = [];
    
    // 1. Connectivity Analysis
    this.checkConnectivity(issues);

    // 2. Configuration & Variable Analysis
    this.checkConfiguration(issues);

    // 3. Security/Credential Analysis
    this.checkCredentials(issues);

    // 4. Simulation (Reachability)
    const simulation = this.simulateExecution();

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    return {
      isValid: criticalCount === 0,
      issues,
      simulation,
      summary: {
        totalNodes: this.workflow.nodes.length,
        criticalCount,
        warningCount
      }
    };
  }

  private checkConnectivity(issues: TestIssue[]) {
    const { nodes, connections } = this.workflow;
    
    // Identify Trigger Nodes (Start points)
    const triggers = nodes.filter(n => 
      ['webhook', 'manual', 'timer'].includes(n.type)
    );

    if (triggers.length === 0 && nodes.length > 0) {
      issues.push({
        id: 'no-trigger',
        severity: 'warning',
        message: 'Workflow has no explicit trigger node (Webhook, Manual, Timer). It may not start automatically.',
        category: 'connectivity'
      });
    }

    // Check for Orphans (Nodes with no incoming connections, unless they are triggers)
    const targets = new Set<string>();
    if (connections) {
      Object.values(connections).forEach(group => {
        group.forEach(ruleGroup => {
          ruleGroup.forEach(rule => targets.add(rule.node));
        });
      });
    }

    nodes.forEach(node => {
      const isTrigger = ['webhook', 'manual', 'timer'].includes(node.type);
      if (!isTrigger && !targets.has(node.name)) {
        issues.push({
          id: `orphan-${node.name}`,
          nodeName: node.name,
          severity: 'warning',
          message: `Node is isolated. It has no incoming connections and is not a trigger.`,
          category: 'connectivity'
        });
      }
    });
  }

  private checkConfiguration(issues: TestIssue[]) {
    const { nodes, global } = this.workflow;
    const nodeNames = new Set(nodes.map(n => n.name));
    const globalKeys = new Set(Object.keys(global || {}));

    nodes.forEach(node => {
      // 1. Check for Empty Required Fields (heuristic based)
      this.validateNodeParams(node, issues);

      // 2. Check Variable References {{ $Node.x }} or {{ $global.x }}
      const paramString = JSON.stringify(node.parameters || {});
      const matches = paramString.matchAll(/\{\{\s*([$a-zA-Z0-9_.]+)\s*\}\}/g);
      
      for (const match of matches) {
        const variable = match[1]; // e.g., "$global.apiKey" or "$prevNode.output"
        const parts = variable.split('.');
        const root = parts[0];

        if (root === '$global') {
          const key = parts[1];
          if (key && !globalKeys.has(key)) {
            issues.push({
              id: `missing-global-${node.name}-${key}`,
              nodeName: node.name,
              severity: 'critical',
              message: `References missing global variable: ${key}`,
              category: 'variable'
            });
          }
        } else if (root === '$P') {
          // $P references inputs, hard to validate statically without schema, skip
        } else if (!nodeNames.has(root)) {
          // Assuming root is a Node Name
          issues.push({
            id: `missing-ref-node-${node.name}-${root}`,
            nodeName: node.name,
            severity: 'critical',
            message: `References non-existent node: ${root}`,
            category: 'variable'
          });
        }
      }
    });
  }

  private validateNodeParams(node: NodeDefinition, issues: TestIssue[]) {
    // Basic heuristic: if a node type is HTTP, URL is likely required
    if (node.type === 'http' || node.type === 'webhook') {
      if (node.type === 'http' && !node.parameters?.url) {
         issues.push({
            id: `http-missing-url-${node.name}`,
            nodeName: node.name,
            severity: 'critical',
            message: 'HTTP node missing "url" parameter.',
            category: 'configuration'
         });
      }
    }
    
    if (node.type === 'chatgpt' || node.type === 'llm') {
        if (!node.parameters?.question && !node.parameters?.messages && !node.parameters?.prompt) {
             issues.push({
                id: `llm-missing-prompt-${node.name}`,
                nodeName: node.name,
                severity: 'warning',
                message: 'LLM node appears to have no prompt/question configured.',
                category: 'configuration'
             });
        }
    }
  }

  private checkCredentials(issues: TestIssue[]) {
    this.workflow.nodes.forEach(node => {
      // Check if node type usually requires credentials
      const needsCreds = ['mysql', 'pg', 'redis', 'chatgpt', 'tts', 's3', 'oss', 'feishu_bitable'].includes(node.type);
      
      if (needsCreds) {
        const hasDirectCreds = node.credentials && Object.keys(node.credentials).length > 0;
        const hasLinkedSecret = !!node.secret;
        
        if (!hasDirectCreds && !hasLinkedSecret) {
           issues.push({
             id: `missing-creds-${node.name}`,
             nodeName: node.name,
             severity: 'critical',
             message: `Node type '${node.type}' typically requires credentials, but none are configured.`,
             category: 'security'
           });
        }
      }
    });
  }

  private simulateExecution(): SimulationStep[] {
    const steps: SimulationStep[] = [];
    const { nodes, connections } = this.workflow;
    
    // Start with triggers or first node
    let queue = nodes.filter(n => ['webhook', 'manual', 'timer'].includes(n.type)).map(n => n.name);
    
    if (queue.length === 0 && nodes.length > 0) {
        queue = [nodes[0].name];
    }

    const visited = new Set<string>();
    let order = 1;

    while (queue.length > 0) {
      const currentName = queue.shift()!;
      if (visited.has(currentName)) continue;

      visited.add(currentName);
      steps.push({
        order: order++,
        nodeName: currentName,
        status: 'reachable'
      });

      // Find next nodes
      if (connections && connections[currentName]) {
        connections[currentName].forEach(group => {
          group.forEach(rule => {
            if (!visited.has(rule.node)) {
              queue.push(rule.node);
            }
          });
        });
      }
    }

    // Find unreachable nodes
    nodes.forEach(node => {
      if (!visited.has(node.name)) {
        steps.push({
          order: -1,
          nodeName: node.name,
          status: 'unreachable',
          note: 'Node cannot be reached from start triggers'
        });
      }
    });

    return steps.sort((a, b) => {
        if (a.order === -1 && b.order !== -1) return 1;
        if (a.order !== -1 && b.order === -1) return -1;
        return a.order - b.order;
    });
  }
}
