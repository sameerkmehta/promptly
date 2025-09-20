import React, { useState, useRef, useCallback, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8080';

export default function PartyPage() {
  const [partyId, setPartyId] = useState('');
  const [partyTheme, setPartyTheme] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [party, setParty] = useState(null);
  const [promptText, setPromptText] = useState('');
  const pollRef = useRef(null);

  const fetchParty = useCallback(async () => {
    if (!partyId) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/party/${partyId}`);
      if (!resp.ok) return;
      const { party: p } = await resp.json();
      setParty(p);
    } catch (e) {
      console.error('Error fetching party:', e);
    }
  }, [partyId]);

  useEffect(() => {
    if (partyId) {
      pollRef.current = setInterval(() => fetchParty(), 2500);
      fetchParty();
      return () => clearInterval(pollRef.current);
    }
    return undefined;
  }, [partyId, fetchParty]);

  async function createParty() {
    if (!playerName || !partyTheme) {
      return;
    }
    try {
      const resp = await fetch(`${API_BASE_URL}/api/party`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: playerName, theme: partyTheme }) });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Server error creating party:', resp.status, errorText);
        return;
      }
      const data = await resp.json();
      setPartyId(data.id);
      setParty(data.party);
    } catch (e) {
      console.error('Error creating party:', e);
    }
  }

  async function joinParty() {
    if (!playerName || !partyId) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/party/${partyId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: playerName }) });
      const data = await resp.json();
      setParty(data.party);
    } catch (e) {
      console.error('Error joining party:', e);
    }
  }

  async function submitToParty(e) {
    e.preventDefault();
    if (!partyId || !promptText) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/party/${partyId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: playerName, prompt: promptText }) });
      if (!resp.ok) throw new Error('submit failed');
      await resp.json();
      setPromptText('');
      fetchParty();
    } catch (err) {
      console.error('Error submitting to party:', err);
    }
  }

  async function vote(submissionId) {
    if (!partyId || !submissionId) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/party/${partyId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, voterName: playerName }) });
      if (!resp.ok) throw new Error('vote failed');
      fetchParty();
    } catch (e) {
      console.error('Error voting:', e);
    }
  }

  return (
    <main className="layout">
      <div className="party-page-root">
        <h2>Party Mode</h2>
        <div className="party-card glass">
          <p className="small muted">One person creates a party with a theme. Others join and submit prompts. Submissions are judged by the theme and players can vote.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input placeholder="Your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            <input placeholder="Party theme (e.g. '80s sci-fi poster')" value={partyTheme} onChange={(e) => setPartyTheme(e.target.value)} />
            <button className="btn primary" onClick={createParty}>Create Party</button>
            <input placeholder="Party ID to join" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
            <button className="btn muted" onClick={joinParty}>Join</button>
          </div>

          {party && (
            <div style={{ marginBottom: 12 }}>
              <div><strong>Party:</strong> {party.id} — Theme: {party.theme}</div>
              <div className="small muted">Host: {party.host} — Participants: {party.participants.length}</div>
            </div>
          )}

          {party && (
            <form onSubmit={submitToParty}>
              <textarea placeholder="Enter your prompt to match the theme..." value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={4} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'inherit' }} />
              <div className="party-controls">
                <button type="submit" className="btn primary">Submit to Party</button>
                <button type="button" className="btn muted" onClick={() => setPromptText('')}>Clear</button>
              </div>
            </form>
          )}

          <div className="party-submissions">
            <h4>Submissions</h4>
            {!party && <div className="muted">No party selected.</div>}
            {party && party.submissions.length === 0 && <div className="muted">No submissions yet.</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {party && party.submissions.map((s) => (
                <li key={s.id} className={`party-submission-item ${s.name === playerName ? 'mine' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div><strong>{s.name}</strong> — <span className="small muted">{new Date(s.createdAt).toLocaleTimeString()}</span></div>
                    <div>
                      <button className="btn muted" onClick={() => vote(s.id)}>Vote ({s.votes || 0})</button>
                    </div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{s.prompt}</pre>
                  {s.result && <div className="party-submission-result"><strong>AI Response:</strong> {s.result}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
