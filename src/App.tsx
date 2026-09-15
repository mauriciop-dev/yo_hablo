import React, { useState, useEffect } from 'react';
import {
  MessageSquare, BookOpen, PenTool, Volume2, Sparkles, ShieldCheck,
  Layers, Library,
} from 'lucide-react';
import { UserProfile } from './types';
import { supabase } from './lib/supabase';
import { useVoice, VoiceSelection } from './hooks/useVoice';
import LoginScreen from './components/LoginScreen';
import TutorChat from './components/TutorChat';
import ReadingExercise from './components/ReadingExercise';
import WritingExercise from './components/WritingExercise';
import AdminPanel from './components/AdminPanel';
import SettingsModal from './components/SettingsModal';
import LessonsPanel from './components/LessonsPanel';
import VocabularyCards from './components/VocabularyCards';
import ProgressAchievementsModal from './components/ProgressAchievementsModal';
import OnboardingWizard from './components/OnboardingWizard';
import InstallPwaBanner from './components/InstallPwaBanner';
import { useAppMode } from './hooks/useAppMode';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { schedulePlanReminder } from './lib/notifications';
import { inferLevel } from './lib/skillTest';
import { LessonData } from './data/lessons';
import { evaluateAchievements, type ProgressState } from './lib/progress';

const PRESET_PROFILES: UserProfile[] = [
  { id: 'mariana-german', name: 'Mariana', email: 'mary.pinrodriguez@gmail.com', targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-emerald-600' },
  { id: 'mariana-english', name: 'Mariana (English)', email: 'mary.pinrodriguez@gmail.com', targetLanguage: 'English', level: 'B1', nativeLanguage: 'Spanish', avatarColor: 'bg-teal-600' },
  { id: 'mauricio-german', name: 'Mauricio', email: 'shadowalkalone@gmail.com', targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-indigo-600' },
  { id: 'mauricio-english', name: 'Mauricio (English)', email: 'shadowalkalone@gmail.com', targetLanguage: 'English', level: 'B1', nativeLanguage: 'Spanish', avatarColor: 'bg-sky-600' },
  { id: 'guest', name: 'Invitado', targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-amber-600', isGuest: true },
];

type Tab = 'tutor' | 'reading' | 'writing' | 'lessons' | 'vocabulary' | 'admin';
type AuthUser = { id: string; email: string; name: string; role: string; accessToken?: string };

async function fetchUserRole(authUser: AuthUser): Promise<string> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authUser.accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.role || 'user';
    }
  } catch (e) {
    console.warn('Register failed, falling back to direct query', e);
  }
  const { data } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  return data?.role || 'user';
}

function getProfileFromAuth(auth: AuthUser): UserProfile {
  const preset = PRESET_PROFILES.find(p => p.email === auth.email && !p.isGuest);
  if (preset) {
    return { ...preset, id: auth.id };
  }
  return {
    id: auth.id, name: auth.name, email: auth.email,
    targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish',
    avatarColor: 'bg-emerald-600',
  };
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile>(PRESET_PROFILES[0]);
  const [activeTab, setActiveTab] = useState<Tab>('tutor');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedTutorVoice, setSelectedTutorVoice] = useState<VoiceSelection>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [onboarding, setOnboarding] = useState<{ completed: boolean; plan: any; skillLevels: any }>({ completed: true, plan: null, skillLevels: null });
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<LessonData | null>(null);
  const streakDays = 5;
  const appMode = useAppMode();
  const install = useInstallPrompt();

  const progressState: ProgressState = {
    completedLessons: Array.from(completedLessons).filter(id => id.startsWith(profile.targetLanguage === 'German' ? 'de-' : profile.targetLanguage === 'French' ? 'fr-' : 'en-')),
    passedTests: Array.from(completedLessons).filter(id => id.includes('-6')),
    skillScores: { speaking: 0, listening: 0, reading: 0, writing: 0 },
    completedLevels: { speaking: [], listening: [], reading: [], writing: [] },
  };

  const unlockedAchievements = new Set(evaluateAchievements(progressState));

  const profileStorageKey = authUser ? `yo-hablo-profile-${authUser.id}` : '';
  const progressStorageKey = authUser ? `yo-hablo-completed-lessons-${authUser.id}` : '';

  const voice = useVoice(profile.targetLanguage, profile.level, selectedTutorVoice);

  const loadOnboarding = async (auth: AuthUser) => {
    try {
      const res = await fetch('/api/user/onboarding', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOnboarding({
          completed: !!data.onboarding_completed,
          plan: data.plan,
          skillLevels: data.skill_levels,
        });
        if (data.onboarding_completed && !localStorage.getItem(`yo-hablo-profile-${auth.id}`)) {
          setProfile((prev) => ({
            ...prev,
            targetLanguage: Array.isArray(data.selected_languages) && data.selected_languages.includes('German')
              ? 'German'
              : Array.isArray(data.selected_languages) && data.selected_languages.includes('French')
                ? 'French'
              : Array.isArray(data.selected_languages) && data.selected_languages.includes('English')
                ? 'English'
                : prev.targetLanguage,
            level: data.skill_levels ? inferLevel(data.skill_levels) : prev.level,
          }));
        }
      }
    } catch (e) {
      console.warn('load onboarding failed', e);
    }
  };

  useEffect(() => {
    const applyUser = async (session: any) => {
      if (!session?.user) {
        setAuthUser(null);
        return;
      }
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
        role: 'user',
        accessToken: session.access_token,
      };
      const role = await fetchUserRole(authUser);
      authUser.role = role;
      setAuthUser(authUser);
      const savedProfile = localStorage.getItem(`yo-hablo-profile-${authUser.id}`);
      setProfile(savedProfile ? { ...getProfileFromAuth(authUser), ...JSON.parse(savedProfile) } : getProfileFromAuth(authUser));
      const savedLessons = localStorage.getItem(`yo-hablo-completed-lessons-${authUser.id}`);
      setCompletedLessons(new Set(savedLessons ? JSON.parse(savedLessons) : []));
      await loadOnboarding(authUser);
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await applyUser(session);
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applyUser(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!onboarding.completed || !onboarding.plan) return;
    const stop = schedulePlanReminder(onboarding.plan);
    return stop;
  }, [onboarding]);

  const handleUserReady = (user: AuthUser) => {
    setAuthUser(user);
    setProfile(getProfileFromAuth(user));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    voice.stopLiveSession();
  };

  const handleProfileChange = (p: UserProfile) => {
    setProfile(p);
    voice.stopLiveSession();
  };

  const handleApplySettings = (p: UserProfile, nextVoiceEnabled: boolean, nextVoice: VoiceSelection) => {
    setProfile(p);
    setVoiceEnabled(nextVoiceEnabled);
    setSelectedTutorVoice(nextVoice);
    if (profileStorageKey) localStorage.setItem(profileStorageKey, JSON.stringify(p));
    voice.stopLiveSession();
  };

  const completeLesson = (lesson: LessonData) => {
    setCompletedLessons(previous => {
      const next = new Set(previous);
      next.add(lesson.id);
      if (progressStorageKey) localStorage.setItem(progressStorageKey, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleStartLesson = (lesson: LessonData) => {
    setActiveLesson(lesson);
    setActiveTab('tutor');
  };

  const userProfiles = authUser
    ? PRESET_PROFILES.filter(p => authUser.email ? p.email === authUser.email : p.isGuest)
    : PRESET_PROFILES;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen onUserReady={handleUserReady} />;
  }

  const handleOnboardingComplete = (data: { profile: UserProfile; plan: any; skillLevels: any }) => {
    setProfile(data.profile);
    setOnboarding({ completed: true, plan: data.plan, skillLevels: data.skillLevels });
  };

  const navItems: [Tab, string, any][] = [
    ['tutor', 'Conversación', MessageSquare],
    ['lessons', 'Lecciones', Layers],
    ['vocabulary', 'Vocabuario', Library],
    ['reading', 'Lectura', BookOpen],
    ['writing', 'Escritura', PenTool],
    ...(authUser.role === 'admin' ? [['admin', 'Admin', ShieldCheck] as [Tab, string, any]] : []),
  ];

  return (
    <div className={`theme-${profile.theme || 'emerald'} bg-stone-50 text-stone-900 flex flex-col font-sans antialiased ${appMode === 'desktop' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => setProgressOpen(true)} aria-label="Abrir progreso y logros" className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm hover:bg-emerald-700 transition-colors">
              <Sparkles className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-stone-800">Yo Hablo</h1>
              <p className="text-xs text-stone-500">
                {profile.targetLanguage} <span className="font-medium text-emerald-700">({profile.level})</span>
              </p>
            </div>
          </div>

          {appMode === 'desktop' && (
            <nav className="hidden lg:flex space-x-1 bg-stone-100 p-1 rounded-xl overflow-x-auto">
              {navItems.map(([tab, label, Icon]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === tab ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}>
                  <Icon className={`w-4 h-4 ${activeTab === tab ? 'text-emerald-600' : ''}`} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center space-x-3">
            <button onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                voiceEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-100 border-stone-200 text-stone-400'
              }`}>
              <Volume2 className="w-5 h-5" />
            </button>

            <div className="relative">
              <button onClick={() => setProfileMenuOpen(o => !o)}
                className="flex items-center space-x-2 p-1.5 pr-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all">
                <div className={`w-8 h-8 rounded-lg ${profile.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                  {profile.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-stone-800">{profile.name}</div>
                  <div className="text-[10px] text-stone-500">{authUser.email || 'Invitado'}</div>
                </div>
              </button>
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-2 z-50">
                    <button onClick={() => { setSettingsOpen(true); setProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50">
                      Configuración
                    </button>
                    <button onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-stone-50">
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {appMode === 'desktop' ? (
        <main className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto p-4 flex gap-4 overflow-hidden">
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {activeTab === 'tutor' && (
              <TutorChat profile={profile} voiceEnabled={voiceEnabled} voice={voice} activeLesson={activeLesson} onLessonComplete={completeLesson} />
            )}
            {activeTab === 'lessons' && (
              <LessonsPanel profile={profile} completedLessons={completedLessons} onStartLesson={handleStartLesson} />
            )}
            {activeTab === 'vocabulary' && (
              <VocabularyCards profile={profile} speakText={voice.speakText} />
            )}
            {activeTab === 'reading' && (
              <ReadingExercise profile={profile} speakText={voice.speakText} />
            )}
            {activeTab === 'writing' && (
              <WritingExercise profile={profile} />
            )}
            {activeTab === 'admin' && (
              <AdminPanel adminId={authUser.id} accessToken={authUser.accessToken || ''} />
            )}
          </div>
          <aside className="w-72 shrink-0 min-h-0 overflow-y-auto space-y-4">
            <InstallPwaBanner install={install} />
          </aside>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-xl mx-auto p-4 pb-24">
          {activeTab === 'tutor' && (
            <TutorChat profile={profile} voiceEnabled={voiceEnabled} voice={voice} activeLesson={activeLesson} onLessonComplete={completeLesson} />
          )}
          {activeTab === 'lessons' && (
            <LessonsPanel profile={profile} completedLessons={completedLessons} onStartLesson={handleStartLesson} />
          )}
          {activeTab === 'vocabulary' && (
            <VocabularyCards profile={profile} speakText={voice.speakText} />
          )}
          {activeTab === 'reading' && (
            <ReadingExercise profile={profile} speakText={voice.speakText} />
          )}
          {activeTab === 'writing' && (
            <WritingExercise profile={profile} />
          )}
          {activeTab === 'admin' && (
            <AdminPanel adminId={authUser.id} accessToken={authUser.accessToken || ''} />
          )}

          {activeTab === 'tutor' && (
            <div className="mt-4">
              <InstallPwaBanner install={install} />
            </div>
          )}
        </main>
      )}

      {appMode !== 'desktop' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 flex justify-around p-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          {navItems.map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center py-1.5 px-2.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${
                activeTab === tab ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600'
              }`}>
              <Icon className="w-4 h-4 mb-0.5" /><span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentProfile={profile}
        profiles={userProfiles}
        onProfileChange={handleProfileChange}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
        selectedTutorVoice={selectedTutorVoice}
        onSelectTutorVoice={setSelectedTutorVoice}
        onApplySettings={handleApplySettings}
        voice={voice}
      />

      <ProgressAchievementsModal
        open={progressOpen}
        onClose={() => setProgressOpen(false)}
        profile={profile}
        progress={progressState}
        unlockedIds={unlockedAchievements}
      />

      {!onboarding.completed && authUser && (
        <OnboardingWizard
          profile={profile}
          accessToken={authUser.accessToken || ''}
          userId={authUser.id}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
