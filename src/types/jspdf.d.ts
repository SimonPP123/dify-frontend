import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    addFont(url: string, fontName: string, fontStyle: string): void;
    autoTable: (options: any) => void;
  }
}