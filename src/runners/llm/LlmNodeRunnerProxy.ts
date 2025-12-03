import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { LlmNodeRunner } from './LlmNodeRunner';

/**
 * LLM Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments
 * since it only calls external APIs (Gemini).
 */
export class LlmNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,            // No browser-specific implementation
            undefined,            // No server-specific implementation
            new LlmNodeRunner()   // Shared implementation for both
        );
    }
}
