import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

export class SystemNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const params = interpolate(node.parameters, context, node);
    const logs: string[] = [];
    
    // Simulate network/process latency
    await new Promise(resolve => setTimeout(resolve, 600));

    let output: any = { executed: true };

    try {
        if (node.type === 'execute_command') {
            const command = params.command || '';
            const workdir = params.workdir || '.';
            
            logs.push(`[System] Working Directory: ${workdir}`);
            logs.push(`[System] Executing: ${command}`);
            
            // Simulate output based on command content
            let simulatedStdout = "Command executed successfully.";
            if (command.includes('echo')) {
                simulatedStdout = command.replace(/echo\s+['"]?([^'"]*)['"]?/, '$1');
            } else if (command.includes('ls')) {
                simulatedStdout = "file1.txt\nfile2.json\nbuild/";
            }
            
            output = { 
                stdout: simulatedStdout, 
                stderr: "", 
                exitCode: 0 
            };
        } else if (node.type.includes('docker')) {
            logs.push(`[Docker] Action: ${params.action || 'run'}`);
            if (params.image) logs.push(`[Docker] Image: ${params.image}`);
            if (params['docker-compose-file']) logs.push(`[Docker] Compose File: ${params['docker-compose-file']}`);
            
            output = { containerId: "a1b2c3d4e5f6", status: "running" };
        } else if (node.type === 'git') {
            logs.push(`[Git] Action: ${params.action}`);
            logs.push(`[Git] Repo: ${params.repoName || params.gitURL}`);
            
            output = { commit: "7b3f1a2", branch: "main", status: "clean" };
        }

        return {
            status: 'success',
            inputs: params,
            output: { ...output, ...params },
            logs: logs
        };
    } catch (e: any) {
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: logs.concat([`Error: ${e.message}`])
        };
    }
  }
}