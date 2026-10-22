import React, { useState, useEffect, useRef, useCallback, Component, ReactNode } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, ChevronLeft, Play, Pause, StopCircle, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface RolePlayScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  context: string;
  systemPrompt: string;
  initialMessage: string;
  vocabulary: { word: string; translation: string; example: string }[];
}

const SCENARIOS: RolePlayScenario[] = [
  {
    id: 'cinema',
    title: 'En el Cine',
    description: 'Compra entradas, elige asientos, pide palomitas',
    icon: '🎬',
    context: 'Estás en la taquilla de un cine. Quieres comprar entradas para una película.',
    systemPrompt: `Eres un empleado de taquilla de cine amable y paciente. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante quiere comprar entradas para el cine.
Tu rol: Ayudarle a elegir película, horario, asientos, y venderle entradas y snacks.
Corrige suavemente sus errores (máximo 1 por respuesta). Sé natural y conversacional.`,
    initialMessage: '¡Buenas tardes! Bienvenido al cine. ¿Qué película le gustaría ver hoy? Tenemos varias opciones: acción, comedia, terror, animación...',
    vocabulary: [
      { word: 'la entrada', translation: 'la entrada / el boleto', example: 'Quisiera dos entradas para la película de las 8.' },
      { word: 'la taquilla', translation: 'la taquilla', example: 'La taquilla está abierta hasta las 10 de la noche.' },
      { word: 'el asiento', translation: 'el asiento', example: 'Prefiero asientos en el medio, fila 10.' },
      { word: 'las palomitas', translation: 'las palomitas de maíz', example: '¿Me pone unas palomitas grandes, por favor?' },
      { word: 'el refresco', translation: 'el refresco / la bebida', example: 'Un refresco mediano para acompañar.' },
      { word: 'la cartelera', translation: 'la cartelera', example: 'Mire la cartelera para ver los horarios.' },
      { word: 'la sesión', translation: 'la sesión / la función', example: 'La próxima sesión es a las 8:30.' },
      { word: 'subtitulada', translation: 'subtitulada', example: '¿La película es en versión original subtitulada?' },
    ],
  },
  {
    id: 'office',
    title: 'En la Oficina',
    description: 'Reuniones, emails, presentar proyectos, café con compañeros',
    icon: '🏢',
    context: 'Estás en una oficina. Es tu primer día o tienes una reunión importante.',
    systemPrompt: `Eres un compañero de trabajo amable y profesional. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante es un compañero de trabajo en una oficina.
Tu rol: Ayudarle con reuniones, emails, presentaciones, pausa para café, jerga de oficina.
Corrige suavemente sus errores (máximo 1 por respuesta). Usa lenguaje profesional pero accesible.`,
    initialMessage: '¡Hola! Bienvenido al equipo. ¿Es tu primer día? Te enseño dónde está todo: la sala de reuniones, la máquina de café, mi escritorio...',
    vocabulary: [
      { word: 'la reunión', translation: 'la reunión', example: 'Tenemos una reunión a las 10 de la mañana.' },
      { word: 'el proyecto', translation: 'el proyecto', example: 'Este proyecto es muy importante para el cliente.' },
      { word: 'el plazo', translation: 'el plazo / la fecha límite', example: 'El plazo para entregar es el viernes.' },
      { word: 'el compañero', translation: 'el compañero de trabajo', example: 'Mi compañero me ayuda con el informe.' },
      { word: 'el jefe', translation: 'el jefe / la jefa', example: 'El jefe quiere ver el progreso mañana.' },
      { word: 'el informe', translation: 'el informe / el reporte', example: 'Terminé el informe mensual anoche.' },
      { word: 'la pausa', translation: 'la pausa / el descanso', example: 'Vamos a tomar una pausa para café.' },
      { word: 'la videollamada', translation: 'la videollamada', example: 'La videollamada con el cliente es a las 3.' },
    ],
  },
  {
    id: 'restaurant',
    title: 'En el Restaurante',
    description: 'Reservar mesa, pedir comida, alergias, pagar la cuenta',
    icon: '🍽️',
    context: 'Estás en un restaurante. Quieres reservar, pedir comida y pagar.',
    systemPrompt: `Eres un camarero profesional y atento. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante es un cliente en un restaurante.
Tu rol: Tomar la reserva, mostrar la carta, tomar el pedido, preguntar por alergias, traer la cuenta.
Corrige suavemente sus errores (máximo 1 por respuesta). Sé cortés y servicial.`,
    initialMessage: '¡Buenas noches! Bienvenidos a nuestro restaurante. ¿Tienen reserva o les busco una mesa?',
    vocabulary: [
      { word: 'la reserva', translation: 'la reserva', example: 'Tengo una reserva a nombre de García para las 8.' },
      { word: 'la carta', translation: 'la carta / el menú', example: '¿Nos trae la carta, por favor?' },
      { word: 'el plato principal', translation: 'el plato principal', example: 'De plato principal quiero el salmón.' },
      { word: 'el entrante', translation: 'el entrante / la entrada', example: 'Para empezar, una ensalada mixta.' },
      { word: 'la cuenta', translation: 'la cuenta', example: '¿Nos trae la cuenta, por favor?' },
      { word: 'la propina', translation: 'la propina', example: 'El servicio está incluido, no hace falta propina.' },
      { word: 'alérgico', translation: 'alérgico/a', example: 'Soy alérgico a los frutos secos.' },
      { word: 'el postre', translation: 'el postre', example: 'De postre, me apetece la tarta de chocolate.' },
    ],
  },
  {
    id: 'airport',
    title: 'En el Aeropuerto',
    description: 'Facturación, control de seguridad, puerta de embarque, equipaje',
    icon: '✈️',
    context: 'Estás en el aeropuerto. Necesitas facturar, pasar seguridad y encontrar tu puerta.',
    systemPrompt: `Eres un agente de facturación / seguridad / información de aeropuerto. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante está en el aeropuerto y necesita ayuda con facturación, seguridad, embarque.
Tu rol: Pedir pasaporte/tarjeta de embarque, preguntar por equipaje, dar instrucciones de seguridad, indicar puerta.
Corrige suavemente sus errores (máximo 1 por respuesta). Sé claro y directo, como en un aeropuerto real.`,
    initialMessage: 'Buenos días. Pasaporte y tarjeta de embarque, por favor. ¿Factura alguna maleta?',
    vocabulary: [
      { word: 'la tarjeta de embarque', translation: 'la tarjeta de embarque', example: 'Aquí tiene mi tarjeta de embarque.' },
      { word: 'facturar', translation: 'facturar (equipaje)', example: 'Quiero facturar esta maleta.' },
      { word: 'la maleta', translation: 'la maleta / el equipaje', example: 'Mi maleta pesa 20 kilos.' },
      { word: 'el control de seguridad', translation: 'el control de seguridad', example: '¿Dónde está el control de seguridad?' },
      { word: 'la puerta de embarque', translation: 'la puerta de embarque', example: 'La puerta de embarque es la B12.' },
      { word: 'el pasaporte', translation: 'el pasaporte', example: 'Aquí tiene mi pasaporte.' },
      { word: 'el retraso', translation: 'el retraso', example: 'Nuestro vuelo tiene 30 minutos de retraso.' },
      { word: 'la cinta', translation: 'la cinta de equipajes', example: 'Recoja su maleta en la cinta número 3.' },
    ],
  },
  {
    id: 'hotel',
    title: 'En el Hotel',
    description: 'Check-in, servicios, wifi, checkout, reclamaciones',
    icon: '🏨',
    context: 'Estás en la recepción de un hotel. Haces check-in, pides información, haces checkout.',
    systemPrompt: `Eres un recepcionista de hotel amable y profesional. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante es un huésped que hace check-in, pide servicios, o hace checkout.
Tu rol: Registrar entrada, dar llave/wifi, explicar servicios, resolver problemas, registrar salida.
Corrige suavemente sus errores (máximo 1 por respuesta). Sé hospitalario y servicial.`,
    initialMessage: '¡Bienvenido a nuestro hotel! Tiene reserva, ¿verdad? ¿Bajo qué nombre?',
    vocabulary: [
      { word: 'el check-in', translation: 'el check-in / la entrada', example: 'El check-in es a partir de las 3 de la tarde.' },
      { word: 'el check-out', translation: 'el check-out / la salida', example: 'El check-out es antes de las 12 del mediodía.' },
      { word: 'la llave', translation: 'la llave / la tarjeta magnética', example: 'Aquí tiene su tarjeta para la habitación 305.' },
      { word: 'la recepción', translation: 'la recepción', example: 'La recepción está abierta 24 horas.' },
      { word: 'el wifi', translation: 'el wifi', example: 'La contraseña del wifi está en la tarjeta.' },
      { word: 'el desayuno', translation: 'el desayuno', example: 'El desayuno se sirve de 7 a 10.' },
      { word: 'la habitación', translation: 'la habitación', example: 'Mi habitación tiene vistas al mar.' },
      { word: 'la queja', translation: 'la queja / la reclamación', example: 'Quiero hacer una queja: el aire no funciona.' },
    ],
  },
  {
    id: 'shopping',
    title: 'De Compras',
    description: 'Ropa, tallas, probadores, pago, devoluciones, mercados',
    icon: '🛍️',
    context: 'Estás en una tienda o mercado. Buscas ropa, preguntas tallas, pagas o devuelves.',
    systemPrompt: `Eres un dependiente/a de tienda amable y paciente. Habla en ${'{{language}}'} nivel ${'{{level}}'}.
Contexto: El estudiante está comprando ropa o en un mercado.
Tu rol: Ayudar a encontrar tallas, colores, probadores, procesar pago, gestionar devoluciones.
Corrige suavemente sus errores (máximo 1 por respuesta). Sé servicial y comercial.`,
    initialMessage: '¡Hola! ¿En qué le puedo ayudar hoy? Busca algo en especial o solo echa un vistazo?',
    vocabulary: [
      { word: 'la talla', translation: 'la talla', example: '¿Qué talla usa? Yo uso la M.' },
      { word: 'el probador', translation: 'el probador', example: 'Los probadores están al fondo a la derecha.' },
      { word: 'probarse', translation: 'probarse (ropa)', example: '¿Me la puedo probar, por favor?' },
      { word: 'el precio', translation: 'el precio', example: '¿Cuál es el precio de esta camiseta?' },
      { word: 'la rebaja', translation: 'la rebaja / el descuento', example: 'Esta chaqueta tiene un 30% de descuento.' },
      { word: 'pagar', translation: 'pagar', example: '¿Puedo pagar con tarjeta?' },
      { word: 'el recibo', translation: 'el recibo / el ticket', example: 'Guarde el recibo por si quiere cambiarlo.' },
      { word: 'devolver', translation: 'devolver / cambiar', example: 'Quiero devolver esto, me queda grande.' },
    ],
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  translation?: string;
  correction?: string;
}

interface VoiceState {
  isSpeaking: boolean;
  isListening: boolean;
  speakText: (text: string) => void;
  stopSpeech: () => void;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
}

interface RolePlayProps {
  profile: UserProfile;
  voiceEnabled: boolean;
  voice: VoiceState;
}

export default function RolePlay({ profile, voiceEnabled, voice }: RolePlayProps) {
  const [activeScenario, setActiveScenario] = useState<RolePlayScenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const fallback = (
    <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="text-lg font-semibold text-stone-800">Error al cargar Role Play</h3>
          <p className="text-sm text-stone-500">Ha ocurrido un error inesperado. Intenta cambiar de pestaña y volver.</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
            Recargar aplicación
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startScenario = useCallback((scenario: RolePlayScenario) => {
    const filledSystemPrompt = scenario.systemPrompt
      .replace('{{language}}', profile.targetLanguage)
      .replace('{{level}}', profile.level);
    const filledInitialMessage = scenario.initialMessage
      .replace('{{language}}', profile.targetLanguage)
      .replace('{{level}}', profile.level);

    setActiveScenario(scenario);
    setMessages([
      { id: `sys-${Date.now()}`, role: 'system', text: filledSystemPrompt, timestamp: new Date() },
      { id: `init-${Date.now()}`, role: 'assistant', text: filledInitialMessage, timestamp: new Date() },
    ]);
    setSessionActive(true);
    if (voiceEnabled) voice.speakText(filledInitialMessage);
  }, [profile.targetLanguage, profile.level, voiceEnabled, voice]);

  const endScenario = useCallback(() => {
    setActiveScenario(null);
    setMessages([]);
    setSessionActive(false);
    voice.stopSpeech();
    voice.stopListening();
  }, [voice]);

  const sendMessage = async (textToSend?: string) => {
    if (!activeScenario || !voiceEnabled) return;
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', text, timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const historyText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.text}`)
        .join('\n');

      const systemPrompt = activeScenario.systemPrompt
        .replace('{{language}}', profile.targetLanguage)
        .replace('{{level}}', profile.level);

      const prompt = `Contexto: ${activeScenario.context}\n\nConversación:\n${historyText}\n\nUsuario: ${text}\nAsistente:`;

      const res = await fetch('/api/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: messages.filter(m => m.role !== 'system'), 
          profile, 
          systemPrompt,
          scenarioContext: activeScenario.context 
        }),
      });

      const textResponse = await res.text();
      if (!res.ok) throw new Error(`Server error (${res.status}): ${textResponse}`);
      const data = JSON.parse(textResponse);
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        translation: data.translation,
        correction: data.gentleCorrection,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (voiceEnabled) voice.speakText(data.reply);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Lo siento, hubo un problema. ¿Podrías repetirlo?',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    if (voice.isListening) {
      voice.stopListening();
      setIsRecording(false);
    } else {
      voice.startListening((transcript) => {
        setIsRecording(false);
        sendMessage(transcript);
      });
      setIsRecording(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!activeScenario) {
    return (
      <ErrorBoundary fallback={fallback}>
        <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 font-bold text-xl">🎭</div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800">Role Play - Práctica Inmersiva</h2>
              <p className="text-xs text-stone-500">Elige un escenario y practica conversaciones reales con IA de voz</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => startScenario(scenario)}
              className="group p-6 border-2 border-stone-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left"
            >
              <div className="text-4xl mb-3">{scenario.icon}</div>
              <h3 className="text-lg font-bold text-stone-800 group-hover:text-emerald-700">{scenario.title}</h3>
              <p className="text-xs text-stone-500 mt-1">{scenario.description}</p>
              <div className="mt-3 pt-3 border-t border-stone-100">
                <span className="text-[10px] text-stone-400 flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" /> Chat + Voz en tiempo real
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 border-t border-stone-200 bg-stone-50">
          <div className="text-center text-xs text-stone-500">
            <p>La IA actuará como personaje del escenario (camarero, recepcionista, compañero...)</p>
            <p className="mt-1">Corrección suave automática • Voz en tiempo real • Vocabulario contextual</p>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={fallback}>
      <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden h-[calc(100vh-8rem)]">
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <button onClick={endScenario} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-stone-500" />
        </button>
        <div className="flex items-center space-x-3 flex-1">
          <div className="text-2xl">{activeScenario.icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-stone-800 truncate">{activeScenario.title}</h2>
            <p className="text-[10px] text-stone-500 truncate">{activeScenario.context}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => setShowVocabulary(!showVocabulary)} className="p-2 hover:bg-stone-200 rounded-xl transition-colors">
            <span className="text-xs font-medium text-stone-600">Vocab ({activeScenario.vocabulary.length})</span>
          </button>
          <button onClick={endScenario} className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors" title="Terminar sesión">
            <StopCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div key={msg.id} className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className={`max-w-xl rounded-2xl px-4 py-3 space-y-2 text-sm shadow-xs ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-xs' : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'}`}>
              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.translation && (
                <div className="text-xs bg-stone-100 text-stone-600 p-2 rounded-lg border border-stone-200">
                  <span className="font-semibold text-stone-700">Traducción:</span> {msg.translation}
                </div>
              )}
              {msg.correction && (
                <div className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200 flex items-start space-x-1.5">
                  <span className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0">✨</span>
                  <div><span className="font-semibold">Corrección:</span> {msg.correction}</div>
                </div>
              )}
              <div className={`text-[10px] text-right ${msg.role === 'user' ? 'text-emerald-100' : 'text-stone-400'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4 rounded-bl-xs flex items-center space-x-3 text-stone-500 text-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
                <div className="w-2 h-2 bg-emerald-600 rounded-full animate-typing-dot"></div>
              </div>
              <span className="text-xs text-stone-400">Escribiendo...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showVocabulary && activeScenario && (
        <div className="border-t border-stone-200 bg-stone-50 p-4 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-emerald-900">Vocabulario clave - {activeScenario.title}</h3>
            <button onClick={() => setShowVocabulary(false)} className="p-1 hover:bg-stone-200 rounded-lg">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeScenario.vocabulary.map((v, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-xl p-3 text-xs">
                <div className="font-semibold text-stone-800">{v.word}</div>
                <div className="text-stone-600">{v.translation}</div>
                <div className="text-stone-400 mt-1 italic">«{v.example}»</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-stone-200 flex items-center space-x-3">
        <button
          onClick={handleMicToggle}
          disabled={loading}
          className={`p-3 rounded-xl transition-all flex items-center justify-center ${voice.isListening ? 'bg-rose-500 text-white animate-pulse' : voiceEnabled ? 'bg-stone-100 text-stone-700 hover:bg-emerald-50' : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}
          title={voice.isListening ? 'Detener grabación' : voiceEnabled ? 'Hablar (mantén pulsado)' : 'Activa voz en ajustes'}
        >
          {voice.isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voice.isListening ? '🎤 Escuchando...' : `Escribe o habla en ${profile.targetLanguage}...`}
          disabled={loading}
          className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !inputText.trim()}
          className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
        >
          <Play className="w-5 h-5" />
        </button>
      </div>
    </div>
    </ErrorBoundary>
  );
}