"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./forgot.module.css";
import { toast } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function ForgotPasswordPage() {
  const params = useParams();
  const currentLocale = typeof params.locale === "string" ? params.locale : "en";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer for resend
  const startCooldown = useCallback(() => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        setErrorCode(data.code || "");
        setLoading(false);
        return;
      }

      setSent(true);
      startCooldown();
      toast.success("Reset link sent! Check your inbox.");
    } catch {
      setError("Unable to connect to the server. Please try again later.");
    }

    setLoading(false);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        startCooldown();
        toast.success("Reset link resent! Check your inbox.");
      } else {
        const data = await res.json();
        setError(data.message || "Failed to resend. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please try again later.");
    }

    setLoading(false);
  };

  return (
    <div>
      <div className={styles.forgotBg}>
        <div className={styles.forgotCard}>
          {!sent ? (
            <>
              {/* Request Form */}
              <div className={styles.iconContainer}>
                <div className={styles.iconCircle}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>

              <h1 className={styles.title}>Forgot your password?</h1>
              <p className={styles.subtitle}>
                No worries! Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
              </p>

              {error && (
                <div className={styles.errorMessage}>
                  {error}
                  {errorCode === "OAUTH_ACCOUNT" && (
                    <Link
                      href={`/${currentLocale}/auth/login`}
                      style={{ display: 'block', marginTop: '8px', color: '#ef4444', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Go to Sign In →
                    </Link>
                  )}
                  {errorCode === "USER_NOT_FOUND" && (
                    <Link
                      href={`/${currentLocale}/auth/signup`}
                      style={{ display: 'block', marginTop: '8px', color: '#ef4444', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Create an account →
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label className={styles.inputLabel}>
                  <span className={styles.labelRow}>
                    <span className={styles.labelIcon}>✉️</span> Email address
                  </span>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                    autoComplete="email"
                  />
                </label>

                <button
                  className={styles.submitBtn}
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{ marginTop: "1rem" }}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>

              <div className={styles.backRow}>
                <Link href={`/${currentLocale}/auth/login`} className={styles.backLink}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className={styles.successContainer}>
                <div className={styles.successIconCircle}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>

                <h2 className={styles.successTitle}>Check your email</h2>

                <p className={styles.successMessage}>
                  We&apos;ve sent a password reset link to{" "}
                  <span className={styles.emailHighlight}>{email}</span>.
                  Please check your inbox and spam folder.
                </p>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <div className={styles.resendRow}>
                  <span>Didn&apos;t receive it?</span>
                  <button
                    className={styles.resendBtn}
                    onClick={handleResend}
                    disabled={loading || cooldown > 0}
                  >
                    {loading ? "Sending..." : "Resend link"}
                  </button>
                  {cooldown > 0 && (
                    <span className={styles.timerText}>({cooldown}s)</span>
                  )}
                </div>

                <div className={styles.backRow}>
                  <Link href={`/${currentLocale}/auth/login`} className={styles.backLink}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
