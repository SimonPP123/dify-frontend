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
  file_upload: yup.string().required('File content is required').max(1000000)
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
  const { 
    sendMessage, 
    loading, 
    error, 
    setError, 
    streamingResponse,
    currentWorkflowId,
    fullResponse,
    fetchWorkflowResult,
    isConnected,
    connectionError,
    checkConnection
  } = useDifyAPI();

  const getWorkflowState = useCallback(() => {
    if (!currentWorkflowId) return null;
    return WorkflowStateManager.getWorkflowState(currentWorkflowId);
  }, [currentWorkflowId]);

  const onSubmit = async (data) => {
    if (!session?.user?.id) {
      setError('User session is required');
      return;
    }

    setFinalResponse(null);
    
    try {
      const validatedInputs = validateInputs(data, session.user.id);
      
      const result = await sendMessage({
        inputs: validatedInputs,
        response_mode: 'streaming',
        user: session.user.id
      });
      
      console.log('Initial API response:', result);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to process workflow');
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

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      selectedApp: DIFY_APPS.APP_1.ID
    }
  });

  const handleFileRead = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const markdownTable = [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...lines.slice(1)
          .filter(line => line.trim())
          .map(line => `| ${line.split(',').join(' | ')} |`)
      ].join('\n');

      setValue('file_upload', markdownTable);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file content');
    }
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {renderConnectionStatus()}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {Object.entries(INPUT_FIELDS).map(([key, field]) => (
          <div key={key}>
            {field.type === 'select' ? (
              <SelectField
                name={field.variable}
                register={register}
                errors={errors}
                options={field.options}
                label={field.label}
              />
            ) : null}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Application
          </label>
          <select
            {...register('selectedApp')}
            className="w-full p-2 border rounded-md"
          >
            {Object.values(DIFY_APPS).map(app => (
              <option key={app.ID} value={app.ID}>
                {app.NAME} - {app.DESCRIPTION}
              </option>
            ))}
          </select>
          {errors.selectedApp && (
            <p className="text-red-500 text-sm mt-1">{errors.selectedApp.message}</p>
          )}
        </div>

        <FileUploadSection
          register={register}
          errors={errors}
          handleFileRead={handleFileRead}
        />

        <div className="space-y-4">
          <button
            type="submit"
            disabled={loading || !session}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {!session ? 'Please sign in' : loading ? 'Processing...' : 'Run Workflow'}
          </button>

          {loading && (
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Processing your request...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {currentWorkflowId && (
        <WorkflowProgress
          state={getWorkflowState() || {
            workflowRunId: currentWorkflowId,
            status: loading ? 'running' : 'pending',
            progress: {
              currentNode: '',
              completedNodes: [],
              outputs: [],
              lastUpdateTime: Date.now()
            },
            startTime: Date.now(),
            lastActiveTime: Date.now(),
            inputs: {},
            streamingResponse: '',
            retryCount: 0,
            metadata: {
              userId: session?.user?.id || '',
              appId: '',
              finishedAt: null
            }
          }}
          streamingResponse={streamingResponse}
          error={error}
        />
      )}

      {hasValidData && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl">Final Result:</h3>
            <DownloadButtons 
              output={fullResponse.output ? (Array.isArray(fullResponse.output) ? fullResponse.output : [fullResponse.output]) : []}
              questions={fullResponse.questions ? (Array.isArray(fullResponse.questions) ? fullResponse.questions : [fullResponse.questions]) : []}
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