import React from 'react';
import { Mic, BookOpen, PenTool, Ear, TrendingUp } from 'lucide-react';

interface SkillProgress {
  skill: string;
  level: number;
  color: string;
  icon: React.ReactNode;
}

interface ProgressBarProps {
  overall: number;
  skills: SkillProgress[];
  streakDays?: number;
}

const defaultSkills: SkillProgress[] = [
  { skill: 'Speaking', level: 0, color: 'bg-emerald-500', icon: <Mic className="w-3.5 h-3.5" /> },
  { skill: 'Listening', level: 0, color: 'bg-blue-500', icon: <Ear className="w-3.5 h-3.5" /> },
  { skill: 'Reading', level: 0, color: 'bg-violet-500', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { skill: 'Writing', level: 0, color: 'bg-amber-500', icon: <PenTool className="w-3.5 h-3.5" /> },
];

export default function ProgressBar({
  overall, skills = defaultSkills, streakDays
}: ProgressBarProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Progreso General</span>
        <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{overall}%</span>
        </div>
      </div>

      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${overall}%` }}></div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {skills.map((s) => (
          <div key={s.skill} className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-lg ${s.color} text-white flex items-center justify-center`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px]">
                <span className="text-stone-600 truncate">{s.skill}</span>
                <span className="text-stone-800 font-semibold">{s.level}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mt-0.5">
                <div className={`h-full ${s.color} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${s.level}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {streakDays !== undefined && (
        <div className="flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-100 pt-2">
          <span>Racha actual</span>
          <span className="font-bold text-amber-600">{streakDays} días 🔥</span>
        </div>
      )}
    </div>
  );
}
