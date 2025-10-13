'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationModal, SuccessModal, PlanChangeModal, PlanInfoModal } from './Modal';
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  RefreshCw,
  ExternalLink,
  ArrowUp,
  Info,
  Users,
  Heart,
  Stethoscope
} from 'lucide-react';

interface SubscriptionData {
  subscription: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    created: number;
  };
  plan: {
    name: string;
    amount: number;
    currency: string;
    interval: string;
  };
}

// Available plans for changing
const AVAILABLE_PLANS = [
  {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER!,
    name: 'Starter',
    price: 4.99,
    level: 1,
    icon: Users,
    recommended: false,
    features: [
      'Basic care coordination',
      'Family messaging',
      'Appointment reminders',
      'Document storage (5GB)',
      'Mobile app access',
    ],
  },
  {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS!,
    name: 'Plus',
    price: 6.99,
    level: 2,
    icon: Heart,
    recommended: true,
    features: [
      'Everything in Starter',
      'Advanced care plans',
      'Medical team coordination',
      'Unlimited document storage',
      'Video consultations',
      'Priority support',
    ],
  },
  {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PRO!,
    name: 'Family Pro',
    price: 14.99,
    level: 3,
    icon: Stethoscope,
    recommended: false,
    features: [
      'Everything in Plus',
      'Multiple family members',
      'Advanced analytics',
      'Care team management',
      'Custom workflows',
      '24/7 medical support',
      'Insurance integration',
    ],
  },
];

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Plan change states
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [planChangeData, setPlanChangeData] = useState<{
    newPriceId: string;
    newPlanName: string;
    changeType: 'upgrade';
  } | null>(null);

  // Plan info modal state
  const [showPlanInfoModal, setShowPlanInfoModal] = useState(false);
  const [selectedPlanInfo, setSelectedPlanInfo] = useState<typeof AVAILABLE_PLANS[0] | null>(null);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/manage-subscription?uid=${user.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription');
      }

      // Handle the case where there's no subscription
      if (data.hasSubscription === false || !data.subscription) {
        setSubscriptionData(null);
      } else {
        setSubscriptionData(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscriptionData) return;

    try {
      setActionLoading(true);
      
      const response = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          action: 'cancel',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh subscription data
      await fetchSubscription();
      setSuccessMessage('Your subscription has been scheduled for cancellation at the end of the current billing period.');
      setShowSuccessModal(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setShowCancelModal(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!user || !subscriptionData) return;

    try {
      setActionLoading(true);
      
      const response = await fetch('/api/manage-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          action: 'reactivate',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      // Refresh subscription data
      await fetchSubscription();
      setSuccessMessage('Your subscription has been reactivated! Your billing will continue as normal.');
      setShowSuccessModal(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setShowReactivateModal(false);
    }
  };

  const handlePlanChange = (newPriceId: string, newPlanName: string) => {
    if (!subscriptionData) return;

    // Find current and new plan levels
    const currentPlan = AVAILABLE_PLANS.find(p => p.name === subscriptionData.plan.name);
    const newPlan = AVAILABLE_PLANS.find(p => p.priceId === newPriceId);

    if (!currentPlan || !newPlan) return;

    // Only allow upgrades
    if (newPlan.level <= currentPlan.level) {
      setError('Downgrades are not available. To switch to a lower plan, please cancel your current subscription and resubscribe after it expires.');
      return;
    }

    setPlanChangeData({
      newPriceId,
      newPlanName,
      changeType: 'upgrade',
    });
    setShowPlanChangeModal(true);
  };

  const handleShowPlanInfo = (plan: typeof AVAILABLE_PLANS[0]) => {
    setSelectedPlanInfo(plan);
    setShowPlanInfoModal(true);
  };



  const confirmPlanChange = async () => {
    if (!user || !planChangeData) return;

    try {
      setActionLoading(true);
      
      const response = await fetch('/api/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          newPriceId: planChangeData.newPriceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan');
      }

      // Refresh subscription data
      await fetchSubscription();
      
      setSuccessMessage(data.message);
      setShowSuccessModal(true);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
      setShowPlanChangeModal(false);
      setPlanChangeData(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
            <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-800">Subscription Error</h2>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchSubscription}
          className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Check if subscription is expired (canceled status)
  const isExpired = subscriptionData && subscriptionData.subscription.status === 'canceled';

  if (!subscriptionData || isExpired) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            {isExpired ? 'Subscription Expired' : 'No Active Subscription'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isExpired 
              ? 'Your subscription has ended. Choose a plan to continue enjoying Doctor Journal services.' 
              : 'You don\'t have an active subscription yet. Choose a plan to get started with Doctor Journal.'}
          </p>
          
          <a
            href="/subscribe"
            className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            <CreditCard className="w-5 h-5" />
            <span>Choose Your Plan</span>
          </a>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              All plans include a 7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { subscription, plan } = subscriptionData;
  
  // Handle date conversion with error checking
  const currentPeriodEnd = subscription.current_period_end && subscription.current_period_end > 0
    ? new Date(subscription.current_period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now
    
  // Validate the date
  const isValidDate = !isNaN(currentPeriodEnd.getTime());
  
  const isActive = subscription.status === 'active';
  const isCanceling = subscription.cancel_at_period_end;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CreditCard className="w-6 h-6 text-teal-600" />
          <h2 className="text-xl font-semibold text-gray-800">Subscription Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isActive && !isCanceling
              ? 'bg-green-100 text-green-800'
              : isCanceling
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {isActive && !isCanceling && 'Active'}
            {isCanceling && 'Canceling'}
            {!isActive && 'Inactive'}
          </div>
          <button
            onClick={fetchSubscription}
            disabled={actionLoading}
            className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm transition-colors"
            style={{ fontSize: '14px' }}
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className={`grid ${!isCanceling ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Current Plan</h3>
              <p className="text-2xl font-bold text-teal-600">{plan.name}</p>
              <p className="text-gray-600">
                ${plan.amount}/{plan.interval}
              </p>
            </div>
            {!isCanceling && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Next Billing Date</h3>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <p className="text-gray-800">
                    {isValidDate ? currentPeriodEnd.toLocaleDateString() : 'Date unavailable'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Notice */}
        {isCanceling && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Subscription Ending</h4>
                <p className="text-yellow-700 text-sm">
                  Your subscription will end on {isValidDate ? currentPeriodEnd.toLocaleDateString() : 'the end of your current billing period'}. 
                  You'll continue to have access until then.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Status Information */}
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-gray-800">Status</span>
            </div>
            <p className="text-gray-600 capitalize">{subscription.status}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-gray-800">Member Since</span>
            </div>
            <p className="text-gray-600">
              {new Date(subscription.created * 1000).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <ExternalLink className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-gray-800">Subscription ID</span>
            </div>
            <p className="text-gray-600 text-xs font-mono">
              {subscription.id.substring(0, 16)}...
            </p>
          </div>
        </div>

        {/* Plan Change Section */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Change Plan</h4>
          <div className="grid md:grid-cols-3 gap-3">
            {AVAILABLE_PLANS.map((availablePlan) => {
              const isCurrentPlan = availablePlan.name === plan.name;
              const currentPlan = AVAILABLE_PLANS.find(p => p.name === plan.name);
              const isUpgrade = currentPlan && availablePlan.level > currentPlan.level;
              const IconComponent = availablePlan.icon;

              return (
                <div
                  key={availablePlan.priceId}
                  className={`relative border rounded-lg p-3 ${
                    isCurrentPlan 
                      ? 'border-teal-200 bg-teal-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        availablePlan.recommended 
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600' 
                          : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-4 h-4 ${
                          availablePlan.recommended ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <h5 className="font-medium text-gray-800">{availablePlan.name}</h5>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isCurrentPlan && (
                        <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                      <button
                        onClick={() => handleShowPlanInfo(availablePlan)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="View plan details"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    ${availablePlan.price}/month
                  </p>
                  
                  {!isCurrentPlan && isUpgrade && (
                    <button
                      onClick={() => handlePlanChange(availablePlan.priceId, availablePlan.name)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                      style={{ fontSize: '14px' }}
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>Upgrade</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!isCanceling ? (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={actionLoading}
            className="flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: '14px' }}
          >
            <X className="w-4 h-4" />
            <span>Cancel Subscription</span>
          </button>
        ) : (
          <button
            onClick={() => setShowReactivateModal(true)}
            disabled={actionLoading}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-2 rounded-lg transition-colors"
            style={{ fontSize: '14px' }}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Reactivate Subscription</span>
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Need to change your plan or billing information? Contact our support team at{' '}
          <a href="mailto:support@doctorjournal.com" className="text-teal-600 hover:text-teal-700">
            support@doctorjournal.com
          </a>
        </p>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? Your access will continue until the end of your current billing period, and you can reactivate before then if you change your mind."
        confirmText="Yes, Cancel"
        cancelText="Keep Subscription"
        loading={actionLoading}
        type="warning"
      />

      <ConfirmationModal
        isOpen={showReactivateModal}
        onClose={() => setShowReactivateModal(false)}
        onConfirm={handleReactivateSubscription}
        title="Reactivate Subscription"
        message="This will reactivate your subscription and resume normal billing. You'll continue to have full access without interruption."
        confirmText="Yes, Reactivate"
        cancelText="Cancel"
        loading={actionLoading}
        type="success"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        message={successMessage}
        buttonText="Got it"
      />

      {planChangeData && (
        <PlanChangeModal
          isOpen={showPlanChangeModal}
          onClose={() => {
            setShowPlanChangeModal(false);
            setPlanChangeData(null);
          }}
          onConfirm={confirmPlanChange}
          currentPlan={subscriptionData?.plan.name || ''}
          newPlan={planChangeData.newPlanName}
          changeType={planChangeData.changeType}
          loading={actionLoading}
        />
      )}

      {selectedPlanInfo && (
        <PlanInfoModal
          isOpen={showPlanInfoModal}
          onClose={() => {
            setShowPlanInfoModal(false);
            setSelectedPlanInfo(null);
          }}
          plan={selectedPlanInfo}
        />
      )}
    </div>
  );
}