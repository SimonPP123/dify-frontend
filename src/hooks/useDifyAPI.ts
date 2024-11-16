import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkflowEvent, SendMessageParams, WorkflowResponse } from '../types/api';

export const useDifyAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
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

  const fetchWorkflowResult = useCallback(async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch workflow result');
      }
      const result = await response.json();
      if (result.outputs) {
        setFullResponse(result.outputs);
        setStreamingResponse(result.outputs.text || '');
      }
      return result;
    } catch (error) {
      console.error('Error fetching workflow result:', error);
      setError('Failed to fetch final workflow result');
    }
  }, []);

  const handleWorkflowEvent = useCallback(async (event: WorkflowEvent) => {
    switch (event.event) {
      case 'workflow_started':
        if (event.workflow_run_id) {
          setCurrentWorkflowId(event.workflow_run_id);
          setStreamingResponse(prev => prev + 'Workflow started...\n');
        }
        break;
      
      case 'node_started':
        if (event.data?.title) {
          setStreamingResponse(prev => prev + `Processing: ${event.data.title}...\n`);
        }
        break;
      
      case 'node_finished':
        if (event.data?.outputs?.text) {
          const outputText = event.data.outputs.text;
          setStreamingResponse(prev => prev + outputText + '\n');
        }
        break;
      
      case 'workflow_finished':
        setStreamingResponse(prev => prev + 'Workflow completed.\n');
        if (event.data?.outputs) {
          setFullResponse(event.data.outputs);
        }
        setLoading(false);
        break;
      
      case 'error':
        const errorMsg = event.data?.error || 'Unknown error occurred';
        setError(errorMsg);
        setLoading(false);
        break;
    }
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();

    setLoading(true);
    setError(null);
    setStreamingResponse('');
    setFullResponse(null);

    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to start workflow');
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
            await handleWorkflowEvent(event);
          } catch (e) {
            console.error('Error parsing event data:', e);
          }
        }
      }

      setLoading(false);
      return { success: true };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      setLoading(false);
      throw error;
    }
  }, [handleWorkflowEvent]);

  return {
    sendMessage,
    loading,
    error,
    setError,
    streamingResponse,
    currentWorkflowId,
    fullResponse,
    fetchWorkflowResult
  };
};