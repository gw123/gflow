
import { NodeRunner } from '../types';
import { Registry } from '../registry';

// Circular Dependency Fix: Do NOT import builtins here. 
// The app entry point or nodes.ts is responsible for loading builtins.

export const getRunner = (type: string): NodeRunner => {
  return Registry.getRunner(type);
};

export { interpolate, evaluateCondition } from './utils';

export { AiImageNodeRunnerProxy as AiImageNodeRunner } from './ai-image';
export { ControlNodeRunnerProxy as ControlNodeRunner } from './control';
export { DefaultRunnerProxy as DefaultRunner } from './default';
export { GrpcNodeRunnerProxy as GrpcNodeRunner } from './grpc';
export { HttpNodeRunnerProxy as HttpNodeRunner } from './http';
export { InteractionNodeRunnerProxy as InteractionNodeRunner } from './interaction';
export { JsNodeRunnerProxy as JsNodeRunner } from './js';
export { LlmNodeRunnerProxy as LlmNodeRunner } from './llm';
export { ManualNodeRunnerProxy as ManualNodeRunner } from './manual';
export { MediaNodeRunnerProxy as MediaNodeRunner } from './media';
export { PlayMediaNodeRunnerProxy as PlayMediaNodeRunner } from './play-media';
export { SystemNodeRunnerProxy as SystemNodeRunner } from './system';
export { TimeNodeRunnerProxy as TimeNodeRunner } from './time';
export { TtsNodeRunnerProxy as TtsNodeRunner } from './tts';
export { MysqlNodeRunnerProxy as MysqlNodeRunner } from './mysql';

// gRPC Plugin System (Server-side only)
export { GrpcPluginManager, DynamicGrpcNodeRunner } from './grpc';
export type { GrpcPluginConfig, GrpcPluginsConfig, RegisteredGrpcPlugin } from './grpc';
