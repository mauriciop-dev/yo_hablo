export type TargetLanguage = 'German' | 'English' | 'French';
export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SkillFocus = 'speaking' | 'listening' | 'reading' | 'writing';
export type AppTheme = 'emerald' | 'violet' | 'sky' | 'amber' | 'pink';
export type AvatarGender = 'male' | 'female';

export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  targetLanguage: TargetLanguage;
  level: ProficiencyLevel;
  nativeLanguage: 'Spanish' | 'English';
  avatarColor: string;
  isGuest?: boolean;
  preferredSkill?: SkillFocus;
  theme?: AppTheme;
  avatarGender?: AvatarGender;
  avatarModelUrl?: string;
};

export type AvatarExpression = 
  | 'HAPPY' | 'NEUTRAL' | 'THINKING' | 'EMPATHETIC' | 'CONFUSED' | 'PROUD';
export type AvatarGesture = 
  | 'NOD' | 'DOUBLE_NOD' | 'TILT_HEAD' | 'SHRUG' | 'WAVE' | 'POINT_PRACTICE' | 'NONE';
export type AvatarGaze = 'DIRECT' | 'THINK_UP' | 'DOWN_SOFT';
export type AvatarProsody = 'FAST_ENCOURAGING' | 'SLOW_EXPLANATORY' | 'WARM_CASUAL' | 'EMPHASIS_TARGET';
export type AvatarPhoneticsFocus = 'GERMAN_UMLAUT' | 'GERMAN_CH' | 'ENGLISH_TH' | 'ENGLISH_R' | 'STANDARD';

export type AvatarMetadata = {
  expr: AvatarExpression;
  gesture: AvatarGesture;
  gaze: AvatarGaze;
  prosody: AvatarProsody;
  phonetics_focus: AvatarPhoneticsFocus;
  pause_ms: number;
};

export type AvatarMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  metadata?: AvatarMetadata;
  timestamp: Date;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  gentleCorrection?: string;
  timestamp: Date;
};

export type ReadingExercise = {
  title: string;
  text: string;
  vocabulary: { word: string; translation: string }[];
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
};

export type WritingFeedback = {
  score: number;
  correctedText: string;
  corrections: {
    original: string;
    suggestion: string;
    explanation: string;
  }[];
  encouragement: string;
};
