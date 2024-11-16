// documentGenerator.ts

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from 'docx';
import { RobotoRegularBase64, RobotoBoldBase64 } from '../../fonts';

interface QuestionData {
  Въпрос: string;
  Отговори: string;
  [key: string]: string;
}

interface MarkdownItem {
  text: string;
  isHeader: boolean;
  headerLevel: number;
}

interface TextSegment {
  text: string;
  isBold: boolean;
}

const FONTS = {
  REGULAR: {
    name: 'Roboto-Regular',
    style: 'normal'
  },
  BOLD: {
    name: 'Roboto-Bold',
    style: 'bold'
  }
};

const getHeadingLevel = (level: number): typeof HeadingLevel[keyof typeof HeadingLevel] => {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return HeadingLevel.HEADING_1;
  }
};

const parseQuestionsData = (questionString: string): QuestionData[] => {
  try {
    return JSON.parse(questionString);
  } catch (error) {
    console.error('Error parsing question data:', error);
    return [];
  }
};

const parseMarkdown = (text: string): MarkdownItem[] => {
  return text.split('\n').map(line => ({
    text: line.replace(/^#{1,6}\s/, '').trim(),
    isHeader: line.startsWith('#'),
    headerLevel: (line.match(/^#{1,6}\s/) || [''])[0].trim().length
  }));
};

const parseBoldText = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  const boldPattern = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    // Add non-bold text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        isBold: false
      });
    }
    // Add bold text
    segments.push({
      text: match[1],
      isBold: true
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining non-bold text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isBold: false
    });
  }

  return segments;
};

class PDFGenerator {
  private doc: jsPDF;
  private yOffset: number;
  private margin: number;
  private pageWidth: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: 'a4',
      putOnlyUsedFonts: true,
      compress: true
    });
    this.initializeFonts();
    this.yOffset = 40;
    this.margin = 40;
    this.pageWidth = this.doc.internal.pageSize.width;
  }

  private initializeFonts() {
    try {
      console.log('Initializing fonts...');
      
      // Add regular font
      this.doc.addFileToVFS(`${FONTS.REGULAR.name}.ttf`, RobotoRegularBase64);
      this.doc.addFont(`${FONTS.REGULAR.name}.ttf`, FONTS.REGULAR.name, FONTS.REGULAR.style);
      
      // Add bold font
      this.doc.addFileToVFS(`${FONTS.BOLD.name}.ttf`, RobotoBoldBase64);
      this.doc.addFont(`${FONTS.BOLD.name}.ttf`, FONTS.BOLD.name, FONTS.BOLD.style);
      
      // Set default font
      this.doc.setFont(FONTS.REGULAR.name, FONTS.REGULAR.style);
      this.doc.setLanguage("bg");
      
      console.log('Fonts initialized successfully');
    } catch (error) {
      console.error('Error initializing fonts:', error);
      throw new Error('Font initialization failed');
    }
  }

  private checkPageBreak() {
    if (this.yOffset > this.doc.internal.pageSize.height - this.margin) {
      this.doc.addPage();
      this.yOffset = this.margin;
    }
  }

  private addText(text: string, fontSize: number, isHeader: boolean = false) {
    try {
      this.doc.setFontSize(fontSize);
      
      const segments = parseBoldText(text);
      let currentX = this.margin;
      let textWidth = 0;
      
      segments.forEach(segment => {
        const fontStyle = segment.isBold || isHeader ? FONTS.BOLD.style : FONTS.REGULAR.style;
        const fontName = segment.isBold || isHeader ? FONTS.BOLD.name : FONTS.REGULAR.name;
        
        this.doc.setFont(fontName, fontStyle);
        const encodedText = decodeURIComponent(encodeURIComponent(segment.text));
        
        const lines = this.doc.splitTextToSize(encodedText, this.pageWidth - (this.margin * 2));
        this.checkPageBreak();
        
        lines.forEach((line: string, index: number) => {
          this.doc.text(line, currentX + textWidth, this.yOffset);
          if (index < lines.length - 1) {
            this.yOffset += fontSize + 2;
            textWidth = 0;
            currentX = this.margin;
          } else {
            textWidth += this.doc.getTextWidth(line);
          }
        });
      });
      
      this.yOffset += fontSize + 10;
    } catch (error) {
      console.error('Error in addText:', error);
      throw error;
    }
  }

  public addPage() {
    this.doc.addPage();
    this.yOffset = 40;
  }

  public getDocument() {
    return this.doc;
  }

  public generatePDF(output: string[], questions: string[], summary?: string) {
    if (!Array.isArray(output) || !Array.isArray(questions)) {
      throw new Error('Input must be arrays');
    }

    // Add main content
    output.forEach((text, index) => {
      if (index > 0) {
        this.doc.addPage();
        this.yOffset = 40;
      }

      // Add title
      this.addText(`Analysis Report ${index + 1}`, 24, true);

      // Process content
      const contentItems = parseMarkdown(text);
      contentItems.forEach(item => {
        const fontSize = item.isHeader ? 18 - (item.headerLevel * 2) : 12;
        this.addText(item.text, fontSize, item.isHeader);
      });
    });

    // Add summary if provided
    if (summary) {
      this.doc.addPage();
      this.yOffset = 40;
      this.addText('Summary', 24, true);
      
      const summaryItems = parseMarkdown(summary);
      summaryItems.forEach(item => {
        const fontSize = item.isHeader ? 18 - (item.headerLevel * 2) : 12;
        this.addText(item.text, fontSize, item.isHeader);
      });
    }

    // Add questions data
    questions.forEach((questionSet, index) => {
      const questionData = parseQuestionsData(questionSet);
      if (!questionData.length) return;

      this.doc.addPage();
      this.yOffset = 40;
      this.addText(`Questions Data ${index + 1}`, 24, true);

      const headers = Object.keys(questionData[0]);
      const data = questionData.map(row => headers.map(header => row[header]));

      this.doc.autoTable({
        head: [headers],
        body: data,
        startY: this.yOffset,
        margin: { top: 40, right: 40, bottom: 40, left: 40 },
        styles: { font: FONTS.REGULAR.name, fontSize: 12 },
        headStyles: { font: FONTS.BOLD.name, fontSize: 12 }
      });

      this.yOffset = (this.doc as any).lastAutoTable.finalY + 20;
    });

    return this.doc;
  }
}

// Export function
export const generatePDF = (output: string[], questions: string[], summary?: string) => {
  const generator = new PDFGenerator();
  return generator.generatePDF(output, questions, summary);
};

export const generateDOCX = (output: string[], questions: string[], summary?: string) => {
  console.log('DOCX Generator - Starting generation with:', {
    outputLength: output.length,
    questionsLength: questions.length,
    hasSummary: !!summary
  });

  try {
    const children: any[] = [];

    // Process output sections
    output.forEach((section, index) => {
      console.log(`Processing output section ${index + 1}`);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Analysis Report ${index + 1}`, bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 400 }
        })
      );

      const contentItems = parseMarkdown(section);
      console.log(`Found ${contentItems.length} content items in section ${index + 1}`);
      contentItems.forEach(item => {
        const segments = parseBoldText(item.text);
        children.push(
          new Paragraph({
            children: segments.map(segment => 
              new TextRun({ 
                text: segment.text,
                bold: segment.isBold || item.isHeader,
                size: item.isHeader ? 28 - (item.headerLevel * 2) : 24
              })
            ),
            heading: item.isHeader ? getHeadingLevel(item.headerLevel) : undefined,
            spacing: { after: 200 }
          })
        );
      });
    });

    // Process summary
    if (summary) {
      console.log('Processing summary section');
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Summary', bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 400 }
        })
      );

      const summaryItems = parseMarkdown(summary);
      console.log(`Found ${summaryItems.length} items in summary`);
      summaryItems.forEach(item => {
        const segments = parseBoldText(item.text);
        children.push(
          new Paragraph({
            children: segments.map(segment => 
              new TextRun({ 
                text: segment.text,
                bold: segment.isBold || item.isHeader,
                size: item.isHeader ? 28 - (item.headerLevel * 2) : 24
              })
            ),
            heading: item.isHeader ? getHeadingLevel(item.headerLevel) : undefined,
            spacing: { after: 200 }
          })
        );
      });
    }

    // Process questions data
    questions.forEach((questionSet, index) => {
      console.log(`Processing question set ${index + 1}`);
      const questionData = parseQuestionsData(questionSet);
      if (!questionData.length) {
        console.log(`No valid question data found in set ${index + 1}`);
        return;
      }

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Questions Data ${index + 1}`, bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      );

      const headers = Object.keys(questionData[0]);
      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(header => 
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })]
              })
            )
          }),
          ...questionData.map(row => 
            new TableRow({
              children: headers.map(header => 
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: String(row[header]) })] })]
                })
              )
            })
          )
        ]
      });
      children.push(table);
    });

    console.log('DOCX Generation completed');
    return new Document({
      sections: [{ children }]
    });
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw error;
  }
};
