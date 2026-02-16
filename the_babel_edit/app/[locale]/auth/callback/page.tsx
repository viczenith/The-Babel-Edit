'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { setAuthToken } from '@/app/lib/api';
import { toast } from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();
  const locale = (params?.locale as string) || 'en';
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double-processing in React StrictMode
    if (processedRef.current) return;
    processedRef.current = true;

    const dataParam = searchParams.get('data');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      toast.error('Social login failed. Please try again.');
      router.replace(`/${locale}/auth/login`);
      return;
    }

    if (!dataParam) {
      toast.error('No authentication data received.');
      router.replace(`/${locale}/auth/login`);
      return;
    }

    try {
      const authData = JSON.parse(decodeURIComponent(dataParam));
      const { user, accessToken } = authData;

      if (!user || !accessToken) {
        throw new Error('Invalid auth data');
      }

      // Store the access token
      setAuthToken(accessToken);

      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(user));

      // Update auth context
      updateUser(user);

      // Set the user role cookie for middleware
      document.cookie = `userRole=${user.role};path=/;max-age=${7 * 24 * 60 * 60};samesite=strict`;

      toast.success('Signed in successfully!');

      // Redirect based on role
      const role = (user.role || '').toUpperCase();
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        router.replace(`/${locale}/admin`);
      } else {
        router.replace(`/${locale}/dashboard`);
      }
    } catch {
      toast.error('Failed to process login. Please try again.');
      router.replace(`/${locale}/auth/login`);
    }
  }, [searchParams, router, locale, updateUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
