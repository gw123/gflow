import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { TtsNodeRunner } from './TtsNodeRunner';

/**
 * TTS Node Runner Proxy
 * 
 * Automatically selects the appropriate implementation based on the environment.
 */
export class TtsNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(new TtsNodeRunner());
    }
}