import { NodeRunnerProxy } from '../base/NodeRunnerProxy';
import { ResponseNodeRunner } from './ResponseNodeRunner';

/**
 * Response Node Runner Proxy
 * 
 * Uses the same implementation for both browser and server environments
 * since response context handling is environment-agnostic.
 */
export class ResponseNodeRunnerProxy extends NodeRunnerProxy {
  constructor() {
    super(
      undefined,                // No browser-specific implementation
      undefined,                // No server-specific implementation
      new ResponseNodeRunner()  // Shared implementation for both
    );
  }
}
