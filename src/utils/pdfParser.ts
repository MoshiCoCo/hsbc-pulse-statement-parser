import * as pdfjsLib from 'pdfjs-dist';
import { parseStatementPDF } from './statementParser';
import type { StatementData } from '@/types/statement';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

export async function parsePDFFromFile(file: File): Promise<StatementData[]> {
  const text = await extractTextFromPDF(file);
  return parseStatementPDF(text);
}
