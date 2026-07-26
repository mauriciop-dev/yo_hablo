import React from 'react';
import { Trophy, Lock } from 'lucide-react';
import { ACHIEVEMENTS, Achievement } from '../data/achievements';

interface AchievementsProps {
  unlockedIds: Set<string>;
}

export default function Achievements({ unlockedIds }: AchievementsProps) {
  const unlocked = ACHIEVEMENTS.filter(a => unlockedIds.has(a.id));
  const locked = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-xs p-6">
      <div className="pb-4 border-b border-stone-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" /><span>Logros</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{unlocked.length} / {ACHIEVEMENTS.length} desbloqueados</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {unlocked.map(a => <AchievementCard key={a.id} achievement={a} unlocked />)}
        {locked.map(a => <AchievementCard key={a.id} achievement={a} unlocked={false} />)}
      </div>
    </div>
  );
}

function AchievementCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  return (
    <div className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${
      unlocked ? 'bg-amber-50/50 border-amber-200' : 'bg-stone-50 border-stone-200 opacity-60'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
        unlocked ? 'bg-amber-100' : 'bg-stone-200'
      }`}>
        {unlocked ? achievement.icon : <Lock className="w-4 h-4 text-stone-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${unlocked ? 'text-amber-900' : 'text-stone-500'}`}>
          {achievement.title}
        </p>
        <p className="text-[11px] text-stone-500">{achievement.description}</p>
      </div>
      {unlocked && (
        <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-lg font-medium">
          ¡Listo!
        </div>
      )}
    </div>
  );
}
