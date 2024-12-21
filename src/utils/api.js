const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://dify.analyserinsights.com';
};

const API_URL = `${getBaseUrl()}/api`;
const API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY;

export async function fetchDifyAPI(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  console.log('Making API request to:', url);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', {
      status: response.status,
      url: response.url,
      error: errorText
    });
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const handleWorkflowResponse = (response) => {
  if (!response?.data) {
    throw new Error('Invalid response from workflow API');
  }

  const { workflow_run_id, task_id, data } = response;

  if (!workflow_run_id || !task_id) {
    throw new Error('Missing workflow identifiers in response');
  }

  return {
    workflow_run_id,
    task_id,
    ...data
  };
};

export const API_ENDPOINTS = {
  WORKFLOW_RUN: '/api/workflows/run',
  WORKFLOW_STOP: (taskId) => `/api/workflows/tasks/${taskId}/stop`,
  WORKFLOW_LOGS: '/api/workflows/logs',
  PARAMETERS: '/api/parameters',
  FILE_UPLOAD: '/api/files/upload'
}; 