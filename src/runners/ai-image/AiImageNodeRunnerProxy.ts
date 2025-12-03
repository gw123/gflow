import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { AiImageNodeRunnerBrowser } from './AiImageNodeRunnerBrowser';
import { AiImageNodeRunnerServer } from './AiImageNodeRunnerServer';

/**
 * AI Image Node Runner Proxy
 * 
 * Automatically selects between browser and server implementations
 * based on the current execution environment.
 */
export class AiImageNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            new AiImageNodeRunnerBrowser(),  // Browser implementation
            new AiImageNodeRunnerServer()     // Server implementation
        );
    }
}