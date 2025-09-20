import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

function toMimeType(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function getImageSimilarityScore(image1Path, image2Path) {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error('API_KEY environment variable is not set');

    // Read images; if SVG, attempt to rasterize to PNG using sharp
    const { buffer: buf1, mime: mime1 } = await readAsImageBytes(image1Path);
    const { buffer: buf2, mime: mime2 } = await readAsImageBytes(image2Path);

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const body = {
      contents: [
        {
          parts: [
            {
              text:
                'Compare these two images and return a similarity score as a single number between 0 and 1. 0 means completely different, 1 means identical. Only output the number, nothing else.'
            },
            { inlineData: { data: buf1.toString('base64'), mimeType: mime1 } },
            { inlineData: { data: buf2.toString('base64'), mimeType: mime2 } }
          ]
        }
      ],
      generationConfig: { temperature: 0.0 }
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
    try {
      data = JSON.parse(txt);
    } catch (e) {
      throw new Error(`Invalid JSON from Gemini: ${txt}`);
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let score = parseFloat(String(raw).trim());
    if (!isFinite(score)) return -1.0;
    if (score < 0) score = 0;
    if (score > 1) score = 1;
    return score;
  } catch (e) {
    console.error('getImageSimilarityScore error:', e);
    return -1.0;
  }
}

async function readAsImageBytes(p) {
  const mime = toMimeType(p);
  const isSvg = mime === 'image/svg+xml';
  const data = fs.readFileSync(p);
  if (!isSvg) {
    return { buffer: data, mime };
  }

  // SVG needs conversion; try dynamic import of sharp to avoid hard dependency if not needed
  try {
    const sharp = (await import('sharp')).default;
    const pngBuffer = await sharp(data).png().toBuffer();
    return { buffer: pngBuffer, mime: 'image/png' };
  } catch (e) {
    throw new Error('SVG target/generation requires rasterization. Please install sharp in server/ (npm i sharp) or replace the SVG with a PNG/JPEG. Original error: ' + e.message);
  }
}
