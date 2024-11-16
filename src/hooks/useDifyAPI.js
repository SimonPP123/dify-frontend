import { useState, useCallback, useRef, useEffect } from 'react';

export const useDifyAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [fullResponse, setFullResponse] = useState(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
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
                  setStreamingResponse(prev => prev + event.data.outputs.text + '\n');
                }
                break;
              
              case 'workflow_finished':
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