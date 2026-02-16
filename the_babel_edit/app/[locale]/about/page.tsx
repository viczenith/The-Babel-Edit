'use client';

import React from 'react';
import Navbar from '@/app/components/features/Navbar/Navbar';
import Footer from '@/app/components/features/Footer/Footer';
import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <div className={styles.pageWrapper}>
      <Navbar />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.header}>About Us</h1>
          <div className={styles.subheader}>
            At Babel, we believe clothing is more than just what you wear — it's a language of identity, culture, and connection. Inspired by the ancient city that brought together people of many tongues, Babel blends eras, styles, and stories into one expressive wardrobe.
            <br /><br />
            We thoughtfully curate high-quality, pre-loved pieces from around the world — garments that are not only stylish and sustainable but also rich in history and soul. Whether you're rediscovering vintage treasures or exploring a new sense of style, Babel invites you to express yourself through fashion that transcends trends and time.
          </div>

          <div className={styles.sectionTitle}>Our Story</div>
          <div className={styles.subheader}>
            Babel began as a dream in 2022 — born from a love of sustainability, cultural richness, and the timeless beauty of antiques. What started as a quiet idea soon grew into a vision: to create a space where fashion could tell stories, preserve history, and celebrate individuality.
            <br /><br />
            After years of curating, planning, and building with intention, Babel came to life in 2025. It was more than the launch of a brand — it was the fulfillment of a passion to merge style with meaning.
            <br /><br />
            Rooted in the belief that fashion should honor both people and the planet, Babel brings together pre-loved pieces from around the world. Each item is handpicked for its uniqueness, soul, and connection to culture — not mass-produced trends.
            <br /><br />
            Babel exists to create, connect, and give back — to share beauty with the community, and to offer a wardrobe that reflects who you are and what you value.
            <br /><br />
            This is more than clothing. This is our story — and we're so glad it's now part of yours.
          </div>

          <div className={styles.sectionTitle}>Our Values</div>
          <div className={styles.valuesRow}>
            <div className={styles.valueCard}>
              <span className={styles.valueIcon} role="img" aria-label="recycle">♻️</span>
              <div className={styles.valueTitle}>Sustainability</div>
              <div className={styles.valueDesc}>We are committed to reducing fashion waste and promoting circularity by giving pre-loved clothes a new life.</div>
            </div>
            <div className={styles.valueCard}>
              <span className={styles.valueIcon} role="img" aria-label="heart">♡</span>
              <div className={styles.valueTitle}>Quality</div>
              <div className={styles.valueDesc}>We carefully curate each item to ensure it meets our high standards of quality and style.</div>
            </div>
            <div className={styles.valueCard}>
              <span className={styles.valueIcon} role="img" aria-label="community">👥</span>
              <div className={styles.valueTitle}>Community</div>
              <div className={styles.valueDesc}>We foster a community of like-minded individuals who share a passion for sustainable fashion and unique finds.</div>
            </div>
          </div>

          {/* <div className={styles.teamSection}>
            <div className={styles.sectionTitle}>Meet the Team</div>
            <div className={styles.teamRow}>
              <div className={styles.teamMember}>
                <div className={styles.teamCard}>
                  <img className={styles.teamAvatar} src="https://randomuser.me/api/portraits/women/68.jpg" alt="Sarah Chen" />
                </div>
                <div className={styles.teamName}>Sarah Chen</div>
                <div className={styles.teamRole}>Founder & CEO</div>
              </div>
              <div className={styles.teamMember}>
                <div className={styles.teamCard}>
                  <img className={styles.teamAvatar} src="https://randomuser.me/api/portraits/men/32.jpg" alt="David Lee" />
                </div>
                <div className={styles.teamName}>David Lee</div>
                <div className={styles.teamRole}>Head of Curation</div>
              </div>
              <div className={styles.teamMember}>
                <div className={styles.teamCard}>
                  <img className={styles.teamAvatar} src="https://randomuser.me/api/portraits/women/65.jpg" alt="Emily Wong" />
                </div>
                <div className={styles.teamName}>Emily Wong</div>
                <div className={styles.teamRole}>Customer Experience Manager</div>
              </div>
            </div>
          </div> */}

          <div className={styles.howItWorks}>
            <div className={styles.sectionTitle}>How it works</div>
            <ul className={styles.howList}>
              <li className={styles.howItem}>
                <span className={styles.howDot}></span>
                <span><strong>Sourcing</strong><br />We carefully source our items from trusted sellers and vintage stores.</span>
              </li>
              <li className={styles.howItem}>
                <span className={styles.howDot}></span>
                <span><strong>Curation</strong><br />Our team inspects and curates each piece to ensure quality and style.</span>
              </li>
              <li className={styles.howItem}>
                <span className={styles.howDot}></span>
                <span><strong>Shipping</strong><br />We ship your order with eco-friendly packaging and fast delivery.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}