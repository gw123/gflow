import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { SystemNodeRunner } from './SystemNodeRunner';

/**
 * System Node Runner Proxy
 * 
 * System command node (currently simulated).
 * Uses shared implementation.
 */
export class SystemNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        // Pass as third argument (sharedRunner) since implementation is the same for both environments
        super(undefined, undefined, new SystemNodeRunner());
    }
}