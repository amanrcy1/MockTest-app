import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pwa-installed';

/**
 * Hook to handle PWA installation prompt
 * Returns install state and trigger function
 */
const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (opened from home screen)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      // Update localStorage when opened in standalone mode
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (_e) {
        // localStorage might be unavailable
      }
      return;
    }

    // Check localStorage for previous installation
    try {
      const wasInstalled = localStorage.getItem(STORAGE_KEY) === 'true';
      if (wasInstalled) {
        setIsInstalled(true);
      }
    } catch (_e) {
      // localStorage might be unavailable
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Android/Desktop Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      // If we receive this event, app is NOT installed (browser tells us)
      // Clear the localStorage flag if it was set incorrectly
      try {
        const wasInstalled = localStorage.getItem(STORAGE_KEY) === 'true';
        if (wasInstalled) {
          // User must have uninstalled - clear the flag
          localStorage.removeItem(STORAGE_KEY);
          setIsInstalled(false);
        }
      } catch (_err) {
        // localStorage might be unavailable
      }
      setInstallPrompt(e);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (_e) {
        // localStorage might be unavailable
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch (_e) {
          // localStorage might be unavailable
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install prompt error:', error);
      return false;
    }
  }, [installPrompt]);

  // Function to mark as installed (for iOS manual install)
  const markAsInstalled = useCallback(() => {
    setIsInstalled(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (_e) {
      // localStorage might be unavailable
    }
  }, []);

  return {
    canInstall: !!installPrompt,
    isInstalled,
    isIOS,
    promptInstall,
    markAsInstalled,
  };
};

export default usePWAInstall;
