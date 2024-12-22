import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WorkflowStateManager } from '../utils/WorkflowStateManager';

interface Props {
  children: ReactNode;
  workflowId?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WorkflowErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workflow error:', error, errorInfo);
    if (this.props.workflowId) {
      WorkflowStateManager.clearWorkflowState(this.props.workflowId);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-red-800 font-medium">Something went wrong</h2>
          <p className="text-red-600 mt-1">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
} 