import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { ControlNodeRunner } from './ControlNodeRunner';

/**
 * Control Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments.
 */
export class ControlNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,                 // No browser-specific implementation
            undefined,                 // No server-specific implementation
            new ControlNodeRunner()    // Shared implementation for both
        );
    }
}
