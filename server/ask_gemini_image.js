#!/usr/bin/env node
import { config } from 'dotenv';

config(); // Load environment variables

async function generateImage(prompt) {
  console.log("GenAI image generation is temporarily disabled.");
  return { success: true, filename: "placeholder_image.png" };
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