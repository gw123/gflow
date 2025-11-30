
import { NodeRunner } from '../types';
import { JsNodeRunner } from './JsNodeRunner';
import { ManualNodeRunner } from './ManualNodeRunner';
import { HttpNodeRunner } from './HttpNodeRunner';
import { TimeNodeRunner } from './TimeNodeRunner';
import { LlmNodeRunner } from './LlmNodeRunner';
import { ControlNodeRunner } from './ControlNodeRunner';
import { SystemNodeRunner } from './SystemNodeRunner';
import { DefaultRunner } from './DefaultRunner';
import { GrpcNodeRunner } from './GrpcNodeRunner';
import { InteractionNodeRunner } from './InteractionNodeRunner';
import { MediaNodeRunner } from './MediaNodeRunner';
import { PlayMediaNodeRunner } from './PlayMediaNodeRunner';
import { AiImageNodeRunner } from './AiImageNodeRunner';
import { LangChainNodeRunner } from './LangChainNodeRunner';

// Registry
const Runners: Record<string, NodeRunner> = {
  'js': new JsNodeRunner(),
  'manual': new ManualNodeRunner(),
  
  // HTTP / Webhook
  'http': new HttpNodeRunner(),
  'webhook': new HttpNodeRunner(),
  
  // Time
  'wait': new TimeNodeRunner(),
  'timer': new TimeNodeRunner(),
  
  // AI / LLM
  'chatgpt': new LlmNodeRunner(),
  'tts': new LlmNodeRunner(),
  'agent': new LlmNodeRunner(),
  'prompt_template': new LlmNodeRunner(),
  'ai_low_code': new LlmNodeRunner(),
  'ai_image_gen': new AiImageNodeRunner(),
  'langchain_agent': new LangChainNodeRunner(),
  
  // Control Flow
  'if': new ControlNodeRunner(),
  'switch': new ControlNodeRunner(),
  'loop': new ControlNodeRunner(),

  // System / Command
  'execute_command': new SystemNodeRunner(),
  'docker': new SystemNodeRunner(),
  'docker_compose': new SystemNodeRunner(),
  'git': new SystemNodeRunner(),

  // Plugins
  'grpc_plugin': new GrpcNodeRunner(),
  
  // Human in the Loop
  'user_interaction': new InteractionNodeRunner(),
  
  // Media
  'media_capture': new MediaNodeRunner(),
  'play_media': new PlayMediaNodeRunner(),
};

export const getRunner = (type: string): NodeRunner => {
  return Runners[type] || new DefaultRunner();
};

export { interpolate, evaluateCondition } from './utils';
