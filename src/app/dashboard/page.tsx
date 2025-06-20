import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

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
    <main className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center bg-gray-800 p-8 rounded shadow-md border border-gray-700">
        <h1 className="text-3xl font-bold mb-4 text-white">Welcome to your Dashboard, {session.user?.email}!</h1>
        <p className="mb-4 text-gray-300">Upload a PDF to get started.</p>
        <form
          action="/api/upload"
          method="post"
          encType="multipart/form-data"
          className="mb-6"
        >
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
        <Link href="/" className="text-blue-400 underline">Go to Home</Link>
      </div>
    </main>
  );
}
