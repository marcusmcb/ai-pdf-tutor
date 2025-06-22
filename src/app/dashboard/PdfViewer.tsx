"use client";

const PdfViewer: React.FC<{ url: string }> = ({ url }) => (
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

export default PdfViewer;
