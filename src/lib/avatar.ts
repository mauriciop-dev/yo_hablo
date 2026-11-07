// Utilidades para el módulo Avatar
import type { AvatarMetadata, AvatarGender, TargetLanguage } from '../types';

// Modelos VRM reales y gratuitos (GitHub - three-vrm examples)
// AliciaSolid es un modelo VRM 0.x femenino funcional
const VRM_MODELS = {
  female: 'https://github.com/pixiv/three-vrm/raw/master/packages/three-vrm/examples/models/vrm/AliciaSolid.vrm',
  male: 'https://github.com/pixiv/three-vrm/raw/master/packages/three-vrm/examples/models/vrm/AliciaSolid.vrm', // Temporal: mismo modelo
};

// Avatar por defecto (fallback genérico)
export const DEFAULT_AVATAR_URL = VRM_MODELS.female;

// Generar URL de modelo VRM real
export function generateReadyPlayerMeUrl(gender: AvatarGender, options?: {
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
}): string {
  // Usar modelos VRM reales de three-vrm examples
  return VRM_MODELS[gender] || VRM_MODELS.female;
}

// Parsear respuesta del backend en formato: {json} texto
export function parseAvatarResponse(rawResponse: string): { metadata: AvatarMetadata; cleanText: string } | null {
  if (!rawResponse || !rawResponse.trim()) return null;
  
  // Buscar JSON al inicio de la respuesta
  const jsonMatch = rawResponse.match(/^(\{[\s\S]*?\})\s*([\s\S]*)$/);
  
  if (!jsonMatch) {
    // Si no hay JSON, devolver metadata por defecto
    return {
      metadata: getDefaultMetadata(),
      cleanText: rawResponse.trim(),
    };
  }
  
  try {
    const metadata = JSON.parse(jsonMatch[1]) as AvatarMetadata;
    const cleanText = jsonMatch[2].trim();
    
    // Validar que el metadata tenga todos los campos requeridos
    const validatedMetadata = validateMetadata(metadata);
    
    return { metadata: validatedMetadata, cleanText };
  } catch (e) {
    console.warn('Error parsing avatar metadata, using defaults:', e);
    return {
      metadata: getDefaultMetadata(),
      cleanText: rawResponse.trim(),
    };
  }
}

// Metadata por defecto
export function getDefaultMetadata(): AvatarMetadata {
  return {
    expr: 'NEUTRAL',
    gesture: 'NONE',
    gaze: 'DIRECT',
    prosody: 'WARM_CASUAL',
    phonetics_focus: 'STANDARD',
    pause_ms: 0,
  };
}

// Validar y normalizar metadata
export function validateMetadata(metadata: Partial<AvatarMetadata>): AvatarMetadata {
  const defaults = getDefaultMetadata();
  
  const validExpressions: AvatarMetadata['expr'][] = ['HAPPY', 'NEUTRAL', 'THINKING', 'EMPATHETIC', 'CONFUSED', 'PROUD'];
  const validGestures: AvatarMetadata['gesture'][] = ['NOD', 'DOUBLE_NOD', 'TILT_HEAD', 'SHRUG', 'WAVE', 'POINT_PRACTICE', 'NONE'];
  const validGaze: AvatarMetadata['gaze'][] = ['DIRECT', 'THINK_UP', 'DOWN_SOFT'];
  const validProsody: AvatarMetadata['prosody'][] = ['FAST_ENCOURAGING', 'SLOW_EXPLANATORY', 'WARM_CASUAL', 'EMPHASIS_TARGET'];
  const validPhonetics: AvatarMetadata['phonetics_focus'][] = ['GERMAN_UMLAUT', 'GERMAN_CH', 'ENGLISH_TH', 'ENGLISH_R', 'STANDARD'];
  
  return {
    expr: validExpressions.includes(metadata.expr as any) ? metadata.expr! : defaults.expr,
    gesture: validGestures.includes(metadata.gesture as any) ? metadata.gesture! : defaults.gesture,
    gaze: validGaze.includes(metadata.gaze as any) ? metadata.gaze! : defaults.gaze,
    prosody: validProsody.includes(metadata.prosody as any) ? metadata.prosody! : defaults.prosody,
    phonetics_focus: validPhonetics.includes(metadata.phonetics_focus as any) ? metadata.phonetics_focus! : defaults.phonetics_focus,
    pause_ms: typeof metadata.pause_ms === 'number' && metadata.pause_ms >= 0 ? metadata.pause_ms : defaults.pause_ms,
  };
}

// Mapear idioma a código de voz para TTS
export function getVoiceLangCode(language: TargetLanguage): string {
  switch (language) {
    case 'German': return 'de-DE';
    case 'French': return 'fr-FR';
    case 'English': return 'en-US';
  }
}

// Mapear fonética según idioma
export function getPhoneticsFocusForLanguage(language: TargetLanguage): AvatarMetadata['phonetics_focus'] {
  switch (language) {
    case 'German': return 'GERMAN_UMLAUT';
    case 'English': return 'ENGLISH_TH';
    case 'French': return 'STANDARD';
  }
}

// System prompt para el backend del Avatar
export const AVATAR_SYSTEM_PROMPT = (profile: {
  name: string;
  targetLanguage: TargetLanguage;
  level: string;
  nativeLanguage: string;
  avatarGender: AvatarGender;
}) => `Eres Aura, un tutor de ${profile.targetLanguage} nativo, amigable y moderno. 
Tu estudiante: ${profile.name}, nivel ${profile.level} (nativo en ${profile.nativeLanguage}).
Tu avatar es ${profile.avatarGender === 'male' ? 'un hombre' : 'una mujer'}.

REGLAS ESTRICTAS:
1. SIEMPRE inicia tu respuesta con un JSON en una sola línea con metadatos de animación
2. Formato: {"expr":"<EMOCION>","gesture":"<GESTO>","gaze":"<MIRADA>","prosody":"<PROSODIA>","phonetics_focus":"<FOCO_FONETICO>","pause_ms":<MS>} <TEXTO_PARA_AUDIO>
3. Máximo 2-3 oraciones por respuesta (latencia < 1s)
4. Tono: Tutor nativo informal, expresiones coloquiales reales
5. 80% conversación natural, 20% corrección suave y fluida
6. Valora la intención comunicativa antes de corregir

VALORES PERMITIDOS:
- expr: HAPPY, NEUTRAL, THINKING, EMPATHETIC, CONFUSED, PROUD
- gesture: NOD, DOUBLE_NOD, TILT_HEAD, SHRUG, WAVE, POINT_PRACTICE, NONE
- gaze: DIRECT, THINK_UP, DOWN_SOFT
- prosody: FAST_ENCOURAGING, SLOW_EXPLANATORY, WARM_CASUAL, EMPHASIS_TARGET
- phonetics_focus: GERMAN_UMLAUT, GERMAN_CH, ENGLISH_TH, ENGLISH_R, STANDARD
- pause_ms: entero (0, 200, 400, etc.)

EJEMPLO:
{"expr":"EMPATHETIC","gesture":"TILT_HEAD","gaze":"DIRECT","prosody":"SLOW_EXPLANATORY","phonetics_focus":"ENGLISH_TH","pause_ms":200} Great try! Remember, for yesterday we say "I went to the park and saw a big dog." What kind of dog was it?`;

// Construir prompt para el backend
export function buildAvatarPrompt(
  message: string,
  history: Array<{ role: string; text: string }>,
  profile: { name: string; targetLanguage: TargetLanguage; level: string; nativeLanguage: string; avatarGender: AvatarGender }
): string {
  const historyText = history.map(m => `${m.role}: ${m.text}`).join('\n');
  return `Conversación hasta ahora:\n${historyText}\n\nEstudiante: ${message}\nAura:`;
}