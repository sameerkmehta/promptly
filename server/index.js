import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// In-memory store for parties (party mode)
const parties = {}; // { [partyId]: { id, host, theme, createdAt, participants: [{name,id}], submissions: [{id, name, prompt, result, votes, createdAt}] } }

// Create a new party
app.post('/api/party', async (req, res) => {
  try {
    const { host, theme } = req.body || {};
    if (!host || !theme) return res.status(400).json({ error: 'host and theme are required' });
    const existingParty = Object.values(parties).find(p => p.host === host);
    if (existingParty) {
      return res.status(400).json({ error: 'You can only host one party at a time.' });
    }
    const id = randomUUID();
    const party = {
      id,
      host,
      theme,
      createdAt: Date.now(),
      participants: [],
      submissions: []
    };
    parties[id] = party;
    return res.json({ id, party });
  } catch (e) {
    console.error('party create error:', e);
    return res.status(500).json({ error: String(e) });
  }
});

// Join an existing party
app.post('/api/party/:id/join', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const party = parties[id];
    if (!party) return res.status(404).json({ error: 'party not found' });
    if (party.participants.some(p => p.name === name)) {
      return res.status(400).json({ error: 'You have already joined this party.' });
    }
    const pid = randomUUID();
    const participant = { id: pid, name };
    party.participants.push(participant);
    return res.json({ participant, party });
  } catch (e) {
    console.error('party join error:', e);
    return res.status(500).json({ error: String(e) });
  }
});

// Submit a prompt to a party (this will call the model and store the result)
app.post('/api/party/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prompt } = req.body || {};
    if (!name || !prompt) return res.status(400).json({ error: 'name and prompt required' });
    const party = parties[id];
    if (!party) return res.status(404).json({ error: 'party not found' });

    const submissionId = randomUUID();
    const submission = {
      id: submissionId,
      name,
      prompt,
      result: null,
      votes: 0,
      voters: [], // Add a voters array to track who has voted
      createdAt: Date.now()
    };
    // add a placeholder submission immediately so others can see it
    party.submissions.unshift(submission);

    // Kick off model generation; we run it and then update the submission
    // (async () => {
    //   try {
    //     const out = await callGemini(prompt);
    //     submission.result = String(out);
    //   } catch (e) {
    //     submission.result = `ERROR: ${String(e)}`;
    //   }
    // })();
    submission.result = "GenAI is temporarily disabled.";

    return res.json({ submission, party });
  } catch (e) {
    console.error('party submit error:', e);
    return res.status(500).json({ error: String(e) });
  }
});

// Vote for a submission
app.post('/api/party/:id/vote', (req, res) => {
  try {
    const { id } = req.params;
    const { submissionId, voterName } = req.body || {};
    if (!submissionId || !voterName) return res.status(400).json({ error: 'submissionId and voterName required' });
    const party = parties[id];
    if (!party) return res.status(404).json({ error: 'party not found' });
    const sub = party.submissions.find((s) => s.id === submissionId);
    if (!sub) return res.status(404).json({ error: 'submission not found' });
    if (sub.voters.includes(voterName)) {
      return res.status(400).json({ error: 'You have already voted for this submission.' });
    }
    sub.votes = (sub.votes || 0) + 1;
    sub.voters.push(voterName);
    return res.json({ submission: sub, party });
  } catch (e) {
    console.error('party vote error:', e);
    return res.status(500).json({ error: String(e) });
  }
});

// Get party state
app.get('/api/party/:id', (req, res) => {
  try {
    const { id } = req.params;
    const party = parties[id];
    if (!party) return res.status(404).json({ error: 'party not found' });
    return res.json({ party });
  } catch (e) {
    console.error('party get error:', e);
    return res.status(500).json({ error: String(e) });
  }
});

// async function callGemini(prompt) {
//   const apiKey = process.env.API_KEY;
//   if (!apiKey) throw new Error('API_KEY environment variable is not set');
  
//   const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

//   const body = {
//     contents: [{
//       parts: [{
//         text: prompt
//       }]
//     }]
//   };

//   console.log('Sending request to Gemini:', {
//     url,
//     body: JSON.stringify(body, null, 2)
//   });

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'X-goog-api-key': apiKey,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(body)
//   });

//   const txt = await response.text();
//   console.log('Raw Gemini response:', txt);
  
//   if (response.status >= 400) {
//     console.error('Gemini error response:', txt);
//     throw new Error(`Gemini API error ${response.status}: ${txt}`);
//   }

//   let data;
//   try {
//     data = JSON.parse(txt);
//   } catch (err) {
//     console.error('Failed to parse Gemini response:', txt);
//     throw new Error(`Invalid JSON response from Gemini API: ${txt}`);
//   }

//   console.log('Parsed API Response:', JSON.stringify(data, null, 2));
//   const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
//   if (text) return text;
  
//   throw new Error('Unexpected response format from Gemini API');
// }

// function buildParsePrompt(userText, dateHint) {
//   return `You are a calendar event parser that always responds with valid JSON.

// STRICT OUTPUT FORMAT:
// {
//   "events": [
//     {
//       "name": "Event Name",
//       "start": "YYYY-MM-DD_HH:MM",
//       "end": "YYYY-MM-DD_HH:MM",
//       "color": "#hexcolor"
//     }
//   ]
// }

// RULES:
// 1. Respond ONLY with the JSON object - no other text or explanation
// 2. Times must be 24-hour format with zero-padding (09:00, 14:30)
// 3. If date is ambiguous and dateHint provided, use the hint
// 4. If date is ambiguous and no hint, use nearest future date
// 5. For durations (e.g. "2 hours"), pick sensible time in next 7 days
// 6. Color should be a valid hex code (#1976d2, #388e3c, etc.)
// 7. Always ensure the JSON is valid and properly formatted

// EXAMPLE INPUT: "Meeting tomorrow from 2-3pm"
// EXAMPLE OUTPUT:
// {
//   "events": [
//     {
//       "name": "Meeting",
//       "start": "2025-09-20_14:00",
//       "end": "2025-09-20_15:00",
//       "color": "#1976d2"
//     }
//   ]
// }

// USER TEXT: "${userText.replaceAll('"','\\"')}"
// DATE HINT: "${dateHint || ''}"

// Remember: Return ONLY the JSON object with no additional text.`;
// }

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
