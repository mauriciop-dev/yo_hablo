import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Users, UserPlus } from 'lucide-react';

type GuestRequest = {
  id: string;
  guest_email: string;
  guest_name: string;
  status: string;
  message: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  guest_expires_at: string | null;
  created_at: string;
};

interface AdminPanelProps {
  adminId: string;
  accessToken: string;
}

export default function AdminPanel({ adminId, accessToken }: AdminPanelProps) {
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<'requests' | 'users'>('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, usersRes] = await Promise.all([
        fetch('/api/guest-requests', { headers: authHeaders }),
        fetch('/api/users', { headers: authHeaders }),
      ]);
      if (reqRes.ok) setRequests(await reqRes.json());
      else setError((await reqRes.json()).error || 'Error cargando solicitudes');
      if (usersRes.ok) setUsers(await usersRes.json());
      else setError((await usersRes.json()).error || 'Error cargando usuarios');
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const reviewRequest = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await fetch(`/api/guest-requests/${id}/review`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="flex items-center justify-between pb-6 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-bold text-stone-800">Panel de Administración</h2>
          <p className="text-xs text-stone-500 mt-0.5">Gestiona solicitudes de invitados y usuarios</p>
        </div>
        <div className="flex items-center space-x-4 text-xs text-stone-500">
          <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5 text-amber-500" /><span>{pending.length} pendientes</span></span>
          <span className="flex items-center space-x-1"><Users className="w-3.5 h-3.5 text-emerald-600" /><span>{users.length} usuarios</span></span>
        </div>
      </div>

      <div className="flex space-x-1 mt-4 bg-stone-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('requests')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            tab === 'requests' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}>
          <UserPlus className="w-3.5 h-3.5" /><span>Solicitudes</span>
        </button>
        <button onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            tab === 'users' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}>
          <Users className="w-3.5 h-3.5" /><span>Usuarios</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 flex justify-center">
          <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {!loading && tab === 'requests' && (
        <div className="mt-4 space-y-3">
          {requests.length === 0 && (
            <div className="text-center py-12 text-stone-400 text-xs">No hay solicitudes de invitados</div>
          )}
          {requests.map(req => (
            <div key={req.id} className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium text-stone-800">{req.guest_name || 'Anónimo'}</div>
                <div className="text-xs text-stone-500">{req.guest_email || 'Sin email'}</div>
                {req.message && <div className="text-xs text-stone-600 italic">"{req.message}"</div>}
                <div className="text-[10px] text-stone-400">
                  {new Date(req.requested_at).toLocaleDateString()} -{' '}
                  <span className={`font-medium ${
                    req.status === 'pending' ? 'text-amber-600' :
                    req.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>{req.status}</span>
                </div>
              </div>
              {req.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <button onClick={() => reviewRequest(req.id, 'approved')}
                    className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => reviewRequest(req.id, 'rejected')}
                    className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-all">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 text-[10px] font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200">
            <span>Nombre</span><span>Email</span><span>Rol</span><span>Acceso invitado</span>
          </div>
          {users.map(u => (
            <div key={u.id} className="grid grid-cols-4 gap-2 px-4 py-2 text-xs text-stone-700 border-b border-stone-100 items-center">
              <span className="font-medium">{u.name || '—'}</span>
              <span className="text-stone-500">{u.email}</span>
              <span className={`font-medium ${
                u.role === 'admin' ? 'text-emerald-700' :
                u.role === 'guest' ? 'text-amber-600' : 'text-stone-700'
              }`}>{u.role}</span>
              <span className="text-stone-500">{u.guest_expires_at ? new Date(u.guest_expires_at).toLocaleDateString() : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
