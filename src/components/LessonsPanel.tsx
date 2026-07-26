import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronRight, CheckCircle, Lock, Mic, Ear, PenTool, MessageSquare, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { LESSONS, LessonData } from '../data/lessons';

interface LessonsPanelProps {
  profile: UserProfile;
  completedLessons?: Set<string>;
  onStartLesson?: (lesson: LessonData) => void;
}

const skillIcons: Record<string, React.ReactNode> = {
  speaking: <Mic className="w-3.5 h-3.5" />,
  listening: <Ear className="w-3.5 h-3.5" />,
  reading: <BookOpen className="w-3.5 h-3.5" />,
  writing: <PenTool className="w-3.5 h-3.5" />,
};

const skillColors: Record<string, string> = {
  speaking: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  listening: 'bg-blue-100 text-blue-800 border-blue-200',
  reading: 'bg-violet-100 text-violet-800 border-violet-200',
  writing: 'bg-amber-100 text-amber-800 border-amber-200',
};

const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function LessonsPanel({ profile, completedLessons = new Set(), onStartLesson }: LessonsPanelProps) {
  const [activeSkill, setActiveSkill] = useState<string>('speaking');
  const [activeLevel, setActiveLevel] = useState<string>(profile.level);

  const filtered = useMemo(() =>
    LESSONS.filter(l => l.language === profile.targetLanguage && l.skill === activeSkill && l.level === activeLevel),
    [profile.targetLanguage, activeSkill, activeLevel]);

  const levelIdx = levelOrder.indexOf(activeLevel);
  const prevLevel = levelIdx > 0 ? levelOrder[levelIdx - 1] : null;
  const nextLevel = levelIdx < levelOrder.length - 1 ? levelOrder[levelIdx + 1] : null;

  const skills = [
    { key: 'speaking', label: 'Speaking', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
    { key: 'listening', label: 'Listening', color: 'border-blue-500 text-blue-700 bg-blue-50' },
    { key: 'reading', label: 'Reading', color: 'border-violet-500 text-violet-700 bg-violet-50' },
    { key: 'writing', label: 'Writing', color: 'border-amber-500 text-amber-700 bg-amber-50' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs p-6 overflow-y-auto">
      <div className="pb-6 border-b border-stone-200">
        <h2 className="text-xl font-bold text-stone-800">Lecciones Estructuradas</h2>
        <p className="text-xs text-stone-500 mt-0.5">Sigue el plan de estudios progresivo para {profile.targetLanguage}.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {skills.map(s => (
          <button key={s.key} onClick={() => setActiveSkill(s.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              activeSkill === s.key ? s.color + ' shadow-xs' : 'text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}>
            <span className="flex items-center space-x-1.5">
              {skillIcons[s.key]}<span>{s.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center space-x-2 text-xs">
        {levelOrder.map(l => (
          <button key={l} onClick={() => setActiveLevel(l)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeLevel === l ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400">
          <BookOpen className="w-10 h-10 mb-3 text-stone-300" />
          <p className="text-sm">No hay lecciones para {activeSkill} nivel {activeLevel} aún.</p>
          {prevLevel && (
            <button onClick={() => setActiveLevel(prevLevel)}
              className="mt-2 text-xs text-emerald-600 hover:underline">
              Ver lecciones nivel {prevLevel}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((lesson, idx) => {
          const completed = completedLessons.has(lesson.id);
          return (
            <div key={lesson.id}
              className={`group border rounded-2xl p-5 transition-all animate-slide-up hover:shadow-sm ${
                completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200 bg-white'
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${skillColors[activeSkill] || 'bg-stone-100 text-stone-600'}`}>
                      {activeSkill} · Lección {lesson.lessonNumber}
                    </span>
                    {completed && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" /><span>Completada</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-stone-800">{lesson.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">{lesson.description}</p>

                  {lesson.vocabulary.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {lesson.vocabulary.map((v, vi) => (
                        <span key={vi} className="text-[10px] bg-stone-100 text-stone-700 px-2 py-1 rounded-md border border-stone-200">
                          {v.word} <span className="text-stone-400">→</span> {v.translation}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex items-center space-x-3 text-[10px] text-stone-400">
                    <span>{lesson.exercises.length} ejercicios</span>
                    <span>{lesson.vocabulary.length} palabras</span>
                  </div>
                </div>

                {onStartLesson && (
                  <button onClick={() => onStartLesson(lesson)}
                    className={`ml-4 p-2.5 rounded-xl transition-all shrink-0 ${
                      completed
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}>
                    {completed ? <Sparkles className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
