import { useState, useCallback, useRef, useEffect } from 'react';

export const useDifyAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
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
        try {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream completed');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          console.log('Received chunk:', buffer);
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            const dataMatch = message.match(/^data: (.+)$/m);
            if (!dataMatch) continue;
            
            try {
              const event = JSON.parse(dataMatch[1]);
              
              switch(event.event) {
                case 'workflow_started':
                  if (event.workflow_run_id) {
                    console.log('Workflow started:', event.workflow_run_id);
                    setCurrentWorkflowId(event.workflow_run_id);
                    setProgress(5);
                    setCurrentStep('Starting workflow...');
                    setStreamingResponse('Workflow started...\n');
                  }
                  break;
                
                case 'node_started':
                  if (event.data?.title) {
                    const nodeTitle = event.data.title;
                    const node = WORKFLOW_NODES[nodeTitle] || { 
                      weight: 10, 
                      label: `Processing ${nodeTitle}...` 
                    };
                    
                    console.log('Node started:', nodeTitle);
                    setCurrentStep(node.label);
                    setStreamingResponse(prev => prev + `${node.label}\n`);
                    
                    if (nodeTitle.startsWith('Въпрос')) {
                      const questionNum = parseInt(nodeTitle.match(/\d+/)?.[0] || '0');
                      setProgress(prev => Math.min(40 + (questionNum * 15), 90));
                    } else {
                      setProgress(prev => Math.min(prev + node.weight, 95));
                    }
                  }
                  break;
                
                case 'node_finished':
                  if (event.data?.title) {
                    const nodeTitle = event.data.title;
                    setCompletedNodes(prev => new Set([...prev, nodeTitle]));
                    if (event.data?.outputs?.text) {
                      setStreamingResponse(prev => prev + event.data.outputs.text + '\n');
                    }
                  }
                  break;
                
                case 'workflow_finished':
                  setProgress(100);
                  setCurrentStep('Completed');
                  if (event.data?.outputs) {
                    setFullResponse(event.data.outputs);
                  }
                  setLoading(false);
                  break;
                
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
        } catch (error) {
          console.error('Error reading stream:', error);
          throw error;
        }
      }

      return { success: true };
    } catch (error) {
      setError(error.message || 'Unknown error');
      setLoading(false); 
      throw error;
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setIsConnected(true);
        setConnectionError(null);
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionError('Failed to connect to API');
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    sendMessage,
    loading,
    error,
    setError,
    streamingResponse,
    currentWorkflowId,
    fullResponse,
    progress,
    setProgress,
    currentStep,
    setCurrentStep,
    completedNodes,
    isConnected,
    connectionError,
    checkConnection
  };
};