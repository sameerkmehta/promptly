import React from 'react';
import './Party.css';
import { callGenAIBackend } from './genai';
// Define your meta prompt here (developer only)
const META_PROMPT = "Limit the output to no more than a few sentences.";

export default function Party() {
  // All useState hooks must be declared first
  // Retry GenAI for a specific submission index
  async function handleRetryGenAI(idx) {
    if (!submissions[idx]) return;
    const sub = submissions[idx];
    const fullPrompt = META_PROMPT ? `${META_PROMPT}\nUSER PROMPT: ${sub.text}` : sub.text;
    // Call GenAI backend again
    const aiText = await callGenAIBackend(fullPrompt);
    // Update backend with new genText
    await fetch(`/api/parties/code/${joinCode}/submissions/${sub.username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genText: aiText })
    });
    // Refetch party state
    const res = await fetch(`/api/parties/code/${joinCode}`);
    if (res.ok) {
      const data = await res.json();
      setParty(data);
      setSubmissions(data.submissions || []);
    }
  }
  const [hosting, setHosting] = React.useState(false);
  const [theme, setTheme] = React.useState('');
  const [gameStarted, setGameStarted] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [joined, setJoined] = React.useState(false);
  const [isHost, setIsHost] = React.useState(false);
  const [promptInput, setPromptInput] = React.useState('');
  const [genText, setGenText] = React.useState('');
  // submissions: { username, text, genText }
  const [submissions, setSubmissions] = React.useState([]);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [voting, setVoting] = React.useState(false);
  // Party state from backend
  const [party, setParty] = React.useState(null);
  // Poll for latest party state every 2 seconds while game is active
  React.useEffect(() => {
    if (!joinCode || !gameStarted) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/parties/code/${joinCode}`);
      const data = res.ok ? await res.json() : null;
      if (data) {
        setParty(data);
        setSubmissions(data.submissions || []);
        setVotes(data.votes ? (typeof data.votes.entries === 'function' ? Object.fromEntries(data.votes.entries()) : data.votes) : {});
        setWinner(data.winner || null);
        // If all members have submitted, start voting for everyone
        if (
          data.members &&
          data.submissions &&
          data.members.length > 0 &&
          data.submissions.length === data.members.length &&
          !voting
        ) {
          setVoting(true);
        }
        // If all users have voted (using voters array) and winner is not set, calculate and set winner
        if (
          data.members &&
          data.voters &&
          data.voters.length >= data.members.length &&
          !data.winner
        ) {
          let max = -1;
          let winners = [];
          Object.entries(data.votes || {}).forEach(([u, c]) => {
            if (c > max) {
              max = c;
              winners = [u];
            } else if (c === max) {
              winners.push(u);
            }
          });
          if (winners.length > 1) {
            await fetch(`/api/parties/code/${joinCode}/winner`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ winner: '__TIE__' })
            });
          } else if (winners.length === 1) {
            await fetch(`/api/parties/code/${joinCode}/winner`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ winner: winners[0] })
            });
          }
          // Do not setWinner here; let polling update it from backend
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [joinCode, gameStarted, voting]);
  // Fetch party state from backend whenever joinCode changes
  React.useEffect(() => {
    if (joinCode) {
      fetch(`/api/parties/code/${joinCode}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setParty(data);
            setSubmissions(data.submissions || []);
            setVotes(data.votes ? (typeof data.votes.entries === 'function' ? Object.fromEntries(data.votes.entries()) : data.votes) : {});
            setWinner(data.winner || null);
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  // When voting starts, trigger GenAI for all submissions without genText and update backend
  React.useEffect(() => {
    if (voting && party && submissions.length) {
      submissions.forEach(async (sub, idx) => {
        if (!sub.genText) {
          const fullPrompt = META_PROMPT ? `${META_PROMPT}\nUSER PROMPT: ${sub.text}` : sub.text;
          const aiText = await callGenAIBackend(fullPrompt);
          // Update backend with genText (correct endpoint)
          await fetch(`/api/parties/code/${joinCode}/submissions/${sub.username}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ genText: aiText })
          });
          // Refetch party state
          const res = await fetch(`/api/parties/code/${joinCode}`);
          if (res.ok) {
            const data = await res.json();
            setParty(data);
            setSubmissions(data.submissions || []);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voting]);
  const [votes, setVotes] = React.useState({}); // { username: count }
  const [hasVoted, setHasVoted] = React.useState(false);
  const [winner, setWinner] = React.useState(null);
  const [joinError, setJoinError] = React.useState('');
  // Simulate a global set of active games in memory (for demo only)

  // Helper to generate a random join code
  function generateJoinCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  async function handleHostGame(e) {
    e.preventDefault();
    if (!theme.trim()) return;
    const code = joinCode || generateJoinCode();
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: theme, joinCode: code, members: [username] })
      });
      if (!res.ok) {
        const data = await res.json();
        setJoinError(data.error || 'Failed to create party');
        return;
      }
      const data = await res.json();
      setParty(data);
      setJoinCode(data.joinCode);
      setGameStarted(true);
      setIsHost(true);
      setJoined(true);
      setTheme(data.name);
    } catch (err) {
      setJoinError('Failed to create party');
    }
  }

  async function handleJoinGame(e) {
    e.preventDefault();
    setJoinError('');
    if (!username.trim() || !joinCode.trim()) return;
    try {
      // Fetch party by joinCode
      const res = await fetch(`/api/parties/code/${joinCode}`);
      if (!res.ok) {
        setJoinError('No game found with that code.');
        return;
      }
      const data = await res.json();
      if (!data || !data.members) {
        setJoinError('Party data is missing or corrupted.');
        return;
      }
      // Add user to members if not already present
      if (!data.members.includes(username)) {
        const updateRes = await fetch(`/api/parties/code/${joinCode}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, members: [...data.members, username] })
        });
        if (!updateRes.ok) {
          setJoinError('Failed to join party');
          return;
        }
        const updated = await updateRes.json();
        if (!updated || !updated.members) {
          setJoinError('Party update failed or returned invalid data.');
          return;
        }
        setParty(updated);
        setTheme(updated.name);
        setJoined(true);
        setGameStarted(true);
        setIsHost(false);
      } else {
        setParty(data);
        setTheme(data.name);
        setJoined(true);
        setGameStarted(true);
        setIsHost(false);
      }
    } catch (err) {
      setJoinError('Failed to join party. Please check your connection or try again.');
    }
  }

  async function handleGenSubmit(e) {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    // Post submission to backend
    await fetch(`/api/parties/code/${joinCode}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, text: promptInput, genText: null })
    });
    // Refetch party state
    const res = await fetch(`/api/parties/code/${joinCode}`);
    if (res.ok) {
      const data = await res.json();
      setParty(data);
      setSubmissions(data.submissions || []);
    }
    setHasSubmitted(true);
    setIsGenerating(false);
    setPromptInput('');
    // If host, auto-enable voting after all have submitted (simulate for now)
    if (isHost) setVoting(true);
  }

  async function handleVote(idx) {
    if (hasVoted) return;
    const votedUser = submissions[idx].username;
    // Post vote to backend
    await fetch(`/api/parties/code/${joinCode}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votedUser, voter: username })
    });
    setHasVoted(true);
    // Refetch party state
    const res = await fetch(`/api/parties/code/${joinCode}`);
    if (res.ok) {
      const data = await res.json();
      setParty(data);
      setVotes(data.votes ? (typeof data.votes.entries === 'function' ? Object.fromEntries(data.votes.entries()) : data.votes) : {});
      // Winner calculation is now handled in polling effect
    }
  }

  // Show host/join options if game not started
  return (
    <div className="party-container">
      {/* Host visual indicator */}
      {isHost && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, background: '#ffe066', color: '#4a3000', border: '2px solid #f1c14f', borderRadius: 12, padding: '8px 18px', fontWeight: 900, fontSize: 18, boxShadow: '0 2px 8px #e0b03f', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span role="img" aria-label="Host" style={{ fontSize: 22 }}>⭐</span> Host
        </div>
      )}
      <nav className="cg-header" style={{ background: 'var(--cg-sky, #cfe8ff)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '12px 16px', boxShadow: '0 2px 0 #e2f1e8' }}>
        <div className="cg-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'start' }}>
          <img src="/logo192.png" alt="Promptly Logo" style={{ height: 36 }} />
          <span style={{ fontFamily: 'Grandstander, cursive', fontWeight: 900, fontSize: 24, color: 'var(--cg-tree, #2f7d32)', textShadow: '0 2px 0 #e2f1e8' }}>Promptly</span>
        </div>
        <div className="cg-nav" style={{ display: 'flex', gap: 10, justifySelf: 'center' }}></div>
        <div className="cg-auth" style={{ justifySelf: 'end', display: 'flex', gap: 10 }}>
          <a href="/" className="cg-party-btn" style={{ background: '#fff', color: 'var(--cg-tree, #2f7d32)', border: '2px solid var(--cg-edge, #c8ddcf)', padding: '8px 16px', borderRadius: 10, fontWeight: 900, boxShadow: '0 4px 0 #d6e6dc', textDecoration: 'none' }}>Main Page</a>
          <button className="cg-login-btn" style={{ background: 'linear-gradient(135deg, var(--cg-accent, #ffb703), #ffe066)', color: '#4a3000', border: '2px solid #f1c14f', padding: '8px 16px', borderRadius: 10, fontWeight: 900, boxShadow: '0 4px 0 #e0b03f', cursor: 'pointer' }}>Log In</button>
        </div>
      </nav>
      <main className="party-main">
        {/* Show error if join failed or party state is empty */}
        {joinError && (
          <div className="party-error" style={{ color: 'red', margin: 16, textAlign: 'center' }}>{joinError}</div>
        )}
        {!hosting && !gameStarted && (
          <div className="party-card">
            <form onSubmit={e => {
              e.preventDefault();
              if (!username.trim()) return;
              setHosting(true);
              setJoinCode(Math.random().toString(36).substring(2, 8).toUpperCase());
            }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <input
                id="host-username"
                className="party-input"
                type="text"
                placeholder="Host Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <button className="party-btn" type="submit">Host a Game</button>
            </form>
            <div style={{ margin: '24px 0', fontWeight: 700 }}>or</div>
            <form onSubmit={handleJoinGame} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <label htmlFor="join-username" className="party-label">Join a Game</label>
              <input
                id="join-username"
                className="party-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <input
                id="join-code"
                className="party-code-input"
                type="text"
                placeholder="Code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                required
              />
              <button className="party-btn" type="submit" style={{ minWidth: 180 }}>Join Game</button>
              {joinError && <div className="party-error">{joinError}</div>}
            </form>
          </div>
        )}
        {hosting && !gameStarted && (
          <form className="party-card" onSubmit={handleHostGame} style={{ gap: 16 }}>
            <label htmlFor="theme-input" className="party-label">Game Theme</label>
            <input
              id="theme-input"
              className="party-input"
              type="text"
              placeholder="e.g. Write a haiku about space"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              required
            />
            <div style={{ marginTop: 8, fontWeight: 700 }}>Host: {username}</div>
            <button className="party-btn" type="submit">Start Game</button>
          </form>
        )}
  {gameStarted && isHost && !hasSubmitted && (
          <div className="party-card" style={{ textAlign: 'center' }}>
            <h2>Game Started!</h2>
            <div className="party-theme">Theme: {theme}</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Host: {username}</div>
            <div className="party-join-code" style={{ margin: '16px 0' }}>Share this join code: {joinCode}</div>
            <div style={{ color: '#888', fontSize: 14 }}>Participants can join using the code above.</div>
            <form onSubmit={handleGenSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <label htmlFor="prompt-input-party" className="party-label">Your Prompt</label>
              <input
                id="prompt-input-party"
                className="party-input"
                type="text"
                placeholder="Enter your prompt for GenAI..."
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                required
                disabled={isGenerating}
              />
              <button className="party-btn" type="submit" disabled={isGenerating || hasSubmitted}>
                {isGenerating ? 'Generating...' : 'Submit'}
              </button>
            </form>
            {genText && (
              <div style={{ marginTop: 24, fontWeight: 700, color: '#2563eb' }}>Your GenAI Output:
                <pre className="party-submission-text">{genText}</pre>
              </div>
            )}
          </div>
        )}
  {gameStarted && !isHost && joined && !hasSubmitted && (
          <div className="party-card" style={{ textAlign: 'center' }}>
            <h2>Welcome, {username}!</h2>
            <div className="party-theme">Theme: {theme}</div>
            <form onSubmit={handleGenSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
              <label htmlFor="prompt-input-party2" className="party-label">Your Prompt</label>
              <input
                id="prompt-input-party2"
                className="party-input"
                type="text"
                placeholder="Enter your prompt for GenAI..."
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                required
                disabled={isGenerating}
              />
              <button className="party-btn" type="submit" disabled={isGenerating || hasSubmitted}>
                {isGenerating ? 'Generating...' : 'Submit'}
              </button>
            </form>
            {genText && (
              <div style={{ marginTop: 24, fontWeight: 700, color: '#2563eb' }}>Your GenAI Output:
                <pre className="party-submission-text">{genText}</pre>
              </div>
            )}
          </div>
        )}
        {/* Show all submissions to all joined users after they have submitted, before voting starts, using the same card style as voting */}
        {gameStarted && hasSubmitted && !voting && submissions.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <h2>All Submissions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginTop: 24 }}>
              {submissions.map((sub, idx) => (
                <div key={idx} className="party-submission" style={{ maxWidth: 520, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #e0e0e0', padding: 16 }}>
                  <div style={{ width: '100%', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textAlign: 'left', marginBottom: 8 }}>
                    <GenTextDisplay genText={sub.genText} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Voting phase: show all submissions and allow voting, using the same card style and GenTextDisplay as above */}
  {voting && submissions.length > 0 && !hasVoted && (
          <div style={{ textAlign: 'center', marginTop: 32, minHeight: 'unset', height: 'auto' }}>
            <h2>Vote for your favorite!</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, alignItems: 'center', marginTop: 32 }}>
              {submissions.map((sub, idx) => (
                <div key={idx} className="party-submission" style={{ maxWidth: 540, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', borderRadius: 18, boxShadow: '0 4px 16px #e0e0e0', padding: '24px 20px', minHeight: 90 }}>
                  <div style={{ width: '100%', wordBreak: 'break-word', whiteSpace: 'pre-wrap', textAlign: 'left', marginBottom: 12, fontSize: 18, background: '#f7faf7', borderRadius: 10, padding: '12px 16px', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    {sub.genText ? <GenTextDisplay genText={sub.genText} onRetry={() => handleRetryGenAI(idx)} /> : <span style={{ color: '#888', fontFamily: 'monospace', fontSize: 17 }}>Loading...</span>}
                  </div>
                  {sub.genText && (
                    <button className="party-btn" style={{ marginTop: 12, minWidth: 110, fontSize: 18, fontWeight: 700, borderRadius: 10, boxShadow: '0 2px 8px #f7e6b3', background: 'linear-gradient(135deg, #ffe066, #ffd700)' }} onClick={() => handleVote(idx)}>
                      Vote
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* After voting, show winner or voting in progress */}
        {hasVoted && !winner && (
          <div className="party-card" style={{ textAlign: 'center', marginTop: 32 }}>
            <h2>Voting in Progress...</h2>
            <div style={{ color: '#888', fontSize: 16 }}>Waiting for all players to vote.</div>
          </div>
        )}
        {winner && (
          <div className="party-card" style={{ textAlign: 'center', marginTop: 32 }}>
            {winner === '__TIE__' ? (
              <>
                <h2>It's a tie!</h2>
                <div style={{ color: '#888', fontSize: 16 }}>No single winner this round.</div>
              </>
            ) : (
              <>
                <h2>Winner!</h2>
                <div className="party-winner">{winner}</div>
                <div style={{ color: '#888', fontSize: 16 }}>Congratulations! +1 point</div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Helper component to show GenAI output or fallback error if stuck, with retry
function GenTextDisplay({ genText, onRetry }) {
  const [waiting, setWaiting] = React.useState(true);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    if (genText) {
      setWaiting(false);
      setError(false);
    } else {
      setWaiting(true);
      setError(false);
      const timer = setTimeout(() => {
        if (!genText) setError(true);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [genText]);
  if (error) return (
    <div style={{ color: '#d32f2f', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 8 }}>
      GenAI failed to generate output. Please try again or check your connection.<br />
      {onRetry && <button className="party-btn" style={{ marginTop: 8, background: '#fff', color: '#d32f2f', border: '1px solid #d32f2f' }} onClick={onRetry}>Retry</button>}
    </div>
  );
  if (waiting) return <pre className="party-submission-text">Loading...</pre>;
  return <pre className="party-submission-text">{genText}</pre>;
}