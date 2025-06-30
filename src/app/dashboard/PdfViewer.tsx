"use client";
import { useEffect, useRef, useState } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

console.log('[PdfViewer] RENDERED');

interface PdfViewerProps {
  url: string;
  page?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  highlightText?: string | null;
}

export default function PdfViewer({
  url,
  page = 1,
  onPageChange,
  onDocumentLoad,
  highlightText,
}: PdfViewerProps) {
  // Create plugin instances only once per component instance
  const defaultLayout = useRef(defaultLayoutPlugin()).current;
  const pageNav = useRef(pageNavigationPlugin()).current;
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // Instantiate the search plugin ONCE at the top level (not in useMemo)
  const searchPluginInstance = useRef(searchPlugin()).current;

  // Use a regex for robust matching of highlightText (multi-line, flexible whitespace)
  let regexPattern = '';
  if (highlightText && highlightText.trim().length > 0) {
    regexPattern = highlightText
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\s+/g, "\\s+");
  }
  // Log for debugging
  useEffect(() => {
    console.log('[PdfViewer] highlightText:', highlightText);
    console.log('[PdfViewer] regexPattern:', regexPattern);
  }, [highlightText, regexPattern]);

  // When the page prop changes and PDF is loaded, jump to that page using the pageNavigationPlugin
  useEffect(() => {
    console.log('[PdfViewer] useEffect', { page, pdfLoaded });
    if (pdfLoaded && typeof page === "number" && !isNaN(page)) {
      pageNav.jumpToPage(page - 1);
      console.log('[PdfViewer] Called pageNav.jumpToPage', page - 1);
    }
  }, [page, pdfLoaded, pageNav]);

  // Custom overlay highlight for robust multi-line highlighting
  useEffect(() => {
    if (!highlightText || !pdfLoaded) return;
    setTimeout(() => {
      // Find the text layer for the current page
      const textLayers = document.querySelectorAll('.rpv-text-layer');
      if (!textLayers || textLayers.length === 0) return;
      // Find the visible text layer (current page)
      let visibleLayer: HTMLElement | null = null;
      textLayers.forEach(layer => {
        const style = window.getComputedStyle(layer as Element);
        if (style.display !== 'none') visibleLayer = layer as HTMLElement;
      });
      if (!visibleLayer) return;
      const layer = visibleLayer as HTMLElement;
      // Remove previous highlights
      const highlights = layer.querySelectorAll('.ai-pdf-highlight') as NodeListOf<HTMLElement>;
      highlights.forEach((el: HTMLElement) => {
        el.classList.remove('ai-pdf-highlight');
        el.style.background = '';
      });
      // Normalize highlightText for matching
      const normHighlight = highlightText.replace(/\s+/g, ' ').trim().toLowerCase();
      // Join all text spans and search for the highlight
      const spans = Array.from(layer.querySelectorAll('span')) as HTMLElement[];
      const fullText = spans.map(s => s.textContent || '').join(' ').replace(/\s+/g, ' ').toLowerCase();
      const idx = fullText.indexOf(normHighlight);
      if (idx === -1) return;
      // Find which spans cover the match
      let charCount = 0;
      let startSpan = -1, endSpan = -1, startOffset = 0, endOffset = 0;
      for (let i = 0; i < spans.length; i++) {
        const spanText = spans[i].textContent || '';
        const nextCharCount = charCount + spanText.length;
        if (startSpan === -1 && idx < nextCharCount) {
          startSpan = i;
          startOffset = idx - charCount;
        }
        if (startSpan !== -1 && (idx + normHighlight.length) <= nextCharCount) {
          endSpan = i;
          endOffset = (idx + normHighlight.length) - charCount;
          break;
        }
        charCount = nextCharCount + 1; // +1 for the space we joined on
      }
      // Highlight the relevant spans
      for (let i = startSpan; i <= endSpan; i++) {
        const span = spans[i];
        span.classList.add('ai-pdf-highlight');
        span.style.background = '#fde047'; // Tailwind yellow-300
      }
    }, 300);
  }, [highlightText, pdfLoaded, page]);

  return (
    <div className="bg-black p-4 rounded" style={{ height: "800px" }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={[defaultLayout, pageNav]}
          defaultScale={SpecialZoomLevel.PageFit}
          initialPage={page - 1}
          onPageChange={({ currentPage }: { currentPage: number }) => {
            onPageChange && onPageChange(currentPage + 1);
          }}
          onDocumentLoad={(e: any) => {
            setPdfLoaded(true);
            onDocumentLoad && onDocumentLoad(e.doc.numPages);
          }}
        />
      </Worker>
    </div>
  );
}
