import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { detectEnvironment } from '../utils';
import { MysqlNodeRunnerBrowser } from './MysqlNodeRunnerBrowser';

/**
 * MySQL Node Runner Proxy
 * 
 * Automatically selects between browser and server implementations
 * based on the current execution environment.
 * 
 * Note: MySQL connections only work in server environment.
 * Browser implementation returns an error indicating server execution is required.
 */
export class MysqlNodeRunnerProxy implements NodeRunner {
    private runner?: NodeRunner;
    private environment: 'browser' | 'server';

    constructor() {
        this.environment = detectEnvironment();
    }

    private async getRunner(): Promise<NodeRunner> {
        if (this.runner) {
            return this.runner;
        }

        if (this.environment === 'browser') {
            // Browser implementation - can be imported statically since it's browser-safe
            this.runner = new MysqlNodeRunnerBrowser();
        } else {
            const { MysqlNodeRunnerServer } = await import('./MysqlNodeRunnerServer');
            // Server implementation - dynamically import to avoid bundling Node.js modules in browser
            this.runner = new MysqlNodeRunnerServer();
        }

        return this.runner;
    }

    async run(
        node: NodeDefinition,
        context: NodeRunnerContext
    ): Promise<Partial<NodeExecutionResult>> {
        const runner = await this.getRunner();
        return runner.run(node, context);
    }

    getEnvironment(): 'browser' | 'server' {
        return this.environment;
    }

}
