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
      result: "GenAI is temporarily disabled.",
      votes: 0,
      voters: [], // Add a voters array to track who has voted
      createdAt: Date.now()
    };
    // add a placeholder submission immediately so others can see it
    party.submissions.unshift(submission);

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

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
