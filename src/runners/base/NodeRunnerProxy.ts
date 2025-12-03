import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';

/**
 * Base class for all NodeRunner Proxies
 * 
 * Each NodeRunner should have a corresponding Proxy that selects between
 * browser and server implementations based on the current environment.
 * 
 * Usage:
 * 
 * 1. Browser and Server implementations differ:
 *    class HttpNodeRunnerProxy extends NodeRunnerProxy {
 *      constructor() {
 *        super(
 *          new HttpNodeRunnerBrowser(),
 *          new HttpNodeRunnerServer()
 *        );
 *      }
 *    }
 * 
 * 2. Browser and Server implementations are the same:
 *    class TimeNodeRunnerProxy extends NodeRunnerProxy {
 *      constructor() {
 *        super(undefined, undefined, new TimeNodeRunner());
 *      }
 *    }
 */
export abstract class NodeRunnerProxy implements NodeRunner {
    private browserRunner?: NodeRunner;
    private serverRunner?: NodeRunner;
    private currentRunner?: NodeRunner;
    private environment: 'browser' | 'server';

    /**
     * @param browserRunner - Implementation for browser environment
     * @param serverRunner - Implementation for server environment
     * @param sharedRunner - Implementation for both environments (if same)
     */
    constructor(
        browserRunner?: NodeRunner,
        serverRunner?: NodeRunner,
        sharedRunner?: NodeRunner
    ) {
        // Detect environment first
        this.environment = this.detectEnvironment();

        // Set up runners
        if (sharedRunner) {
            // Use shared implementation for both environments
            this.browserRunner = sharedRunner;
            this.serverRunner = sharedRunner;
        } else {
            this.browserRunner = browserRunner;
            this.serverRunner = serverRunner;
        }

        // Select the appropriate runner
        this.currentRunner = this.selectRunner();
    }

    /**
     * Detect the current execution environment
     */
    private detectEnvironment(): 'browser' | 'server' {
        // Check for Node.js specific globals
        if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            return 'server';
        }

        // Check for browser specific globals
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            return 'browser';
        }

        // Default to browser for unknown environments (Web Workers, etc.)
        return 'browser';
    }

    /**
     * Select the appropriate runner based on environment
     */
    private selectRunner(): NodeRunner {
        if (this.environment === 'browser') {
            if (!this.browserRunner) {
                throw new Error(
                    `${this.constructor.name}: No browser implementation available. ` +
                    `This runner may not be supported in browser environments.`
                );
            }
            return this.browserRunner;
        } else {
            if (!this.serverRunner) {
                throw new Error(
                    `${this.constructor.name}: No server implementation available. ` +
                    `This runner may not be supported in server environments.`
                );
            }
            return this.serverRunner;
        }
    }

    /**
     * Run the node using the appropriate environment-specific runner
     */
    async run(
        node: NodeDefinition,
        context: NodeRunnerContext
    ): Promise<Partial<NodeExecutionResult>> {
        if (!this.currentRunner) {
            throw new Error(`${this.constructor.name}: Runner not initialized`);
        }

        return this.currentRunner.run(node, context);
    }

    /**
     * Get the current execution environment
     */
    getEnvironment(): 'browser' | 'server' {
        return this.environment;
    }

    /**
     * Check if the proxy has a browser implementation
     */
    hasBrowserImplementation(): boolean {
        return !!this.browserRunner;
    }

    /**
     * Check if the proxy has a server implementation
     */
    hasServerImplementation(): boolean {
        return !!this.serverRunner;
    }
}
