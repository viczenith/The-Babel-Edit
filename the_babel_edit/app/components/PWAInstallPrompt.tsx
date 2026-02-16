'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { installPWA, isPWAInstallable, isPWAInstalled } from '../utils/pwa';

interface PWAInstallPromptProps {
  showPrompt?: boolean;
  onClose?: () => void;
}

export default function PWAInstallPrompt({ showPrompt = false, onClose }: PWAInstallPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    setIsInstalled(isPWAInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e as any;
      setIsInstallable(true);
      
      // Show prompt if requested
      if (showPrompt && !isPWAInstalled()) {
        setIsOpen(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setIsOpen(false);
      window.deferredPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showPrompt]);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const installed = await installPWA();
      if (installed) {
        setIsOpen(false);
        onClose?.();
      }
    } catch (error) {
      // PWA install failed
    } finally {
      setIsInstalling(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            Install The Babel Edit
          </DialogTitle>
          <DialogDescription>
            Get the full experience with our Progressive Web App. Install The Babel Edit for:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Faster loading and better performance</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Offline browsing of your favorites</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">Push notifications for new arrivals</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm">App-like experience on your device</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            {isInstalling ? 'Installing...' : 'Install App'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing PWA install prompt
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    
    const checkInstallable = () => {
      setIsInstallable(isPWAInstallable());
    };

    // Check periodically
    checkInstallable();
    const interval = setInterval(checkInstallable, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    isInstallable,
    isInstalled,
    install: installPWA
  };
}
