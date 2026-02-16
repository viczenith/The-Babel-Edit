// PWA utilities for The Babel Edit
export interface PWAInstallPrompt {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    deferredPrompt?: PWAInstallPrompt;
  }
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            if (window.confirm('New version available! Refresh to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Listen for service worker messages
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        // Handle update notifications
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.unregister();
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

export const isPWAInstallable = (): boolean => {
  return Boolean(window.deferredPrompt);
};

export const installPWA = async (): Promise<boolean> => {
  if (!window.deferredPrompt) {
    return false;
  }

  try {
    await window.deferredPrompt.prompt();
    const { outcome } = await window.deferredPrompt.userChoice;
    
    // Clear the deferredPrompt
    window.deferredPrompt = undefined;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('PWA installation failed:', error);
    return false;
  }
};

export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if running in standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS Safari PWA
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  return false;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
};

export const subscribeToPushNotifications = async (
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> => {
  try {
    const permission = await requestNotificationPermission();
    
    if (permission !== 'granted') {
      return null;
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
    });
    
    return subscription;
  } catch (error) {
    console.error('Push notification subscription failed:', error);
    return null;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
    
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') return null;
  
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    standalone: isPWAInstalled(),
    online: navigator.onLine,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window
  };
};
