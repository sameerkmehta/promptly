import React, { useState, useEffect, useRef } from 'react';
import './Sandbox.css';
import { evaluatePrompt } from './GameLanding';

export default function Sandbox() {
  const [mode, setMode] = useState('local'); // 'local' or 'party'

  // Local sandbox state
  const [promptText, setPromptText] = useState('');
  const [history, setHistory] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  // Party mode state
  const [partyId, setPartyId] = useState('');
  const [partyTheme, setPartyTheme] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [party, setParty] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (mode === 'party' && partyId) {
      // start polling party state
      pollRef.current = setInterval(() => fetchParty(), 2500);
      fetchParty();
      return () => clearInterval(pollRef.current);
    }
    return undefined;
  }, [mode, partyId]);

  async function fetchParty() {
    if (!partyId) return;
    try {
      const resp = await fetch(`/api/party/${partyId}`);
      if (!resp.ok) return;
      const { party: p } = await resp.json();
      setParty(p);
    } catch (e) {
      // ignore
    }
  }

  async function createParty() {
    if (!playerName || !partyTheme) return;
    const resp = await fetch('/api/party', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: playerName, theme: partyTheme }) });
    const data = await resp.json();
    setPartyId(data.id);
    setParty(data.party);
    setMode('party');
  }

  async function joinParty() {
    if (!playerName || !partyId) return;
    const resp = await fetch(`/api/party/${partyId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: playerName }) });
    const data = await resp.json();
    setParty(data.party);
    setMode('party');
  }

  async function submitLocal(e) {
    e.preventDefault();
    if (!promptText || !promptText.trim()) return;
    const pseudoChallenge = (() => {
      const t = promptText.toLowerCase();
      if (t.includes('function') || t.includes('ispalindrome') || t.includes('=>')) return { type: 'code', tests: [] };
      const lines = promptText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) return { type: 'text' };
      return { type: 'image', keywords: ['pixel', 'smiley', 'yellow'] };
    })();
    const res = evaluatePrompt(pseudoChallenge, promptText);
    const entry = { prompt: promptText, result: res };
    setHistory((h) => [entry, ...h]);
    setLastResult(res);
    setPromptText('');
  }

  async function submitToParty(e) {
    e.preventDefault();
    if (!partyId || !promptText) return;
    try {
      const resp = await fetch(`/api/party/${partyId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: playerName, prompt: promptText }) });
      if (!resp.ok) throw new Error('submit failed');
      const data = await resp.json();
      setPromptText('');
      // refresh party state
      fetchParty();
    } catch (err) {
      // show error locally
      setHistory((h) => [{ prompt: promptText, result: { reason: 'submit-error', error: String(err) } }, ...h]);
    }
  }

  async function vote(submissionId) {
    if (!partyId || !submissionId) return;
    try {
      const resp = await fetch(`/api/party/${partyId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId }) });
      if (!resp.ok) throw new Error('vote failed');
      fetchParty();
    } catch (e) {
      // ignore
    }
  }

  function clearHistory() {
    setHistory([]);
    setLastResult(null);
  }

  return (
    <div className="sandbox-root">
      <h2>Prompt Sandbox / Party Mode</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <button className={`muted ${mode === 'local' ? 'mode-active' : ''}`} onClick={() => setMode('local')}>Local Sandbox</button>
        <button className={`muted ${mode === 'party' ? 'mode-active' : ''}`} onClick={() => setMode('party')}>Party Mode</button>
      </div>

      {mode === 'local' && (
        <div className="sandbox-card">
          <p className="small muted">Try prompts locally. This uses the same lightweight evaluator as the game.</p>
          <form onSubmit={submitLocal}>
            <textarea placeholder="Type a prompt, paste code, or write a short text (haiku)..." value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={6} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'inherit' }} />
            <div className="sandbox-controls">
              <button type="submit" className="primary">Run</button>
              <button type="button" className="muted" onClick={() => setPromptText('')}>Clear</button>
              <button type="button" className="muted" onClick={clearHistory}>Clear History</button>
            </div>
          </form>

          {lastResult && (
            <div className="sandbox-result">Last result: {String(lastResult.correct)} ({lastResult.reason})</div>
          )}

          <div className="sandbox-history">
            <h4>History</h4>
            {history.length === 0 && <div className="muted">No runs yet.</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {history.map((h, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{h.prompt}</pre>
                  <div className="small muted">Result: {h.result.reason}  Passed: {String(h.result.correct)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {mode === 'party' && (
        <div className="sandbox-card">
          <h3>Party Mode — Theme-based prompting</h3>
          <p className="small muted">One person creates a party with a theme. Others join and submit prompts. Submissions are judged by the theme and players can vote.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input placeholder="Your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
            <input placeholder="Party theme (e.g. '80s sci-fi poster')" value={partyTheme} onChange={(e) => setPartyTheme(e.target.value)} />
            <button className="primary" onClick={createParty}>Create Party</button>
            <input placeholder="Party ID to join" value={partyId} onChange={(e) => setPartyId(e.target.value)} />
            <button className="muted" onClick={joinParty}>Join</button>
          </div>

          {party && (
            <div style={{ marginBottom: 12 }}>
              <div><strong>Party:</strong> {party.id} — Theme: {party.theme}</div>
              <div className="small muted">Host: {party.host} — Participants: {party.participants.length}</div>
            </div>
          )}

          <form onSubmit={submitToParty}>
            <textarea placeholder="Enter your prompt to match the theme..." value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={4} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'inherit' }} />
            <div className="sandbox-controls">
              <button type="submit" className="primary">Submit to Party</button>
              <button type="button" className="muted" onClick={() => setPromptText('')}>Clear</button>
            </div>
          </form>

          <div style={{ marginTop: 12 }}>
            <h4>Submissions</h4>
            {!party && <div className="muted">No party selected.</div>}
            {party && party.submissions.length === 0 && <div className="muted">No submissions yet.</div>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {party && party.submissions.map((s) => (
                <li key={s.id} style={{ marginBottom: 12, background: '#fafafa', padding: 8, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div><strong>{s.name}</strong> — <span className="small muted">{new Date(s.createdAt).toLocaleTimeString()}</span></div>
                    <div>
                      <button className="muted" onClick={() => vote(s.id)}>Vote ({s.votes || 0})</button>
                    </div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{s.prompt}</pre>
                  <div className="small muted">Result: {s.result ? s.result : 'Generating...'}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
