import React from 'react';
import { X, Trophy, TrendingUp } from 'lucide-react';
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

export default function ProgressAchievementsModal({ open, onClose, profile, progress, unlockedIds }: ProgressAchievementsModalProps) {
  if (!open) return null;
  const overall = calculateOverallProgress(progress);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-stone-800">Progreso y logros</h2>
            <p className="text-xs text-stone-500">{profile.targetLanguage} · avance real de tus lecciones</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar progreso" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-emerald-900">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Progreso general</span>
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
