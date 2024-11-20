// documentGenerator.ts

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
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
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: decodeURIComponent(escape(text.slice(lastIndex, match.index))),
        isBold: false
      });
    }
    segments.push({
      text: decodeURIComponent(escape(match[1])),
      isBold: true
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      text: decodeURIComponent(escape(text.slice(lastIndex))),
      isBold: false
    });
  }

  return segments;
};

// Define interface for jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => void;
  lastAutoTable?: {
    finalY: number;
  };
}

class PDFGenerator {
  private doc: jsPDFWithAutoTable;
  private yOffset: number;
  private pageWidth: number;
  private margin: number;
  private lineHeight: number;

  constructor() {
    this.doc = new jsPDF() as jsPDFWithAutoTable;
    this.margin = 20;
    this.lineHeight = 7;
    this.pageWidth = this.doc.internal.pageSize.width - (2 * this.margin);
    this.yOffset = this.margin;
    
    // Initialize fonts properly
    this.initializeFonts();
  }

  private initializeFonts() {
    try {
      // Add fonts to VFS first
      this.doc.addFileToVFS('Roboto-Regular.ttf', RobotoRegularBase64);
      this.doc.addFileToVFS('Roboto-Bold.ttf', RobotoBoldBase64);

      // Then add the fonts
      this.doc.addFont('Roboto-Regular.ttf', FONTS.REGULAR.name, FONTS.REGULAR.style);
      this.doc.addFont('Roboto-Bold.ttf', FONTS.BOLD.name, FONTS.BOLD.style);

      // Set default font
      this.doc.setFont(FONTS.REGULAR.name);
    } catch (error) {
      console.error('Error initializing fonts:', error);
      // Fallback to built-in font
      this.doc.setFont('helvetica');
    }
  }

  private addText(text: string, isBold: boolean = false) {
    try {
      this.doc.setFont(
        isBold ? FONTS.BOLD.name : FONTS.REGULAR.name,
        isBold ? FONTS.BOLD.style : FONTS.REGULAR.style
      );
      
      const encodedText = decodeURIComponent(escape(text));
      
      const lines = this.doc.splitTextToSize(encodedText, this.pageWidth);
      
      lines.forEach((line: string) => {
        if (this.yOffset > this.doc.internal.pageSize.height - this.margin) {
          this.doc.addPage();
          this.yOffset = this.margin;
        }
        
        this.doc.text(line, this.margin, this.yOffset);
        this.yOffset += this.lineHeight;
      });
    } catch (error) {
      console.error('Error adding text:', error);
      // Fallback to direct text addition
      this.doc.text(text, this.margin, this.yOffset);
      this.yOffset += this.lineHeight;
    }
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

  private processCyrillicText(text: string): TextSegment[] {
    const segments: TextSegment[] = [];
    let currentText = '';
    let isBold = false;
    
    // Handle **text** pattern for bold text
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '*' && text[i + 1] === '*') {
        if (currentText) {
          segments.push({ text: currentText, isBold });
          currentText = '';
        }
        isBold = !isBold;
        i++; // Skip next asterisk
        continue;
      }
      currentText += text[i];
    }
    
    // Add any remaining text
    if (currentText) {
      segments.push({ text: currentText, isBold });
    }
    
    return segments;
  }

  private addSummaryText(doc: jsPDF, text: string, x: number, y: number): number {
    const segments = this.processCyrillicText(text);
    let currentX = x;
    
    segments.forEach(segment => {
      doc.setFont(
        segment.isBold ? FONTS.BOLD.name : FONTS.REGULAR.name,
        segment.isBold ? FONTS.BOLD.style : FONTS.REGULAR.style
      );
      
      doc.text(segment.text, currentX, y);
      currentX += doc.getStringUnitWidth(segment.text) * doc.getFontSize();
    });
    
    return y + 7; // Return next Y position
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

      // Add summary section if provided
      if (summary) {
        // Add some spacing before summary
        this.yOffset += 10;
        
        // Add summary header
        this.addText('Summary', true);
        this.yOffset += 5;

        // Process summary content
        const summaryItems = parseMarkdown(summary);
        summaryItems.forEach(item => {
          if (item.isHeader) {
            // Add some spacing before headers
            this.yOffset += 5;
            this.addText(item.text, true);
          } else {
            const segments = parseBoldText(item.text);
            segments.forEach(segment => {
              this.addText(segment.text, segment.isBold);
            });
          }
        });
      }

      // Process questions data
      questions.forEach((questionSet, index) => {
        const questionData = parseQuestionsData(questionSet);
        if (!questionData.length) return;

        this.yOffset += 10;
        this.addText(`Questions Data ${index + 1}`, true);
        this.yOffset += 5;

        const headers = Object.keys(questionData[0]);
        this.doc.autoTable({
          head: [headers],
          body: questionData.map(row => headers.map(header => row[header])),
          startY: this.yOffset,
          margin: { left: this.margin, right: this.margin },
          styles: {
            font: FONTS.REGULAR.name,
            fontSize: 10
          },
          headStyles: {
            font: FONTS.BOLD.name,
            fontSize: 10,
            fillColor: [200, 200, 200]
          }
        });

        // Update yOffset after table using optional chaining
        this.yOffset = (this.doc.lastAutoTable?.finalY ?? this.yOffset) + 10;
      });

      return this.doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
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

const opt = {
  margin: [20, 20, 20, 20],
  autoPaging: 'text',
  html2canvas: {
    scale: 0.4
  }
};

function addWrappedText({
  text, 
  textWidth, 
  doc, 
  fontSize = 10, 
  fontType = 'normal', 
  lineSpacing = 7, 
  xPosition = 10, 
  initialYPosition = 10
}) {
  const lines = doc.splitTextToSize(text, textWidth);
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontType(fontType);
  doc.setFontSize(fontSize);

  let cursorY = initialYPosition;
  lines.forEach(line => {
    if (cursorY > pageHeight - 20) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(xPosition, cursorY, line);
    cursorY += lineSpacing;
  });
}
