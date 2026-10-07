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
const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

const lessonDataMap: Record<string, { titles: string[]; questions: { prompt: string; options: string[]; answer: string }[] }> = {
  German: {
    titles: ['Saludar y Presentarse', 'Rutina Diaria', 'Comida y Restaurante', 'Viajes y Direcciones', 'Trabajo y Hobbies', 'Evaluación Integral'],
    questions: [
      { prompt: '¿Cómo se traduce "Buenos días" en alemán formal?', options: ['Guten Morgen', 'Gute Nacht', 'Auf Wiedersehen', 'Tschüss'], answer: 'Guten Morgen' },
      { prompt: 'Elige la forma correcta del verbo "sein" (ser/estar) para "ich":', options: ['bin', 'bist', 'ist', 'sind'], answer: 'bin' },
      { prompt: '¿Qué significa "Danke schön"?', options: ['Muchas gracias', 'Por favor', 'De nada', 'Adiós'], answer: 'Muchas gracias' },
      { prompt: 'Completa: "Ich komme ____ Spanien."', options: ['aus', 'in', 'nach', 'bei'], answer: 'aus' },
      { prompt: '¿Cómo se dice "Manzana" en alemán?', options: ['Der Apfel', 'Das Buch', 'Das Haus', 'Die Milch'], answer: 'Der Apfel' }
    ]
  },
  English: {
    titles: ['Greetings & Introductions', 'Daily Routine', 'Food & Dining', 'Travel & Directions', 'Work & Hobbies', 'Comprehensive Assessment'],
    questions: [
      { prompt: 'Choose the correct greeting for the morning:', options: ['Good morning', 'Good evening', 'Good night', 'Goodbye'], answer: 'Good morning' },
      { prompt: 'Select the correct form of "to be" for "she":', options: ['is', 'am', 'are', 'be'], answer: 'is' },
      { prompt: 'What does "Thank you very much" mean?', options: ['Muchas gracias', 'Por favor', 'De nada', 'Hasta luego'], answer: 'Muchas gracias' },
      { prompt: 'Complete: "I live ___ London."', options: ['in', 'on', 'at', 'to'], answer: 'in' },
      { prompt: 'What is the English word for "Manzana"?', options: ['Apple', 'Book', 'House', 'Water'], answer: 'Apple' }
    ]
  },
  French: {
    titles: ['Salutations et Présentations', 'Routine Quotidienne', 'Nourriture et Restaurant', 'Voyages et Directions', 'Travail et Loisirs', 'Évaluation Complète'],
    questions: [
      { prompt: 'Comment dit-on "Buenos días" en français ?', options: ['Bonjour', 'Bonsoir', 'Bonne nuit', 'Au revoir'], answer: 'Bonjour' },
      { prompt: 'Choisissez la forme correcte du verbe "être" pour "je":', options: ['suis', 'es', 'est', 'sommes'], answer: 'suis' },
      { prompt: 'Que signifie "Merci beaucoup"?', options: ['Muchas gracias', 'Por favor', 'De nada', 'Au revoir'], answer: 'Muchas gracias' },
      { prompt: 'Complétez : "J habite ___ Paris."', options: ['à', 'en', 'dans', 'sur'], answer: 'à' },
      { prompt: 'Quel est le mot français pour "Manzana"?', options: ['La pomme', 'Le livre', 'La maison', 'L eau'], answer: 'La pomme' }
    ]
  }
};

function makeExerciseSet(language: string, skill: string, level: string, lessonNumber: number, isTest = false): ExerciseData[] {
  const langMeta = lessonDataMap[language] || lessonDataMap['German'];
  const qItem = langMeta.questions[(lessonNumber - 1) % langMeta.questions.length];

  if (isTest) {
    return [
      {
        exerciseNumber: 1,
        type: 'multiple_choice',
        instructions: `Evaluación final de ${level} en ${skill}. Selecciona la respuesta correcta.`,
        prompt: qItem.prompt,
        options: qItem.options,
        correctAnswer: qItem.answer,
      },
      {
        exerciseNumber: 2,
        type: 'fill_blank',
        instructions: 'Escribe la respuesta correcta para completar la oración.',
        prompt: `Completa la palabra clave en ${language} para el nivel ${level}.`,
        correctAnswer: qItem.answer,
      },
      {
        exerciseNumber: 3,
        type: 'translation',
        instructions: 'Traduce la expresión clave con naturalidad.',
        prompt: `Traduce al español: "${qItem.answer}"`,
        correctAnswer: qItem.answer,
      }
    ];
  }

  return [
    {
      exerciseNumber: 1,
      type: skill === 'speaking' ? 'voice' : skill === 'listening' ? 'listening' : skill === 'reading' ? 'reading' : 'writing',
      instructions: `Práctica guiada de ${skill} (${level}). Escucha o lee con atención.`,
      prompt: `Ejercicio de calentamiento para ${skill}: Practica la pronunciación y entonación.`,
    },
    {
      exerciseNumber: 2,
      type: 'multiple_choice',
      instructions: 'Selecciona la opción correcta basada en la lección.',
      prompt: qItem.prompt,
      options: qItem.options,
      correctAnswer: qItem.answer,
    },
    {
      exerciseNumber: 3,
      type: 'fill_blank',
      instructions: 'Completa el espacio en blanco con el término adecuado.',
      prompt: `Completa la frase de práctica en ${language} (${level} - ${skill}).`,
      correctAnswer: qItem.answer,
      hints: ['Piensa en el vocabulario aprendido en esta lección.', 'Revisa la gramática básica.'],
    },
  ];
}

function makeVocabulary(language: string, skill: string, level: string, lessonNumber: number) {
  const langMeta = lessonDataMap[language] || lessonDataMap['German'];
  return [
    { word: langMeta.questions[0].answer, translation: 'Expresión principal', example: `Ejemplo de uso en ${skill}.` },
    { word: `${level} - ${skill}`, translation: `Nivel y habilidad (${level})`, example: `Practicando ${skill} en ${language}.` },
    { word: `Lektion ${lessonNumber}`, translation: `Lección número ${lessonNumber}`, example: `Lección dedicada a ${langMeta.titles[(lessonNumber - 1) % langMeta.titles.length]}.` },
  ];
}

function makeLesson(language: string, skill: string, level: string, lessonNumber: number): LessonData {
  const langMeta = lessonDataMap[language] || lessonDataMap['German'];
  const topicTitle = langMeta.titles[(lessonNumber - 1) % langMeta.titles.length];
  const isTest = lessonNumber === 6;
  const title = isTest ? `${topicTitle} • ${level} — Prueba Final` : `${topicTitle} • ${level}`;

  return {
    id: `${language.toLowerCase().slice(0, 2)}-${level.toLowerCase()}-${skill[0]}${lessonNumber}`,
    language,
    skill,
    level,
    lessonNumber,
    title,
    description: isTest
      ? `Evaluación integradora de ${level} para ${skill} en ${language}.`
      : `Lección ${lessonNumber} sobre ${topicTitle} (${level}, ${skill}).`,
    vocabulary: makeVocabulary(language, skill, level, lessonNumber),
    exercises: makeExerciseSet(language, skill, level, lessonNumber, isTest),
  };
}

export const LESSONS: LessonData[] = [];

for (const language of Object.keys(lessonDataMap)) {
  for (const skill of skillOrder) {
    for (const level of levelOrder) {
      for (let lessonNumber = 1; lessonNumber <= 6; lessonNumber += 1) {
        LESSONS.push(makeLesson(language, skill, level, lessonNumber));
      }
    }
  }
}
