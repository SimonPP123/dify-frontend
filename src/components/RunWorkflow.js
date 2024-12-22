import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSession } from 'next-auth/react';
import { useDifyAPI } from '../hooks/useDifyAPI';
import { validateInputs } from '../utils/dataProcessing';
import { DIFY_APPS, INPUT_FIELDS } from '../utils/constants';
import { WorkflowProgress } from './WorkflowProgress';
import { WorkflowStateManager } from '../utils/WorkflowStateManager';
import { DownloadButtons } from './DownloadButtons';
import { CSVPreview } from './CSVPreview';
import { QuestionSelector } from './QuestionSelector';
import { ColumnSelector } from './ColumnSelector';

const schema = yup.object().shape({
  insights_number: yup.string()
    .oneOf(['5', '10', '15', '20', '25'], 'Please select a valid number of insights')
    .required('Number of insights is required'),
  summary_insights_number: yup.string()
    .oneOf(['10', '20', '30', '40', '50'], 'Please select a valid number of summary insights')
    .required('Number of summary insights is required'),
  language: yup.string()
    .oneOf(['Български', 'English'], 'Please select a valid language')
    .required('Language is required'),
  selectedApp: yup.string().required('Please select an application'),
  file_upload: yup.string().required('File content is required').max(1000000),
  selectedColumns: yup.array().min(1, 'Please select at least one column').required('Column selection is required'),
  selectedQuestionOptions: yup.array().of(
    yup.object().shape({
      question: yup.string().required(),
      options: yup.array().of(yup.string()),
      selectedOptions: yup.array().of(yup.string()).min(1, 'Please select at least one option')
    })
  )
});

const SelectField = ({ name, register, errors, options, label }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <select
      {...register(name)}
      className="w-full p-2 border rounded-md"
    >
      <option value="">Select {label}</option>
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {errors[name] && (
      <p className="text-red-500 text-sm mt-1">{errors[name].message}</p>
    )}
  </div>
);

const FileUploadSection = ({ register, errors, handleFileRead }) => (
  <>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload File (Required)
      </label>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileRead(file);
        }}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold"
      />
    </div>
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        File Content
      </label>
      <textarea
        {...register('file_upload')}
        readOnly
        className="w-full h-32 p-2 border rounded-md bg-gray-50"
      />
      {errors.file_upload && (
        <p className="text-red-500 text-sm mt-1">{errors.file_upload.message}</p>
      )}
    </div>
  </>
);

export default function RunWorkflow() {
  const { data: session } = useSession();
  const [finalResponse, setFinalResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const { 
    sendMessage, 
    loading, 
    error, 
    setError, 
    streamingResponse,
    currentWorkflowId,
    fullResponse,
    progress,
    currentStep,
    completedNodes,
    isConnected,
    connectionError,
    checkConnection,
    fetchWorkflowResult
  } = useDifyAPI();

  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [questions, setQuestions] = useState([]);

  const getWorkflowState = useCallback(() => {
    if (!currentWorkflowId) return null;
    return WorkflowStateManager.getWorkflowState(currentWorkflowId);
  }, [currentWorkflowId]);

  const onSubmit = async (data) => {
    console.log('🔥 Step 1: Submit button clicked');
    console.log('Form data:', data);

    if (!session?.user?.id) {
      console.log('❌ No user session');
      setError('User session is required');
      return;
    }

    if (!isConnected) {
      console.log('Checking connection...');
      try {
        await checkConnection();
      } catch (err) {
        console.error('Connection check failed:', err);
        setError('Cannot connect to API. Please try again later.');
        return;
      }
    }

    setFinalResponse(null);
    
    try {
      console.log('🚀 Step 2: Validating inputs');
      const validatedInputs = validateInputs({
        ...data,
        selectedColumns,
        selectedQuestionOptions: questions.map(q => ({
          question: q.question,
          options: q.options,
          selectedOptions: q.selectedOptions
        }))
      }, session.user.id);
      
      console.log('✅ Validated inputs:', validatedInputs);
      
      console.log('🚀 Step 3: Sending message');
      const result = await sendMessage({
        inputs: validatedInputs,
        response_mode: 'streaming',
        user: session.user.id
      });
      
      console.log('✅ Message sent, result:', result);
    } catch (err) {
      console.error('❌ Submission error:', err);
    }
  };

  useEffect(() => {
    let timerId;
    
    if (currentWorkflowId) {
      let attempts = 0;
      const maxAttempts = 5;
      
      const checkProgress = async () => {
        try {
          const result = await fetchWorkflowResult(currentWorkflowId);
          if (result.status === 'completed' || attempts >= maxAttempts) {
            clearInterval(timerId);
          }
          attempts++;
        } catch (err) {
          console.error('Error fetching workflow result:', err);
          if (attempts >= maxAttempts) {
            setError('Failed to fetch final workflow result after multiple attempts');
            clearInterval(timerId);
          }
        }
      };
      
      timerId = setInterval(checkProgress, 60000);
    }
    
    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [currentWorkflowId, fetchWorkflowResult, setError]);

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, dirtyFields }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      insights_number: '',
      summary_insights_number: '',
      language: '',
      selectedApp: DIFY_APPS.APP_1.ID,
      file_upload: '',
      selectedColumns: [],
      selectedQuestionOptions: []
    }
  });

  const handleFileRead = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      const parsedQuestions = [];
      let currentQuestion = null;
      
      for (let i = 0; i < lines.length; i++) {
        const columns = lines[i].split(',').map(col => col.trim());
        console.log('Processing line:', i, 'Column 1:', columns[0], 'Column 2:', columns[1]);
        
        if (columns[0].match(/^В\d+/)) {
          if (currentQuestion) {
            parsedQuestions.push(currentQuestion);
          }
          currentQuestion = {
            question: columns[0],
            options: [],
            selectedOptions: []
          };
          console.log('New question found:', currentQuestion);
        } 
        else if (currentQuestion && columns[1] && columns[1] !== 'Total') {
          currentQuestion.options.push(columns[1]);
          console.log('Added option:', columns[1], 'to question:', currentQuestion.question);
        }
      }
      
      if (currentQuestion) {
        parsedQuestions.push(currentQuestion);
      }

      console.log('Final parsed questions:', parsedQuestions);
      setQuestions(parsedQuestions);
      setValue('selectedQuestionOptions', parsedQuestions, { 
        shouldValidate: true,
        shouldDirty: true 
      });
      
      const headers = lines[0].split(',').map(h => h.trim());
      setSelectedColumns([...headers]);
      setValue('selectedColumns', headers, {
        shouldValidate: true,
        shouldDirty: true
      });
      
      setCsvData({
        headers,
        rows: lines.slice(1).map(line => line.split(',').map(cell => cell.trim()))
      });

      const markdownTable = [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...lines.slice(1).map(line => `| ${line.split(',').join(' | ')} |`)
      ].join('\n');

      setValue('file_upload', markdownTable, {
        shouldValidate: true,
        shouldDirty: true
      });
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file content');
    }
  };

  useEffect(() => {
    if (csvData.headers.length > 0) {
      setSelectedColumns([]);
      setValue('selectedColumns', []);
    }
  }, [csvData.headers]);

  const handleColumnChange = (columns) => {
    setSelectedColumns(columns);
    setValue('selectedColumns', columns);
  };

  const handleQuestionOptionsChange = (questionIndex, selectedOptions) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].selectedOptions = selectedOptions;
    setQuestions(updatedQuestions);
  };

  const hasValidData = fullResponse && 
    (fullResponse.output || fullResponse.questions) && 
    Object.keys(fullResponse).length > 0;

  const renderConnectionStatus = () => {
    if (connectionError) {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {connectionError}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Connected to API
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    console.log('Session state:', session);
  }, [session]);

  const handleDifyAPICall = async (validatedInputs) => {
    try {
      const response = await fetch('https://dify.analyserinsights.com/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer app-DG8cFxyufszAnkEdVJANHNin`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: validatedInputs,
          response_mode: 'streaming',
          user: session?.user?.id || 'anonymous'
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return response;
    } catch (error) {
      console.error('Dify API call failed:', error);
      throw error;
    }
  };

  const handleTestCall = async () => {
    setTestLoading(true);
    try {
      const formValues = getValues();
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            insights_number: formValues.insights_number,
            summary_insights_number: formValues.summary_insights_number,
            language: formValues.language,
            file_upload: formValues.file_upload,
            selectedColumns: selectedColumns,
            selectedQuestionOptions: questions.map(q => ({
              question: q.question,
              options: q.options,
              selectedOptions: q.selectedOptions
            })),
            'sys.app_id': DIFY_APPS.APP_1.ID,
            'sys.user_id': 'test-user-1'
          },
          response_mode: 'streaming',
          user: 'test-user-1'
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const jsonStr = line.slice(5); // Remove 'data: ' prefix
            const eventData = JSON.parse(jsonStr);
            
            // Accumulate the response data
            if (eventData.event === 'workflow_finished' && eventData.data?.outputs) {
              result = { ...result, ...eventData.data.outputs };
            } else if (eventData.data?.outputs?.text) {
              result.text = (result.text || '') + eventData.data.outputs.text;
            }
          } catch (e) {
            console.warn('Failed to parse SSE message:', line);
          }
        }
      }

      setTestResponse(result);
    } catch (error) {
      console.error('Test API call failed:', error);
      setTestResponse({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {renderConnectionStatus()}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <SelectField
          name="insights_number"
          register={register}
          errors={errors}
          options={['5', '10', '15', '20', '25']}
          label="Number of Insights"
        />
        <SelectField
          name="summary_insights_number"
          register={register}
          errors={errors}
          options={['10', '20', '30', '40', '50']}
          label="Number of Summary Insights"
        />
        <SelectField
          name="language"
          register={register}
          errors={errors}
          options={['Български', 'English']}
          label="Language"
        />

        <FileUploadSection
          register={register}
          errors={errors}
          handleFileRead={handleFileRead}
        />

        {csvData.headers.length > 0 && (
          <ColumnSelector
            headers={csvData.headers}
            selectedColumns={selectedColumns}
            onColumnChange={handleColumnChange}
            error={errors.selectedColumns?.message}
          />
        )}

        {questions.length > 0 && (
          <QuestionSelector
            questions={questions}
            onOptionsChange={handleQuestionOptionsChange}
            error={errors.selectedQuestionOptions?.message}
          />
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleTestCall}
            disabled={testLoading}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {testLoading ? 'Testing...' : 'Test API'}
          </button>

          <button
            type="submit"
            disabled={loading || !session}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {!session ? 'Please sign in' : loading ? 'Processing...' : 'Run Workflow'}
          </button>
        </div>
      </form>

      {csvData.headers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">CSV Preview</h3>
          <CSVPreview 
            csvData={csvData}
            isLoading={loading}
          />
        </div>
      )}

      {testResponse && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Test Response</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(testResponse, null, 2)}
          </pre>
        </div>
      )}

      {currentWorkflowId && (
        <WorkflowProgress
          state={{
            workflowRunId: currentWorkflowId,
            status: loading ? 'running' : 'pending',
            progress: {
              currentNode: currentStep,
              completedNodes: Array.from(completedNodes),
              outputs: [],
              lastUpdateTime: Date.now()
            },
            startTime: Date.now(),
            lastActiveTime: Date.now(),
            inputs: {},
            streamingResponse: streamingResponse,
            retryCount: 0,
            metadata: {
              userId: session?.user?.id || '',
              appId: DIFY_APPS.APP_1.ID,
              finishedAt: null
            }
          }}
          streamingResponse={streamingResponse}
          error={error}
          progress={progress}
          currentStep={currentStep}
        />
      )}

      {hasValidData && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl">Final Result:</h3>
            <DownloadButtons 
              output={fullResponse.output ? (Array.isArray(fullResponse.output) ? fullResponse.output : [fullResponse.output]) : []}
              summary={fullResponse.summary}
            />
          </div>
          <div className="bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap">
            {typeof fullResponse === 'string' 
              ? fullResponse 
              : JSON.stringify(fullResponse, null, 2)
            }
          </div>
        </div>
      )}
    </div>
  );
}