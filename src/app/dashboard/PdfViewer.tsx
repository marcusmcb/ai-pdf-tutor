"use client";
import { useEffect, useRef, useState } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

console.log('[PdfViewer] RENDERED');

interface PdfViewerProps {
  url: string;
  page?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
}

export default function PdfViewer({
  url,
  page = 1,
  onPageChange,
  onDocumentLoad,
}: PdfViewerProps) {
  // Create plugin instances only once per component instance
  const defaultLayout = useRef(defaultLayoutPlugin()).current;
  const pageNav = useRef(pageNavigationPlugin()).current;
  const [pdfLoaded, setPdfLoaded] = useState(false);

  // When the page prop changes and PDF is loaded, jump to that page using the pageNavigationPlugin
  useEffect(() => {
    console.log('[PdfViewer] useEffect', { page, pdfLoaded });
    if (pdfLoaded && typeof page === "number" && !isNaN(page)) {
      pageNav.jumpToPage(page - 1);
      console.log('[PdfViewer] Called pageNav.jumpToPage', page - 1);
    }
  }, [page, pdfLoaded, pageNav]);

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
