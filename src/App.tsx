import React, { useState, useEffect } from 'react';
import {
  MessageSquare, BookOpen, PenTool, Volume2, Sparkles, ShieldCheck,
  Layers, Library, Trophy,
} from 'lucide-react';
import { UserProfile } from './types';
import { supabase } from './lib/supabase';
import { useVoice } from './hooks/useVoice';
import LoginScreen from './components/LoginScreen';
import TutorChat from './components/TutorChat';
import ReadingExercise from './components/ReadingExercise';
import WritingExercise from './components/WritingExercise';
import AdminPanel from './components/AdminPanel';
import SettingsModal from './components/SettingsModal';
import ProgressBar from './components/ProgressBar';
import LessonsPanel from './components/LessonsPanel';
import VocabularyCards from './components/VocabularyCards';
import Achievements from './components/Achievements';
import { LessonData } from './data/lessons';

const PRESET_PROFILES: UserProfile[] = [
  { id: 'mariana-german', name: 'Mariana', email: 'mariana@gmail.com', targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-emerald-600' },
  { id: 'mariana-english', name: 'Mariana (English)', email: 'mariana@gmail.com', targetLanguage: 'English', level: 'B1', nativeLanguage: 'Spanish', avatarColor: 'bg-teal-600' },
  { id: 'mauricio-english', name: 'Mauricio', email: 'mauricio@gmail.com', targetLanguage: 'English', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-indigo-600' },
  { id: 'guest', name: 'Invitado', targetLanguage: 'German', level: 'A1', nativeLanguage: 'Spanish', avatarColor: 'bg-amber-600', isGuest: true },
];

type Tab = 'tutor' | 'reading' | 'writing' | 'lessons' | 'vocabulary' | 'admin';
type AuthUser = { id: string; email: string; name: string; role: string; accessToken?: string };

async function fetchUserRole(userId: string): Promise<string> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role || 'user';
}

function getProfileFromAuth(auth: AuthUser): UserProfile {
  const preset = PRESET_PROFILES.find(p => p.email === auth.email && !p.isGuest);
  if (preset) return preset;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const streakDays = 5;

  const voice = useVoice(profile.targetLanguage, profile.level);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setAuthUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
          role,
          accessToken: session.access_token,
        });
      }
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setAuthUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || session.user.email || 'Usuario',
          role,
          accessToken: session.access_token,
        });
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleStartLesson = (lesson: LessonData) => {
    setActiveTab('tutor');
  };

  const unlockedAchievements = new Set<string>(
    streakDays >= 3 ? ['first-steps', 'streak-3'] : ['first-steps']
  );

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

  const navItems: [Tab, string, any][] = [
    ['tutor', 'Conversación', MessageSquare],
    ['lessons', 'Lecciones', Layers],
    ['vocabulary', 'Vocabuario', Library],
    ['reading', 'Lectura', BookOpen],
    ['writing', 'Escritura', PenTool],
    ...(authUser.role === 'admin' ? [['admin', 'Admin', ShieldCheck] as [Tab, string, any]] : []),
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans antialiased">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-stone-800">Yo Hablo</h1>
              <p className="text-xs text-stone-500">
                {profile.targetLanguage} <span className="font-medium text-emerald-700">({profile.level})</span>
              </p>
            </div>
          </div>

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

          <div className="flex items-center space-x-3">
            <button onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                voiceEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-100 border-stone-200 text-stone-400'
              }`}>
              <Volume2 className="w-5 h-5" />
            </button>

            <div className="relative group">
              <button className="flex items-center space-x-2 p-1.5 pr-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 transition-all">
                <div className={`w-8 h-8 rounded-lg ${profile.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                  {profile.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-stone-800">{profile.name}</div>
                  <div className="text-[10px] text-stone-500">{authUser.email || 'Invitado'}</div>
                </div>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-2 hidden group-hover:block z-50">
                <button onClick={() => setSettingsOpen(true)}
                  className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50">
                  Configuración
                </button>
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-stone-50">
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="lg:hidden flex justify-around bg-white border-b border-stone-200 p-1.5 overflow-x-auto">
        {navItems.map(([tab, label, Icon]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-medium whitespace-nowrap ${
              activeTab === tab ? 'text-emerald-700 bg-emerald-50' : 'text-stone-600'
            }`}>
            <Icon className="w-4 h-4 mb-0.5" /><span>{label}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col min-w-0">
          {activeTab === 'tutor' && (
            <TutorChat profile={profile} voiceEnabled={voiceEnabled} voice={voice} />
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
        <aside className="w-full lg:w-64 shrink-0 order-first lg:order-last space-y-4">
          <div className="lg:sticky lg:top-24 space-y-4">
            <ProgressBar
              overall={Math.min(35 + streakDays * 3, 95)}
              streakDays={streakDays}
              skills={[
                { skill: 'Speaking', level: Math.min(20 + streakDays * 2, 90), color: 'bg-emerald-500', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { skill: 'Listening', level: Math.min(30 + streakDays * 2, 90), color: 'bg-blue-500', icon: <Volume2 className="w-3.5 h-3.5" /> },
                { skill: 'Reading', level: Math.min(15 + streakDays * 2, 90), color: 'bg-violet-500', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { skill: 'Writing', level: Math.min(10 + streakDays * 2, 90), color: 'bg-amber-500', icon: <PenTool className="w-3.5 h-3.5" /> },
              ]}
            />
            <Achievements unlockedIds={unlockedAchievements} />
          </div>
        </aside>
      </main>

      <footer className="py-4 text-center text-xs text-stone-400 border-t border-stone-200 bg-white">
        Yo Hablo • Práctica de idiomas en vivo con voz y IA adaptativa
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentProfile={profile}
        profiles={PRESET_PROFILES}
        onProfileChange={handleProfileChange}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
      />
    </div>
  );
}
