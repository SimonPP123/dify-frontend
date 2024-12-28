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
import { StatisticalOptionsSelector } from './StatisticalOptionsSelector';
import { transformDifyResponse, createEmptyResponse } from '../utils/responseTransformer';

const schema = yup.object().shape({
  insights_number: yup.string()
    .oneOf(['1', '2', '3', '4', '5'], 'Please select a valid number of insights')
    .required('Number of insights is required'),
  summary_insights_number: yup.string()
    .oneOf(['10', '20', '30', '40', '50'], 'Please select a valid number of summary insights')
    .required('Number of summary insights is required'),
  language: yup.string()
    .oneOf(['Български', 'English'], 'Please select a valid language')
    .required('Language is required'),
  file_upload: yup.string().required('File content is required'),
  columns_selected: yup.string().required('Column selection is required'),
  question_rows_selected: yup.string().required('Question selections are required'),
  statistics_selected: yup.string().required('Statistical options are required')
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
  const [testResponse, setTestResponse] = useState({
    output: [],
    summary: '',
    whole_output: [],
    whole_summary: ''
  });
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
  const [selectedStatOptions, setSelectedStatOptions] = useState([]);

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
        columns_selected: selectedColumns.join(','),
        question_rows_selected: questions.map(q => q.selectedOptions.join(',')),
        statistics_selected: selectedStatOptions.join(',')
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
      
      // Remove any BOM and normalize line endings
      const normalizedText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      const lines = normalizedText.split('\n');
      
      const parsedQuestions = [];
      let currentQuestion = null;
      let questionNumber = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        const firstColumn = row[0]?.trim().replace(/^"|"$/g, '');
        
        // Skip header row
        if (firstColumn === 'Въпрос') continue;
        
        if (firstColumn && !firstColumn.startsWith(',')) {
          questionNumber++;
          if (currentQuestion) {
            parsedQuestions.push(currentQuestion);
          }

          currentQuestion = {
            questionNumber: questionNumber.toString(),
            questionText: firstColumn,
            headerValue: row[1]?.trim().replace(/^"|"$/g, '') || 'Total',
            options: [row[1]?.trim().replace(/^"|"$/g, '') || 'Total'],
            cleanOptions: [row[1]?.trim().replace(/^"|"$/g, '') || 'Total'],
            selectedOptions: []
          };
        } 
        else if (currentQuestion && row.length > 1) {
          const optionText = row[1]?.trim().replace(/^"|"$/g, '');
          
          if (optionText) {
            currentQuestion.options.push(optionText);
            currentQuestion.cleanOptions.push(optionText);
          }
        }
      }
      
      if (currentQuestion) {
        parsedQuestions.push(currentQuestion);
      }

      setQuestions(parsedQuestions);
      setValue('question_rows_selected', parsedQuestions);
      
      // Process headers
      const headers = lines[0].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map(h => h.trim().replace(/^"|"$/g, ''));
      
      setSelectedColumns([...headers]);
      setValue('selectedColumns', headers);
      
      setCsvData({
        headers,
        rows: lines.slice(1).map(line => 
          line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(cell => cell.trim().replace(/^"|"$/g, ''))
        )
      });

      // Create markdown table with preserved formatting
      const markdownTable = [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...lines.slice(1).map(line => 
          `| ${line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
            .map(cell => cell.trim().replace(/^"|"$/g, ''))
            .join(' | ')} |`
        )
      ].join('\n');

      setValue('file_upload', markdownTable);

    } catch (error) {
      console.error('Error reading file:', error);
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
    console.group('🔍 Question Options Change Debug');
    console.log('Index:', questionIndex);
    console.log('Raw Selected Options:', selectedOptions);
    
    setQuestions(prevQuestions => {
      const updatedQuestions = [...prevQuestions];
      
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        selectedOptions: selectedOptions
      };

      const formattedData = updatedQuestions
        .filter(q => q.selectedOptions?.length > 0)
        .map(q => {
          const questionStr = `Question ${q.questionNumber} ${q.questionText}`;
          
          const selectedValues = q.selectedOptions;

          return `${questionStr}::${selectedValues.join(',')}`;
        })
        .join('|');

      console.log('📤 Final Formatted Data:', formattedData);
      console.groupEnd();

      setValue('question_rows_selected', formattedData);
      return updatedQuestions;
    });
  };

  const handleStatOptionsChange = (options) => {
    setSelectedStatOptions(options);
    setValue('statisticalOptions', options);
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
                Connected to Dify
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
      
      if (!formValues.insights_number || !formValues.summary_insights_number || 
          !formValues.language || !formValues.file_upload) {
        throw new Error('Please fill in all required fields');
      }

      const requestBody = {
        inputs: {
          insights_number: formValues.insights_number,
          summary_insights_number: formValues.summary_insights_number,
          language: formValues.language,
          file_upload: formValues.file_upload,
          columns_selected: selectedColumns.join(':::'),
          question_rows_selected: questions
            .filter(q => q.selectedOptions.length > 0)
            .map(q => {
              const questionStr = `Question ${q.questionNumber} ${q.questionText}`;
              return `${questionStr}::${q.selectedOptions.join(':::')}`;
            })
            .join('|'),
          statistics_selected: selectedStatOptions.join(':::'),
          'sys.app_id': DIFY_APPS.APP_1.ID,
          'sys.user_id': session?.user?.id || 'anonymous'
        },
        response_mode: 'streaming',
        user: session?.user?.id || 'anonymous'
      };

      console.log('Sending request:', requestBody);

      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Dify API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              console.log('Parsed chunk:', data);
              
              if (data.event === 'workflow_finished' && data.data?.outputs) {
                const outputs = data.data.outputs;
                setTestResponse({
                  output: outputs.output || [],
                  summary: outputs.summary || '',
                  whole_output: outputs.whole_output || [],
                  whole_summary: outputs.whole_summary || ''
                });
              } else if (data.event === 'node_finished' && data.data?.outputs) {
                const outputs = data.data.outputs;
                setTestResponse(prev => ({
                  output: outputs.output || prev.output || [],
                  summary: outputs.summary || prev.summary || '',
                  whole_output: outputs.whole_output || prev.whole_output || [],
                  whole_summary: outputs.whole_summary || prev.whole_summary || ''
                }));
              }
            } catch (e) {
              console.warn('Failed to parse SSE message:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Test API call failed:', error);
      setError(error.message);
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
          options={['1', '2', '3', '4', '5']}
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
          <>
            <ColumnSelector
              headers={csvData.headers}
              selectedColumns={selectedColumns}
              onColumnChange={handleColumnChange}
              error={errors.selectedColumns?.message}
            />
          </>
        )}

        {questions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Question Selection</h3>
            <QuestionSelector
              questions={questions.map(q => ({
                ...q,
                questionText: q.questionText,
                options: q.cleanOptions,
                selectedOptions: q.selectedOptions
              }))}
              onOptionsChange={handleQuestionOptionsChange}
              error={errors.selectedQuestionOptions?.message}
            />
          </div>
        )}

        <StatisticalOptionsSelector
          selectedOptions={selectedStatOptions}
          onOptionsChange={handleStatOptionsChange}
          error={errors.statisticalOptions?.message}
        />

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleTestCall}
            disabled={testLoading}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300"
          >
            {testLoading ? 'Processing...' : 'Run Analysis'}
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

      {testResponse && (testResponse.output?.length > 0 || testResponse.summary) && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Analysis Results</h3>
            <DownloadButtons 
              output={testResponse.output || []}
              summary={testResponse.summary || ''}
              whole_output={testResponse.whole_output || []}
              whole_summary={testResponse.whole_summary || ''}
            />
          </div>
          <div className="space-y-4">
            {testResponse.output?.map((insight, index) => (
              <div key={index} className="p-3 bg-white rounded shadow">
                {insight}
              </div>
            ))}
            {testResponse.summary && (
              <div className="p-3 bg-white rounded shadow mt-4">
                <h4 className="font-medium mb-2">Summary</h4>
                {testResponse.summary}
              </div>
            )}
          </div>
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