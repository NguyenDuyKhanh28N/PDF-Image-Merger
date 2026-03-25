import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractPdfPages(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ pageIndex: number, thumbnailUrl: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, canvas: canvas, viewport: viewport }).promise;
      pages.push({
        pageIndex: i - 1, // 0-based for pdf-lib
        thumbnailUrl: canvas.toDataURL('image/jpeg', 0.8)
      });
    }
    
    if (onProgress) {
      onProgress(i / numPages);
    }
  }
  return pages;
}
