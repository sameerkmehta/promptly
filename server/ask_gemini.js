#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config(); // Load environment variables

// async function callGemini(prompt) {
//   const apiKey = process.env.API_KEY;
//   if (!apiKey) throw new Error('API_KEY environment variable is not set');
  
//   const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent';

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

async function callGemini(prompt) {
  return "GenAI is temporarily disabled.";
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node ask_gemini.js "your question"');
    process.exit(2);
  }
  const prompt = args.join(' ');

  try {
    const out = await callGemini(prompt);
    console.log('\n--- Gemini reply ---\n');
    console.log(out);
  } catch (e) {
    console.error('Error calling Gemini:', e);
    process.exit(1);
  }
}

main();
