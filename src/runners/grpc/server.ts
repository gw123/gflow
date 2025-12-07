/**
 * gRPC Server-side Exports
 * 
 * These exports are for server-side use only and should NOT be imported
 * by client-side code to avoid bundling Node.js dependencies like @grpc/grpc-js.
 */

export { GrpcPluginManager } from './GrpcPluginManager';
export { DynamicGrpcNodeRunner } from './DynamicGrpcNodeRunner';
export type { GrpcPluginConfig, GrpcPluginsConfig, RegisteredGrpcPlugin } from './types';
