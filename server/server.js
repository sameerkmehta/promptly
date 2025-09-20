import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import fs from 'fs';
import { Buffer } from 'buffer';

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

// Endpoint for image generation
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateImage(prompt);
    res.json({ imageUrl: `/${result.filename}` });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});