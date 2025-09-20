import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 8080;

async function callGemini(prompt) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY environment variable is not set');
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const body = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  console.log('Sending request to Gemini:', {
    url,
    body: JSON.stringify(body, null, 2)
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const txt = await response.text();
  console.log('Raw Gemini response:', txt);
  
  if (response.status >= 400) {
    console.error('Gemini error response:', txt);
    throw new Error(`Gemini API error ${response.status}: ${txt}`);
  }

  let data;
  try {
    data = JSON.parse(txt);
  } catch (err) {
    console.error('Failed to parse Gemini response:', txt);
    throw new Error(`Invalid JSON response from Gemini API: ${txt}`);
  }

  console.log('Parsed API Response:', JSON.stringify(data, null, 2));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) return text;
  
  throw new Error('Unexpected response format from Gemini API');
}

function buildParsePrompt(userText, dateHint) {
  return `You are a calendar event parser that always responds with valid JSON.

STRICT OUTPUT FORMAT:
{
  "events": [
    {
      "name": "Event Name",
      "start": "YYYY-MM-DD_HH:MM",
      "end": "YYYY-MM-DD_HH:MM",
      "color": "#hexcolor"
    }
  ]
}

RULES:
1. Respond ONLY with the JSON object - no other text or explanation
2. Times must be 24-hour format with zero-padding (09:00, 14:30)
3. If date is ambiguous and dateHint provided, use the hint
4. If date is ambiguous and no hint, use nearest future date
5. For durations (e.g. "2 hours"), pick sensible time in next 7 days
6. Color should be a valid hex code (#1976d2, #388e3c, etc.)
7. Always ensure the JSON is valid and properly formatted

EXAMPLE INPUT: "Meeting tomorrow from 2-3pm"
EXAMPLE OUTPUT:
{
  "events": [
    {
      "name": "Meeting",
      "start": "2025-09-20_14:00",
      "end": "2025-09-20_15:00",
      "color": "#1976d2"
    }
  ]
}

USER TEXT: "${userText.replaceAll('"','\\"')}"
DATE HINT: "${dateHint || ''}"

Remember: Return ONLY the JSON object with no additional text.`;
}

app.post('/api/parse', async (req, res) => {
  const { text, dateHint } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const prompt = buildParsePrompt(text, dateHint);
    console.log('Sending prompt to Gemini:', prompt);
    const out = await callGemini(prompt);
    console.log('Raw Gemini response:', out);

    // try to parse JSON out of the model response
    const jsonStart = out.indexOf('{');
    console.log('JSON starts at:', jsonStart);
    const json = jsonStart >= 0 ? out.slice(jsonStart) : out;
    console.log('Extracted JSON string:', json);
    
    try {
      const parsed = JSON.parse(json);
      console.log('Parsed JSON:', parsed);
      // sanitize + add ids and colors
      const events = (parsed.events || []).map(ev => ({
        id: ev.id || randomUUID(),
        name: ev.name || 'Untitled',
        start: ev.start,
        end: ev.end,
        color: ev.color || '#1976d2'
      }));
      return res.json({ events });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({ error: `Invalid JSON response from AI: ${parseError.message}. Raw response: ${out}` });
    }
  } catch (e) {
    console.error('parse error:', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// free-form ask endpoint: returns plain text response from model
app.post('/api/ask', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    console.log('Received question:', text);
    const out = await callGemini(text);
    console.log('Gemini response:', out);
    return res.json({ text: out });
  } catch (e) {
    console.error('Ask error:', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.get('/', (req, res) => res.send('parser running'));

app.listen(PORT, () => console.log('server listening on', PORT));
