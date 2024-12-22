import { useState } from 'react';
import { DownloadButtons } from './DownloadButtons';
import { transformDifyResponse, createEmptyResponse } from '../utils/responseTransformer';

export const TestWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [formattedResponse, setFormattedResponse] = useState(() => createEmptyResponse());
  const [formData, setFormData] = useState({
    insights_number: '5',
    summary_insights_number: '10',
    language: 'English',
    file_content: ''
  });

  const updateResponse = (data) => {
    console.log('🔄 Updating Response States:', data);
    setResponse(data);
    const transformed = transformDifyResponse(data);
    console.log('🔄 Transformed Data:', transformed);
    setFormattedResponse(transformed);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setFormattedResponse(createEmptyResponse());
    
    try {
      const result = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: formData,
          response_mode: 'blocking',
          user: 'test-user-1'
        })
      });

      if (!result.ok) {
        throw new Error(`API error: ${result.status}`);
      }

      const data = await result.json();
      console.log('🌟 API Response:', data);
      
      // Set raw response first
      setResponse(data);
      
      // Transform and set formatted response
      const transformed = transformDifyResponse(data);
      console.log('🔄 Transformed Response:', transformed);
      setFormattedResponse(transformed);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const processStreamingResponse = (eventData) => {
    if (eventData.event === 'workflow_finished' && eventData.data?.outputs) {
      const { text } = eventData.data.outputs;
      
      // Extract insights and summary sections
      const insightsMatch = text.match(/Инсайти:\n([\s\S]*?)(?=\n\n|$)/);
      const summaryMatch = text.match(/<Резюме и Изводи>\n([\s\S]*?)(?=<\/Резюме и Изводи>|$)/);
      
      setFormattedResponse({
        output: insightsMatch ? [insightsMatch[1]] : [],
        summary: summaryMatch ? summaryMatch[1].trim() : '',
        whole_output: [text],
        whole_summary: summaryMatch ? `<Резюме и Изводи>\n${summaryMatch[1]}\n</Резюме и Изводи>` : ''
      });
      
      setResponse(text);
    }
  };

  const TestResponse = ({ response, formattedResponse }) => {
    if (!response) return null;

    console.log('📦 TestResponse Props:', { response, formattedResponse });

    // Extract the correct data structure
    const responseData = response?.outputs || response;
    
    const downloadProps = {
      output: Array.isArray(responseData.output) ? responseData.output : [],
      summary: responseData.summary || '',
      whole_output: Array.isArray(responseData.whole_output) ? responseData.whole_output : [],
      whole_summary: responseData.whole_summary || ''
    };

    console.log('📦 Download Props:', downloadProps);

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test Response</h3>
          <DownloadButtons {...downloadProps} />
        </div>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(responseData, null, 2)}
        </pre>
      </div>
    );
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
        <>
          <TestResponse 
            response={response}
            formattedResponse={formattedResponse}
          />
        </>
      )}
    </div>
  );
};
