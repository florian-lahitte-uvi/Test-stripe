'use client';

import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'warning' | 'success' | 'info';
}

export function Modal({ isOpen, onClose, title, children, type = 'info' }: ModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIconAndColor = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: null,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const { icon, bgColor, borderColor } = getIconAndColor();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${borderColor}`}>
            <div className="flex items-center space-x-3">
              {icon}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className={`p-6 ${bgColor}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  type?: 'warning' | 'success' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  type = 'warning'
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type={type}>
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK'
}: SuccessModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type="success">
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        
        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: string;
  newPlan: string;
  changeType: 'upgrade' | 'downgrade';
  loading?: boolean;
}

export function PlanChangeModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  changeType,
  loading = false
}: PlanChangeModalProps) {
  const isUpgrade = changeType === 'upgrade';
  
  const getTitle = () => {
    return isUpgrade ? `Upgrade to ${newPlan}` : `Downgrade to ${newPlan}`;
  };

  const getMessage = () => {
    if (isUpgrade) {
      return `You'll immediately get access to all ${newPlan} features. Any prorated charges will appear on your next invoice based on your remaining billing period.`;
    } else {
      return `You'll keep your current ${currentPlan} features until the end of your billing period, then automatically switch to ${newPlan} on your next billing date.`;
    }
  };

  const getButtonText = () => {
    return isUpgrade ? `Upgrade Now` : `Schedule Downgrade`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} type={isUpgrade ? 'info' : 'warning'}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Current Plan:</span>
            <span className="font-medium text-gray-900">{currentPlan}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">New Plan:</span>
            <span className="font-medium text-teal-600">{newPlan}</span>
          </div>
        </div>
        
        <p className="text-gray-700">{getMessage()}</p>
        
        {isUpgrade && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Immediate Change:</strong> You'll get {newPlan} features right away and be charged the prorated difference for your remaining billing period.
            </p>
          </div>
        )}

        {!isUpgrade && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>End-of-Period Change:</strong> No immediate charges. Your {newPlan} subscription starts on your next billing date.
            </p>
          </div>
        )}
        
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${
              isUpgrade 
                ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400'
            }`}
          >
            {loading ? 'Processing...' : getButtonText()}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface PlanInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: number;
    features: string[];
    icon: React.ComponentType<{ className?: string }>;
    recommended?: boolean;
  };
}

export function PlanInfoModal({
  isOpen,
  onClose,
  plan
}: PlanInfoModalProps) {
  const IconComponent = plan.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${plan.name} Plan Details`} type="info">
      <div className="space-y-4">
        {/* Plan Header */}
        <div className="text-center pb-4 border-b border-gray-200">
          <div className="flex justify-center mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              plan.recommended 
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600' 
                : 'bg-gray-100'
            }`}>
              <IconComponent className={`w-6 h-6 ${
                plan.recommended ? 'text-white' : 'text-gray-600'
              }`} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h3>
          <div className="flex items-center justify-center space-x-1">
            <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
            <span className="text-gray-500">/month</span>
          </div>
          {plan.recommended && (
            <div className="mt-2">
              <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                Recommended
              </span>
            </div>
          )}
        </div>

        {/* Features List */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Features included:</h4>
          <ul className="space-y-2">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional Info */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-teal-800">
            <strong>Note:</strong> All plans include a 7-day free trial, secure HIPAA-compliant storage, 
            and the ability to upgrade or downgrade at any time.
          </p>
        </div>
        
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}