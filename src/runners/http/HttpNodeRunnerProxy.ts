import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { HttpNodeRunnerBrowser } from './HttpNodeRunnerBrowser';
import { HttpNodeRunnerServer } from './HttpNodeRunnerServer';

/**
 * HTTP Node Runner Proxy
 * 
 * Automatically selects between browser and server implementations
 * based on the current execution environment.
 */
export class HttpNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new HttpNodeRunnerBrowser(),  // Browser implementation (fetch + fallback)
            new HttpNodeRunnerServer()     // Server implementation (axios)
        );
    }
}
