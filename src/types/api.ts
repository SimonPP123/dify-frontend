import { WorkflowInputs, WorkflowStatus } from './workflow';

export interface WorkflowEventData {
  title: string;
  node_id?: string;
  id?: string;
  index?: number;
  status?: WorkflowStatus;
  outputs?: {
    text?: string;
    [key: string]: any;
  };
  error?: string;
}

export interface WorkflowEvent {
  event: 'workflow_started' | 'node_started' | 'node_finished' | 'workflow_finished' | 'error' | 'ping';
  data: WorkflowEventData;
  task_id?: string;
  workflow_run_id?: string;
}

export interface SendMessageParams {
  inputs: WorkflowInputs;
  response_mode?: 'streaming' | 'blocking';
  user: string;
}

export interface WorkflowResponse {
  text?: string;
  [key: string]: any;
} 