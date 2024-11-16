import { useEffect, useCallback } from 'react';
import { WorkflowState, WorkflowStatus } from '../types/workflow';
import { WorkflowStateManager } from '../utils/WorkflowStateManager';

export const useWorkflowPersistence = (workflowRunId?: string) => {
  useEffect(() => {
    if (!workflowRunId) return;

    // Set up periodic state check
    const intervalId = setInterval(() => {
      const state = WorkflowStateManager.getWorkflowState(workflowRunId);
      if (state && state.status === 'running') {
        // Update last active time to prevent timeout
        WorkflowStateManager.saveWorkflowState(state);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [workflowRunId]);

  const persistWorkflowState = useCallback((state: WorkflowState) => {
    WorkflowStateManager.saveWorkflowState(state);
  }, []);

  const updateStatus = useCallback((
    workflowRunId: string,
    status: WorkflowStatus,
    error?: string
  ) => {
    WorkflowStateManager.updateWorkflowStatus(workflowRunId, status, error);
  }, []);

  const getState = useCallback(() => {
    if (!workflowRunId) return null;
    return WorkflowStateManager.getWorkflowState(workflowRunId);
  }, [workflowRunId]);

  return {
    persistWorkflowState,
    updateStatus,
    getState,
    getIncompleteWorkflows: WorkflowStateManager.getIncompleteWorkflows,
    clearState: WorkflowStateManager.clearWorkflowState
  };
};