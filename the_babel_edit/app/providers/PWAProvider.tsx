'use client';

import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { registerServiceWorker, getDeviceInfo } from '../utils/pwa';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

interface PWAContextType {
  registration: ServiceWorkerRegistration | null;
  isOnline: boolean;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
  updateAvailable: boolean;
  showInstallPrompt: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: ReactNode;
  showInstallPromptOnLoad?: boolean;
}

export function PWAProvider({ children, showInstallPromptOnLoad = false }: PWAProviderProps) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [deviceInfo] = useState(() => getDeviceInfo());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  useEffect(() => {
    // Register service worker
    const initPWA = async () => {
      try {
        // Pre-load and validate icons
        const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
        await Promise.all(
          iconSizes.map(size => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = `/icons/icon-${size}x${size}.png`;
          }))
        );

        // Pre-load and validate screenshots
        await Promise.all(
          ['/screenshots/desktop.png', '/screenshots/mobile.png'].map(src => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
          }))
        );

        const swRegistration = await registerServiceWorker();
        setRegistration(swRegistration);
      } catch (error) {
        console.error('PWA initialization failed:', error);
      }
    };

    if (typeof window !== 'undefined') {
      initPWA();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!registration) return;

    // Listen for service worker updates
    const handleUpdateFound = () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      const handleStateChange = () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      };

      newWorker.addEventListener('statechange', handleStateChange);
    };

    registration.addEventListener('updatefound', handleUpdateFound);

    return () => {
      registration.removeEventListener('updatefound', handleUpdateFound);
    };
  }, [registration]);

  const showInstallPrompt = () => {
    setShowInstallDialog(true);
  };

  const contextValue: PWAContextType = {
    registration,
    isOnline,
    deviceInfo,
    updateAvailable,
    showInstallPrompt,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-medium text-sm">Update Available!</p>
              <p className="text-xs opacity-90">A new version is ready to install.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Offline notification */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-orange-600 text-white p-3 rounded-lg shadow-lg z-50 mx-auto max-w-sm">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-2 h-2 bg-white rounded-full opacity-75"></div>
            <p className="text-sm font-medium">You're offline</p>
          </div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstallPrompt 
        showPrompt={showInstallPromptOnLoad}
        onClose={() => setShowInstallDialog(false)}
      />
      
      {showInstallDialog && (
        <PWAInstallPrompt 
          showPrompt={true}
          onClose={() => setShowInstallDialog(false)}
        />
      )}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
}

// Utility component for PWA install button
export function PWAInstallButton({ className = '' }: { className?: string }) {
  const { showInstallPrompt } = usePWA();
  
  return (
    <button
      onClick={showInstallPrompt}
      className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors ${className}`}
    >
      Install App
    </button>
  );
}
