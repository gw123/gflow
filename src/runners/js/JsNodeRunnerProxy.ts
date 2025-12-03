import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { JsNodeRunnerBrowser } from './JsNodeRunnerBrowser';
import { JsNodeRunnerServer } from './JsNodeRunnerServer';

/**
 * JavaScript Node Runner Proxy
 * 
 * Automatically selects between browser and server implementations
 * based on the current execution environment.
 */
export class JsNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new JsNodeRunnerBrowser(),  // Browser implementation (Function)
            new JsNodeRunnerServer()     // Server implementation (vm module)
        );
    }
}
