"use client";
import { useEffect, useRef } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface PdfViewerProps {
  url: string;
  page?: number;
  onPageChange?: (page: number) => void;
  onDocumentLoad?: (numPages: number) => void;
}

export default function PdfViewerWithControl({
  url,
  page = 1,
  onPageChange,
  onDocumentLoad,
}: PdfViewerProps) {
  const viewerRef = useRef<any>(null);
  const defaultLayout = defaultLayoutPlugin();

  // When the page prop changes, jump to that page using the plugin API
  useEffect(() => {
    if (viewerRef.current && typeof page === "number" && !isNaN(page)) {
      // @ts-ignore
      const viewerInstance = viewerRef.current.viewer;
      if (viewerInstance && viewerInstance.jumpToPage) {
        viewerInstance.jumpToPage(page - 1); // 0-based
      }
    }
  }, [page]);

  return (
    <div className="bg-black p-4 rounded" style={{ height: "800px" }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          ref={viewerRef}
          fileUrl={url}
          plugins={[defaultLayout]}
          defaultScale={SpecialZoomLevel.PageFit}
          initialPage={page - 1}
          onPageChange={({ currentPage }: { currentPage: number }) => {
            onPageChange && onPageChange(currentPage + 1);
          }}
          onDocumentLoad={(e: any) => {
            onDocumentLoad && onDocumentLoad(e.doc.numPages);
          }}
        />
      </Worker>
    </div>
  );
}
