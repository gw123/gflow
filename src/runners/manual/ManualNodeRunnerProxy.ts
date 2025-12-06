import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { ManualNodeRunner } from './ManualNodeRunner';

/**
 * Manual Node Runner Proxy
 * 
 * Manual trigger node works the same in both browser and server environments.
 * Uses shared implementation.
 */
export class ManualNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        // Pass as third argument (sharedRunner) since implementation is the same for both environments
        super(undefined, undefined, new ManualNodeRunner());
    }
}