'use client';

import { useState, useEffect } from 'react';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { createUserProfileIfNotExists } from '@/lib/createUserProfile';
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

// Exception emails that can bypass email verification
const EMAIL_VERIFICATION_EXCEPTIONS = [
  'flolahitte@gmail.com',
  'bob@gmail.com'
];

export default function VerifyEmailPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        // No user signed in, redirect to auth page
        router.push('/auth');
        return;
      }

      // Check if email is in exception list - these emails don't need verification
      if (EMAIL_VERIFICATION_EXCEPTIONS.includes(currentUser.email?.toLowerCase() || '')) {
        // Exception emails should go directly to dashboard
        handleVerifiedUser();
        return;
      }

      setUser(currentUser);
      setLoading(false);

      // Check if email is already verified
      if (currentUser.emailVerified) {
        handleVerifiedUser();
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const handleVerifiedUser = async () => {
    try {
      // Create Firestore profile if it doesn't exist
      await createUserProfileIfNotExists();
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const resendVerificationEmail = async () => {
    if (!user) return;

    setResending(true);
    try {
      await sendEmailVerification(user);
      setMessage('Verification email sent! Check your inbox.');
    } catch (error: any) {
      setMessage('Error sending email: ' + error.message);
    } finally {
      setResending(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!user) return;

    // Check if email is in exception list first
    if (EMAIL_VERIFICATION_EXCEPTIONS.includes(user.email?.toLowerCase() || '')) {
      handleVerifiedUser();
      return;
    }

    // Reload user to get latest verification status
    await user.reload();
    
    if (user.emailVerified) {
      handleVerifiedUser();
    } else {
      setMessage('Email not yet verified. Please check your inbox and click the verification link.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Logo and Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Image
                src="/logo_family.svg"
                alt="Doctor Journal"
                width={80}
                height={80}
                className="w-20 h-20"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Title</h1>
              <p className="text-gray-600 text-sm">Description</p>
            </div>
          </div>

          {/* Email Verification Content */}
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-teal-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Check Your Email</h2>
              <p className="text-gray-600 text-sm">
                We've sent a verification email to:
              </p>
              <p className="text-teal-600 font-medium">
                {user?.email}
              </p>
            </div>
              
              {message && (
                <div className={`p-3 rounded-lg text-sm text-center ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-green-50 text-green-600 border border-green-200'
                }`}>
                  {message}
                </div>
              )}
       

            <div className="space-y-3">
              <button
                onClick={checkVerificationStatus}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>I've Verified My Email</span>
              </button>

              <button
                onClick={resendVerificationEmail}
                disabled={resending}
                className="w-full bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 disabled:text-gray-400 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200 text-center flex flex-col items-center">
              <p className="text-sm text-gray-600 mb-3">
                Wrong email address?
              </p>
              <button
                onClick={() => {
                  auth.signOut();
                  router.push('/auth');
                }}
                className="text-teal-600 hover:text-teal-700 font-medium hover:underline text-sm flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Sign up with a different email</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}