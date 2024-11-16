const API_URL = process.env.DIFY_API_URL;
const API_KEY = process.env.DIFY_API_KEY;

export async function fetchDifyAPI(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
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
  WORKFLOW_RUN: '/api/workflows/run',
  WORKFLOW_STOP: (taskId) => `/api/workflows/tasks/${taskId}/stop`,
  WORKFLOW_LOGS: '/api/workflows/logs',
  PARAMETERS: '/api/parameters',
  FILE_UPLOAD: '/api/files/upload'
}; 