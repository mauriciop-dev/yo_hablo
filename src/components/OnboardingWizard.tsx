import React, { useState, useMemo } from 'react';
import {
  Sparkles, Globe, Volume2, Mic, Goal as GoalIcon, CheckCircle,
  ArrowLeft, ArrowRight, BookOpen, Headphones, MessageSquare, PenTool,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useVoice } from '../hooks/useVoice';
import { supabase } from '../lib/supabase';
import {
  generatePlan, Goal, OBJECTIVE_LABELS, OBJECTIVE_DESCRIPTIONS, TIMEFRAMES, SkillWeights,
} from '../lib/plan';
import {
  getSkillTest, scoreSkillTest, inferLevel, SKILLS, SkillQuestion,
} from '../lib/skillTest';

type Voice = {
  id: string;
  provider: string;
  voice_id: string;
  name: string;
  gender: string;
  language: string;
};

interface OnboardingWizardProps {
  profile: UserProfile;
  accessToken: string;
  userId: string;
  onComplete: (data: { profile: UserProfile; plan: any; skillLevels: any }) => void;
}

export default function OnboardingWizard({ profile, accessToken, userId, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [goal, setGoal] = useState<Goal>({ objective: 'conversational', timeframeMonths: 6, languages: ['English'] });
  const [voices, setVoices] = useState<Voice[]>([]);
  const [tutorVoice, setTutorVoice] = useState('');
  const [micResult, setMicResult] = useState('');
  const [listening, setListening] = useState(false);
  const [questions, setQuestions] = useState<SkillQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false);

  const voice = useVoice(profile.targetLanguage, profile.level, tutorVoice);

  const plan = useMemo(() => generatePlan({ ...goal, languages }), [goal, languages]);
  const langTag = languages[0] === 'German' ? 'de-DE' : 'en-US';

  const loadVoices = () => {
    supabase.from('voices').select('*').order('priority').then(({ data }) => {
      if (data) setVoices(data as Voice[]);
    });
  };

  const steps = [
    { id: 'welcome', label: 'Bienvenida', icon: Sparkles },
    { id: 'languages', label: 'Idiomas', icon: Globe },
    { id: 'voice', label: 'Voz y micrófono', icon: Volume2 },
    { id: 'test', label: 'Prueba inicial', icon: MessageSquare },
    { id: 'goal', label: 'Tu objetivo', icon: GoalIcon },
    { id: 'plan', label: 'Tu plan', icon: CheckCircle },
  ];

  const enterStep = (next: number) => {
    setStep(next);
    if (steps[next].id === 'voice' && voices.length === 0) loadVoices();
    if (steps[next].id === 'test' && questions.length === 0) {
      setQuestions(getSkillTest(languages[0] === 'German' ? 'German' : 'English'));
      setAnswers(new Array(getSkillTest(languages[0] === 'German' ? 'German' : 'English').length).fill(-1));
    }
    if (steps[next].id === 'plan') {
      voice.speakText(`Perfecto ${profile.name}. Este es tu plan de aprendizaje personalizado para los próximos ${goal.timeframeMonths} meses.`);
      setWelcomeSpeechDone(true);
    }
  };

  const canContinue =
    step === 0 ? true :
    step === 1 ? languages.length > 0 :
    step === 2 ? micResult.includes('✔') || micResult.includes('Reconocido') :
    step === 3 ? answers.every(a => a >= 0) :
    step === 4 ? true : true;

  const handleMicTest = () => {
    if (listening) {
      voice.stopListening();
      return;
    }
    setMicResult('');
    setListening(true);
    voice.startListening((transcript) => {
      setListening(false);
      setMicResult(`Reconocido: “${transcript}”`);
    });
  };

  const finish = async () => {
    setSaving(true);
    const skillLevels = scoreSkillTest(questions, answers);
    const inferredLevel = inferLevel(skillLevels);
    const updatedProfile: UserProfile = {
      ...profile,
      targetLanguage: languages[0] as 'German' | 'English',
      level: inferredLevel,
    };
    try {
      await fetch('/api/user/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          onboarding_completed: true,
          selected_languages: languages,
          goal: { ...goal, languages },
          plan,
          skill_levels: skillLevels,
        }),
      });
      onComplete({ profile: updatedProfile, plan, skillLevels });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">Bienvenido a Yo Hablo, {profile.name}</h2>
              <p className="text-[11px] text-stone-500">Configura tu experiencia de aprendizaje en unos pasos.</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-1">
            {steps.map((s, i) => (
              <div key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-emerald-600' : 'bg-stone-200'}`} />
            ))}
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-stone-500">
            Paso {step + 1} de {steps.length}: {steps[step].label}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600 leading-relaxed">
                Yo Hablo es tu tutor de idiomas con <strong>voz en tiempo real</strong>. Vamos a configurar tu
                experiencia en 5 pasos cortos: tus idiomas, tu voz y micrófono, una prueba de nivel, tu objetivo
                y tu plan de aprendizaje.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Conversación real', MessageSquare],
                  ['Lecciones adaptadas', BookOpen],
                  ['Audio y micrófono', Headphones],
                  ['Plan personalizado', PenTool],
                ].map(([label, Icon]: any, i) => (
                  <div key={i} className="flex items-center space-x-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
                    <Icon className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-stone-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">¿Qué idioma quieres aprender?</label>
              {['English', 'German'].map(lang => (
                <button key={lang} onClick={() => {
                  const has = languages.includes(lang);
                  setLanguages(has ? (languages.length > 1 ? languages.filter(l => l !== lang) : languages) : [...languages, lang]);
                }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                    languages.includes(lang) ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}>
                  <span>{lang === 'English' ? '🇺🇸 Inglés' : '🇩🇪 Alemán'}</span>
                  {languages.includes(lang) && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Voz del tutor ({langTag})</label>
                <select value={tutorVoice} onChange={(e) => setTutorVoice(e.target.value)}
                  className="w-full mt-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Por defecto</option>
                  {voices.filter(v => v.language.split(',').includes(languages[0] === 'German' ? 'de' : 'en') || v.language === 'en,de')
                    .map(v => <option key={v.id} value={v.voice_id}>{v.name} ({v.provider})</option>)}
                </select>
                <button onClick={() => voice.speakText('Hola, esta es tu voz de tutora. ¡Vamos a aprender juntos!')}
                  className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium">
                  <Volume2 className="w-3.5 h-3.5" /> Probar voz
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Prueba de micrófono</label>
                <button onClick={handleMicTest}
                  className={`mt-1 w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    listening ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                  }`}>
                  <Mic className="w-4 h-4" />
                  <span>{listening ? 'Escuchando... pulsa para detener' : 'Pulsa y di algo (ej. tu nombre)'}</span>
                </button>
                {micResult && (
                  <p className="mt-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl px-3 py-2">
                    {micResult} <span className="font-semibold">✔</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-stone-500">
                Prueba rápida de nivel ({questions.filter(q => q.skill === 'reading').length} preguntas por habilidad).
                No estudies, solo responde con lo que sepas.
              </p>
              {SKILLS.map(skill => {
                const skillQs = questions.filter(q => q.skill === skill.id);
                return (
                  <div key={skill.id}>
                    <div className="flex items-center space-x-1.5 mb-2">
                      <span>{skill.icon}</span>
                      <span className="text-xs font-bold text-stone-700">{skill.label}</span>
                      <span className="text-[10px] text-stone-400">{skill.description}</span>
                    </div>
                    {skillQs.map((question) => {
                      const globalIdx = questions.findIndex(q => q.id === question.id);
                      return (
                        <div key={question.id} className="mb-2 bg-stone-50 border border-stone-200 rounded-xl p-3">
                          <p className="text-xs text-stone-700 mb-2">{question.prompt}</p>
                          {question.text && (
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-sm font-medium text-stone-800">“{question.text}”</span>
                              <button onClick={() => voice.speakText(question.text!)}
                                className="flex items-center space-x-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                <Headphones className="w-3 h-3" /> Escuchar
                              </button>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-1.5">
                            {question.options.map((opt, oi) => (
                              <button key={oi} onClick={() => {
                                const next = [...answers];
                                next[globalIdx] = oi;
                                setAnswers(next);
                              }}
                                className={`text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                                  answers[globalIdx] === oi ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-700 border-stone-200 hover:bg-emerald-50'
                                }`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">¿Cuál es tu objetivo?</label>
              {(Object.keys(OBJECTIVE_LABELS) as Goal['objective'][]).map(obj => (
                <button key={obj} onClick={() => setGoal({ ...goal, objective: obj })}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    goal.objective === obj ? 'bg-emerald-50 border-emerald-300' : 'bg-stone-50 border-stone-200'
                  }`}>
                  <div className="text-sm font-semibold text-stone-800">{OBJECTIVE_LABELS[obj]}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{OBJECTIVE_DESCRIPTIONS[obj]}</div>
                </button>
              ))}
              <div>
                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider mt-3 block">¿En cuánto tiempo?</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {TIMEFRAMES.map(months => (
                    <button key={months} onClick={() => setGoal({ ...goal, timeframeMonths: months })}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        goal.timeframeMonths === months ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}>
                      {months === 3 ? '3 meses' : months === 6 ? '6 meses' : '12 meses'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-900">Tu plan: {plan.objectiveLabel}</h3>
                  <span className="text-xs bg-white text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 font-semibold">
                    {plan.timeframeMonths} meses
                  </span>
                </div>
                <div className="text-xs text-emerald-800 mt-1">
                  {plan.frequencyLabel} • {plan.weeklyLessons} lecciones por semana
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Distribución por habilidad</label>
                {([
                  ['speaking', 'Conversación', MessageSquare, 'bg-emerald-500'],
                  ['listening', 'Escucha', Headphones, 'bg-blue-500'],
                  ['reading', 'Lectura', BookOpen, 'bg-violet-500'],
                  ['writing', 'Escritura', PenTool, 'bg-amber-500'],
                ] as [keyof SkillWeights, string, any, string][]).map(([key, label, Icon, color]) => (
                  <div key={key} className="mt-2">
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span className="flex items-center space-x-1.5"><Icon className="w-3.5 h-3.5" />{label}</span>
                      <span className="font-semibold">{plan.weights[key]}%</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${plan.weights[key]}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Recomendaciones</label>
                <ul className="mt-1 space-y-1.5">
                  {plan.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2 text-xs text-stone-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-between">
          <button onClick={() => enterStep(step - 1)} disabled={step === 0 || saving}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-all disabled:opacity-40">
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>
          {step < steps.length - 1 ? (
            <button onClick={() => enterStep(step + 1)} disabled={!canContinue || saving}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
              Continuar <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={finish} disabled={saving}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
              {saving ? 'Guardando...' : 'Comenzar a aprender'} <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
