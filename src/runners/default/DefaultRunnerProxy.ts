import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { DefaultRunner } from './DefaultRunner';

/**
 * Default Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments.
 */
export class DefaultRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,              // No browser-specific implementation
            undefined,              // No server-specific implementation
            new DefaultRunner()     // Shared implementation for both
        );
    }
}