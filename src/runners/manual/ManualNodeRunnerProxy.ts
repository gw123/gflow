import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { ManualNodeRunner } from './ManualNodeRunner';

/**
 * Manual Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class ManualNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(new ManualNodeRunner());
    }
}