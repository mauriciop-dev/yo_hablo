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

export const LESSONS: LessonData[] = [
  {
    id: 'de-a1-s1-l1',
    language: 'German',
    skill: 'speaking',
    level: 'A1',
    lessonNumber: 1,
    title: 'Erste Begrüßungen — Primeros Saludos',
    description: 'Aprende a saludar y presentarte en alemán. Saludos formales e informales.',
    vocabulary: [
      { word: 'Hallo', translation: 'Hola', example: 'Hallo, wie geht es dir?' },
      { word: 'Guten Morgen', translation: 'Buenos días', example: 'Guten Morgen, Herr Schmidt.' },
      { word: 'Auf Wiedersehen', translation: 'Adiós', example: 'Auf Wiedersehen, bis morgen!' },
      { word: 'Tschüss', translation: 'Chao', example: 'Tschüss, bis später!' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'voice', instructions: 'Repite en voz alta los siguientes saludos en alemán.', prompt: 'Di: "Hallo, ich heiße [tu nombre].", después "Guten Morgen!"' },
      { exerciseNumber: 2, type: 'multiple_choice', instructions: '¿Cómo se dice "Buenos días" en alemán?', prompt: 'Selecciona la opción correcta:', options: ['Gute Nacht', 'Guten Morgen', 'Guten Abend', 'Hallo'], correctAnswer: 'Guten Morgen' },
      { exerciseNumber: 3, type: 'fill_blank', instructions: 'Completa con el saludo adecuado.', prompt: '"___ (Hola), ich bin Anna."', correctAnswer: 'Hallo', hints: ['Empieza con H y termina con o'] },
    ],
  },
  {
    id: 'de-a1-s1-l2',
    language: 'German',
    skill: 'speaking',
    level: 'A1',
    lessonNumber: 2,
    title: 'Sich vorstellen — Presentarse',
    description: 'Aprende a decir tu nombre, de dónde eres y qué idiomas hablas.',
    vocabulary: [
      { word: 'Ich heiße', translation: 'Me llamo', example: 'Ich heiße María.' },
      { word: 'Ich komme aus', translation: 'Vengo de', example: 'Ich komme aus Kolumbien.' },
      { word: 'Ich spreche', translation: 'Yo hablo', example: 'Ich spreche Spanisch und Deutsch.' },
      { word: 'Freut mich', translation: 'Mucho gusto', example: 'Freut mich, dich kennenzulernen!' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'voice', instructions: 'Preséntate en alemán: nombre, país, idiomas.', prompt: 'Di: "Ich heiße [nombre]. Ich komme aus [país]. Ich spreche [idiomas]."' },
      { exerciseNumber: 2, type: 'translation', instructions: 'Traduce al alemán.', prompt: '"Mucho gusto, me llamo Peter."', correctAnswer: 'Freut mich, ich heiße Peter.' },
      { exerciseNumber: 3, type: 'fill_blank', instructions: 'Completa la frase.', prompt: '"Ich ___ (vengo de) Mexiko."', correctAnswer: 'komme aus', hints: ['Verbo: kommen, conjugado para ich'] },
    ],
  },
  {
    id: 'de-a1-l1-l1',
    language: 'German',
    skill: 'listening',
    level: 'A1',
    lessonNumber: 1,
    title: 'Zahlen und Alter — Números y Edad',
    description: 'Aprende los números del 1 al 20 y a preguntar/decir la edad.',
    vocabulary: [
      { word: 'eins, zwei, drei', translation: 'uno, dos, tres', example: 'Eins, zwei, drei, vier...' },
      { word: 'Wie alt bist du?', translation: '¿Cuántos años tienes?', example: 'Wie alt bist du? — Ich bin 25.' },
      { word: 'Ich bin ... Jahre alt', translation: 'Tengo ... años', example: 'Ich bin 30 Jahre alt.' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'listening', instructions: 'Escucha los números y repítelos.', prompt: 'Uno: eins, Dos: zwei, Tres: drei, Cuatro: vier, Cinco: fünf, Seis: sechs, Siete: sieben, Ocho: acht, Nueve: neun, Diez: zehn' },
      { exerciseNumber: 2, type: 'text', instructions: 'Escribe tu edad en alemán.', prompt: '"Ich bin [edad] Jahre alt."' },
      { exerciseNumber: 3, type: 'multiple_choice', instructions: '¿Cómo se dice 15?', prompt: 'Elige la opción correcta:', options: ['fünfzig', 'fünfzehn', 'fünf', 'fünfundzwanzig'], correctAnswer: 'fünfzehn' },
    ],
  },
  {
    id: 'en-a1-s1-l1',
    language: 'English',
    skill: 'speaking',
    level: 'A1',
    lessonNumber: 1,
    title: 'First Greetings',
    description: 'Learn to greet people and introduce yourself in English.',
    vocabulary: [
      { word: 'Hello', translation: 'Hola', example: 'Hello, how are you?' },
      { word: 'Good morning', translation: 'Buenos días', example: 'Good morning, teacher.' },
      { word: 'My name is', translation: 'Me llamo', example: 'My name is Carlos.' },
      { word: 'Nice to meet you', translation: 'Mucho gusto', example: 'Nice to meet you, Maria!' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'voice', instructions: 'Practice greetings out loud.', prompt: 'Say: "Hello! My name is [your name]. Nice to meet you!"' },
      { exerciseNumber: 2, type: 'fill_blank', instructions: 'Complete the greeting.', prompt: '"___ (Buenos días), how are you?"', correctAnswer: 'Good morning' },
    ],
  },
  {
    id: 'en-a1-s1-l2',
    language: 'English',
    skill: 'speaking',
    level: 'A1',
    lessonNumber: 2,
    title: 'Talking About Yourself',
    description: 'Say where you are from, your age, and what languages you speak.',
    vocabulary: [
      { word: 'I am from', translation: 'Soy de', example: 'I am from Colombia.' },
      { word: 'I speak', translation: 'Yo hablo', example: 'I speak Spanish and English.' },
      { word: 'I am ... years old', translation: 'Tengo ... años', example: 'I am 28 years old.' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'voice', instructions: 'Introduce yourself.', prompt: 'Say: "I am from [country]. I speak [languages]. I am [age] years old."' },
      { exerciseNumber: 2, type: 'translation', instructions: 'Translate to English.', prompt: '"Soy de México y hablo español."', correctAnswer: 'I am from Mexico and I speak Spanish.' },
    ],
  },
  {
    id: 'en-b1-s1-l1',
    language: 'English',
    skill: 'speaking',
    level: 'B1',
    lessonNumber: 1,
    title: 'Expressing Opinions',
    description: 'Learn to express your opinion, agree and disagree politely.',
    vocabulary: [
      { word: 'In my opinion', translation: 'En mi opinión', example: 'In my opinion, this is a great idea.' },
      { word: 'I think that', translation: 'Creo que', example: 'I think that we should practice more.' },
      { word: 'I agree', translation: 'Estoy de acuerdo', example: 'I agree with you.' },
      { word: 'I disagree', translation: 'No estoy de acuerdo', example: 'I disagree, I think it is different.' },
    ],
    exercises: [
      { exerciseNumber: 1, type: 'voice', instructions: 'Express your opinion about learning languages.', prompt: 'Say: "In my opinion, learning English is very useful. I think that practice is the key."' },
      { exerciseNumber: 2, type: 'multiple_choice', instructions: 'How do you politely disagree?', prompt: 'Choose the correct option:', options: ['You are wrong!', 'I disagree, I think that...', 'No!', 'That is bad.'], correctAnswer: 'I disagree, I think that...' },
    ],
  },
];
