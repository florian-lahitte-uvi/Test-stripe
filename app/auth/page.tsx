'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';
import { createUserProfileIfNotExists } from '@/lib/createUserProfile';
import { signInSchema, signUpSchema, SignInFormData, SignUpFormData } from '@/lib/validationSchemas';
import CustomRoleSelect from '@/components/CustomRoleSelect';
import Image from 'next/image';

export default function AuthPage() {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const auth = getAuth(app);

  // Sign In Form
  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange', // Real-time validation
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Sign Up Form  
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange', // Real-time validation
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      role: 'Parent',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

// Exception emails that can bypass email verification
const EMAIL_VERIFICATION_EXCEPTIONS = [
  'flolahitte@gmail.com',
  'bob@gmail.com'
];

const handleSignIn = async (data: SignInFormData) => {
  try {
    setError('');
    
    // Sign in existing user
    const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
    
    // Check if email is in exception list or is verified
    if (EMAIL_VERIFICATION_EXCEPTIONS.includes(data.email.toLowerCase()) || userCredential.user.emailVerified) {
      // ✅ Create Firestore profile if it doesn't exist
      await createUserProfileIfNotExists();

      // ✅ Redirect after profile is set
      router.push('/dashboard');
    } else {
      setError('Please verify your email before signing in. Check your inbox for a verification email.');
      return;
    }
  } catch (err: any) {
    console.error(err);
    setError(err.message);
  }
};

const handleSignUp = async (data: SignUpFormData) => {
  try {
    setError('');

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    
    // Check if email is in exception list
    if (EMAIL_VERIFICATION_EXCEPTIONS.includes(data.email.toLowerCase())) {
      // Skip email verification for exception emails
      await createUserProfileIfNotExists(data.firstName, data.lastName, data.role);
      router.push('/dashboard');
    } else {
      // Send email verification for regular emails
      await sendEmailVerification(userCredential.user);
      router.push('/verify-email');
    }
  } catch (err: any) {
    console.error(err);
    setError(err.message);
  }
};

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
              <p className="text-gray-600 text-sm">description </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center text-gray-700">
              {isSigningUp ? 'Create Account' : 'Sign In'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {isSigningUp ? (
              // Sign Up Form
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="First Name"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                        signUpForm.formState.errors.firstName 
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                          : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                      }`}
                      {...signUpForm.register('firstName')}
                    />
                    {signUpForm.formState.errors.firstName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Last Name"
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                        signUpForm.formState.errors.lastName 
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                          : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                      }`}
                      {...signUpForm.register('lastName')}
                    />
                    {signUpForm.formState.errors.lastName && (
                      <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <CustomRoleSelect
                    value={signUpForm.watch('role')}
                    onChange={(value) => signUpForm.setValue('role', value)}
                    error={!!signUpForm.formState.errors.role}
                  />
                  {signUpForm.formState.errors.role && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      signUpForm.formState.errors.email 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    {...signUpForm.register('email')}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      signUpForm.formState.errors.password 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    {...signUpForm.register('password')}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      signUpForm.formState.errors.confirmPassword 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    {...signUpForm.register('confirmPassword')}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signUpForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={signUpForm.formState.isSubmitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  {signUpForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            ) : (
              // Sign In Form
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-3">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      signInForm.formState.errors.email 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    {...signInForm.register('email')}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                      signInForm.formState.errors.password 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200' 
                        : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                    {...signInForm.register('password')}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-red-600 text-xs mt-1 font-medium">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={signInForm.formState.isSubmitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  {signInForm.formState.isSubmitting ? 'Signing In...' : 'Log In'}
                </button>
              </form>
            )}

           
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                {isSigningUp ? 'Already have an account?' : 'Don\'t have an account?'}{' '}
                <button
                  onClick={() => {
                    setIsSigningUp(!isSigningUp);
                    setError('');
                    // Reset both forms when switching
                    signInForm.reset();
                    signUpForm.reset();
                  }}
                  className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
                >
                  {isSigningUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
