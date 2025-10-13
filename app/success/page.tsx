'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebaseClient';
import { CheckCircle, ArrowRight, Sparkles, Shield, Clock } from 'lucide-react';
import Image from 'next/image';

// Exception emails that can bypass email verification
const EMAIL_VERIFICATION_EXCEPTIONS = [
  'flolahitte@gmail.com',
  'bob@gmail.com'
];

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const db = getFirestore(app);

  useEffect(() => {
    const sessionId = searchParams?.get('session_id');
    if (!sessionId) {
      setErrorMessage('Missing session ID');
      setStatus('error');
      return;
    }

    const auth = getAuth(app);
    
    // Wait for auth state to be determined
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user === null) {
        // User is definitely not logged in
        router.push('/auth');
        return;
      }
      
      if (user && !user.emailVerified && !EMAIL_VERIFICATION_EXCEPTIONS.includes(user.email?.toLowerCase() || '')) {
        // User is not verified and not in exception list
        router.push('/verify-email');
        return;
      }
      
      if (user) {
        // User is logged in, proceed with subscription confirmation
        try {
          // Call the confirm-subscription API to get subscription details
          const res = await fetch('/api/confirm-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, uid: user.uid }),
          });

          if (!res.ok) {
            const data = await res.json();
            console.error('API Error:', data);
            setErrorMessage(data.error || 'Failed to retrieve subscription details');
            setStatus('error');
            return;
          }

          const subscriptionData = await res.json();
          
          // Update Firebase directly from the client
          const userDocRef = doc(db, 'profiles', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            subscription: {
              plan: subscriptionData.plan,
              subscriptionId: subscriptionData.subscriptionId,
              status: subscriptionData.status || 'active',
              customerId: subscriptionData.customerId,
              updatedAt: new Date().toISOString(),
            },
            createdAt: new Date().toISOString(),
          }, { merge: true });

          setSubscriptionPlan(subscriptionData.plan);
          setStatus('success');
          
        } catch (err: any) {
          console.error('Subscription confirmation error:', err);
          setErrorMessage('Something went wrong updating your subscription');
          setStatus('error');
        }
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [searchParams, router, db]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Your Subscription</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-red-500 to-red-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Subscription Error</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push('/subscribe')}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600">
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-2xl mx-4">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Main Message */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center space-x-2">
              <Sparkles className="w-8 h-8 text-yellow-500" />
              <span>Welcome to Doctor Journal!</span>
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              🎉 Your subscription is now active
            </p>
            {subscriptionPlan && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 mb-4">
                <p className="text-teal-800 font-semibold">
                  Plan: <span className="text-teal-900">{subscriptionPlan}</span>
                </p>
              </div>
            )}
            <p className="text-gray-600">
              Thank you for joining our family care community. You now have access to all premium features!
            </p>
          </div>

          {/* Features Unlocked */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">What's included in your plan:</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <Shield className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">Secure Care Plans</p>
                <p className="text-gray-600">HIPAA compliant storage</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <Clock className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">24/7 Access</p>
                <p className="text-gray-600">Always available support</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <p className="font-medium text-gray-800">Premium Features</p>
                <p className="text-gray-600">Full platform access</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoToDashboard}
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg"
            >
              <span>Access Your Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-sm text-gray-500">
              You can also bookmark this page and return anytime to manage your account
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@doctorjournal.com" className="text-teal-600 hover:text-teal-700">
                support@doctorjournal.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
