import { GeneratedPlan } from './plan';

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function planReminderMessage(plan: GeneratedPlan | null): string {
  if (!plan) return 'Es hora de practicar tu idioma. ¡Aura te espera! 💬';
  const topSkill = (Object.entries(plan.weights) as [keyof GeneratedPlan['weights'], number][])
    .sort((a, b) => b[1] - a[1])[0];
  const skillLabel: Record<string, string> = {
    speaking: 'conversación',
    listening: 'escucha',
    reading: 'lectura',
    writing: 'escritura',
  };
  return `⏰ Tu plan de ${plan.timeframeMonths} meses te espera. Hoy toca ${skillLabel[topSkill[0]]}. ¡Vamos! 🚀`;
}

export async function notifyNow(title: string, body: string): Promise<void> {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.showNotification) {
      reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'yo-hablo-reminder' });
      return;
    }
  }
  try {
    new Notification(title, { body, icon: '/icons/icon-192.png' });
  } catch {
    /* algunos navegadores requieren el service worker */
  }
}

export function schedulePlanReminder(plan: GeneratedPlan | null): () => void {
  if (!notificationsSupported()) return () => {};
  const intervalMs = 30 * 60 * 1000;
  const id = window.setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 8 && hour <= 21) {
      notifyNow('Yo Hablo', planReminderMessage(plan));
    }
  }, intervalMs);
  return () => window.clearInterval(id);
}
