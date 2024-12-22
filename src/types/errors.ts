export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  API = 'API_ERROR',
  NETWORK = 'NETWORK_ERROR',
  WORKFLOW = 'WORKFLOW_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  type: ErrorType;
  statusCode?: number;
  requestId?: string;
  details?: any;
}

export interface ErrorResponse {
  error: string;
  requestId?: string;
  timestamp: string;
  context?: ErrorContext;
} 