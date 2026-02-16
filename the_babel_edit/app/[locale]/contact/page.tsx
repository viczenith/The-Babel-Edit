'use client';

import React, { useState } from 'react';
import styles from './contact.module.css';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

export default function ContactPage() {
  const { settings } = useSiteSettingsStore();

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // Handle form submission (e.g., send to API or show success message)
  };

  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      <main className={styles.contactPageWrapper}>
        <div className={styles.contactContent}>
          <section className={styles.contactFormSection}>
            <h1 className={styles.contactFormTitle}>Contact Us</h1>
            <p className={styles.contactFormSubtitle}>
              We're here to help! Reach out to us with any questions or concerns.
            </p>
            <form onSubmit={handleSubmit} autoComplete="off">
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="name">
                  <span role="img" aria-label="name">🔑</span> Name
                </label>
                <input
                  className={styles.formInput}
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="email">
                  <span role="img" aria-label="email">✉️</span> Email
                </label>
                <input
                  className={styles.formInput}
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="subject">
                  <span role="img" aria-label="subject">🗂️</span> Subject
                </label>
                <select
                  className={styles.formSelect}
                  id="subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select a subject</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Returns">Returns</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="message">
                  <span role="img" aria-label="message">📝</span> Message
                </label>
                <textarea
                  className={styles.formTextarea}
                  id="message"
                  name="message"
                  placeholder="Tell us how we can help you..."
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <button className={styles.sendButton} type="submit">
                Send Message
              </button>
            </form>
          </section>
          
          <aside className={styles.contactInfoSection}>
            <h2 className={styles.infoTitle}>Other ways to Reach Us</h2>
            
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} role="img" aria-label="email">✉️</span>
              <span className={styles.infoText}>{settings.store_contact_email || 'support@babeledit.com'}</span>
            </div>
            
            {(settings.store_phone) && (
              <div className={styles.infoRow}>
                <span className={styles.infoIcon} role="img" aria-label="phone">📞</span>
                <span className={styles.infoText}>{settings.store_phone}</span>
              </div>
            )}
            
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} role="img" aria-label="clock">⏰</span>
              <div className={styles.infoText}>
                Business Hours
                <div className={styles.infoSubText}>Mon-Fri: 9am-6pm</div>
              </div>
            </div>
            
            {(settings.store_address) && (
              <div className={styles.infoRow}>
                <span className={styles.infoIcon} role="img" aria-label="location">📍</span>
                <div className={styles.infoText}>
                  {settings.store_address}
                </div>
              </div>
            )}
            
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} role="img" aria-label="chat">💬</span>
              <span className={styles.infoText}>Chat with us</span>
            </div>
            
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} role="img" aria-label="track">🔗</span>
              <span className={styles.infoText}>Track your order</span>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}