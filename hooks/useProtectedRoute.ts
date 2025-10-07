// hooks/useProtectedRoute.ts
'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';

// Exception emails that can bypass email verification
const EMAIL_VERIFICATION_EXCEPTIONS = [
  'flolahite@gmail.com',
  'bob@gmail.com'
];

export function useProtectedRoute() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) {
        router.push('/');
        return;
      }

      // Check if email is verified or in exception list
      if (!user.emailVerified && !EMAIL_VERIFICATION_EXCEPTIONS.includes(user.email?.toLowerCase() || '')) {
        router.push('/verify-email');
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch(`/api/profile?uid=${user.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();

      if (data?.subscription?.active) {
        setAuthorized(true);
      } else {
        router.push('/subscribe');
      }

      setLoading(false);
    };

    check();
  }, [router]);

  return { loading, authorized };
}
