import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { detectEnvironment } from '../utils';
import { PlayMediaNodeRunnerBrowser } from './PlayMediaNodeRunnerBrowser';

/**
 * Play Media Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 * Uses lazy loading for server implementation to avoid bundling Node.js-only
 * modules (child_process, fs, etc.) in the browser bundle.
 */
export class PlayMediaNodeRunnerProxy implements NodeRunner {
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
            this.runner = new PlayMediaNodeRunnerBrowser();
        } else {
            // Server implementation - dynamically import to avoid bundling Node.js modules in browser
            const { PlayMediaNodeRunnerServer } = await import('./PlayMediaNodeRunnerServer');
            this.runner = new PlayMediaNodeRunnerServer();
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