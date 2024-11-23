import React from 'react';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';
import { generatePDF, generateDOCX } from '../utils/documentGenerator';

interface DownloadButtonsProps {
  output: string[];
  summary?: string;
}

export const DownloadButtons: React.FC<DownloadButtonsProps> = ({ output, summary }) => {
  const hasData = output?.length > 0;

  const validateData = (data: any[]) => {
    return Array.isArray(data) ? data : [];
  };

  const handlePDFDownload = async () => {
    if (!hasData) return;
    try {
      const validatedOutput = validateData(output);
      
      console.log('Validated PDF data:', {
        output: validatedOutput,
        summary
      });
      
      const doc = generatePDF(validatedOutput, summary);
      const blob = doc.output('blob');
      saveAs(blob, 'analysis-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDOCXDownload = async () => {
    if (!hasData) return;
    try {
      const validatedOutput = validateData(output);
      
      console.log('Validated DOCX data:', {
        output: validatedOutput,
        summary
      });
      
      const doc = generateDOCX(validatedOutput, summary);
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'analysis-report.docx');
    } catch (error) {
      console.error('Error generating DOCX:', error);
    }
  };

  return (
    <div className="flex gap-4">
      <button
        onClick={handlePDFDownload}
        disabled={!hasData}
        className={`px-4 py-2 text-white rounded-md transition-colors ${
          hasData ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-300 cursor-not-allowed'
        }`}
      >
        Download PDF
      </button>
      <button
        onClick={handleDOCXDownload}
        disabled={!hasData}
        className={`px-4 py-2 text-white rounded-md transition-colors ${
          hasData ? 'bg-green-600 hover:bg-green-700' : 'bg-green-300 cursor-not-allowed'
        }`}
      >
        Download DOCX
      </button>
    </div>
  );
};