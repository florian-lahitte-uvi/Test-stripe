'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireEmailVerification = true,
  redirectTo = '/'
}: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    if (!user) {
      // User not authenticated, redirect to login
      router.push(redirectTo);
      return;
    }

    if (requireEmailVerification && !isEmailVerified) {
      // Email verification required but not verified
      router.push('/verify-email');
      return;
    }
  }, [user, loading, isEmailVerified, requireEmailVerification, redirectTo, router]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if user is not authenticated or email not verified
  if (!user || (requireEmailVerification && !isEmailVerified)) {
    return null;
  }

  return <>{children}</>;
}