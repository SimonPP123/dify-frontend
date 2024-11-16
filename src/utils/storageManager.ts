export const STORAGE_KEYS = {
  WORKFLOW_STATE: 'dify_workflow_state',
  STREAMING_DATA: 'dify_streaming_data',
  WORKFLOW_ID: 'dify_workflow_id'
};

export interface WorkflowState {
  workflowRunId: string;
  taskId: string;
  status: 'running' | 'completed' | 'error';
  streamingResponse: string;
  finalResponse: any;
  timestamp: number;
}

export const storageManager = {
  saveWorkflowState: (state: WorkflowState) => {
    sessionStorage.setItem(STORAGE_KEYS.WORKFLOW_STATE, JSON.stringify(state));
  },

  getWorkflowState: (): WorkflowState | null => {
    const state = sessionStorage.getItem(STORAGE_KEYS.WORKFLOW_STATE);
    return state ? JSON.parse(state) : null;
  },

  clearWorkflowState: () => {
    sessionStorage.removeItem(STORAGE_KEYS.WORKFLOW_STATE);
  },

  appendStreamingData: (data: string) => {
    const currentData = sessionStorage.getItem(STORAGE_KEYS.STREAMING_DATA) || '';
    sessionStorage.setItem(STORAGE_KEYS.STREAMING_DATA, currentData + data);
  },

  getStreamingData: () => {
    return sessionStorage.getItem(STORAGE_KEYS.STREAMING_DATA) || '';
  }
}; 