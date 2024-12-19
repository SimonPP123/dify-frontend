import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ErrorMessage from './ErrorMessage';

// Define the form input types with exact types
type InsightNumber = "5" | "10" | "15" | "20" | "25";
type Language = "en" | "vi";

interface WorkflowFormInputs {
  file_upload: FileList;
  insights_number: InsightNumber;
  language: Language;
}

// Create a type-safe validation schema
const schema = yup.object({
  file_upload: yup
    .mixed<FileList>()
    .required('File is required')
    .test('fileType', 'Only CSV files are allowed', (value?: FileList) => {
      if (!value?.[0]) return false;
      return value[0].type === 'text/csv';
    }),
  insights_number: yup
    .string()
    .required('Number of insights is required')
    .oneOf(['5', '10', '15', '20', '25'] as const, 'Please select a valid number of insights') as yup.StringSchema<InsightNumber>,
  language: yup
    .string()
    .required('Language is required')
    .oneOf(['en', 'vi'] as const, 'Please select a valid language') as yup.StringSchema<Language>,
}).required();

const WorkflowForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<WorkflowFormInputs>({
    resolver: yupResolver(schema) as any // Type assertion needed due to yup/react-hook-form type mismatch
  });

  // Rest of the component remains the same
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [workflowResult, setWorkflowResult] = useState<any>(null);

  const onSubmit = async (data: WorkflowFormInputs) => {
    setIsLoading(true);
    setApiError(null);
    setWorkflowResult(null);

    try {
      const formData = new FormData();
      formData.append('file', data.file_upload[0]);
      formData.append('insights_number', data.insights_number);
      formData.append('language', data.language);

      const response = await fetch('/api/sendToWorkflow', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setWorkflowResult(result.workflowResult);
        reset();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Workflow submission error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to submit form');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">File Analysis Workflow</h2>

      {apiError && <ErrorMessage message={apiError} />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            {...register('file_upload')}
            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.file_upload && (
            <p className="mt-1 text-sm text-red-600">{errors.file_upload.message}</p>
          )}
        </div>

        {/* Insights Number Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Insights
          </label>
          <select
            {...register('insights_number')}
            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select number of insights</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
            <option value="25">25</option>
          </select>
          {errors.insights_number && (
            <p className="mt-1 text-sm text-red-600">{errors.insights_number.message}</p>
          )}
        </div>

        {/* Language Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <select
            {...register('language')}
            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select language</option>
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
          </select>
          {errors.language && (
            <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Processing...' : 'Analyze File'}
        </button>
      </form>

      {/* Display Results */}
      {workflowResult && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Analysis Results:</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(workflowResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowForm;