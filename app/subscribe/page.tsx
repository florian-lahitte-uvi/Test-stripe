'use client';

import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { app } from '@/lib/firebaseClient';

const PRICING_PLANS = [
  {
    name: 'Indie',
    price: '$20',
    priceId: 'price_1SFKF4DQWAjbFEAXiXoAfeaS', // replace with real Stripe Price ID
    features: [ 
      '125 user messages',
      'Context Engine',
      'MCP & Native Tools',
      'Unlimited Edits & Completions',
    ],
    color: 'bg-indigo-600',
  },
  {
    name: 'Developer',
    price: '$50',
    priceId: 'price_456_developer',
    features: [
      'Everything in Indie',
      '600 user messages',
      'Advanced Dev Features',
    ],
    color: 'bg-pink-600',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    priceId: null,
    features: [
      'Custom usage',
      'Slack integration',
      'SSO & Compliance',
      'Dedicated support',
    ],
    color: 'bg-yellow-500',
  },
];

export default function SubscribePage() {
  const [uid, setUid] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/');
      } else {
        setUid(user.uid);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubscribe = async (priceId: string) => {
    if (!uid) return alert('You must be logged in');

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, priceId }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert('Failed to redirect to Stripe');
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-10">Choose Your Plan</h1>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-lg shadow-lg p-6 border border-gray-700 ${plan.color}`}
          >
            <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
            <p className="text-3xl font-bold mb-4">{plan.price}/month</p>
            <ul className="mb-6 space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm">✔ {f}</li>
              ))}
            </ul>
            {plan.priceId ? (
              <button
                onClick={() => handleSubscribe(plan.priceId!)}
                className="w-full py-2 px-4 bg-white text-black rounded hover:opacity-90 transition"
              >
                Subscribe
              </button>
            ) : (
              <a
                href="mailto:sales@yourcompany.com"
                className="block text-center bg-black py-2 px-4 rounded text-white hover:bg-gray-800"
              >
                Contact Sales
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
