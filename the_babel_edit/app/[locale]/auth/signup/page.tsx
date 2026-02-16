"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { useAuth } from "@/app/context/AuthContext";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function SignupPage() {
  const params = useParams();
  const currentLocale = typeof params.locale === 'string' ? params.locale : 'en';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);

  const { signup } = useAuth();
  const router = useRouter();

  const handleGoogleSignup = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiBase}/auth/auth/google`;
  };

  // Password validation function
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push("Password must contain at least one letter");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time password validation
    if (name === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const handlePasswordFocus = () => {
    setShowPasswordHelp(true);
  };

  const handlePasswordBlur = () => {
    // Keep help visible if there are errors
    if (passwordErrors.length === 0) {
      setShowPasswordHelp(false);
    }
  };

  const validateForm = (): boolean => {
    // Check if all required fields are filled
    if (!formData.firstname.trim()) {
      toast.error("First name is required");
      return false;
    }

    if (!formData.lastname.trim()) {
      toast.error("Last name is required");
      return false;
    }

    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Password validation
    const passwordValidationErrors = validatePassword(formData.password);
    if (passwordValidationErrors.length > 0) {
      toast.error(passwordValidationErrors[0]); // Show first error
      return false;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    // Terms agreement validation
    if (!agree) {
      toast.error("You must agree to the Terms & Conditions");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await signup({
        firstName: formData.firstname,
        lastName: formData.lastname,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        isAgree: agree
      });

      if (result.success) {
        toast.success("Account created successfully!");
        router.push(`/${currentLocale}/dashboard`);
      } else {
        const errorMessage = result.error || "Failed to create account";
        toast.error(errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get password strength indicator
  const getPasswordStrength = () => {
    const { password } = formData;
    if (password.length === 0) return null;

    const errors = validatePassword(password);
    if (errors.length === 0) return 'strong';
    if (errors.length === 1) return 'medium';
    return 'weak';
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div>
      <div className={styles.signupBg}>
        <form className={styles.signupCard} onSubmit={handleSubmit}>
          <h1 className={styles.title}>Create Your Account</h1>
          <p className={styles.subtitle}>
            Sign up for peak experience
          </p>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}><span className={styles.labelIcon}>🔑</span> First Name</span>
            <input
              className={styles.input}
              type="text"
              name="firstname"
              placeholder="First Name"
              value={formData.firstname}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}><span className={styles.labelIcon}>🔑</span> Last Name</span>
            <input
              className={styles.input}
              type="text"
              name="lastname"
              placeholder="Last Name"
              value={formData.lastname}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}><span className={styles.labelIcon}>✉️</span> Email</span>
            <input
              className={styles.input}
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}><span className={styles.labelIcon}>📞</span> Phone Number</span>
            <input
              className={styles.input}
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
            />
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}>
              <span className={styles.labelIcon}>🔒</span> Password
              {passwordStrength && (
                <span className={`${styles.strengthIndicator} ${styles[passwordStrength]}`}>
                  {passwordStrength === 'strong' ? '✓ Strong' :
                    passwordStrength === 'medium' ? '⚠ Medium' : '✗ Weak'}
                </span>
              )}
            </span>
            <input
              className={`${styles.input} ${passwordErrors.length > 0 ? styles.inputError : ''}`}
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              required
            />
            {(showPasswordHelp || passwordErrors.length > 0) && (
              <div className={styles.passwordHelp}>
                <div className={styles.passwordRequirements}>
                  <div className={formData.password.length >= 6 ? styles.requirementMet : styles.requirementUnmet}>
                    {formData.password.length >= 6 ? '✓' : '•'} At least 6 characters
                  </div>
                  <div className={/[a-zA-Z]/.test(formData.password) ? styles.requirementMet : styles.requirementUnmet}>
                    {/[a-zA-Z]/.test(formData.password) ? '✓' : '•'} Contains letters
                  </div>
                  <div className={/[0-9]/.test(formData.password) ? styles.requirementMet : styles.requirementUnmet}>
                    {/[0-9]/.test(formData.password) ? '✓' : '•'} Contains numbers
                  </div>
                </div>
              </div>
            )}
          </label>

          <label className={styles.inputLabel}>
            <span className={styles.labelRow}><span className={styles.labelIcon}>🔒</span> Confirm Password</span>
            <input
              className={`${styles.input} ${formData.confirmPassword && formData.password !== formData.confirmPassword ? styles.inputError : ''
                }`}
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className={styles.errorText}>Passwords do not match</div>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
              <div className={styles.successText}>✓ Passwords match</div>
            )}
          </label>

          <div className={styles.checkRow}>
            <input
              className={styles.input}
              type="checkbox"
              id="newsletter"
              checked={newsletter}
              onChange={() => setNewsletter(!newsletter)}
            />
            <label htmlFor="newsletter">Subscribe to newsletter and exclusive offers</label>
          </div>

          <div className={styles.checkRow}>
            <input
              className={styles.input}
              type="checkbox"
              id="agree"
              checked={agree}
              onChange={() => setAgree(!agree)}
              required
            />
            <label htmlFor="agree">
              I agree to the <span className={styles.terms}>Terms & Conditions and Privacy Policy</span>
            </label>
          </div>

          <button
            className={styles.createBtn}
            type="submit"
            disabled={loading || !agree || passwordErrors.length > 0}
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>

          <div className={styles.dividerRow}>
            <span className={styles.divider}></span>
            <span className={styles.orText}>or sign up with:</span>
            <span className={styles.divider}></span>
          </div>

          <div className={styles.socialRow}>
            <button type="button" className={styles.socialBtn} onClick={handleGoogleSignup}>
              <img src="/images/google.svg" alt="Google" />Google
            </button>
            <button type="button" className={styles.socialBtn} onClick={() => toast('Facebook signup coming soon', { icon: '🔜' })}>
              <img src="/images/facebook.svg" alt="Facebook" />Facebook
            </button>
            <button type="button" className={styles.socialBtn} onClick={() => toast('Apple signup coming soon', { icon: '🔜' })}>
              <img src="/images/apple.svg" alt="Apple" />Apple
            </button>
          </div>

          <div className={styles.signinRow}>
            Already have an account?{' '}
            <Link href={`/${currentLocale}/auth/login`} className={styles.signinLink}>
              <span className={styles.lockIcon}>🔒</span> Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}