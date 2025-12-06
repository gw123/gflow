import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { TtsNodeRunner } from './TtsNodeRunner';

/**
 * TTS Node Runner Proxy
 * 
 * Text-to-Speech node uses Google GenAI API which works in both environments.
 * Uses shared implementation.
 */
export class TtsNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        // Pass as third argument (sharedRunner) since implementation is the same for both environments
        super(undefined, undefined, new TtsNodeRunner());
    }
}