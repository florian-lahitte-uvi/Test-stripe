'use client';

import { getAuth, signOut } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebaseClient';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function DashboardPage() {
  const { loading, authorized } = useProtectedRoute();

  const handleLogout = async () => {
    const auth = getAuth(firebaseApp);
    await signOut(auth);
    window.location.href = '/';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold">🔥 Welcome to the Dashboard</h1>
      <p className="mt-4">You have an active subscription and full access.</p>

      <button onClick={handleLogout} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">
        Logout
      </button>
    </div>
  );
}
