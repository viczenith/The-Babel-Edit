'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */
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

const TYPE_DEFAULTS: Record<string, { bg: string; text: string; icon: string }> = {
  SALE:        { bg: '#dc2626', text: '#ffffff', icon: '🔥' },
  INFO:        { bg: '#2563eb', text: '#ffffff', icon: 'ℹ️' },
  NEW_ARRIVAL: { bg: '#059669', text: '#ffffff', icon: '✨' },
  WARNING:     { bg: '#d97706', text: '#ffffff', icon: '⚠️' },
  CUSTOM:      { bg: '#7c3aed', text: '#ffffff', icon: '💎' },
};

const ROTATE_INTERVAL = 6000; // 6 seconds per slide

interface AnnouncementBarProps {
  className?: string;
  variant?: 'banner' | 'inline';
  locale?: string;
}

/* ─────────────────────────────────────────────
   Keyframe styles injected once
   ───────────────────────────────────────────── */
const STYLE_ID = 'announcement-bar-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes announcementSlideDown {
      0%   { transform: translateY(-100%); opacity: 0; }
      60%  { transform: translateY(4px); opacity: 1; }
      100% { transform: translateY(0); opacity: 1; }
    }

    @keyframes announcementFadeSlideIn {
      0%   { opacity: 0; transform: translateY(-8px) scale(0.97); filter: blur(4px); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }

    @keyframes announcementFadeSlideOut {
      0%   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      100% { opacity: 0; transform: translateY(8px) scale(0.97); filter: blur(4px); }
    }

    @keyframes announcementShimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }

    @keyframes announcementProgress {
      0%   { transform: scaleX(0); }
      100% { transform: scaleX(1); }
    }

    @keyframes announcementPulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.15); }
    }

    @keyframes announcementDismiss {
      0%   { transform: translateY(0); opacity: 1; max-height: 60px; }
      100% { transform: translateY(-100%); opacity: 0; max-height: 0; padding: 0; }
    }

    @keyframes announcementInlineEntrance {
      0%   { opacity: 0; transform: scale(0.92); filter: blur(6px); }
      60%  { opacity: 1; transform: scale(1.02); filter: blur(0); }
      100% { opacity: 1; transform: scale(1); filter: blur(0); }
    }

    @keyframes sparkleFloat {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
      50%      { transform: translateY(-3px) rotate(15deg); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */
const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  className = '',
  variant = 'banner',
  locale = 'en',
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const [isDismissing, setIsDismissing] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject CSS keyframes once
  useEffect(() => { injectKeyframes(); }, []);

  // Entrance animation trigger
  useEffect(() => {
    if (!loading && announcements.length > 0) {
      const t = setTimeout(() => setHasEntered(true), 50);
      return () => clearTimeout(t);
    }
  }, [loading, announcements.length]);

  // Load dismissed IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed_announcements');
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  // Fetch active announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/announcements/active`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setAnnouncements(data.announcements || []);
        }
      } catch { /* Silent fail */ }
      finally { setLoading(false); }
    };
    fetchAnnouncements();
  }, []);

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  // ── Transition helper ──
  const goTo = useCallback((nextIdx: number, dir: 'next' | 'prev') => {
    if (isTransitioning) return;
    setTransitionDirection(dir);
    setIsTransitioning(true);

    // halfway through the animation, swap index
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex(nextIdx);
      setIsTransitioning(false);
      setProgressKey(k => k + 1); // restart progress bar
    }, 350); // matches the CSS out duration
  }, [isTransitioning]);

  // Auto-rotate with progress
  useEffect(() => {
    if (visibleAnnouncements.length <= 1) return;
    const interval = setInterval(() => {
      goTo((currentIndex + 1) % visibleAnnouncements.length, 'next');
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [visibleAnnouncements.length, currentIndex, goTo]);

  // Cleanup
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // ── Dismiss with animation ──
  const handleDismiss = useCallback((id: string) => {
    setIsDismissing(true);
    setTimeout(() => {
      setDismissed(prev => {
        const next = new Set(prev);
        next.add(id);
        try { localStorage.setItem('dismissed_announcements', JSON.stringify([...next])); }
        catch { /* ignore */ }
        return next;
      });
      setIsDismissing(false);
    }, 400);
  }, []);

  // ── Navigation arrows ──
  const goNext = useCallback(() => {
    if (visibleAnnouncements.length <= 1) return;
    goTo((currentIndex + 1) % visibleAnnouncements.length, 'next');
  }, [currentIndex, visibleAnnouncements.length, goTo]);

  const goPrev = useCallback(() => {
    if (visibleAnnouncements.length <= 1) return;
    goTo((currentIndex - 1 + visibleAnnouncements.length) % visibleAnnouncements.length, 'prev');
  }, [currentIndex, visibleAnnouncements.length, goTo]);

  // ── Guards ──
  if (loading || visibleAnnouncements.length === 0) return null;

  const safeIndex = currentIndex % visibleAnnouncements.length;
  const current = visibleAnnouncements[safeIndex];
  if (!current) return null;

  const typeDefaults = TYPE_DEFAULTS[current.type] || TYPE_DEFAULTS.INFO;
  const bgColor = current.backgroundColor || typeDefaults.bg;
  const txtColor = current.textColor || typeDefaults.text;
  const icon = typeDefaults.icon;

  const linkHref = current.linkUrl
    ? current.linkUrl.startsWith('http')
      ? current.linkUrl
      : `/${locale}${current.linkUrl.startsWith('/') ? '' : '/'}${current.linkUrl}`
    : null;

  // ── Text content transition style ──
  const textAnimStyle: React.CSSProperties = isTransitioning
    ? { animation: `announcementFadeSlideOut 0.35s ease forwards` }
    : { animation: `announcementFadeSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards` };

  /* ═══════════════════════════════════════════
     INLINE VARIANT
     ═══════════════════════════════════════════ */
  if (variant === 'inline') {
    return (
      <div
        className={className}
        style={{
          backgroundColor: bgColor,
          color: txtColor,
          padding: '12px 20px',
          borderRadius: '10px',
          textAlign: 'center',
          fontWeight: 500,
          position: 'relative',
          overflow: 'hidden',
          animation: hasEntered ? 'announcementInlineEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards' : 'none',
          opacity: hasEntered ? undefined : 0,
        }}
      >
        {/* Shimmer overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.10) 60%, transparent 100%)`,
            backgroundSize: '200% 100%',
            animation: 'announcementShimmer 3s ease-in-out infinite',
            pointerEvents: 'none',
            borderRadius: 'inherit',
          }}
        />

        <span style={{ ...textAnimStyle, display: 'inline-block', position: 'relative', color: txtColor }}>
          <span style={{ marginRight: 6 }}>{icon}</span>
          {current.message}
        </span>

        {current.linkText && linkHref && (
          <>
            {' '}
            <a
              href={linkHref}
              style={{
                color: txtColor,
                textDecoration: 'underline',
                fontWeight: 700,
                position: 'relative',
                letterSpacing: '0.02em',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {current.linkText} →
            </a>
          </>
        )}

        {current.isDismissible && (
          <button
            onClick={() => handleDismiss(current.id)}
            className="ml-3 inline-flex items-center p-0.5 rounded-full transition-colors"
            style={{
              color: txtColor,
              position: 'relative',
              background: 'rgba(255,255,255,0.15)',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1)'; }}
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     BANNER VARIANT
     ═══════════════════════════════════════════ */
  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: txtColor,
        position: 'relative',
        overflow: 'hidden',
        animation: isDismissing
          ? 'announcementDismiss 0.4s ease forwards'
          : hasEntered
            ? 'announcementSlideDown 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : 'none',
        opacity: hasEntered || isDismissing ? undefined : 0,
      }}
      className={className}
    >
      {/* ── Shimmer overlay ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.06) 65%, transparent 100%)`,
          backgroundSize: '200% 100%',
          animation: 'announcementShimmer 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      {/* ── Inner content bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 48px',
          position: 'relative',
          minHeight: 42,
        }}
      >
        {/* ── Left: prev arrow + dot indicators ── */}
        {visibleAnnouncements.length > 1 && (
          <div style={{ position: 'absolute', left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={goPrev}
              style={{
                color: txtColor,
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
              aria-label="Previous announcement"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>

            <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 5 }}>
              {visibleAnnouncements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > safeIndex ? 'next' : 'prev')}
                  style={{
                    width: i === safeIndex ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: txtColor,
                    opacity: i === safeIndex ? 1 : 0.35,
                    transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  aria-label={`Announcement ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Center: message with transition ── */}
        <div style={{ textAlign: 'center', flex: 1, fontSize: 14, fontWeight: 500 }}>
          <span style={{ ...textAnimStyle, display: 'inline-block' }}>
            <span
              style={{
                marginRight: 6,
                display: 'inline-block',
                animation: 'announcementPulse 2s ease-in-out infinite',
              }}
            >
              {icon}
            </span>
            {current.message}
            {current.linkText && linkHref && (
              <>
                {'  '}
                <a
                  href={linkHref}
                  style={{
                    color: txtColor,
                    textDecoration: 'none',
                    fontWeight: 700,
                    borderBottom: `1.5px solid ${txtColor}`,
                    paddingBottom: 1,
                    marginLeft: 6,
                    letterSpacing: '0.02em',
                    transition: 'opacity 0.2s, padding-bottom 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.paddingBottom = '3px'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.paddingBottom = '1px'; }}
                >
                  {current.linkText} →
                </a>
              </>
            )}
          </span>
        </div>

        {/* ── Right: next arrow + dismiss ── */}
        <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          {visibleAnnouncements.length > 1 && (
            <button
              onClick={goNext}
              style={{
                color: txtColor,
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1)'; }}
              aria-label="Next announcement"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          )}

          {current.isDismissible && (
            <button
              onClick={() => handleDismiss(current.id)}
              style={{
                color: txtColor,
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
              aria-label="Dismiss announcement"
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Progress bar (auto-rotate timer) ── */}
      {visibleAnnouncements.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <div
            key={progressKey}
            style={{
              height: '100%',
              backgroundColor: txtColor,
              opacity: 0.5,
              transformOrigin: 'left',
              animation: `announcementProgress ${ROTATE_INTERVAL}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AnnouncementBar;
