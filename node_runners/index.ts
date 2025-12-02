
import { NodeRunner } from '../types';
import { Registry } from '../registry';
import '../builtins'; // Ensure registration

export const getRunner = (type: string): NodeRunner => {
  return Registry.getRunner(type);
};

export { interpolate, evaluateCondition } from './utils';
// Re-export new runners for any legacy code importing from here
export { TtsNodeRunner } from '../src/runners/TtsNodeRunner';
export { LlmNodeRunner } from '../src/runners/LlmNodeRunner';
