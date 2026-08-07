import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
);

const supabaseAdmin = supabase;

function parseJSON(text: string) {
  if (!text) return {};
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

// API endpoint for AI Tutor Chat / Conversation
app.post('/api/tutor', async (req, res) => {
  try {
    const { message, history, profile } = req.body;
    // profile: { name: string, targetLanguage: string, level: string, nativeLanguage: string }
    const targetLang = profile?.targetLanguage || 'German';
    const level = profile?.level || 'A1';
    const userName = profile?.name || 'Mariana';
    const nativeLang = profile?.nativeLanguage || 'Spanish';

    const systemInstruction = `You are a live, highly friendly, empathetic, and conversational language tutor named "Aura".
Your student is ${userName}, whose current level in ${targetLang} is ${level}. Their native language is ${nativeLang}.
Follow these core interaction rules strictly:
1. Maintain conversational flow (80/20 rule): Prioritize natural, encouraging conversation (80%) over grammar corrections (20%). Do not interrupt every minor error. Allow ${userName} to express themselves, and offer gentle, kind feedback or vocabulary hints organically.
2. Adapt to level: If the level is A1/A2, speak clearly, use simpler vocabulary in ${targetLang} mixed with supportive ${nativeLang} if needed, and keep sentences concise. If B1/B2, speak at a natural native pace mostly in ${targetLang}.
3. Be warm, empathetic, and act as a relaxed conversational companion for daily life topics as well as lessons.
4. Respond in JSON format with fields:
   - "reply": The tutor's spoken and written response to the user.
   - "translation": A brief translation or explanation if needed (especially for A1).
   - "gentleCorrection": Optional gentle tip or correction on the user's last message (keep it brief and positive).
   - "suggestedReplies": 2-3 short suggested quick-reply buttons for the user to continue the conversation easily.`;

    const contents = [
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Tutor's reply in target language and supportive text." },
            translation: { type: Type.STRING, description: "Translation or clarification." },
            gentleCorrection: { type: Type.STRING, description: "Gentle positive grammar/vocab feedback if applicable." },
            suggestedReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 quick response options for the student."
            }
          },
          required: ['reply', 'suggestedReplies']
        }
      }
    });

    const textRes = response.text || '{}';
    const data = parseJSON(textRes);
    res.json(data);
  } catch (error: any) {
    console.error('Tutor API error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate tutor response' });
  }
});

// API endpoint for Assisted Reading generator
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { profile, topic } = req.body;
    const targetLang = profile?.targetLanguage || 'German';
    const level = profile?.level || 'A1';

    const prompt = `Generate a short reading passage in ${targetLang} suitable for level ${level} about "${topic || 'daily routine and hobbies'}".
Include:
1. Title in ${targetLang}.
2. Reading text (150-200 words).
3. 4 vocabulary words with definitions in Spanish/English.
4. 3 comprehension questions (multiple choice with options and correct answer).
Return JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            text: { type: Type.STRING },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  translation: { type: Type.STRING }
                },
                required: ['word', 'translation']
              }
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING }
                },
                required: ['question', 'options', 'correctAnswer']
              }
            }
          },
          required: ['title', 'text', 'vocabulary', 'questions']
        }
      }
    });

    res.json(parseJSON(response.text || '{}'));
  } catch (error: any) {
    console.error('Reading gen error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for Assisted Writing feedback
app.post('/api/writing/feedback', async (req, res) => {
  try {
    const { text, profile } = req.body;
    const targetLang = profile?.targetLanguage || 'German';
    const level = profile?.level || 'A1';

    const prompt = `Review the following text written by a ${level} student in ${targetLang}: "${text}".
Provide:
1. Overall score out of 100.
2. Polished/corrected version of the text.
3. List of specific corrections with explanation.
4. Encouraging feedback comment.
Return JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            correctedText: { type: Type.STRING },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ['original', 'suggestion', 'explanation']
              }
            },
            encouragement: { type: Type.STRING }
          },
          required: ['score', 'correctedText', 'corrections', 'encouragement']
        }
      }
    });

    res.json(parseJSON(response.text || '{}'));
  } catch (error: any) {
    console.error('Writing feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== SUPABASE API ROUTES =====

// Auth: Create or get user from Google OAuth
app.post('/api/auth/user', async (req, res) => {
  try {
    const { email, name, sub } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      return res.json({ user: existing, isNew: false });
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ email, name, role: 'user' }])
      .select()
      .single();

    if (error) throw error;
    res.json({ user: newUser, isNew: true });
  } catch (error: any) {
    console.error('Auth user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth: Guest login / session tracking
const GUEST_ACCESS_DAYS = 14;

app.post('/api/auth/guest', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    const guestEmail = String(email).trim().toLowerCase();

    const { data: existing, error: lookupError } = await supabaseAdmin.from('users').select('*').eq('email', guestEmail).maybeSingle();
    if (lookupError) throw lookupError;

    if (existing) {
      if (existing.role === 'user' || existing.role === 'admin') {
        return res.json({ blocked: false, user: existing });
      }
      if (existing.role === 'guest' && existing.guest_expires_at) {
        const expired = new Date(existing.guest_expires_at).getTime() < Date.now();
        return res.json({ blocked: expired, user: existing });
      }
      const expiresAt = new Date(Date.now() + GUEST_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from('users')
        .update({ guest_expires_at: expiresAt })
        .eq('id', existing.id);
      return res.json({ blocked: false, user: { ...existing, guest_expires_at: expiresAt } });
    }

    const expiresAt = new Date(Date.now() + GUEST_ACCESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin.from('users')
      .insert([{ email: guestEmail, name: 'Invitado', role: 'guest', guest_expires_at: expiresAt, approved_by_admin: false }])
      .select().single();
    if (error) throw error;
    return res.json({ blocked: false, user: data });
  } catch (error: any) {
    console.error('Guest auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Guest requests: Submit request
app.post('/api/guest-requests', async (req, res) => {
  try {
    const { guestEmail, guestName, message } = req.body;
    const { data, error } = await supabase
      .from('guest_requests')
      .insert([{ guest_email: guestEmail, guest_name: guestName, message }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Guest request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Guest requests: List all (admin)
app.get('/api/guest-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('guest_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Guest requests: Approve or reject (admin)
app.post('/api/guest-requests/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }
    const { data: request, error: reqError } = await supabase
      .from('guest_requests')
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (reqError) throw reqError;
    if (status === 'approved' && request?.guest_email) {
      await supabase
        .from('users')
        .update({ role: 'user', approved_by_admin: true })
        .eq('email', request.guest_email);
    }
    res.json(request);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Progress: Get user progress
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Progress: Save
app.post('/api/progress', async (req, res) => {
  try {
    const { user_id, language, skill, level, lesson_id, score, completed } = req.body;
    const { data: existing } = await supabase
      .from('progress')
      .select('id, attempts, score')
      .eq('user_id', user_id)
      .eq('lesson_id', lesson_id)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('progress')
        .update({ score, completed, attempts: existing.attempts + 1, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase
      .from('progress')
      .insert([{ user_id, language, skill, level, lesson_id, score, completed }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Lessons: Get by skill and level
app.get('/api/lessons', async (req, res) => {
  try {
    const { language, skill, level } = req.query;
    let query = supabase.from('lessons').select('*');
    if (language) query = query.eq('language', language);
    if (skill) query = query.eq('skill', skill);
    if (level) query = query.eq('level', level);
    const { data, error } = await query.order('lesson_number', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Exercises: Get by lesson
app.get('/api/exercises/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('exercise_number', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Voice sessions: Record
app.post('/api/voice-sessions', async (req, res) => {
  try {
    const { user_id, session_type, provider, duration_seconds } = req.body;
    const { data, error } = await supabase
      .from('voice_sessions')
      .insert([{ user_id, session_type, provider, duration_seconds }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Users: List (admin)
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ELEVENLABS TTS ENDPOINT =====
app.post('/api/tts/elevenlabs', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVEN_LABS_API_KEY not configured' });

    const voice = voiceId || '21m00Tcm4TlvDq8ikWAM';
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        }),
      },
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs error ${response.status}: ${errText}`);
    }
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error: any) {
    console.error('ElevenLabs TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GROQ STT ENDPOINT =====
app.post('/api/stt/groq', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const groqForm = new FormData();
    groqForm.append('model', 'whisper-large-v3');
    groqForm.append('file', new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }), 'audio.webm');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: groqForm,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    res.json({ text: data.text });
  } catch (error: any) {
    console.error('Groq STT error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DEEPSEEK LLM ENDPOINT =====
app.post('/api/llm/deepseek', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful language tutor.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    console.error('DeepSeek error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== KIMI LLM ENDPOINT =====
app.post('/api/llm/kimi', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'KIMI_API_KEY not configured' });

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful language tutor.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kimi error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    console.error('Kimi error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.VERCEL !== '1') {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs, req) => {
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const targetLanguage = urlParams.get('targetLanguage') || 'German';
    const level = urlParams.get('level') || 'A1';
    const name = urlParams.get('name') || 'Mariana';
    const userId = urlParams.get('userId') || '';
    const sessionStart = Date.now();

    const systemInstruction = `You are Aura, a live, highly friendly, empathetic, and conversational language tutor.
Your student is ${name}, practicing ${targetLanguage} at level ${level}.
Keep conversational flow (80/20 rule): 80% natural supportive conversation in ${targetLanguage}, 20% gentle correction. Speak clearly and warmly.`;

    try {
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            const text = message.serverContent?.modelTurn?.parts[0]?.text;
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err) => {
            console.error('Gemini Live session error:', err);
            clientWs.send(JSON.stringify({ error: 'Live session error' }));
          },
          onclose: () => {
            console.log('Gemini Live session closed');
          }
        }
      });

      clientWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            session.sendRealtimeInput({
              audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          }
          if (msg.text) {
            session.sendRealtimeInput({
              text: msg.text
            });
          }
        } catch (e) {
          console.error('Error handling client message in live WS:', e);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
          const duration = Math.floor((Date.now() - sessionStart) / 1000);
          if (userId) {
            supabase.from('voice_sessions').insert([{
              user_id: userId,
              session_type: 'live',
              provider: 'gemini',
              duration_seconds: duration,
            }]);
          }
        } catch (e) {}
      });
    } catch (err) {
      console.error('Failed to establish Gemini Live session:', err);
      clientWs.close();
    }
  });

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Yo Hablo server running on port ${PORT}`);
  });
}

export default app;

