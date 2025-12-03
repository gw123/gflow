/**
 * HTTP Node Runner Module
 * 
 * Exports the proxy which automatically selects the appropriate implementation.
 * Only the proxy should be used externally.
 */
export { HttpNodeRunnerProxy } from './HttpNodeRunnerProxy';

// Internal implementations (not exported, only used by proxy)
// export { HttpNodeRunnerBrowser } from './HttpNodeRunnerBrowser';
// export { HttpNodeRunnerServer } from './HttpNodeRunnerServer';
