import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { WorkflowInputs } from '../types/workflow';

interface FileUploadSectionProps {
  register: UseFormRegister<WorkflowInputs>;
  errors: FieldErrors<WorkflowInputs>;
  handleFileRead: (file: File) => Promise<void>;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  register,
  errors,
  handleFileRead
}) => {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload File (Required)
        </label>
        <input
          {...register('file')}
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
}; 