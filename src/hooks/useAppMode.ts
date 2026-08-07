import { useState, useEffect } from 'react';

export type AppMode = 'pwa' | 'mobile' | 'desktop';

function detectMode(): AppMode {
  if (typeof window === 'undefined') return 'desktop';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  if (isStandalone) return 'pwa';
  if (window.innerWidth < 1024) return 'mobile';
  return 'desktop';
}

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>(detectMode);

  useEffect(() => {
    const update = () => setMode(detectMode());
    window.addEventListener('resize', update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  return mode;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
