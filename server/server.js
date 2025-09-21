import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import fs from 'fs';
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { CHALLENGES, evaluateGeneratedOutput } from './challenges.js';

import connectDB, { dbConnectionState } from './db.js';
import Party from './Party.js';

config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // To serve the generated images

// Serve React build (if present) so a single Render service can host frontend + backend
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Connect to MongoDB (non-fatal). If the DB is down we continue running but
// Party routes will return 503 until the DB becomes available.
connectDB().then((ok) => {
  if (!ok) console.warn('Warning: MongoDB not connected at startup — party endpoints will return 503 until it is available.');
}).catch((e) => {
  console.warn('Unexpected error while attempting to connect to MongoDB:', e && (e.stack || e.message) || e);
});

// Middleware to require DB connection for party endpoints
function requireDB(req, res, next) {
  const state = dbConnectionState();
  // mongoose readyState === 1 means connected
  if (state !== 1) return res.status(503).json({ error: 'Database unavailable' });
  return next();
}

// --- Party API Endpoints ---

// Create a new party with a joinCode
app.post('/api/parties', requireDB, async (req, res) => {
  try {
    const { name, joinCode, members } = req.body;
    if (!name || !joinCode) return res.status(400).json({ error: 'Party name and joinCode are required' });
    // Ensure joinCode is unique
    const existing = await Party.findOne({ joinCode });
    if (existing) return res.status(409).json({ error: 'Join code already in use' });
    const party = new Party({ name, joinCode, members: members || [] });
    await party.save();
    res.status(201).json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all parties
app.get('/api/parties', requireDB, async (req, res) => {
  try {
    const parties = await Party.find();
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single party by joinCode
app.get('/api/parties/code/:joinCode', requireDB, async (req, res) => {
  try {
    const party = await Party.findOne({ joinCode: req.params.joinCode });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Update a party by joinCode (e.g., add member)
app.put('/api/parties/code/:joinCode', requireDB, async (req, res) => {
  try {
    const { name, members } = req.body;
    const party = await Party.findOneAndUpdate(
      { joinCode: req.params.joinCode },
      { name, members },
      { new: true }
    );
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a submission to a party
app.post('/api/parties/code/:joinCode/submissions', requireDB, async (req, res) => {
  try {
    const { username, text, genText } = req.body;
    // Reset winner and votes for a new round
    const party = await Party.findOneAndUpdate(
      { joinCode: req.params.joinCode },
      { $push: { submissions: { username, text, genText } }, $set: { winner: null, votes: {}, voters: [] } },
      { new: true }
    );
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a submission's genText (AI output)
app.put('/api/parties/code/:joinCode/submissions/:username', requireDB, async (req, res) => {
  try {
    const { genText } = req.body;
    const party = await Party.findOne({ joinCode: req.params.joinCode });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    const sub = party.submissions.find(s => s.username === req.params.username);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    sub.genText = genText;
    await party.save();
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a vote
app.post('/api/parties/code/:joinCode/votes', requireDB, async (req, res) => {
  try {
    const { votedUser, voter } = req.body;
    const party = await Party.findOne({ joinCode: req.params.joinCode });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    // Prevent double voting
    if (party.voters && party.voters.includes(voter)) {
      return res.status(400).json({ error: 'User has already voted' });
    }
    party.votes.set(votedUser, (party.votes.get(votedUser) || 0) + 1);
    if (!party.voters) party.voters = [];
    party.voters.push(voter);
    await party.save();
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set the winner
app.post('/api/parties/code/:joinCode/winner', requireDB, async (req, res) => {
  try {
    const { winner } = req.body;
    const party = await Party.findOneAndUpdate(
      { joinCode: req.params.joinCode },
      { winner },
      { new: true }
    );
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a party by joinCode
app.delete('/api/parties/code/:joinCode', requireDB, async (req, res) => {
  try {
    const party = await Party.findOneAndDelete({ joinCode: req.params.joinCode });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json({ message: 'Party deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function generateImage(prompt) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY environment variable is not set');
  
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

  const body = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  const txt = await res.text();
  if (res.status >= 400) {
    throw new Error(`Gemini API error ${res.status}: ${txt}`);
  }

  let data;
  try { 
    data = JSON.parse(txt); 
    
    // Process the response
    const candidate = data.candidates[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          console.log('Text response:', part.text);
        }
        if (part.inlineData) {
          // Create public directory if it doesn't exist
          if (!fs.existsSync('public')) {
            fs.mkdirSync('public');
          }

          // Generate unique filename
          const timestamp = Date.now();
          const filename = `generated_image_${timestamp}.png`;
          
          // Convert base64 to buffer and save as image
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(`public/${filename}`, imageBuffer);
          return { success: true, filename };
        }
      }
    }
  } catch (e) { 
    console.error('Error parsing response:', e);
    throw e;
  }
  
  throw new Error('No image data found in response');
}

// Text generation via Gemini
async function callGemini(prompt) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY environment variable is not set');
    throw new Error('API_KEY environment variable is not set');
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  let res, txt;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    txt = await res.text();
  } catch (err) {
    console.error('Network or fetch error calling Gemini API:', err);
    throw new Error('Network or fetch error calling Gemini API: ' + err.message);
  }
  if (res.status >= 400) {
    console.error('Gemini API error:', res.status, txt);
    throw new Error(`Gemini API error ${res.status}: ${txt}`);
  }
  let data;
  try { data = JSON.parse(txt); } catch (e) {
    console.error('Invalid JSON response from Gemini API:', txt);
    throw new Error(`Invalid JSON response from Gemini API: ${txt}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) return text;
  console.error('Unexpected response format from Gemini API:', data);
  throw new Error('Unexpected response format from Gemini API: ' + JSON.stringify(data));
}

// Check whether a prompt violates a given safety restraint using Gemini 2.5-flash (text)
async function checkPromptSafety(prompt, safetyRestraint) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error('API_KEY environment variable is not set');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  // Construct the exact prompt per your spec
  const safetyPrompt = `User Prompt: ${JSON.stringify(prompt)}\nPrompting Rules: ${JSON.stringify(safetyRestraint)}\nThe user is going to generate an image with this prompt. Does this user prompt violate the prompting rules defined above? Answer with ONE WORD: YES or NO. If YES, provide one short sentence explaining why it violates the prompting rules.`;

  const body = { contents: [{ parts: [{ text: safetyPrompt }] }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const txt = await res.text();
  if (res.status >= 400) {
    throw new Error(`Gemini API error ${res.status}: ${txt}`);
  }

  let data;
  try { data = JSON.parse(txt); } catch (e) { throw new Error(`Invalid JSON from Gemini: ${txt}`); }
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  const upper = text.toUpperCase();
  // Look specifically for YES (violation) or NO (ok)
  const isYes = /^YES\b/.test(upper) || upper.includes('\nYES') || upper === 'YES' || upper.startsWith('YES');
  // If YES, try to extract the following sentence as explanation
  let explanation = '';
  if (isYes) {
    // Remove leading YES and separators
    const after = text.replace(/^(YES[:\-\s]*)/i, '').trim();
    // Take the first sentence (up to the first period) or the whole line
    const m = after.match(/([^\.\n]+[\.\n]?)/);
    explanation = m ? m[1].trim() : after.split('\n')[0].trim();
  }
  return { violates: isYes, raw: text, explanation };
}

// Endpoint to get all challenges
app.get('/api/challenges', (req, res) => {
  try {
    console.log('Challenges endpoint called, CHALLENGES length:', CHALLENGES?.length);
    res.json(CHALLENGES);
  } catch (error) {
    console.error('Error in challenges endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Generate first, then evaluate (two-step ready)
app.post('/api/challenges/:id/generate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { prompt } = req.body || {};
    if (!id || !prompt) return res.status(400).json({ error: 'id and prompt required' });

    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    let generation;
    if (challenge.type === 'image') {
      // If a challenge modifier is present with a safety restraint, run the prompt through Gemini safety check first
      const safety = challenge?.modifier?.safetyRestraint || challenge?.modifier?.safety || null;
      if (safety) {
        try {
          const check = await checkPromptSafety(prompt, safety);
          if (check.violates) {
            // Return a foiled image and message (developer will add /foiled.png later)
            const reason = check.explanation ? check.explanation : 'violates the prompting rules.';
            generation = {
              type: 'image',
              imageUrl: '/foiled.png',
              meta: { prompt, safetyCheck: check.raw, foiled: true, foiledMessage: `ELON CAUGHT YOU SNOOPING! ${reason}` }
            };
            return res.json({ generation });
          }
        } catch (e) {
          console.error('Safety check failed, continuing generation:', e);
          // continue to normal generation if safety check errors
        }
      }

      try {
        const result = await generateImage(prompt);
        if (!result?.success || !result.filename) throw new Error('Image generation failed');
        generation = { type: 'image', imageUrl: `/${result.filename}`, meta: { prompt } };
      } catch (genErr) {
        // If the generator returned no image data, return a friendly message asking for a more descriptive prompt
        const msg = String(genErr?.message || '');
        if (msg.includes('No image data found in response')) {
          // Return a friendly generation message (200) instead of an HTTP error so the client can show it
          const generation = { type: 'text', content: 'Generator AI wants a more descriptive prompt', meta: { prompt, note: 'generator-need-more' } };
          return res.json({ generation });
        }
        // otherwise rethrow to be handled by outer catch
        throw genErr;
      }
    } else if (challenge.type === 'text') {
      const content = await callGemini(prompt);
      generation = { type: 'text', content, meta: { prompt } };
    } else if (challenge.type === 'code') {
      generation = { type: 'code', content: prompt };
    } else {
      return res.status(400).json({ error: 'Unsupported challenge type' });
    }

    return res.json({ generation });
  } catch (e) {
    console.error('Error generating challenge output:', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/challenges/:id/evaluate', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { generation } = req.body || {};
    if (!id || !generation) return res.status(400).json({ error: 'id and generation required' });

    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    const evaluation = await evaluateGeneratedOutput(challenge, generation);
    return res.json(evaluation);
  } catch (e) {
    console.error('Error evaluating generated output:', e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});