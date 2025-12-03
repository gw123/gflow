import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { InteractionNodeRunner } from './InteractionNodeRunner';

/**
 * Interaction Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments.
 */
export class InteractionNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,                     // No browser-specific implementation
            undefined,                     // No server-specific implementation
            new InteractionNodeRunner()    // Shared implementation for both
        );
    }
}