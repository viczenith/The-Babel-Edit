'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'SALE' | 'INFO' | 'NEW_ARRIVAL' | 'WARNING' | 'CUSTOM';
  linkText: string | null;
  linkUrl: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  startDate: string | null;
  endDate: string | null;
}

const TYPE_DEFAULTS: Record<string, { bg: string; text: string }> = {
  SALE: { bg: '#dc2626', text: '#ffffff' },
  INFO: { bg: '#2563eb', text: '#ffffff' },
  NEW_ARRIVAL: { bg: '#059669', text: '#ffffff' },
  WARNING: { bg: '#d97706', text: '#ffffff' },
  CUSTOM: { bg: '#7c3aed', text: '#ffffff' },
};

interface AnnouncementBarProps {
  /** Optional className for the outer container */
  className?: string;
  /** Render variant: 'banner' for full-width bar, 'inline' for embedded in a section */
  variant?: 'banner' | 'inline';
  /** Optional locale for link prefixing */
  locale?: string;
}

const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ className = '', variant = 'banner', locale = 'en' }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      if (stored) {
        setDismissed(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch active announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/announcements/active`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
        }
      } catch {
        // Silent fail - not critical
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Auto-rotate if multiple announcements
  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  useEffect(() => {
    if (visibleAnnouncements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % visibleAnnouncements.length);
    }, 6000); // Rotate every 6 seconds

    return () => clearInterval(interval);
  }, [visibleAnnouncements.length]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Don't render anything while loading or if no announcements
  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  // Ensure index is in bounds
  const safeIndex = currentIndex % visibleAnnouncements.length;
  const current = visibleAnnouncements[safeIndex];
  if (!current) return null;

  const typeDefaults = TYPE_DEFAULTS[current.type] || TYPE_DEFAULTS.INFO;
  const bgColor = current.backgroundColor || typeDefaults.bg;
  const txtColor = current.textColor || typeDefaults.text;

  // Build link href with locale prefix
  const linkHref = current.linkUrl
    ? current.linkUrl.startsWith('http')
      ? current.linkUrl
      : `/${locale}${current.linkUrl.startsWith('/') ? '' : '/'}${current.linkUrl}`
    : null;

  if (variant === 'inline') {
    return (
      <div className={className}>
        <span style={{ color: txtColor }}>{current.message}</span>
        {current.linkText && linkHref && (
          <>
            {' '}
            <a
              href={linkHref}
              style={{ color: txtColor, textDecoration: 'underline', fontWeight: 600 }}
            >
              {current.linkText}
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-300 ${className}`}
      style={{ backgroundColor: bgColor, color: txtColor }}
    >
      {/* Dot indicators for multiple announcements */}
      {visibleAnnouncements.length > 1 && (
        <div className="hidden sm:flex items-center gap-1.5 absolute left-4">
          {visibleAnnouncements.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: txtColor,
                opacity: i === safeIndex ? 1 : 0.4,
                transform: i === safeIndex ? 'scale(1.3)' : 'scale(1)',
              }}
              aria-label={`Announcement ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Message */}
      <div className="text-center flex-1">
        <span>{current.message}</span>
        {current.linkText && linkHref && (
          <>
            {' '}
            <a
              href={linkHref}
              className="underline font-semibold hover:opacity-80 transition-opacity"
              style={{ color: txtColor }}
            >
              {current.linkText}
            </a>
          </>
        )}
      </div>

      {/* Dismiss button */}
      {current.isDismissible && (
        <button
          onClick={() => handleDismiss(current.id)}
          className="absolute right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          style={{ color: txtColor }}
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default AnnouncementBar;
