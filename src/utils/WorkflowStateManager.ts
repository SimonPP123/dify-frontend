import { WorkflowState, WorkflowStatus, WorkflowProgress } from '../types/workflow';

export class WorkflowStateManager {
  private static readonly STORAGE_PREFIX = 'dify_workflow_';
  private static readonly MAX_STORED_WORKFLOWS = 10;
  private static readonly WORKFLOW_TIMEOUT = 1800000; // 30 minutes

  private static getStorageKey(workflowRunId: string): string {
    return `${this.STORAGE_PREFIX}${workflowRunId}`;
  }

  static saveWorkflowState(state: WorkflowState): void {
    try {
      // Update last active time
      state.lastActiveTime = Date.now();
      
      // Save to session storage
      sessionStorage.setItem(
        this.getStorageKey(state.workflowRunId),
        JSON.stringify(state)
      );

      // Maintain workflow list
      this.updateWorkflowList(state.workflowRunId);
    } catch (error) {
      console.error('Error saving workflow state:', error);
    }
  }

  static getWorkflowState(workflowRunId: string): WorkflowState | null {
    try {
      const stored = sessionStorage.getItem(this.getStorageKey(workflowRunId));
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error retrieving workflow state:', error);
      return null;
    }
  }

  private static updateWorkflowList(workflowRunId: string): void {
    const listKey = `${this.STORAGE_PREFIX}list`;
    const storedList = sessionStorage.getItem(listKey);
    const workflowList: string[] = storedList ? JSON.parse(storedList) : [];

    // Add new workflow if not exists
    if (!workflowList.includes(workflowRunId)) {
      workflowList.unshift(workflowRunId);
      
      // Keep only recent workflows
      if (workflowList.length > this.MAX_STORED_WORKFLOWS) {
        const removed = workflowList.pop();
        if (removed) {
          sessionStorage.removeItem(this.getStorageKey(removed));
        }
      }
      
      sessionStorage.setItem(listKey, JSON.stringify(workflowList));
    }
  }

  static updateWorkflowProgress(
    workflowRunId: string,
    progress: Partial<WorkflowProgress>
  ): void {
    const state = this.getWorkflowState(workflowRunId);
    if (state) {
      state.progress = { ...state.progress, ...progress };
      state.lastActiveTime = Date.now();
      this.saveWorkflowState(state);
    }
  }

  static updateWorkflowStatus(
    workflowRunId: string,
    status: WorkflowStatus,
    error?: string
  ): void {
    const state = this.getWorkflowState(workflowRunId);
    if (state) {
      state.status = status;
      if (error) state.error = error;
      state.lastActiveTime = Date.now();
      this.saveWorkflowState(state);
    }
  }

  static getIncompleteWorkflows(): WorkflowState[] {
    const listKey = `${this.STORAGE_PREFIX}list`;
    const storedList = sessionStorage.getItem(listKey);
    if (!storedList) return [];

    const workflowList: string[] = JSON.parse(storedList);
    const incompleteWorkflows: WorkflowState[] = [];

    for (const workflowRunId of workflowList) {
      const state = this.getWorkflowState(workflowRunId);
      if (state && ['running', 'pending'].includes(state.status)) {
        // Check for timeout
        if (Date.now() - state.lastActiveTime > this.WORKFLOW_TIMEOUT) {
          this.updateWorkflowStatus(workflowRunId, 'timeout');
        } else {
          incompleteWorkflows.push(state);
        }
      }
    }

    return incompleteWorkflows;
  }

  static clearWorkflowState(workflowRunId: string): void {
    sessionStorage.removeItem(this.getStorageKey(workflowRunId));
    
    // Update workflow list
    const listKey = `${this.STORAGE_PREFIX}list`;
    const storedList = sessionStorage.getItem(listKey);
    if (storedList) {
      const workflowList: string[] = JSON.parse(storedList);
      const updatedList = workflowList.filter(id => id !== workflowRunId);
      sessionStorage.setItem(listKey, JSON.stringify(updatedList));
    }
  }
}