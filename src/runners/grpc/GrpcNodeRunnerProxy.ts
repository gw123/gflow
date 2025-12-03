import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { GrpcNodeRunner } from './GrpcNodeRunner';

/**
 * Grpc Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments.
 */
export class GrpcNodeRunnerProxy extends NodeRunnerProxy {
    constructor() {
        super(
            undefined,              // No browser-specific implementation
            undefined,              // No server-specific implementation
            new GrpcNodeRunner()    // Shared implementation for both
        );
    }
}