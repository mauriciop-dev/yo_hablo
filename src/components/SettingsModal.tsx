import React, { useState, useEffect } from 'react';
import { X, Globe, Volume2, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

type Voice = {
  id: string;
  provider: string;
  voice_id: string;
  name: string;
  gender: string;
  language: string;
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  profiles: UserProfile[];
  onProfileChange: (profile: UserProfile) => void;
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
  userId?: string;
}

export default function SettingsModal({
  open, onClose, currentProfile, profiles, onProfileChange,
  voiceEnabled, onVoiceToggle, userId,
}: SettingsModalProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedTutorVoice, setSelectedTutorVoice] = useState('');
  const [selectedTeacherVoice, setSelectedTeacherVoice] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.from('voices').select('*').order('priority').then(({ data }) => {
      if (data) setVoices(data as Voice[]);
    });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-bold text-stone-800">Configuración</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg transition-all">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center space-x-1.5 mb-3">
              <Globe className="w-3.5 h-3.5" /><span>Perfil</span>
            </label>
            <div className="space-y-1">
              {profiles.map(p => (
                <button key={p.id} onClick={() => onProfileChange(p)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                    currentProfile.id === p.id ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium' : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                  }`}>
                  <span>{p.name} — {p.targetLanguage} ({p.level})</span>
                  {currentProfile.id === p.id && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-medium text-stone-700">Voz del Tutor</span>
            </div>
            <button onClick={() => onVoiceToggle(!voiceEnabled)}
              className={`relative w-10 h-5 rounded-full transition-all ${voiceEnabled ? 'bg-emerald-600' : 'bg-stone-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-all ${voiceEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {voiceEnabled && voices.length > 0 && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Voz del Tutor (Aura)</label>
                <select value={selectedTutorVoice} onChange={(e) => setSelectedTutorVoice(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Por defecto</option>
                  {voices.map(v => (
                    <option key={v.id} value={v.voice_id}>{v.name} ({v.provider})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Voz del Profesor</label>
                <select value={selectedTeacherVoice} onChange={(e) => setSelectedTeacherVoice(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Por defecto</option>
                  {voices.map(v => (
                    <option key={v.id} value={v.voice_id}>{v.name} ({v.provider})</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
