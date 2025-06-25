"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import SessionProviderWrapper from "./SessionProviderWrapper";
import PdfViewer from "./PdfViewer";

const DashboardPage: React.FC = () => (
  <SessionProviderWrapper>
    <DashboardContent />
  </SessionProviderWrapper>
);

const DashboardContent: React.FC = () => {
  const { data: session } = useSession();
  const [status, setStatus] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<any[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  // Store chat history per PDF by id
  const [chatHistories, setChatHistories] = useState<Record<string, { role: "user" | "ai"; content: string }[]>>({});
  const [userInput, setUserInput] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Helper to get current chat messages for selected PDF
  const chatMessages = selectedPdf ? chatHistories[selectedPdf.id] || [] : [];

  // When selectedPdf changes, ensure chat history exists for it
  useEffect(() => {
    if (selectedPdf && !chatHistories[selectedPdf.id]) {
      setChatHistories((prev) => ({ ...prev, [selectedPdf.id]: [] }));
    }
  }, [selectedPdf]);

  useEffect(() => {
    if (session) {
      setLoadingPdfs(true);
      fetch("/api/list-pdfs")
        .then((res) => res.json())
        .then((data) => {
          const sorted = (data.pdfs || []).sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          setPdfs(sorted);
          setLoadingPdfs(false);
          if (sorted.length > 0) setSelectedPdf(sorted[0]);
        })
        .catch(() => setLoadingPdfs(false));
    }
  }, [session, status]);

  useEffect(() => {
    if (selectedPdf) {
      console.log('PDF URL:', selectedPdf.url);
    }
  }, [selectedPdf]);

  useEffect(() => {
    if (selectedPdf && !pdfs.find((pdf) => pdf.id === selectedPdf.id)) {
      setSelectedPdf(pdfs.length > 0 ? pdfs[0] : null);
    }
  }, [pdfs, selectedPdf]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Reset page to 1 when PDF changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPdf]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
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
  };

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedPdf) return;
    setChatHistories((prev) => ({
      ...prev,
      [selectedPdf.id]: [...(prev[selectedPdf.id] || []), { role: "user", content: userInput }],
    }));
    setUserInput("");
    try {
      const baseFilename = selectedPdf.filename.split(/[\\/]/).pop();
      const res = await fetch("/api/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: baseFilename, question: userInput }),
      });
      if (!res.ok) throw new Error("Failed to get AI answer");
      const data = await res.json();
      setChatHistories((prev) => ({
        ...prev,
        [selectedPdf.id]: [
          ...(prev[selectedPdf.id] || []),
          { role: "ai", content: data.text || "No answer generated." },
        ],
      }));
      // Auto-navigate to referenced page if present
      if (data.page && typeof data.page === "number") {
        setCurrentPage(data.page);
      }
    } catch (err) {
      setChatHistories((prev) => ({
        ...prev,
        [selectedPdf.id]: [
          ...(prev[selectedPdf.id] || []),
          { role: "ai", content: "Error getting AI answer." },
        ],
      }));
    }
  };

  // Handler for custom page navigation
  const goToPage = (page: number) => {
    if (numPages && page >= 1 && page <= numPages) {
      setCurrentPage(page);
    }
  };

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-900 p-6">
      <div className="w-full max-w-6xl">
        <div className="text-center bg-gray-800 p-8 rounded shadow-md border border-gray-700 mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold mb-4 text-white md:mb-0">Welcome to your Dashboard, {session.user?.email}!</h1>
          <button
            onClick={() => signOut()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column: Upload + List */}
          <div className="md:w-1/3 w-full bg-gray-800 p-6 rounded shadow-md border border-gray-700 flex flex-col">
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
            <div className="mb-6 flex-1">
              <h2 className="text-xl font-bold mb-2 text-white">Your PDFs</h2>
              {loadingPdfs ? (
                <div className="text-gray-400">Loading...</div>
              ) : pdfs.length === 0 ? (
                <div className="text-gray-400">No PDFs uploaded yet.</div>
              ) : (
                <ul className="space-y-2">
                  {pdfs.map((pdf) => (
                    <li key={pdf.id} className={`bg-gray-900 p-2 rounded text-white flex items-center justify-between ${selectedPdf && selectedPdf.id === pdf.id ? 'border border-blue-500' : ''}`}>
                      <span className="truncate max-w-[8rem] md:max-w-[12rem] lg:max-w-[18rem] overflow-hidden whitespace-nowrap">{pdf.filename}</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-400 underline"
                          onClick={() => setSelectedPdf(pdf)}
                        >
                          View
                        </button>
                        <button
                          className="text-red-400 underline"
                          onClick={async () => {
                            setStatus(null);
                            const res = await fetch(`/api/delete-pdf?id=${pdf.id}`, { method: 'DELETE' });
                            if (res.ok) {
                              setStatus('PDF deleted.');
                              setPdfs((prev) => prev.filter((p) => p.id !== pdf.id));
                              if (selectedPdf && selectedPdf.id === pdf.id) setSelectedPdf(null);
                            } else {
                              const data = await res.json().catch(() => ({}));
                              setStatus(data.error ? `Error: ${data.error}` : 'Delete failed.');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Right column: PDF Viewer + Chat */}
          <div className="md:w-2/3 w-full bg-gray-800 p-6 rounded shadow-md border border-gray-700 min-h-[600px] flex flex-col items-center justify-start">
            {selectedPdf && selectedPdf.url && selectedPdf.url.startsWith('/uploads/') ? (
              <>
                <h2 className="text-lg font-bold mb-2 text-white">Viewing: {selectedPdf.filename}</h2>
                {/* Chat UI - moved above PDFViewer */}
                <div
                  ref={chatContainerRef}
                  className="w-full flex flex-col flex-1 mt-6 max-h-[350px] overflow-y-auto bg-gray-900 rounded p-4 border border-gray-700"
                >
                  {chatMessages.length === 0 && (
                    <div className="text-gray-400 text-center">Ask a question about this PDF to get started.</div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`mb-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`px-4 py-2 rounded-lg max-w-[80%] ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleChatSubmit} className="w-full flex mt-2 gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    className="flex-1 p-2 rounded border border-gray-700 bg-gray-900 text-white focus:outline-none"
                    placeholder="Ask a question about this PDF..."
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Send
                  </button>
                </form>
                <div className="w-full mb-4 mt-4">
                  {/* Custom PDF navigation controls */}
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      className="px-2 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Prev
                    </button>
                    <span className="text-white">
                      Page
                      <input
                        type="number"
                        min={1}
                        max={numPages || 1}
                        value={currentPage}
                        onChange={e => goToPage(Number(e.target.value))}
                        className="w-16 mx-2 p-1 rounded bg-gray-900 border border-gray-700 text-white text-center"
                      />
                      / {numPages || '?'}
                    </span>
                    <button
                      className="px-2 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={!!numPages && currentPage >= numPages}
                    >
                      Next
                    </button>
                  </div>
                  <PdfViewer
                    url={selectedPdf.url}
                    page={currentPage}
                    onPageChange={setCurrentPage}
                    // Get total pages from PDFViewer (add this prop to PdfViewer)
                    onDocumentLoad={setNumPages}
                  />
                </div>
                <button
                  className="mt-4 text-red-400 underline"
                  onClick={() => setSelectedPdf(null)}
                >
                  Close PDF
                </button>
              </>
            ) : pdfs.length === 0 ? (
              <div className="text-gray-400 text-center">Upload a PDF file to get started.</div>
            ) : (
              <div className="text-gray-400 text-center">Select a PDF from the list to view it.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
