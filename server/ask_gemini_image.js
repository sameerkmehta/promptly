#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import fs from 'fs';
import { Buffer } from 'buffer';

config(); // Load environment variables

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
      'Accept': 'application/json'
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
    
    // Process the response similar to the Python example
    const candidate = data.candidates[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          console.log('Text response:', part.text);
        }
        if (part.inlineData) {
          // Convert base64 to buffer and save as image
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync('generated_image.png', imageBuffer);
          console.log('Image saved as: generated_image.png');
          return { success: true };
        }
      }
    }
  } catch (e) { 
    console.error('Error parsing response:', e);
    throw e;
  }
  
  console.error('No image data found in response');
  return { success: false, data: txt };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node ask_gemini_image.js "describe the image you want to generate"');
    process.exit(2);
  }
  const prompt = args.join(' ');

  try {
    await generateImage(prompt);
  } catch (e) {
    console.error('Error generating image:', e);
    process.exit(1);
  }
}

main();