import { useState } from 'react';
import { DownloadButtons } from './DownloadButtons';

export const TestWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [formattedResponse, setFormattedResponse] = useState({
    output: [],
    summary: ''
  });
  const [formData, setFormData] = useState({
    insights_number: '5',
    summary_insights_number: '10',
    language: 'English',
    file_content: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse('');
    setFormattedResponse({ output: [], summary: '' });
    
    try {
      const response = await fetch('https://dify.analyserinsights.com/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            insights_number: formData.insights_number,
            summary_insights_number: formData.summary_insights_number,
            language: formData.language,
            file_upload: formData.file_content
          },
          response_mode: 'streaming',
          user: 'test-user-1'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      let buffer = '';
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const jsonStr = line.slice(5);
            const eventData = JSON.parse(jsonStr);
            
            if (eventData.data?.outputs?.text) {
              setResponse(prev => prev + eventData.data.outputs.text + '\n');
              
              if (eventData.event === 'workflow_finished') {
                setFormattedResponse({
                  output: eventData.data.outputs.text.split('\n').filter(Boolean),
                  summary: eventData.data.outputs.summary || ''
                });
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE message:', line);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Test Workflow API</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">Number of Insights:</label>
          <select 
            value={formData.insights_number}
            onChange={e => setFormData(prev => ({ ...prev, insights_number: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="25">25</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Number of Summary Insights:</label>
          <select 
            value={formData.summary_insights_number}
            onChange={e => setFormData(prev => ({ ...prev, summary_insights_number: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="40">40</option>
            <option value="50">50</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Language:</label>
          <select 
            value={formData.language}
            onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="English">English</option>
            <option value="Български">Български</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">File Content:</label>
          <textarea
            value={formData.file_content}
            onChange={e => setFormData(prev => ({ ...prev, file_content: e.target.value }))}
            className="w-full p-2 border rounded h-32"
            placeholder="Paste your file content here..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? 'Processing...' : 'Test API Call'}
        </button>
      </form>

      {response && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl mb-2">Response:</h3>
            <DownloadButtons 
              output={formattedResponse.output}
              summary={formattedResponse.summary}
            />
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
};
