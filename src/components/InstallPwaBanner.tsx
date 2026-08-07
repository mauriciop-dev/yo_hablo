import React, { useState } from 'react';
import { Bell, X, Share, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { notificationsSupported, getNotificationPermission, requestNotificationPermission, notifyNow } from '../lib/notifications';
import { useAppMode } from '../hooks/useAppMode';

interface Props {
  install: ReturnType<typeof useInstallPrompt>;
}

export default function InstallPwaBanner({ install }: Props) {
  const appMode = useAppMode();
  const [dismissed, setDismissed] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(() => getNotificationPermission());

  if (dismissed) return null;
  if (install.installed && notifPerm === 'granted') return null;
  if (install.installed && !notificationsSupported()) return null;

  const handleNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      notifyNow('Yo Hablo', '¡Notificaciones activadas! Te recordaré practicar tu idioma. 💬');
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            {install.installed ? <Bell className="w-4.5 h-4.5" /> : <Smartphone className="w-4.5 h-4.5" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">
              {install.installed ? 'Recordatorios' : 'Instala Yo Hablo'}
            </p>
            <p className="text-[11px] text-stone-500">
              {install.installed
                ? 'Recibe recordatorios de práctica en tu dispositivo.'
                : 'Úsalo como app nativa, con acceso rápido y sin distracciones.'}
            </p>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-stone-400 hover:text-stone-600 p-0.5 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!install.installed && (
        <>
          {install.canInstall ? (
            <button onClick={install.promptInstall}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
              Instalar ahora
            </button>
          ) : install.isIOS && appMode !== 'pwa' ? (
            <div className="bg-stone-50 rounded-xl p-3 space-y-2">
              <p className="text-[11px] text-stone-600 flex items-center space-x-1.5">
                <span>En iPhone/iPad:</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span className="flex items-center space-x-1"><Share className="w-3.5 h-3.5" /> Compartir</span>
                <span className="text-stone-300">→</span>
                <span>Añadir a pantalla de inicio</span>
              </div>
            </div>
          ) : null}
        </>
      )}

      {notificationsSupported() && notifPerm !== 'granted' && (
        <button onClick={handleNotif}
          className={`w-full text-sm font-medium rounded-xl py-2.5 transition-colors flex items-center justify-center space-x-2 ${
            notifPerm === 'denied'
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}>
          <Bell className="w-4 h-4" />
          <span>{notifPerm === 'denied' ? 'Notificaciones bloqueadas' : 'Activar recordatorios'}</span>
        </button>
      )}
    </div>
  );
}
