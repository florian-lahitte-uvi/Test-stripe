'use client';

import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { createUserProfileIfNotExists } from '@/lib/createUserProfile';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const auth = getAuth(app);

const handleAuth = async () => {
  try {
    if (isSigningUp) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }

    // ✅ Create Firestore profile if it doesn't exist
    await createUserProfileIfNotExists();

    // ✅ Redirect after profile is set
    router.push('/dashboard');
  } catch (err: any) {
    console.error(err);
    setError(err.message);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-3xl font-bold text-center">
          {isSigningUp ? 'Create Account' : 'Sign In'}
        </h2>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 rounded bg-gray-800 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 rounded bg-gray-800 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAuth}
          className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
        >
          {isSigningUp ? 'Sign Up' : 'Sign In'}
        </button>

        <p className="text-center text-sm">
          {isSigningUp ? 'Already have an account?' : 'Don’t have an account?'}{' '}
          <button
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="text-blue-400 hover:underline"
          >
            {isSigningUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
