import { useState, useEffect, useCallback } from 'react';
import { useAppMode } from './useAppMode';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function useInstallPrompt() {
  const mode = useAppMode();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(mode === 'pwa');

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const isIOS = typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return { canInstall: !installed && !!deferredPrompt, isIOS, promptInstall, installed };
}
