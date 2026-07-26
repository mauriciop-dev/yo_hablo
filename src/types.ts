export type UserProfile = {
  id: string;
  name: string;
  email?: string;
  targetLanguage: 'German' | 'English';
  level: 'A1' | 'A2' | 'B1' | 'B2';
  nativeLanguage: 'Spanish' | 'English';
  avatarColor: string;
  isGuest?: boolean;
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
