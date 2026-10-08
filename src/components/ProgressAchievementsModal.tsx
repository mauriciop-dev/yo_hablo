import React, { useState, useEffect } from 'react';
import { X, Trophy, TrendingUp, Flame, CheckCircle, Target, Calendar } from 'lucide-react';
import { UserProfile } from '../types';
import { ACHIEVEMENTS } from '../data/achievements';
import { calculateLevelProgress, calculateOverallProgress, calculateSkillProgress, LEVEL_ORDER, SKILL_NAMES, ProgressState, SkillName } from '../lib/progress';

interface ProgressAchievementsModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  progress: ProgressState;
  unlockedIds: Set<string>;
}

const skillLabels: Record<SkillName, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  reading: 'Leer',
  writing: 'Escribir',
};

const skillColors: Record<SkillName, string> = {
  speaking: 'bg-emerald-500',
  listening: 'bg-blue-500',
  reading: 'bg-violet-500',
  writing: 'bg-amber-500',
};

interface DailyChallenge {
  id: string;
  title: string;
  completed: boolean;
}

export default function ProgressAchievementsModal({ open, onClose, profile, progress, unlockedIds }: ProgressAchievementsModalProps) {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split('T')[0];
    const challengeKey = `yo-hablo-challenges-${profile.id}-${today}`;
    const savedChallenges = localStorage.getItem(challengeKey);
    if (savedChallenges) {
      try {
        setChallenges(JSON.parse(savedChallenges));
      } catch (e) {
        setChallenges(getDefaultChallenges());
      }
    } else {
      const def = getDefaultChallenges();
      setChallenges(def);
      localStorage.setItem(challengeKey, JSON.stringify(def));
    }

    // Heatmap 30 days
    const heatmapKey = `yo-hablo-heatmap-${profile.id}`;
    const savedHeatmap = localStorage.getItem(heatmapKey);
    let days: { date: string; count: number }[] = [];
    const now = new Date();
    if (savedHeatmap) {
      try {
        days = JSON.parse(savedHeatmap);
      } catch (e) {}
    }
    if (days.length !== 30) {
      days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = i === 0 ? 3 : Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 1 : 0;
        days.push({ date: dateStr, count });
      }
      localStorage.setItem(heatmapKey, JSON.stringify(days));
    }
    setHeatmapDays(days);
  }, [open, profile.id]);

  const getDefaultChallenges = (): DailyChallenge[] => [
    { id: '1', title: 'Completa 1 ejercicio de escritura u oración', completed: true },
    { id: '2', title: 'Interactúa 2 minutos con el tutor de voz', completed: false },
    { id: '3', title: 'Repasa al menos 5 tarjetas de vocabulario SRS', completed: false },
  ];

  const toggleChallenge = (id: string) => {
    const updated = challenges.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    setChallenges(updated);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`yo-hablo-challenges-${profile.id}-${today}`, JSON.stringify(updated));
  };

  if (!open) return null;
  const overall = calculateOverallProgress(progress);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-stone-800">Progreso, Racha y Retos</h2>
            <p className="text-xs text-stone-500">{profile.targetLanguage} · tu actividad y constancia diaria</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar progreso" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <Flame className="w-5 h-5 text-amber-600 fill-amber-500" />
                <span>Racha de Estudio: 5 Días Consecutivos</span>
              </div>
              <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full">¡En racha! 🔥</span>
            </div>

            <div className="mt-4">
              <div className="flex items-center space-x-1.5 text-xs text-stone-600 mb-2 font-medium">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span>Mapa de Calor de Actividad (Últimos 30 días)</span>
              </div>
              <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5 bg-white p-3 rounded-xl border border-amber-100">
                {heatmapDays.map((day, idx) => (
                  <div
                    key={idx}
                    title={`${day.date}: ${day.count} actividades`}
                    className={`h-5 rounded-md transition-all ${
                      day.count === 0 ? 'bg-stone-100' : day.count === 1 ? 'bg-emerald-200' : day.count === 2 ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[10px] text-stone-400 mt-2 px-1">
                <span>Hace 30 días</span>
                <div className="flex items-center space-x-1">
                  <span>Menos</span>
                  <div className="w-2.5 h-2.5 bg-stone-100 rounded-xs" />
                  <div className="w-2.5 h-2.5 bg-emerald-200 rounded-xs" />
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-xs" />
                  <div className="w-2.5 h-2.5 bg-emerald-600 rounded-xs" />
                  <span>Más</span>
                </div>
                <span>Hoy</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-900 mb-3">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-700" />Retos Diarios de Hoy</span>
              <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">{challenges.filter(c => c.completed).length}/{challenges.length} completados</span>
            </div>
            <div className="space-y-2">
              {challenges.map(c => (
                <div key={c.id} onClick={() => toggleChallenge(c.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    c.completed ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' : 'bg-white border-stone-200 text-stone-800 hover:border-emerald-200'
                  }`}>
                  <div className="flex items-center space-x-3 text-xs font-medium">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      c.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-stone-50'
                    }`}>
                      {c.completed && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <span className={c.completed ? 'line-through opacity-80' : ''}>{c.title}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.completed ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {c.completed ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-stone-800">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Progreso general</span>
              <span>{overall}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${overall}%` }} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-700">Habilidades</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILL_NAMES.map(skill => {
                const percent = calculateSkillProgress(progress, skill);
                return (
                  <div key={skill} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex justify-between text-xs font-semibold text-stone-700">
                      <span>{skillLabels[skill]}</span><span>{percent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${skillColors[skill]}`} style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-stone-500">
                      {LEVEL_ORDER.map(level => <span key={level} className="text-center">{level}: {calculateLevelProgress(progress, skill, level)}%</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-700"><Trophy className="h-4 w-4 text-amber-500" />Logros</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {ACHIEVEMENTS.map(achievement => {
                const unlocked = unlockedIds.has(achievement.id);
                return <div key={achievement.id} className={`rounded-xl border p-3 ${unlocked ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-stone-50 opacity-60'}`}>
                  <div className="flex items-start gap-2"><span className="text-lg">{unlocked ? achievement.icon : '🔒'}</span><div><p className="text-xs font-semibold text-stone-800">{achievement.title}</p><p className="mt-0.5 text-[11px] text-stone-500">{achievement.description}</p></div></div>
                </div>;
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
