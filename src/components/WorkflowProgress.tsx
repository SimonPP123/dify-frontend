import React from 'react';
import { WorkflowState, WorkflowStatus } from '../types/workflow';

interface WorkflowProgressProps {
  state: WorkflowState;
  streamingResponse: string;
  error?: string;
}

const StatusIndicator = ({ status }: { status: WorkflowStatus }) => {
  const statusColors = {
    pending: 'bg-yellow-500',
    running: 'bg-blue-500 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    timeout: 'bg-gray-500',
    interrupted: 'bg-orange-500'
  };

  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full ${statusColors[status]} mr-2`} />
      <span className="capitalize">{status}</span>
    </div>
  );
};

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  state,
  streamingResponse,
  error
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