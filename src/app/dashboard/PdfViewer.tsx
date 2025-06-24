"use client";

export default function PdfViewer({ url }: { url: string }) {
  return (
    <div className="bg-black p-4 rounded" style={{ height: "800px" }}>
      <iframe
        src={url}
        width="100%"
        height="100%"
        style={{ border: "none", minHeight: "800px" }}
        title="PDF Viewer"
      />
    </div>
  );
}
