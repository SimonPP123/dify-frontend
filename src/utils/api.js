const API_URL = process.env.DIFY_API_URL;
const API_KEY = process.env.DIFY_API_KEY;

export const getApiUrl = (endpoint) => {
  const baseUrl = process.env.DIFY_API_URL?.replace(/\/v1$/, '');
  return `${baseUrl}${endpoint}`;
};

export async function fetchDifyAPI(endpoint, options = {}) {
  const response = await fetch(getApiUrl(endpoint), {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
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
  WORKFLOW_RUN: '/v1/workflows/run',
  WORKFLOW_STOP: (taskId) => `/v1/workflows/tasks/${taskId}/stop`,
  WORKFLOW_LOGS: '/v1/workflows/logs',
  PARAMETERS: '/v1/parameters',
  FILE_UPLOAD: '/v1/files/upload'
}; 