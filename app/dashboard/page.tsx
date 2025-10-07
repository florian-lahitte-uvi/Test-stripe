'use client';

import { getAuth, signOut } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import SubscriptionManager from '@/components/SubscriptionManager';
import { LogOut, User, Settings } from 'lucide-react';

function DashboardContent() {
  const { user } = useAuth();

  const handleLogout = async () => {
    const auth = getAuth(firebaseApp);
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Welcome back!</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <User className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-800">Account</h2>
            </div>
            <div className="space-y-2 text-gray-600">
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Status:</strong> 
                <span className="text-green-600 ml-2">
                  {user?.emailVerified ? 'Verified' : 'Pending Verification'}
                </span>
              </p>
              <p><strong>Member since:</strong> {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors">
                Profile Settings
              </button>
              <button className="w-full text-left bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors">
                Notifications
              </button>
              <button className="w-full text-left bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors">
                Privacy & Security
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        <div className="mt-8">
          <SubscriptionManager />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute requireEmailVerification={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
