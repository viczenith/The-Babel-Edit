"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import styles from "./reset.module.css";
import { toast } from "react-hot-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type PageState = "loading" | "form" | "success" | "error" | "expired";

export default function ResetPasswordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentLocale = typeof params.locale === "string" ? params.locale : "en";

  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [userName, setUserName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Password requirements
  const requirements = useMemo(() => [
    { label: "At least 6 characters", met: newPassword.length >= 6 },
    { label: "Contains a letter", met: /[a-zA-Z]/.test(newPassword) },
    { label: "Contains a number", met: /[0-9]/.test(newPassword) },
  ], [newPassword]);

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  // Password strength
  const strength = useMemo(() => {
    if (newPassword.length === 0) return { level: 0, label: "", class: "" };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;

    if (score <= 1) return { level: 1, label: "Weak", class: "weak" };
    if (score <= 2) return { level: 2, label: "Medium", class: "medium" };
    return { level: 3, label: "Strong", class: "strong" };
  }, [newPassword]);

  // Verify token on mount
  const verifyToken = useCallback(async () => {
    if (!token) {
      setErrorMessage("No reset token provided. Please request a new password reset link.");
      setPageState("error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/password/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.message?.toLowerCase().includes("expired")) {
          setErrorMessage("This password reset link has expired. Please request a new one.");
          setPageState("expired");
        } else {
          setErrorMessage(data.message || "This reset link is invalid.");
          setPageState("error");
        }
        return;
      }

      setUserName(data.user?.firstName || "");
      setPageState("form");
    } catch {
      setErrorMessage("Unable to verify the reset link. Please try again later.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!allRequirementsMet) {
      setFormError("Please meet all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.message?.toLowerCase().includes("expired")) {
          setPageState("expired");
          setErrorMessage("Your reset link has expired. Please request a new one.");
        } else if (data.message?.toLowerCase().includes("already been used")) {
          setPageState("expired");
          setErrorMessage(data.message);
        } else {
          setFormError(data.message || "Failed to reset password. Please try again.");
        }
        setLoading(false);
        return;
      }

      setPageState("success");
      toast.success("Password reset successfully!");
    } catch {
      setFormError("Unable to connect to the server. Please try again later.");
    }

    setLoading(false);
  };

  // Loading state
  if (pageState === "loading") {
    return (
      <div>
        <div className={styles.resetBg}>
          <div className={styles.resetCard}>
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Verifying your reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div>
        <div className={styles.resetBg}>
          <div className={styles.resetCard}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIconCircle}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className={styles.errorTitle}>Invalid Reset Link</h2>
              <p className={styles.errorDescription}>{errorMessage}</p>
              <Link href={`/${currentLocale}/auth/forgot`} className={styles.requestNewBtn}>
                Request a New Link
              </Link>
              <div className={styles.backRow}>
                <Link href={`/${currentLocale}/auth/login`} className={styles.backLink}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expired token state
  if (pageState === "expired") {
    return (
      <div>
        <div className={styles.resetBg}>
          <div className={styles.resetCard}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIconCircle}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h2 className={styles.errorTitle}>Link Expired</h2>
              <p className={styles.errorDescription}>{errorMessage}</p>
              <Link href={`/${currentLocale}/auth/forgot`} className={styles.requestNewBtn}>
                Request a New Link
              </Link>
              <div className={styles.backRow}>
                <Link href={`/${currentLocale}/auth/login`} className={styles.backLink}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === "success") {
    return (
      <div>
        <div className={styles.resetBg}>
          <div className={styles.resetCard}>
            <div className={styles.successContainer}>
              <div className={styles.successIconCircle}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>Password Reset Complete</h2>
              <p className={styles.successMessage}>
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <Link href={`/${currentLocale}/auth/login`} className={styles.loginBtn}>
                Continue to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div>
      <div className={styles.resetBg}>
        <div className={styles.resetCard}>
          <div className={styles.iconContainer}>
            <div className={styles.iconCircle}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
            </div>
          </div>

          <h1 className={styles.title}>Create new password</h1>
          <p className={styles.subtitle}>
            {userName ? (
              <>Hi <span className={styles.userGreeting}>{userName}</span>, enter your new password below.</>
            ) : (
              <>Your new password must be different from previously used passwords.</>
            )}
          </p>

          {formError && <div className={styles.errorMessage}>{formError}</div>}

          <form onSubmit={handleSubmit}>
            {/* New Password */}
            <label className={styles.inputLabel}>
              <span className={styles.labelRow}>
                <span className={styles.labelIcon}>🔒</span> New password
              </span>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${formError && !allRequirementsMet ? styles.inputError : ""}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {/* Strength bar */}
            {newPassword.length > 0 && (
              <>
                <div className={styles.strengthBar}>
                  {[1, 2, 3].map((seg) => (
                    <div
                      key={seg}
                      className={`${styles.strengthSegment} ${seg <= strength.level ? `${styles.active} ${styles[strength.class]}` : ""}`}
                    />
                  ))}
                </div>
                <div className={`${styles.strengthLabel} ${styles[strength.class]}`}>
                  {strength.label}
                </div>
              </>
            )}

            {/* Requirements checklist */}
            {newPassword.length > 0 && (
              <div className={styles.requirements}>
                {requirements.map((req) => (
                  <div key={req.label} className={`${styles.requirement} ${req.met ? styles.met : ""}`}>
                    {req.met ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    {req.label}
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <label className={styles.inputLabel} style={{ marginTop: "1rem" }}>
              <span className={styles.labelRow}>
                <span className={styles.labelIcon}>🔒</span> Confirm password
              </span>
              <div className={styles.inputWrapper}>
                <input
                  className={`${styles.input} ${confirmPassword.length > 0 && !passwordsMatch ? styles.inputError : ""}`}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <div className={`${styles.matchText} ${passwordsMatch ? styles.match : styles.mismatch}`}>
                {passwordsMatch ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Passwords match
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Passwords do not match
                  </>
                )}
              </div>
            )}

            <button
              className={styles.submitBtn}
              type="submit"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Resetting...
                </>
              ) : (
                "Reset Password"
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
        </div>
      </div>
    </div>
  );
}
