import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import fs from 'fs';
import { Buffer } from 'buffer';
import fetch from 'node-fetch';
import { CHALLENGES, evaluateGeneratedOutput } from './challenges.js';

config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // To serve the generated images

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
  if (!apiKey) throw new Error('API_KEY environment variable is not set');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
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
  try { data = JSON.parse(txt); } catch (e) {
    throw new Error(`Invalid JSON response from Gemini API: ${txt}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text) return text;
  throw new Error('Unexpected response format from Gemini API');
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
      const result = await generateImage(prompt);
      if (!result?.success || !result.filename) throw new Error('Image generation failed');
      generation = { type: 'image', imageUrl: `/${result.filename}`, meta: { prompt } };
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