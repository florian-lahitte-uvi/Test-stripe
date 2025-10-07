'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebaseClient';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      
      if (user) {
        // User is logged in, proceed with subscription confirmation
        try {
          console.log('Confirming subscription for user:', user.uid);
          
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
          console.log('Subscription data received:', subscriptionData);
          
          // Update Firebase directly from the client
          const userDocRef = doc(db, 'profiles', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            subscription: {
              active: true,
              plan: subscriptionData.plan,
              subscriptionId: subscriptionData.subscriptionId,
              status: subscriptionData.status || 'active',
              customerId: subscriptionData.customerId,
              updatedAt: new Date().toISOString(),
            },
            stripeCustomerId: subscriptionData.customerId,
            createdAt: new Date().toISOString(),
          }, { merge: true });

          console.log('✅ Firebase profile updated successfully');
          setStatus('success');
          
          setTimeout(() => {
            router.push('/dashboard');
          }, 3000);
          
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

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Confirming your subscription...</div>;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-700 text-white p-4 text-center">
        <h1 className="text-3xl font-bold mb-4">❌ Subscription Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-900 text-white text-center px-4">
      <h1 className="text-4xl font-bold mb-4">🎉 Subscription Successful!</h1>
      <p className="text-lg mb-2">Thank you for subscribing. You now have full access.</p>
      <p className="text-sm text-gray-300">Redirecting you to your dashboard...</p>
    </div>
  );
}
