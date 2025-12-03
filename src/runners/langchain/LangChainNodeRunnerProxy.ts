import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { LangChainNodeRunnerBrowser } from './LangChainNodeRunnerBrowser';
import { LangChainNodeRunnerServer } from './LangChainNodeRunnerServer';
import { NodeRunner } from '../../types';

/**
 * LangChain Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class LangChainNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new LangChainNodeRunnerBrowser(),    // Browser implementation
            new LangChainNodeRunnerServer()      // Server implementation
        );
    }
}