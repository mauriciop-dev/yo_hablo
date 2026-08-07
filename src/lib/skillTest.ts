import { SkillName } from './plan';

export type SkillQuestion = {
  id: string;
  skill: SkillName;
  prompt: string;
  text?: string;
  options: string[];
  correctIndex: number;
};

export const SKILLS: { id: SkillName; label: string; description: string; icon: string }[] = [
  { id: 'reading', label: 'Lectura', description: 'Entiendes texto escrito', icon: '📖' },
  { id: 'listening', label: 'Escucha', description: 'Entiendes el idioma hablado', icon: '🎧' },
  { id: 'speaking', label: 'Habla', description: 'Produces frases habladas', icon: '🎤' },
  { id: 'writing', label: 'Escritura', description: 'Produces frases escritas', icon: '✍️' },
];

function q(id: string, skill: SkillName, prompt: string, text: string | undefined, options: string[], correctIndex: number): SkillQuestion {
  return { id, skill, prompt, text, options, correctIndex };
}

export function getSkillTest(language: 'German' | 'English'): SkillQuestion[] {
  if (language === 'German') {
    return [
      // Reading
      q('r1', 'reading', '¿Qué significa "Der Hund schläft"?', undefined,
        ['El perro come', 'El perro duerme', 'El gato duerme', 'El perro corre'], 1),
      q('r2', 'reading', '¿Qué significa "Ich heiße María"?', undefined,
        ['Me llamo María', 'Yo soy de España', 'María vive aquí', 'Hola María'], 0),
      // Listening (se lee en voz alta)
      q('l1', 'listening', 'Escucha la frase y elige su significado.', 'Guten Morgen!',
        ['Buenas tardes', 'Buenos días', 'Buenas noches', 'Hasta luego'], 1),
      q('l2', 'listening', 'Escucha la frase y elige su significado.', 'Wo ist die Toilette?',
        ['¿Dónde está la biblioteca?', '¿Dónde está la estación?', '¿Dónde está el baño?', '¿Dónde está el hotel?'], 2),
      // Speaking (opciones habladas)
      q('s1', 'speaking', 'Para saludar en alemán, dirías...', undefined,
        ['"Bitte schön"', '"Danke"', '"Hallo"', '"Tschüss"'], 2),
      q('s2', 'speaking', 'Para agradecer en alemán, dirías...', undefined,
        ['"Bitte"', '"Danke"', '"Ja"', '"Nein"'], 1),
      // Writing
      q('w1', 'writing', '¿Cuál es la frase correcta?', undefined,
        ['Ich bin María', 'Ich ist María', 'María bin Ich', 'Ich am María'], 0),
      q('w2', 'writing', '¿Cómo se dice "Sí" en alemán?', undefined,
        ['Nein', 'Ja', 'Bitte', 'Gut'], 1),
    ];
  }
  return [
    // Reading
    q('r1', 'reading', 'What does "The dog is sleeping" mean?', undefined,
      ['El perro come', 'El perro duerme', 'El gato duerme', 'El perro corre'], 1),
    q('r2', 'reading', 'What does "My name is Mary" mean?', undefined,
      ['Me llamo María', 'Yo soy de España', 'María vive aquí', 'Hola María'], 0),
    // Listening
    q('l1', 'listening', 'Listen to the phrase and choose its meaning.', 'Good morning!',
      ['Buenas tardes', 'Buenos días', 'Buenas noches', 'Hasta luego'], 1),
    q('l2', 'listening', 'Listen to the phrase and choose its meaning.', 'Where is the bathroom?',
      ['¿Dónde está la biblioteca?', '¿Dónde está la estación?', '¿Dónde está el baño?', '¿Dónde está el hotel?'], 2),
    // Speaking
    q('s1', 'speaking', 'To greet someone in English, you would say...', undefined,
      ['"Thank you"', '"Please"', '"Hello"', '"Goodbye"'], 2),
    q('s2', 'speaking', 'To say thanks in English, you would say...', undefined,
      ['"Please"', '"Thanks"', '"Yes"', '"No"'], 1),
    // Writing
    q('w1', 'writing', 'Which is the correct sentence?', undefined,
      ['I am Mary', 'I is Mary', 'Mary am I', 'I be Mary'], 0),
    q('w2', 'writing', 'How do you write "yes" in English?', undefined,
      ['No', 'Yes', 'Please', 'Good'], 1),
  ];
}

export function scoreSkillTest(questions: SkillQuestion[], answers: number[]): Record<SkillName, number> {
  const bySkill: Record<SkillName, number[]> = { speaking: [], listening: [], reading: [], writing: [] };
  questions.forEach((question, i) => bySkill[question.skill].push(answers[i] === question.correctIndex ? 1 : 0));
  const result = {} as Record<SkillName, number>;
  (Object.keys(bySkill) as SkillName[]).forEach((skill) => {
    const arr = bySkill[skill];
    result[skill] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100);
  });
  return result;
}

export function inferLevel(skillScores: Record<SkillName, number>): 'A1' | 'A2' | 'B1' | 'B2' {
  const avg = (Object.values(skillScores) as number[]).reduce((a, b) => a + b, 0) / 4;
  if (avg >= 88) return 'B2';
  if (avg >= 63) return 'B1';
  if (avg >= 38) return 'A2';
  return 'A1';
}
