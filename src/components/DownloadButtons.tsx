import { useMemo } from 'react';
import { saveAs } from 'file-saver';
import { generatePDF, generateDOCX } from '../utils/documentGenerator';
import { DownloadableContent } from '../types/workflow';
import { Packer } from 'docx';

export const DownloadButtons: React.FC<DownloadableContent> = ({ 
  output, 
  summary,
  whole_output,
  whole_summary 
}) => {
  console.log('🎯 DownloadButtons Props:', { 
    output, 
    summary,
    whole_output,
    whole_summary
  });

  const hasData = useMemo(() => {
    const hasOutput = Array.isArray(output) && output.some(item => item?.length > 0);
    const hasWholeOutput = Array.isArray(whole_output) && whole_output.some(item => item?.length > 0);
    const hasSummary = typeof summary === 'string' && summary.length > 0;
    const hasWholeSummary = typeof whole_summary === 'string' && whole_summary.length > 0;

    console.log('🔍 Data Validation:', {
      hasOutput,
      hasWholeOutput,
      hasSummary,
      hasWholeSummary,
      outputLength: output?.length,
      wholeOutputLength: whole_output?.length,
      summaryLength: summary?.length,
      wholeSummaryLength: whole_summary?.length
    });

    return hasOutput || hasWholeOutput || hasSummary || hasWholeSummary;
  }, [output, whole_output, summary, whole_summary]);

  const handlePDFDownload = async () => {
    try {
      const contentToUse = output?.length ? output : whole_output || [];
      const summaryToUse = summary || whole_summary || '';
      
      const doc = generatePDF(contentToUse, summaryToUse);
      const blob = doc.output('blob');
      saveAs(blob, 'analysis-report.pdf');
    } catch (error) {
      console.error('PDF Generation Error:', error);
    }
  };

  const handleDOCXDownload = async () => {
    try {
      const contentToUse = output?.length ? output : whole_output || [];
      const summaryToUse = summary || whole_summary || '';
      
      const doc = generateDOCX(contentToUse, summaryToUse);
      const blob = await Packer.toBlob(doc);
      saveAs(blob, 'analysis-report.docx');
    } catch (error) {
      console.error('DOCX Generation Error:', error);
    }
  };

  if (!hasData) {
    console.log('❌ No data for downloads');
    return null;
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={handlePDFDownload}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Download PDF
      </button>
      <button
        onClick={handleDOCXDownload}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Download DOCX
      </button>
    </div>
  );
};