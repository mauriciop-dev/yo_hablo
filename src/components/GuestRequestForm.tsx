import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

interface GuestRequestFormProps {
  onSent: () => void;
}

export default function GuestRequestForm({ onSent }: GuestRequestFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/guest-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestEmail: email, guestName: name, message }),
      });
      if (!res.ok) throw new Error('Error al enviar');
      setSent(true);
      onSent();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-2 py-4">
        <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
        <p className="text-sm font-medium text-stone-800">Solicitud enviada</p>
        <p className="text-xs text-stone-500">El administrador revisará tu solicitud y te notificará.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email" required
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)}
        placeholder="¿Por qué quieres acceder a Yo Hablo?" rows={3}
        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button type="submit" disabled={loading || !email}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center space-x-1.5">
        <Send className="w-3.5 h-3.5" /><span>{loading ? 'Enviando...' : 'Enviar Solicitud'}</span>
      </button>
    </form>
  );
}
