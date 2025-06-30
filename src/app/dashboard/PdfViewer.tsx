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
  // Restore the defaultLayoutPlugin to ensure text layer is rendered
  const defaultLayout = useRef(defaultLayoutPlugin()).current;
  const pageNav = useRef(pageNavigationPlugin()).current;
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [textLayerMissing, setTextLayerMissing] = useState(false);

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
    let retryCount = 0;
    function tryHighlight() {
      console.log('[PdfViewer] custom highlight effect running', { highlightText, pdfLoaded, page, retryCount });
      if (!highlightText || !pdfLoaded) return;
      const textLayers = document.querySelectorAll('.rpv-text-layer');
      console.log('[PdfViewer] .rpv-text-layer count:', textLayers.length);
      if (!textLayers || textLayers.length === 0) {
        if (retryCount < 10) {
          retryCount++;
          setTimeout(tryHighlight, 200);
        } else {
          setTextLayerMissing(true);
          console.log('[PdfViewer] Gave up waiting for text layer');
        }
        return;
      }
      setTextLayerMissing(false);
      // ...existing highlight logic...
    }
    tryHighlight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightText, pdfLoaded, page]);

  return (
    <div className="bg-black p-4 rounded" style={{ height: "800px" }}>
      {textLayerMissing && (
        <div className="bg-red-500 text-white p-2 mb-2 rounded">
          PDF text layer not found. This PDF may be image-based or there may be a rendering issue. Highlighting will not work.
        </div>
      )}
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
