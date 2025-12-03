import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { SystemNodeRunner } from './SystemNodeRunner';

/**
 * System Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class SystemNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(new SystemNodeRunner());
    }
}