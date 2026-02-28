"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { apiRequest } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import styles from '../login/login.module.css';

const AdminRegisterPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { firstName, lastName, email, password, role: 'product_manager' };
      const res = await apiRequest('/auth/register', { method: 'POST', body: payload });
      if (res && (res.success || res.id)) {
        router.push(`/${locale}/auth/login`);
      } else {
        toast.error(res?.message || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-gray-50 px-3 sm:px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-md sm:rounded-lg shadow p-4 sm:p-6 max-h-[90vh] overflow-auto">
        <h2 className="text-2xl font-semibold mb-2">Product Manager Signup</h2>
        <p className="text-sm sm:text-base text-gray-500 mb-6">Create a Product Manager account to manage products and inventory.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="First name" className="w-full px-3 py-2 border rounded" aria-label="First name" autoComplete="given-name" />
            <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Last name" className="w-full px-3 py-2 border rounded" aria-label="Last name" autoComplete="family-name" />
          </div>
          <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="Email" className="w-full px-3 py-2 border rounded" aria-label="Email" autoComplete="email" />
          <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="Password" className="w-full px-3 py-2 border rounded" aria-label="Password" autoComplete="new-password" />

          <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60 text-sm sm:text-base">
            {submitting ? 'Creating account…' : 'Create Product Manager Account'}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600 text-center">
          Already have an account? <Link href={`/${locale}/auth/login`} className="text-blue-600 font-medium">Login here</Link>
        </div>

        <div>
          <div className={styles.dividerRow}>
            <span className={styles.divider}></span>
            <span className={styles.orText}>or sign up with:</span>
            <span className={styles.divider}></span>
          </div>

          <div className={styles.socialRow}>
            <button type="button" className={styles.socialBtn} onClick={() => { window.location.href = '/api/users/auth/google'; }}>
              <img src="/images/google.svg" alt="Google" />
              Google
            </button>
            {/* <button type="button" className={styles.socialBtn} onClick={() => { window.location.href = '/api/users/auth/facebook'; }}>
              <img src="/images/facebook.svg" alt="Facebook" />
              Facebook
            </button>
            <button type="button" className={styles.socialBtn} onClick={() => { window.location.href = '/api/users/auth/apple'; }}>
              <img src="/images/apple.svg" alt="Apple" />
              Apple
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRegisterPage;
