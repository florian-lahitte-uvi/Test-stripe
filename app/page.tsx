'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🔥 Welcome to the App</h1>
        <p className="mb-6">Sign in to access the dashboard and subscribe.</p>

        <Link href="/auth">
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold text-white">
            Sign In / Sign Up
          </button>
        </Link>
      </div>
    </main>
  );
}
