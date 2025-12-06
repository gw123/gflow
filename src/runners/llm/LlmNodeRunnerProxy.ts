import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { LlmNodeRunnerBrowser } from './LlmNodeRunnerBrowser';
import { LlmNodeRunnerServer } from './LlmNodeRunnerServer';
import { NodeRunner } from '../../types';

/**
 * LLM Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class LlmNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new LlmNodeRunnerBrowser(),    // Browser implementation
            new LlmNodeRunnerServer()      // Server implementation
        );
    }
}