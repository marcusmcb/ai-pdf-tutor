"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import SessionProviderWrapper from "./SessionProviderWrapper";
import dynamic from "next/dynamic";

// Properly type the dynamic import for PDFViewer
const PDFViewer = dynamic(() => import("./PdfViewer"), { ssr: false }) as React.ComponentType<{ url: string }>;

export default function DashboardPage() {
  return (
    <SessionProviderWrapper>
      <DashboardContent />
    </SessionProviderWrapper>
  );
}

function DashboardContent() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);

  useEffect(() => {
    if (session) {
      setLoadingPdfs(true);
      fetch("/api/list-pdfs")
        .then((res) => res.json())
        .then((data) => {
          setPdfs(data.pdfs || []);
          setLoadingPdfs(false);
        })
        .catch(() => setLoadingPdfs(false));
    }
  }, [session, status]); // refetch after upload

  useEffect(() => {
    if (selectedPdf) {
      console.log('PDF URL:', selectedPdf.url);
    }
  }, [selectedPdf]);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">You must be signed in to view your dashboard.</h1>
          <Link href="/auth/signin" className="text-blue-400 underline">Sign in</Link>
        </div>
      </main>
    );
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    setStatus("Uploading...");
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      setStatus("Upload successful!");
      form.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error ? `Error: ${data.error}` : "Upload failed.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center bg-gray-800 p-8 rounded shadow-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-4 text-white">Welcome to your Dashboard, {session.user?.email}!</h1>
        <p className="mb-4 text-gray-300">Upload a PDF to get started.</p>
        <form onSubmit={handleUpload} className="mb-6">
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            className="mb-4 block w-full text-white bg-gray-900 border border-gray-700 rounded p-2"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Upload PDF
          </button>
        </form>
        {status && <div className="mb-4 text-white">{status}</div>}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2 text-white">Your PDFs</h2>
          {loadingPdfs ? (
            <div className="text-gray-400">Loading...</div>
          ) : pdfs.length === 0 ? (
            <div className="text-gray-400">No PDFs uploaded yet.</div>
          ) : (
            <ul className="space-y-2">
              {pdfs.map((pdf) => (
                <li key={pdf.id} className="bg-gray-900 p-2 rounded text-white flex items-center justify-between">
                  <span>{pdf.filename}</span>
                  <button
                    className="text-blue-400 underline ml-2"
                    onClick={() => setSelectedPdf(pdf)}
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedPdf && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 text-white">Viewing: {selectedPdf.filename}</h2>
            {/* Check if the URL is valid and starts with /uploads/ */}
            {selectedPdf.url && selectedPdf.url.startsWith('/uploads/') ? (
              <PDFViewer url={selectedPdf.url} />
            ) : (
              <div className="text-red-400">PDF URL is invalid or inaccessible: {selectedPdf.url}</div>
            )}
            <button
              className="mt-2 text-red-400 underline"
              onClick={() => setSelectedPdf(null)}
            >
              Close PDF
            </button>
          </div>
        )}
        <Link href="/" className="text-blue-400 underline">Go to Home</Link>
      </div>
    </main>
  );
}
