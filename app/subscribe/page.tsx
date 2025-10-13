'use client';

import { Check, Star, Users, Heart, Stethoscope } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: '$4.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER!,
    features: [
      'Basic care coordination',
      'Family messaging',
      'Appointment reminders',
      'Document storage (5GB)',
      'Mobile app access',
    ],
    icon: Users,
    recommended: false,
  },
  {
    name: 'Plus',
    price: '$6.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS!,
    features: [
      'Everything in Starter',
      'Advanced care plans',
      'Medical team coordination',
      'Unlimited document storage',
      'Video consultations',
      'Priority support',
    ],
    icon: Heart,
    recommended: true,
  },
  {
    name: 'Family Pro',
    price: '$14.99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PRO!,
    features: [
      'Everything in Plus',
      'Multiple family members',
      'Advanced analytics',
      'Care team management',
      'Custom workflows',
      '24/7 medical support',
      'Insurance integration',
    ],
    icon: Stethoscope,
    recommended: false,
  },
];

function SubscribeContent() {
  const { user } = useAuth();

  const handleSubscribe = async (priceId: string) => {
    if (!user) return alert('You must be logged in');

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid, priceId }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert('Failed to redirect to Stripe');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo_family.svg"
              alt="Doctor Journal"
              width={100}
              height={100}
              className="w-24 h-24"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-teal-100 mb-2">Caring together, connected always</p>
          <p className="text-teal-200 max-w-2xl mx-auto">
            Select the perfect plan for your family's care coordination needs. 
            Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {PRICING_PLANS.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:scale-105 ${
                    plan.recommended 
                      ? 'ring-4 ring-yellow-400 ring-opacity-50 transform scale-105' 
                      : ''
                  }`}
                >
                  {/* Recommended Badge */}
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-1">
                        <Star className="w-4 h-4" />
                        <span>Recommended</span>
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        plan.recommended 
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600' 
                          : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-8 h-8 ${
                          plan.recommended ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-center justify-center space-x-1">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500 text-lg">/month</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mb-8">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Subscribe Button */}
                  <button
                    onClick={() => handleSubscribe(plan.priceId)}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-lg'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {plan.recommended ? 'Get Started' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="text-center mt-12">
            <p className="text-teal-100 mb-4">
              All plans include a 7-day free trial • Cancel anytime • Secure payment
            </p>
            <div className="flex justify-center space-x-8 text-sm text-teal-200">
              <span>✓ HIPAA Compliant</span>
              <span>✓ 256-bit SSL Encryption</span>
              <span>✓ 99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <ProtectedRoute requireEmailVerification={true}>
      <SubscribeContent />
    </ProtectedRoute>
  );
}
