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
  // Create the plugin instance only once per component instance
  const pluginInstance = useRef(defaultLayoutPlugin()).current;

  // When the page prop changes, jump to that page using the plugin API
  useEffect(() => {
    if (pluginInstance && typeof page === "number" && !isNaN(page)) {
      // @ts-ignore: store is available at runtime
      const store = (pluginInstance as any).store;
      const jumpToPage = store?.get && store.get("jumpToPage");
      if (typeof jumpToPage === "function") {
        jumpToPage(page - 1); // 0-based
      }
    }
  }, [page, pluginInstance]);

  return (
    <div className="bg-black p-4 rounded" style={{ height: "800px" }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={url}
          plugins={[pluginInstance]}
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
