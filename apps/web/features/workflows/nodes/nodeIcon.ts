import type { NodeType } from '../lib/types';
import type { IconName } from './StepIcon';

/**
 * Icon for a step type. Shared by the node header on the canvas and by the
 * compact rows inside Block nodes so a step looks the same either way.
 */
export const STEP_ICONS: Partial<Record<NodeType, IconName>> = {
  message: 'message',
  prompt: 'prompt',
  image: 'image',
  card: 'card',
  carousel: 'carousel',
  buttons: 'buttons',
  choice: 'choice',
  capture: 'capture',
  condition: 'condition',
  setVariable: 'set',
  component: 'component',
  end: 'end',
  tool: 'tool',
  function: 'function',
  api: 'api',
  javascript: 'javascript',
  kbSearch: 'kb',
  callForward: 'call',
  customAction: 'custom',
  playbook: 'workflow',
  agent: 'agent',
  crew: 'crew',
  operator: 'operator',
  block: 'component',
};

/**
 * Which of the five canvas accents a step belongs to. Drives the tint of the
 * icon chip in the node header, so type is readable at a glance while zoomed
 * out far enough that the label is not.
 */
export const STEP_ACCENTS: Partial<Record<NodeType, string>> = {
  playbook: 'agent',
  agent: 'agent',
  crew: 'agent',
  operator: 'agent',
  message: 'talk',
  prompt: 'talk',
  image: 'talk',
  card: 'talk',
  carousel: 'talk',
  buttons: 'listen',
  choice: 'listen',
  capture: 'listen',
  condition: 'logic',
  setVariable: 'logic',
  component: 'logic',
  block: 'logic',
  end: 'logic',
  callForward: 'logic',
  tool: 'dev',
  function: 'dev',
  api: 'dev',
  javascript: 'dev',
  kbSearch: 'dev',
  customAction: 'dev',
};
