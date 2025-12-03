import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { MediaNodeRunnerBrowser } from './MediaNodeRunnerBrowser';
import { MediaNodeRunnerServer } from './MediaNodeRunnerServer';

/**
 * Media Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class MediaNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new MediaNodeRunnerBrowser(),    // Browser implementation
            new MediaNodeRunnerServer()      // Server implementation
        );
    }
}