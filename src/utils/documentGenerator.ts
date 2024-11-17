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
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF();
    this.yOffset = 20;
    this.margin = 20;
    this.pageWidth = this.doc.internal.pageSize.width - (this.margin * 2);
    this.lineHeight = 7;
    
    // Add fonts
    this.doc.addFont(RobotoRegularBase64, FONTS.REGULAR.name, FONTS.REGULAR.style);
    this.doc.addFont(RobotoBoldBase64, FONTS.BOLD.name, FONTS.BOLD.style);
    this.doc.setFont(FONTS.REGULAR.name);
  }

  private addText(text: string, isBold: boolean = false) {
    // Set font for the current text
    this.doc.setFont(isBold ? FONTS.BOLD.name : FONTS.REGULAR.name);
    
    // Split text into lines that fit within the page width
    const lines = this.doc.splitTextToSize(text, this.pageWidth);
    
    // Check if we need a new page
    lines.forEach((line: string, index: number) => {
      if (this.yOffset > this.doc.internal.pageSize.height - this.margin) {
        this.doc.addPage();
        this.yOffset = this.margin;
      }
      
      this.doc.text(line, this.margin, this.yOffset);
      this.yOffset += this.lineHeight;
    });

    // Add some spacing after the text block
    this.yOffset += 3;
  }

  private addNumberedItem(number: number, text: string) {
    const numberWidth = this.doc.getTextWidth(`${number}. `);
    const textWidth = this.pageWidth - numberWidth;
    
    // Add the number
    this.doc.setFont(FONTS.BOLD.name);
    this.doc.text(`${number}.`, this.margin, this.yOffset);
    
    // Add the text with proper wrapping
    this.doc.setFont(FONTS.REGULAR.name);
    const lines = this.doc.splitTextToSize(text, textWidth);
    
    lines.forEach((line: string, index: number) => {
      if (this.yOffset > this.doc.internal.pageSize.height - this.margin) {
        this.doc.addPage();
        this.yOffset = this.margin;
      }
      
      const xOffset = index === 0 ? this.margin + numberWidth : this.margin + numberWidth;
      this.doc.text(line, xOffset, this.yOffset);
      this.yOffset += this.lineHeight;
    });

    // Add spacing after each item
    this.yOffset += 3;
  }

  public generate(output: string[], questions: string[], summary?: string) {
    try {
      // Process output content
      output.forEach(text => {
        const match = text.match(/^(\d+)\.\s(.+)$/);
        if (match) {
          const [_, number, content] = match;
          this.addNumberedItem(parseInt(number), content);
        } else {
          this.addText(text);
        }
      });

      // ... rest of the code remains the same ...
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
    return this.doc;
  }
}

// Export function
export const generatePDF = (output: string[], questions: string[], summary?: string) => {
  const generator = new PDFGenerator();
  return generator.generate(output, questions, summary);
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
          children: [new TextRun({ text: `Question ${index + 1}`, bold: true, size: 32 })],
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
