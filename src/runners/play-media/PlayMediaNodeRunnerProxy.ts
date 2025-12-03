import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { PlayMediaNodeRunnerBrowser } from './PlayMediaNodeRunnerBrowser';
import { PlayMediaNodeRunnerServer } from './PlayMediaNodeRunnerServer';

/**
 * Play Media Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class PlayMediaNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new PlayMediaNodeRunnerBrowser(),    // Browser implementation
            new PlayMediaNodeRunnerServer()      // Server implementation
        );
    }
}