import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // To serve the generated images

async function generateImage(prompt) {
  return { success: true, filename: "placeholder_image.png" };
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});