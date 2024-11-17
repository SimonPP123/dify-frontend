import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

// Define interface for jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => void;
  lastAutoTable?: {
    finalY: number;
  };
}

declare module 'jspdf' {
  interface jsPDF {
    addFileToVFS(filename: string, base64Content: string): void;
    addFont(url: string, fontName: string, fontStyle: string, encoding?: string): void;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    splitTextToSize(text: string, maxWidth: number, options?: { fontName?: string }): string[];
  }
}

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface UserOptions {
    head?: any[][];
    body?: any[][];
    startY?: number;
    margin?: { left: number; right: number };
    styles?: {
      font?: string;
      fontSize?: number;
    };
    headStyles?: {
      font?: string;
      fontSize?: number;
      fillColor?: number[];
    };
    didDrawCell?: (data: any) => void;
  }

  interface AutoTable {
    (options: UserOptions): void;
    previous?: {
      finalY: number;
    };
  }
}