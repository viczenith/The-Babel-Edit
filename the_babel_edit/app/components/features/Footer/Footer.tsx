'use client';

import React, { useState } from 'react';
import styles from './Footer.module.css';
import en from '@/locales/en/common.json';
import fr from '@/locales/fr/common.json';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SiTiktok, SiFacebook, SiInstagram, SiX } from '@icons-pack/react-simple-icons';
import Image from 'next/image';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

const options = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
];

const Footer = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = pathname.split('/')[1] || 'en';
  const [selectOption, setSelectedOption] = useState(currentLocale);

  // Pull dynamic settings from the store
  const { settings } = useSiteSettingsStore();

  const [expandedSections, setExpandedSections] = useState({
    companyInfo: false,
    helpSupport: false,
    customerCare: false,
    newsletter: false
  });

  const translations: Record<string, Record<string, string>> = { en, fr };
  const t = (key: string) => (translations[currentLocale] || translations['en'])[key] || key;

  const handleLanguageChange = (locale: string) => {
    setSelectedOption(locale);
    const segments = pathname.split('/');
    segments[1] = locale;
    router.push(segments.join('/'));
  };

  type SectionKey = 'companyInfo' | 'helpSupport' | 'customerCare' | 'newsletter';

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerColumns}>
          {/* Company Info */}
          <div className={styles.footerCol}>
            <div className={styles.footerColHeader} onClick={() => toggleSection('companyInfo')}>
              <h4 className={styles.footerColTitle}>{t('companyInfo')}</h4>
              <span className={styles.accordionIcon}>
                {expandedSections.companyInfo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </div>
            <div className={`${styles.footerColContent} ${expandedSections.companyInfo ? styles.expanded : ''}`}>
              <ul>
                <li><a href={`/${currentLocale}/about`}>{t('about')}</a></li>
                <li><a href={`/${currentLocale}/dispute-resolution`}>{t('Arbitration and dispute resolution')}</a></li>
              </ul>
            </div>
          </div>

          {/* Help & Support */}
          <div className={styles.footerCol}>
            <div className={styles.footerColHeader} onClick={() => toggleSection('helpSupport')}>
              <h4 className={styles.footerColTitle}>{t('helpSupport')}</h4>
              <span className={styles.accordionIcon}>
                {expandedSections.helpSupport ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </div>
            <div className={`${styles.footerColContent} ${expandedSections.helpSupport ? styles.expanded : ''}`}>
              <ul>
                <li><a href={`/${currentLocale}/faq`}>{t('FAQ')}</a></li>
                <li><a href={`/${currentLocale}/contact`}>{t('contactUs')}</a></li>
                <li><a href={`/${currentLocale}/returns-policy`}>{t('shipping')}</a></li>
                <li><a href={`/${currentLocale}/returns-policy`}>{t('returns')}</a></li>
              </ul>
            </div>
          </div>

          {/* Customer Care */}
          <div className={styles.footerCol}>
            <div className={styles.footerColHeader} onClick={() => toggleSection('customerCare')}>
              <h4 className={styles.footerColTitle}>{t('customerCare')}</h4>
              <span className={styles.accordionIcon}>
                {expandedSections.customerCare ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </div>
            <div className={`${styles.footerColContent} ${expandedSections.customerCare ? styles.expanded : ''}`}>
              <ul></ul>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className={styles.footerNewsletter}>
          <div className={styles.footerColHeader} onClick={() => toggleSection('newsletter')}>
            <h4>{t('signUpForNews')}</h4>
            <span className={styles.accordionIcon}>
              {expandedSections.newsletter ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </div>
          <div className={`${styles.newsletterContent} ${expandedSections.newsletter ? styles.expanded : ''}`}>
            <form className={styles.newsletterForm}>
              <input type="email" placeholder={t('yourEmail')} className={styles.newsletterInput} />
              <button type="submit" className={styles.newsletterButton}>{t('subscribe')}</button>
            </form>
            <div className={styles.privacyText}>
              {t('privacyText')}<a href={`/${currentLocale}/cookie-policy`}>{t('privacyCookiePolicy')}</a>
            </div>
          </div>
          <div className="socials flex gap-4 text-gray-600 mt-3">
            {settings.social_tiktok && (
              <a href={settings.social_tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <SiTiktok size={24} style={{ color: '#E1306C' }} />
              </a>
            )}
            {settings.social_facebook && (
              <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <SiFacebook size={24} style={{ color: '#1877F2' }} />
              </a>
            )}
            {settings.social_instagram && (
              <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <SiInstagram size={24} style={{ color: '#E1306C' }} />
              </a>
            )}
            {settings.social_twitter && (
              <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
                <SiX size={24} style={{ color: '#000' }} />
              </a>
            )}
            {/* Fallback: show defaults if no social links are configured */}
            {!settings.social_tiktok && !settings.social_facebook && !settings.social_instagram && !settings.social_twitter && (
              <>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <SiTiktok size={24} style={{ color: '#E1306C' }} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <SiFacebook size={24} style={{ color: '#1877F2' }} />
                </a>
                <a href="https://instagram.com/thebabeledit" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <SiInstagram size={24} style={{ color: '#E1306C' }} />
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className={styles.footerPaymentsBottom}>
        <h4>{t('weAccept')}</h4>
        <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
          {[
            { name: "Mastercard", src: "https://upload.wikimedia.org/wikipedia/commons/0/04/Mastercard-logo.png" },
            { name: "Visa", src: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" },
            { name: "Apple Pay", src: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" },
            { name: "Google Pay", src: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" },
          ].map((payment, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-300"
            >
              <Image
                src={payment.src}
                alt={payment.name}
                width={60}
                height={30}
                unoptimized
                className="h-5 w-auto object-contain"
                onError={(e) => {
                  const fallback = `data:image/svg+xml;base64,${btoa(
                    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'><rect width='60' height='30' fill='#f9fafb' stroke='#e5e7eb' stroke-width='1' rx='6'/><text x='30' y='20' font-family='Arial, sans-serif' font-size='8' fill='#6b7280' text-anchor='middle'>${payment.name}</text></svg>`
                  )}`;
                  (e.currentTarget as HTMLImageElement).src = fallback;
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Bottom */}
      <div className={styles.footerBottom}>
        <div className={styles.footerCopyright}>
          {t('allRightsReserved')}
        </div>
        <div className={styles.footerLegalLinks}>
          <a href={`/${currentLocale}/privacy-policy`}>{t('privacyCenter')}</a>
          <a href={`/${currentLocale}/cookie-policy`}>{t('privacyCookiePolicy')}</a>
          <a href={`/${currentLocale}/terms-condition`}>{t('termsConditions')}</a>
          <a href="#">{t('copyrightNotice')}</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;