import { useState, useCallback, useRef, useEffect } from 'react';

export const useDifyAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [fullResponse, setFullResponse] = useState(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completedNodes, setCompletedNodes] = useState(new Set());
  const abortController = useRef(null);

  const cleanupRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupRequest();
  }, [cleanupRequest]);

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const WORKFLOW_NODES = {
    'workflow_started': { weight: 5, label: 'Starting workflow...' },
    'Start': { weight: 5, label: 'Initializing...' },
    'CSV TO JSON': { weight: 10, label: 'Converting CSV to JSON...' },
    'JSON ARRAY': { weight: 10, label: 'Processing JSON data...' },
    'IF/ELSE': { weight: 10, label: 'Analyzing data...' },
    'Въпрос': { weight: 15, label: 'Processing question...' },
    'Агент 1': { weight: 20, label: 'Analyzing responses...' },
    'Агент 2': { weight: 20, label: 'Generating insights...' },
    'Extract Question Insights': { weight: 5, label: 'Extracting insights...' },
    'Extract Summary Insights': { weight: 5, label: 'Generating summary...' },
    'End': { weight: 5, label: 'Completing workflow...' }
  };

  const sendMessageWithRetry = async (payload, retryCount = 0) => {
    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
        return sendMessageWithRetry(payload, retryCount + 1);
      }
      throw error;
    }
  };

  const sendMessage = useCallback(async ({ inputs, response_mode = 'streaming', user }) => {
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();

    setLoading(true);
    setError(null);
    setStreamingResponse('');
    setFullResponse(null);

    try {
      const response = await sendMessageWithRetry({
        inputs: {
          ...inputs,
          'sys.files': [],
          'sys.user_id': user
        },
        response_mode,
        user
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          const dataMatch = message.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          
          try {
            const event = JSON.parse(dataMatch[1]);
            
            switch(event.event) {
              case 'workflow_started':
                setProgress(5);
                setCurrentStep(WORKFLOW_NODES.workflow_started.label);
                if (event.workflow_run_id) {
                  setCurrentWorkflowId(event.workflow_run_id);
                  setStreamingResponse(prev => prev + 'Workflow started...\n');
                }
                break;
              
              case 'node_started':
                if (event.data?.title) {
                  const nodeTitle = event.data.title;
                  const node = WORKFLOW_NODES[nodeTitle];
                  if (node) {
                    setCurrentStep(node.label);
                    if (nodeTitle.includes('Въпрос') || nodeTitle.includes('Агент')) {
                      setProgress(prev => Math.min(prev + (node.weight / 3), 95));
                    } else {
                      setProgress(prev => Math.min(prev + node.weight, 95));
                    }
                  }
                }
                break;
              
              case 'node_finished':
                if (event.data?.title) {
                  setCompletedNodes(prev => new Set([...prev, event.data.title]));
                }
                break;
              
              case 'workflow_finished':
                setProgress(100);
                setCurrentStep('Completed');
                setStreamingResponse(prev => prev + 'Workflow completed.\n');
                setLoading(false);
                if (event.data?.outputs) {
                  setFullResponse(event.data.outputs);
                }
                return { success: true, data: event.data?.outputs || null };
              
              case 'error':
                const errorMsg = event.data?.error || 'Unknown error';
                setError(errorMsg);
                setLoading(false);
                throw new Error(errorMsg);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
            throw e;
          }
        }
      }

      return { success: true };
    } catch (error) {
      setError(error.message || 'Unknown error');
      setLoading(false);
      throw error;
    }
  }, []);

  return {
    sendMessage,
    loading,
    error,
    setError,
    streamingResponse,
    currentWorkflowId,
    fullResponse
  };
};