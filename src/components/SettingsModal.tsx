import React, { useState, useEffect } from 'react';
import { X, Globe, Volume2, CheckCircle, Mic, Play, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { VoiceSelection } from '../hooks/useVoice';

type Voice = {
  id: string;
  provider: string;
  voice_id: string;
  name: string;
  gender: string;
  language: string;
};

interface VoiceState {
  isSpeaking: boolean;
  isListening: boolean;
  speakText: (text: string) => void;
  stopSpeech: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentProfile: UserProfile;
  profiles: UserProfile[];
  onProfileChange: (profile: UserProfile) => void;
  voiceEnabled: boolean;
  onVoiceToggle: (enabled: boolean) => void;
  selectedTutorVoice: VoiceSelection;
  onSelectTutorVoice: (voice: VoiceSelection) => void;
  onApplySettings: (profile: UserProfile, voiceEnabled: boolean, voice: VoiceSelection) => void;
  voice: VoiceState;
  userId?: string;
}

export default function SettingsModal({
  open, onClose, currentProfile, profiles, onProfileChange,
  voiceEnabled, onVoiceToggle, selectedTutorVoice, onSelectTutorVoice, voice, userId,
  onApplySettings,
}: SettingsModalProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [micTest, setMicTest] = useState('');
  const [micTesting, setMicTesting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentProfile.targetLanguage);
  const [selectedLevel, setSelectedLevel] = useState<string>(currentProfile.level);
  const [selectedSkill, setSelectedSkill] = useState<string>(currentProfile.preferredSkill || 'speaking');
  const [selectedTheme, setSelectedTheme] = useState<string>(currentProfile.theme || 'emerald');
  const [draftVoiceEnabled, setDraftVoiceEnabled] = useState(voiceEnabled);
  const [draftTutorVoice, setDraftTutorVoice] = useState<VoiceSelection>(selectedTutorVoice);

  useEffect(() => {
    setSelectedLanguage(currentProfile.targetLanguage);
    setSelectedLevel(currentProfile.level);
    setSelectedSkill(currentProfile.preferredSkill || 'speaking');
    setSelectedTheme(currentProfile.theme || 'emerald');
    setDraftVoiceEnabled(voiceEnabled);
    setDraftTutorVoice(selectedTutorVoice);
  }, [currentProfile, voiceEnabled, selectedTutorVoice]);

  useEffect(() => {
    if (!open) return;
    supabase.from('voices').select('*').order('priority').then(({ data }) => {
      if (data) setVoices(data as Voice[]);
    });
  }, [open]);

  const localeKey = currentProfile.targetLanguage === 'German' ? 'de' : currentProfile.targetLanguage === 'French' ? 'fr' : 'en';
  const filteredVoices = voices.filter(v => v.provider !== 'deepgram' && (v.language.split(',').includes(localeKey) || v.language === 'en,de' || v.language === 'en,fr'));

  const handleMicTest = () => {
    if (voice.isListening) {
      voice.stopListening();
      return;
    }
    setMicTesting(true);
    setMicTest('');
    voice.startListening((transcript) => {
      setMicTesting(false);
      setMicTest(transcript || 'No se detectó voz. Intenta de nuevo.');
    });
  };

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

          <div className="space-y-4 border border-stone-200 bg-stone-50 rounded-xl p-4">
            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Idioma</label>
              <select value={selectedLanguage} onChange={(e) => {
                const value = e.target.value as 'German' | 'English' | 'French';
                setSelectedLanguage(value);
              }} className="w-full mt-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="German">Alemán</option>
                <option value="English">Inglés</option>
                <option value="French">Francés</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Nivel inicial</label>
              <select value={selectedLevel} onChange={(e) => {
                const value = e.target.value as any;
                setSelectedLevel(value);
              }} className="w-full mt-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Habilidad prioritária</label>
              <select value={selectedSkill} onChange={(e) => {
                const value = e.target.value as any;
                setSelectedSkill(value);
              }} className="w-full mt-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="speaking">Hablar</option>
                <option value="listening">Escuchar</option>
                <option value="reading">Leer</option>
                <option value="writing">Escribir</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Color de la aplicación</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  { key: 'emerald', name: 'Verde', className: 'bg-emerald-600' },
                  { key: 'violet', name: 'Violeta', className: 'bg-violet-600' },
                  { key: 'sky', name: 'Azul', className: 'bg-sky-600' },
                  { key: 'amber', name: 'Ámbar', className: 'bg-amber-500' },
                  { key: 'pink', name: 'Rosado', className: 'bg-pink-500' },
                ].map((theme) => (
                  <button key={theme.key} onClick={() => {
                    setSelectedTheme(theme.key);
                  }} className={`rounded-xl border px-2 py-2 text-[10px] font-medium ${selectedTheme === theme.key ? 'border-stone-900 text-stone-900 bg-white' : 'border-stone-200 text-stone-600 bg-white'}`}>
                    <span className={`inline-block w-4 h-4 rounded-full ${theme.className} mr-1 align-middle`} />
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-medium text-stone-700">Voz del Tutor</span>
            </div>
            <button onClick={() => setDraftVoiceEnabled(!draftVoiceEnabled)}
              className={`relative w-10 h-5 rounded-full transition-all ${draftVoiceEnabled ? 'bg-emerald-600' : 'bg-stone-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-all ${draftVoiceEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {draftVoiceEnabled && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Voz del Tutor</label>
                <select
                  value={draftTutorVoice ? `${draftTutorVoice.provider}::${draftTutorVoice.voice_id}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) { setDraftTutorVoice(null); return; }
                    const [provider, voice_id] = val.split('::');
                    setDraftTutorVoice({ provider, voice_id });
                  }}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Por defecto</option>
                  {filteredVoices.map(v => (
                    <option key={v.id} value={`${v.provider}::${v.voice_id}`}>{v.name} ({v.provider})</option>
                  ))}
                </select>
                <div className="mt-2 flex items-center space-x-2">
                  <button onClick={() => voice.speakText(currentProfile.targetLanguage === 'German'
                    ? 'Hallo! Ich bin deine Sprachlehrerin. Freut mich, dich kennenzulernen.'
                    : 'Hello! I am your language tutor. Nice to meet you!')}
                    disabled={voice.isSpeaking}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition-all">
                    <Play className="w-3.5 h-3.5" /><span>{voice.isSpeaking ? 'Reproduciendo...' : 'Probar voz'}</span>
                  </button>
                  {voice.isSpeaking && (
                    <button onClick={voice.stopSpeech}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium transition-all">
                      Detener
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Prueba de micrófono</label>
                <button onClick={handleMicTest}
                  className={`mt-1 w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    voice.isListening ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                  }`}>
                  <Mic className="w-4 h-4" />
                  <span>{voice.isListening ? 'Escuchando... pulsa para detener' : 'Probar micrófono'}</span>
                </button>
                {micTesting && !voice.isListening && (
                  <p className="mt-2 text-xs text-stone-400 flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Transcribiendo...</span>
                  </p>
                )}
                {micTest && (
                  <p className="mt-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">
                    Reconocido: “{micTest}”
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-all">
            Cancelar
          </button>
          <button onClick={() => {
            onApplySettings({ ...currentProfile, targetLanguage: selectedLanguage as UserProfile['targetLanguage'], level: selectedLevel as UserProfile['level'], preferredSkill: selectedSkill as UserProfile['preferredSkill'], theme: selectedTheme as UserProfile['theme'] }, draftVoiceEnabled, draftTutorVoice);
            onVoiceToggle(draftVoiceEnabled);
            onSelectTutorVoice(draftTutorVoice);
            onClose();
          }}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
            Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
