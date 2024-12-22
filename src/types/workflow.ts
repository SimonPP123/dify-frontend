export interface WorkflowInputs {
  insights_number: '5' | '10' | '15' | '20' | '25';
  summary_insights_number: '10' | '20' | '30' | '40' | '50';
  language: 'Български' | 'English';
  file_upload: string;
  'sys.app_id': string;
  'sys.user_id': string;
  'sys.files'?: string[];
  selectedApp?: string;
  selectedColumns: string[];
  [key: string]: any;
}

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'interrupted';

export interface WorkflowProgress {
  currentNode: string;
  completedNodes: string[];
  outputs: Array<{
    nodeId: string;
    output: any;
    timestamp: number;
  }>;
  lastUpdateTime: number;
}

export interface WorkflowState {
  workflowRunId: string;
  taskId: string;
  status: WorkflowStatus;
  progress: WorkflowProgress;
  inputs: WorkflowInputs;
  streamingResponse: string;
  error?: string;
  startTime: number;
  lastActiveTime: number;
  retryCount: number;
  metadata: {
    userId: string;
    appId: string;
    totalTokens?: number;
    elapsedTime?: number;
    checkpointData?: any;
    finishedAt?: number;
  };
}

export interface WorkflowEvent {
  event: 'workflow_started' | 'node_started' | 'node_finished' | 'workflow_finished' | 'error';
  task_id: string;
  workflow_run_id: string;
  data?: {
    id?: string;
    title?: string;
    node_id?: string;
    outputs?: {
      text?: string;
    };
    error?: string;
    status?: WorkflowStatus;
  };
}

export interface WorkflowResponse {
  output: string[];
  summary: string;
  whole_output?: string[];
  whole_summary?: string;
}

export interface StreamResponse {
  event: 'workflow_started' | 'node_started' | 'node_finished' | 'workflow_finished';
  task_id: string;
  workflow_run_id: string;
  data: {
    outputs?: {
      text?: string;
    };
    status?: WorkflowStatus;
    error?: string;
  };
}

export interface QuestionSection {
  question: string;
  options: string[];
  selectedOptions: string[];
}

export interface DownloadableContent {
  output: string[];
  summary?: string;
  whole_output?: string[];
  whole_summary?: string;
}