'use client';

import { useEffect } from 'react';
import { useSiteSettingsStore } from '@/app/store/useSiteSettingsStore';

/**
 * Dynamically injects Google Analytics and Facebook Pixel scripts
 * based on values configured in Super Admin Settings.
 * Renders nothing visible — just injects <script> tags into <head>.
 */
export default function AnalyticsScripts() {
  const { settings, loaded } = useSiteSettingsStore();

  useEffect(() => {
    if (!loaded) return;

    // ── Google Analytics (gtag.js) ──
    const gaId = settings.seo_google_analytics?.trim();
    if (gaId && !document.getElementById('ga-script')) {
      // Load the gtag.js library
      const gaScript = document.createElement('script');
      gaScript.id = 'ga-script';
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(gaScript);

      // Initialize gtag
      const gaInit = document.createElement('script');
      gaInit.id = 'ga-init';
      gaInit.textContent = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(gaInit);
    }

    // ── Facebook Pixel ──
    const fbId = settings.seo_facebook_pixel?.trim();
    if (fbId && !document.getElementById('fb-pixel-script')) {
      const fbScript = document.createElement('script');
      fbScript.id = 'fb-pixel-script';
      fbScript.textContent = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fbId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(fbScript);

      // noscript fallback pixel
      const noscript = document.createElement('noscript');
      noscript.id = 'fb-pixel-noscript';
      const img = document.createElement('img');
      img.height = 1;
      img.width = 1;
      img.style.display = 'none';
      img.src = `https://www.facebook.com/tr?id=${fbId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    }
  }, [loaded, settings.seo_google_analytics, settings.seo_facebook_pixel]);

  return null; // Renders nothing — just injects scripts
}
