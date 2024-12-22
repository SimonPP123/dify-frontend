import { NextApiRequest, NextApiResponse } from 'next';

export class WorkflowError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: any
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// Custom error logger
const logError = (error: WorkflowError, requestId?: string) => {
  console.error({
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    requestId,
    context: error.context
  });
};

export function errorHandler(err: any, req: NextApiRequest, res: NextApiResponse) {
  const error = err instanceof WorkflowError ? err : new WorkflowError(err.message);
  const requestId = req.headers['x-request-id'] as string;
  
  // Log error for debugging
  logError(error, requestId);

  res.status(error.statusCode).json({
    error: error.message,
    requestId,
    timestamp: new Date().toISOString()
  });
} 