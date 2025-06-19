import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import Link from "next/link";

export default async function Home() {
	const session = await getServerSession(authOptions);

	return (
		<main className='flex min-h-screen items-center justify-center'>
			{session ? (
				<div className='text-center'>
					<h1 className='text-3xl font-bold mb-4'>
						Welcome, {session.user?.email}!
					</h1>
					<p className='mb-4'>You are signed in.</p>
					<Link
						href='/auth/signin'
						className='text-blue-600 underline'
					>
						Sign out
					</Link>
				</div>
			) : (
				<div className='text-center'>
					<h1 className='text-3xl font-bold mb-4'>
						Welcome to AI PDF Tutor
					</h1>
					<Link
						href='/auth/signin'
						className='text-blue-600 underline'
					>
						Sign in or sign up
					</Link>
				</div>
			)}
		</main>
	);
}
