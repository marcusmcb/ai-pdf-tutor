import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">You must be signed in to view your dashboard.</h1>
          <Link href="/auth/signin" className="text-blue-600 underline">Sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to your Dashboard, {session.user?.email}!</h1>
        <p className="mb-4">This is your user view. More features coming soon.</p>
        <Link href="/" className="text-blue-600 underline">Go to Home</Link>
      </div>
    </main>
  );
}
