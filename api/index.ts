import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const zaiApiKey = process.env.ZAI_API_KEY || '';

async function callZAI(prompt: string, systemPrompt: string = ''): Promise<string> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${zaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'glm-4.5-flash', messages, max_tokens: 2048 }),
  });
  if (!response.ok) throw new Error(`Z.AI error ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ===== TUTOR CHAT =====
app.post('/api/tutor', async (req, res) => {
  try {
    const { message, history, profile } = req.body;
    const systemPrompt = `You are Aura, an encouraging and mildly funny ${profile.targetLanguage} tutor.
Your student: ${profile.name}, level ${profile.level} (${profile.nativeLanguage} native).
Rules: respond in ${profile.targetLanguage}, 80/20 rule (80% natural conversation, 20% gentle correction), never break character.`;
    const historyText = (history || []).map((m: any) => `${m.role}: ${m.text}`).join('\n');
    const prompt = `Conversation so far:\n${historyText}\n\nStudent: ${message}\nAura:`;
    const reply = await callZAI(prompt, systemPrompt);
    const translation = profile.targetLanguage === 'German'
      ? `🇩🇪 → 🇪🇸: ${reply.slice(0, 80)}...`
      : `🇬🇧 → 🇪🇸: ${reply.slice(0, 80)}...`;
    const suggestedReplies = ['That is interesting, tell me more!', 'Can you repeat that please?', 'How do you say this in English?'];
    res.json({ reply, translation, gentleCorrection: '', suggestedReplies });
  } catch (error: any) {
    console.error('Tutor error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== READING =====
app.post('/api/reading/generate', async (req, res) => {
  try {
    const { profile, topic } = req.body;
    const prompt = `Generate a ${profile.level} ${profile.targetLanguage} reading text about "${topic}".
Return valid JSON: { "title": "...", "text": "...", "vocabulary": [{"word":"...","translation":"..."}], "questions": [{"question":"...","options":["..."],"correctAnswer":"..."}] }`;
    const textRes = await callZAI(prompt);
    const jsonMatch = textRes.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Reading', text: textRes, vocabulary: [], questions: [] };
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== WRITING FEEDBACK =====
app.post('/api/writing/feedback', async (req, res) => {
  try {
    const { text, profile } = req.body;
    const prompt = `Review this ${profile.targetLanguage} text (${profile.level} level) and return JSON:
{ "score": 0-100, "encouragement": "...", "correctedText": "...", "corrections": [{"original":"...","suggestion":"...","explanation":"..."}] }
Text: "${text}"`;
    const textRes = await callZAI(prompt);
    const jsonMatch = textRes.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 50, encouragement: 'Good effort!', correctedText: text, corrections: [] };
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SUPABASE PROXY =====
app.post('/api/auth/guest', async (req, res) => {
  try {
    const { data: existing, error: lookupError } = await supabase.from('users').select('*').eq('email', 'guest@yohablo.com').single();
    if (existing && existing.role === 'guest' && existing.guest_sessions_count && existing.guest_sessions_count >= 3) {
      return res.json({ blocked: true });
    }
    const { data, error } = await supabase.from('users').insert([{ email: 'guest@yohablo.com', name: 'Invitado', role: 'guest' }]).select().single();
    if (error && error.code !== '23505') throw error;
    const guestData = existing || data;
    return res.json({ user: guestData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/guest-requests', async (req, res) => {
  try {
    const { guestEmail, guestName, message } = req.body;
    const { data, error } = await supabase.from('guest_requests').insert([{ guest_email: guestEmail, guest_name: guestName, message }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/guest-requests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('guest_requests').select('*').order('requested_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/guest-requests/:id', async (req, res) => {
  try {
    const { status, reviewedBy } = req.body;
    const { data, error } = await supabase.from('guest_requests').update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase.from('progress').select('*').eq('user_id', req.params.userId).order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    const { userId, language, skill, level, lessonId, score, completed } = req.body;
    const { data, error } = await supabase.from('progress').insert([{ user_id: userId, language, skill, level, lesson_id: lessonId, score, completed }]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tts/elevenlabs', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ELEVEN_LABS_API_KEY not configured' });
    const voice = voiceId || '21m00Tcm4TlvDq8ikWAM';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1', voice_settings: { stability: 0.5, similarity_boost: 0.5 } }),
    });
    if (!response.ok) throw new Error(`ElevenLabs error ${response.status}`);
    const audioBuffer = await response.arrayBuffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stt/groq', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !req.file) return res.status(400).json({ error: 'Missing API key or audio' });
    const groqForm = new FormData();
    groqForm.append('model', 'whisper-large-v3');
    groqForm.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), 'audio.webm');
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: groqForm,
    });
    if (!response.ok) throw new Error(`Groq error ${response.status}`);
    const data = await response.json();
    res.json({ text: data.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/deepseek', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'DEEPSEEK_API_KEY not configured' });
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt || '' }, { role: 'user', content: prompt }], max_tokens: 1024 }),
    });
    if (!response.ok) throw new Error(`DeepSeek error ${response.status}`);
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/kimi', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.KIMI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'KIMI_API_KEY not configured' });
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'moonshot-v1-8k', messages: [{ role: 'system', content: systemPrompt || '' }, { role: 'user', content: prompt }], max_tokens: 1024 }),
    });
    if (!response.ok) throw new Error(`Kimi error ${response.status}`);
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/gemini', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    const contents: any[] = [];
    if (systemPrompt) contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
    contents.push({ role: 'user', parts: [{ text: prompt }] });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });
    if (!response.ok) throw new Error(`Gemini error ${response.status}`);
    const data = await response.json();
    res.json({ reply: data.candidates?.[0]?.content?.parts?.[0]?.text || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/zai', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    const apiKey = process.env.ZAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ZAI_API_KEY not configured' });
    const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'glm-4.5-flash', messages: [{ role: 'system', content: systemPrompt || '' }, { role: 'user', content: prompt }], max_tokens: 2048 }),
    });
    if (!response.ok) throw new Error(`Z.AI error ${response.status}`);
    const data = await response.json();
    res.json({ reply: data.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
