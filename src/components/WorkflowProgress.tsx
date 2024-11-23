import React from 'react';
import { WorkflowState, WorkflowStatus } from '../types/workflow';

interface WorkflowProgressProps {
  state: WorkflowState;
  streamingResponse: string;
  error?: string;
  progress: number;
  currentStep: string;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  state,
  streamingResponse,
  error,
  progress,
  currentStep
}) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium mb-2">Progress</h3>
        <div className="whitespace-pre-wrap font-mono text-sm">
          {streamingResponse || 'Waiting for response...'}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}; 