import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkflowEvent, SendMessageParams, WorkflowResponse } from '../types/api';

const API_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 300000, // 5 minutes
  HEALTH_CHECK_INTERVAL: 30000 // 30 seconds
};

const ERROR_MESSAGES = {
  CONNECTION: 'Cannot connect to API',
  TIMEOUT: 'Request timed out',
  WORKFLOW: 'Workflow processing failed',
  UNKNOWN: 'An unknown error occurred'
};

export const useDifyAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedNodes] = useState<Set<string>>(new Set());
  const abortController = useRef<AbortController | null>(null);

  const cleanupRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupRequest();
  }, [cleanupRequest]);

  const handleWorkflowEvent = useCallback((event: WorkflowEvent) => {
    switch (event.event) {
      case 'workflow_started':
        if (event.workflow_run_id) {
          setCurrentWorkflowId(event.workflow_run_id);
          setProgress(5);
          setCurrentStep('Starting workflow...');
          setStreamingResponse(prev => prev + 'Workflow started...\n');
        }
        break;

      case 'node_started':
        if (event.data?.title) {
          setProgress(prev => Math.min(prev + 10, 90));
          setCurrentStep(event.data.title);
          setStreamingResponse(prev => prev + `Processing: ${event.data.title}...\n`);
        }
        break;

      case 'node_finished':
        if (event.data?.outputs?.text) {
          completedNodes.add(event.data.node_id);
          setStreamingResponse(prev => prev + event.data.outputs.text + '\n');
        }
        break;

      case 'workflow_finished':
        setProgress(100);
        setCurrentStep('Completed');
        setStreamingResponse(prev => prev + 'Workflow completed.\n');
        if (event.data?.outputs) {
          setFullResponse(event.data.outputs);
        }
        setLoading(false);
        break;

      case 'error':
        const errorMsg = event.data?.error || ERROR_MESSAGES.UNKNOWN;
        setError(errorMsg);
        setLoading(false);
        break;
    }
  }, [completedNodes]);

  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      
      // Consider API connected if we can reach our health endpoint
      setIsConnected(true);
      
      // But set connection error if Dify API is not healthy
      if (data.status !== 'healthy') {
        setConnectionError(data.error || 'Dify API is not available');
        return false;
      }

      setConnectionError(null);
      return true;
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Failed to check API health');
      return false;
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const intervalId = setInterval(checkConnection, API_CONFIG.HEALTH_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, [checkConnection]);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!isConnected) {
      await checkConnection();
      if (!isConnected) {
        throw new Error(ERROR_MESSAGES.CONNECTION);
      }
    }

    cleanupRequest();
    abortController.current = new AbortController();

    setLoading(true);
    setError(null);
    setStreamingResponse('');
    setFullResponse(null);
    setProgress(0);

    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.WORKFLOW);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (!message.startsWith('data: ')) continue;
          
          try {
            const jsonStr = message.slice(6).trim();
            if (!jsonStr) continue;
            
            const event = JSON.parse(jsonStr);
            handleWorkflowEvent(event);
          } catch (e) {
            console.error('Error parsing event data:', e);
          }
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN;
      setError(errorMessage);
      setLoading(false);
      throw error;
    }
  }, [isConnected, checkConnection, handleWorkflowEvent, cleanupRequest]);

  return {
    sendMessage,
    loading,
    error,
    setError,
    streamingResponse,
    currentWorkflowId,
    fullResponse,
    progress,
    currentStep,
    completedNodes,
    isConnected,
    connectionError,
    checkConnection
  };
};
