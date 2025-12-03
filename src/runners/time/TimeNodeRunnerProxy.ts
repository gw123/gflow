import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { TimeNodeRunner } from './TimeNodeRunner';

/**
 * Time Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments.
 */
export class TimeNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,              // No browser-specific implementation
            undefined,              // No server-specific implementation
            new TimeNodeRunner()    // Shared implementation for both
        );
    }
}
