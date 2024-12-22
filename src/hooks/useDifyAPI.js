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
      console.log('Attempting to send workflow request:', {
        url: `${process.env.DIFY_API_URL}/v1/workflows/run`,
        payload,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
        }
      });

      const response = await fetch(`${process.env.DIFY_API_URL}/v1/workflows/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Workflow API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
      }
      
      return response;
    } catch (error) {
      console.error('Workflow API Error:', error);
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
        return sendMessageWithRetry(payload, retryCount + 1);
      }
      throw error;
    }
  };

  const processResponse = (eventData) => {
    if (eventData.event === 'workflow_finished' && eventData.data?.outputs) {
      const { text } = eventData.data.outputs;
      
      // Extract insights and summary sections
      const insightsMatch = text.match(/Инсайти:\n([\s\S]*?)(?=\n\n|$)/);
      const summaryMatch = text.match(/<Резюме и Изводи>\n([\s\S]*?)(?=<\/Резюме и Изводи>|$)/);
      
      setFullResponse({
        output: insightsMatch ? insightsMatch[1].split('\n').filter(Boolean) : [],
        summary: summaryMatch ? summaryMatch[1].trim() : '',
        whole_output: [text],
        whole_summary: summaryMatch ? `<Резюме и Изводи>\n${summaryMatch[1]}\n</Резюме и Изводи>` : ''
      });
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

      const handleStreamResponse = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              try {
                const eventData = JSON.parse(line.slice(5));
                const result = processResponse(eventData);
                if (result) {
                  setFullResponse(result);
                } else if (eventData.data?.outputs?.text) {
                  setStreamingResponse(prev => prev + eventData.data.outputs.text);
                }
              } catch (e) {
                console.warn('Failed to parse SSE message:', e);
              }
            }
          }
        } catch (error) {
          throw new Error(`Stream reading failed: ${error.message}`);
        }
      };

      await handleStreamResponse(response);

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