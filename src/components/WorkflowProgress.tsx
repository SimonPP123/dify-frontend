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
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Progress</h3>
          <span className="text-sm text-gray-600">{progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Current step: {currentStep || 'Initializing...'}
        </div>

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