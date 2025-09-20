#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import { config } from 'dotenv';

config(); // Load environment variables

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
  try { data = JSON.parse(txt); } catch (e) { data = null; }
  if (data) {
    console.log('Full API Response:', JSON.stringify(data, null, 2));
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    return JSON.stringify(data);
  }
  return txt;
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
