
import { NodeRunner } from '../types';
import { Registry } from '../registry';
import '../builtins'; // Ensure registration

export const getRunner = (type: string): NodeRunner => {
  return Registry.getRunner(type);
};

export { interpolate, evaluateCondition } from './utils';
