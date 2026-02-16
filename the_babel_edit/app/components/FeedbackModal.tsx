'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackModal({ isOpen, onClose, locale }: { isOpen: boolean; onClose: () => void; locale?: string }) {
  const [type, setType] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (message.trim().length < 10) {
      toast.error('Message must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      // Ensure enum values match backend (PRISMA FeedbackType)
      const normalizedType = (type || 'GENERAL').toString().toUpperCase();
      await apiRequest(API_ENDPOINTS.FEEDBACK.CREATE, {
        method: 'POST',
        body: { type: normalizedType, message, pageUrl: typeof window !== 'undefined' ? window.location.href : '' },
        requireAuth: true,
      });
      toast.success('Feedback submitted — thank you!');
      setMessage('');
      onClose();
    } catch (err: any) {
      // If not authenticated, redirect to login page
      if (err?.status === 401) {
        toast.error('Please sign in to submit feedback');
        router.push(`/${locale || 'en'}/auth/login`);
      } else {
        toast.error(err?.message || 'Failed to submit feedback');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Share Your Thoughts</h3>
            <p className="text-sm text-gray-500">Send suggestions, issues or general feedback.</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-sm text-gray-700 block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded px-3 py-2 pr-8">
              <option value="GENERAL">General</option>
              <option value="BUG">Bug Report</option>
              <option value="SUGGESTION">Suggestion</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="text-sm text-gray-700 block mb-1">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send Feedback'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
