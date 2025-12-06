import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { detectEnvironment } from '../utils';
import { AiImageNodeRunnerBrowser } from './AiImageNodeRunnerBrowser';

/**
 * AI Image Node Runner Proxy
 * 
 * Automatically selects between browser and server implementations
 * based on the current execution environment.
 * Uses lazy loading for server implementation to avoid bundling Node.js modules in browser.
 */
export class AiImageNodeRunnerProxy implements NodeRunner {
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
            this.runner = new AiImageNodeRunnerBrowser();
        } else {
            // Dynamically import to avoid bundling fs/path in browser
            const { AiImageNodeRunnerServer } = await import('./AiImageNodeRunnerServer');
            this.runner = new AiImageNodeRunnerServer();
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