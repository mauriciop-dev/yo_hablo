import React, { useState } from 'react';
import { Sparkles, User, ShieldCheck, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import GuestRequestForm from './GuestRequestForm';

interface LoginScreenProps {
  onUserReady: (user: { id: string; email: string; name: string; role: string }) => void;
}

export default function LoginScreen({ onUserReady }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (data.blocked) {
        setBlocked(true);
        return;
      }
      onUserReady({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || 'Invitado',
        role: data.user.role,
      });
    } catch (err: any) {
      setError('Error al acceder como invitado');
    } finally {
      setLoading(false);
    }
  };

  if (blocked) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-stone-800">Sesiones agotadas</h2>
          <p className="text-sm text-stone-600">Has usado tus 3 sesiones de prueba. Solicita acceso al administrador para continuar.</p>
          {showGuestForm ? (
            <GuestRequestForm onSent={() => setShowGuestForm(false)} />
          ) : (
            <button onClick={() => setShowGuestForm(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-all">
              Solicitar Acceso
            </button>
          )}
          <button onClick={() => setBlocked(false)}
            className="text-xs text-stone-500 hover:text-stone-700 underline">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-8 max-w-sm w-full space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Yo Hablo</h1>
          <p className="text-sm text-stone-500">Aprende idiomas con voz e IA</p>
        </div>

        <div className="space-y-3">
          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full py-3 px-4 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl text-sm font-medium text-stone-700 transition-all flex items-center justify-center space-x-3 shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            <span>{loading ? 'Conectando...' : 'Continuar con Google'}</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-stone-400">o</span></div>
          </div>

          <button onClick={handleGuestLogin} disabled={loading}
            className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-sm font-medium text-amber-800 transition-all flex items-center justify-center space-x-2 shadow-xs">
            <User className="w-4 h-4" /><span>Entrar como Invitado</span>
          </button>
        </div>

        {error && <p className="text-xs text-rose-600 text-center bg-rose-50 p-2 rounded-lg">{error}</p>}

        <p className="text-[10px] text-stone-400 text-center leading-relaxed">
          Al continuar, aceptas los términos de uso de Yo Hablo.
          Los invitados tienen acceso limitado a 3 sesiones.
        </p>
      </div>
    </div>
  );
}
