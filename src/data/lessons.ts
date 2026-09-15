export interface LessonData {
  id: string;
  language: string;
  skill: string;
  level: string;
  lessonNumber: number;
  title: string;
  description: string;
  vocabulary: { word: string; translation: string; example?: string }[];
  exercises: ExerciseData[];
}

export interface ExerciseData {
  exerciseNumber: number;
  type: 'voice' | 'text' | 'multiple_choice' | 'fill_blank' | 'translation' | 'listening' | 'speaking' | 'reading' | 'writing';
  instructions: string;
  prompt: string;
  options?: string[];
  correctAnswer?: string | string[];
  hints?: string[];
}

const skillOrder = ['speaking', 'listening', 'reading', 'writing'] as const;
const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const languageDefinitions = {
  German: { code: 'de', label: 'Alemán', greeting: 'Hallo', practice: 'Wie geht es dir?' },
  English: { code: 'en', label: 'Inglés', greeting: 'Hello', practice: 'How are you?' },
  French: { code: 'fr', label: 'Francés', greeting: 'Bonjour', practice: 'Comment ça va?' },
} as const;

const lessonSubjects: Record<string, string[]> = {
  speaking: ['Saludar', 'Presentarte', 'Hablar de rutina', 'Expresar opinión', 'Describir un tema'],
  listening: ['Números y sonidos', 'Comprensión oral', 'Instrucciones', 'Conversations breves', 'Detalles clave'],
  reading: ['Texto breve', 'Email sencillo', 'Historia corta', 'Artículo de interés', 'Resumen de lectura'],
  writing: ['Frases básicas', 'Descripción personal', 'Mensaje corto', 'Opinión escrita', 'Texto expresivo'],
};

function makeExerciseSet(language: string, skill: string, level: string, lessonNumber: number, isTest = false): ExerciseData[] {
  const exercises: ExerciseData[] = [
    {
      exerciseNumber: 1,
      type: skill === 'speaking' ? 'voice' : skill === 'listening' ? 'listening' : skill === 'reading' ? 'reading' : 'writing',
      instructions: isTest ? 'Completa la evaluación final del nivel.' : 'Practica esta habilidad con atención.',
      prompt: isTest ? `Evaluación final de ${language} • ${level} • ${skill}` : `Ejercicio práctico de ${skill} en ${language}.`,
    },
    {
      exerciseNumber: 2,
      type: 'multiple_choice',
      instructions: isTest ? 'Selecciona la opción correcta.' : 'Elige la respuesta adecuada.',
      prompt: `Tema ${lessonNumber}: ${level} • ${skill}`,
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctAnswer: 'Opción A',
    },
    {
      exerciseNumber: 3,
      type: 'fill_blank',
      instructions: isTest ? 'Completa el hueco con la respuesta correcta.' : 'Completa el hueco de manera natural.',
      prompt: `${language} ${skill} • nivel ${level}`,
      correctAnswer: languageDefinitions[language as keyof typeof languageDefinitions]?.greeting || 'Hola',
      hints: ['Revisa la estructura de la frase.', 'Fíjate en el contexto.'],
    },
  ];

  if (isTest) {
    return [
      {
        exerciseNumber: 1,
        type: 'multiple_choice',
        instructions: 'Selecciona la respuesta correcta de la prueba final.',
        prompt: `Prueba final: ${skill} • ${level} • ${language}`,
        options: ['Respuesta correcta', 'Respuesta casi correcta', 'Respuesta incorrecta', 'Respuesta distractora'],
        correctAnswer: 'Respuesta correcta',
      },
      {
        exerciseNumber: 2,
        type: 'fill_blank',
        instructions: 'Completa la frase con la palabra correcta.',
        prompt: `La frase clave para esta prueba es: "${languageDefinitions[language as keyof typeof languageDefinitions]?.practice || 'Práctica'}"`,
        correctAnswer: languageDefinitions[language as keyof typeof languageDefinitions]?.greeting || 'Hola',
      },
      {
        exerciseNumber: 3,
        type: 'translation',
        instructions: 'Traduce la frase con naturalidad.',
        prompt: 'Traduce la frase al idioma objetivo.',
        correctAnswer: languageDefinitions[language as keyof typeof languageDefinitions]?.greeting || 'Hola',
      },
    ];
  }

  return exercises;
}

function makeVocabulary(language: string, skill: string, level: string, lessonNumber: number) {
  const base = [
    `${languageDefinitions[language as keyof typeof languageDefinitions]?.greeting || 'Hola'}`,
    `${skill} ${level}`,
    `${languageDefinitions[language as keyof typeof languageDefinitions]?.label || 'Idioma'} ${lessonNumber}`,
    `${level} práctica`,
  ];
  return base.map((word, index) => ({
    word: word,
    translation: `${word} • ${index + 1}`,
    example: `${word} es clave para practicar ${skill.toLowerCase()}.`,
  }));
}

function makeLesson(language: string, skill: string, level: string, lessonNumber: number): LessonData {
  const subject = lessonSubjects[skill]?.[Math.min((lessonNumber - 1) % 5, 4)] || 'Tema principal';
  const title = language === 'German'
    ? `${subject} • ${level} • ${skill}`
    : language === 'French'
      ? `${subject} • ${level} • ${skill}`
      : `${subject} • ${level} • ${skill}`;

  const isTest = lessonNumber === 6;

  return {
    id: `${language === 'German' ? 'de' : language === 'French' ? 'fr' : 'en'}-${level.toLowerCase()}-${skill[0]}${lessonNumber}`,
    language,
    skill,
    level,
    lessonNumber,
    title: isTest ? `${title} — Prueba final` : title,
    description: isTest
      ? `Prueba final para consolidar ${level} en ${skill.toLowerCase()} en ${language}.`
      : `Lección ${lessonNumber} de ${level} enfocada en ${skill.toLowerCase()} para ${language}.`,
    vocabulary: makeVocabulary(language, skill, level, lessonNumber),
    exercises: makeExerciseSet(language, skill, level, lessonNumber, isTest),
  };
}

export const LESSONS: LessonData[] = [];

for (const language of Object.keys(languageDefinitions) as Array<keyof typeof languageDefinitions>) {
  for (const skill of skillOrder) {
    for (const level of levelOrder) {
      for (let lessonNumber = 1; lessonNumber <= 6; lessonNumber += 1) {
        LESSONS.push(makeLesson(language, skill, level, lessonNumber));
      }
    }
  }
}
