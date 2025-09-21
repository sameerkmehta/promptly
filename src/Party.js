import React from 'react';
import './Party.css';
import { callGenAIBackend } from './genai';
// Define your meta prompt here (developer only)
const META_PROMPT = "Limit the output to no more than a few sentences.";

export default function Party() {
  // metaPrompt is now fixed in code
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
  // When voting starts, trigger GenAI for all submissions without genText
  React.useEffect(() => {
    if (voting) {
      submissions.forEach(async (sub, idx) => {
        if (!sub.genText) {
          const fullPrompt = META_PROMPT ? `${META_PROMPT}\nUSER PROMPT: ${sub.text}` : sub.text;
          const aiText = await callGenAIBackend(fullPrompt);
          setSubmissions((subs) => subs.map((s, i) => i === idx ? { ...s, genText: aiText } : s));
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
  const activeGames = React.useRef({});

  function handleHostGame(e) {
    e.preventDefault();
    if (theme.trim()) {
      setGameStarted(true);
      setIsHost(true);
      // Register this game in the in-memory activeGames
      activeGames.current[joinCode] = { theme };
    }
  }

  function handleJoinGame(e) {
    e.preventDefault();
    setJoinError('');
    if (username.trim() && joinCode.trim()) {
      // Only allow joining if a host has started a game with this code
      if (activeGames.current[joinCode]) {
        setJoined(true);
        setGameStarted(true);
        setIsHost(false);
        setTheme(activeGames.current[joinCode].theme);
      } else {
        setJoinError('No game found with that code.');
      }
    }
  }

  async function handleGenSubmit(e) {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    // Save the user's prompt, but do not call GenAI yet
    setSubmissions((subs) => [...subs, { username, text: promptInput, genText: null }]);
    setHasSubmitted(true);
    setIsGenerating(false);
    setPromptInput('');
    // If host, auto-enable voting after all have submitted (simulate for now)
    if (isHost) setVoting(true);
  }

  async function handleVote(idx) {
    if (hasVoted) return;
    // If the GenAI output for this submission is not present, fetch it now
    const sub = submissions[idx];
    if (!sub.genText) {
      const aiText = await callGenAIBackend(sub.text);
      setSubmissions((subs) => subs.map((s, i) => i === idx ? { ...s, genText: aiText } : s));
    }
    const votedUser = submissions[idx].username;
    setVotes((v) => ({ ...v, [votedUser]: (v[votedUser] || 0) + 1 }));
    setHasVoted(true);
    // After voting, determine winner (simulate)
    setTimeout(() => {
      let max = -1, win = null;
      Object.entries({ ...votes, [votedUser]: (votes[votedUser] || 0) + 1 }).forEach(([u, c]) => {
        if (c > max) { max = c; win = u; }
      });
      setWinner(win);
    }, 1000);
  }

  // Show host/join options if game not started
  return (
    <div className="party-container">
      <header className="party-header">
        <h1 className="party-title">Party Mode</h1>
      </header>
      <main className="party-main">
        {!hosting && !gameStarted && (
          <div className="party-card">
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
            <div style={{ margin: '24px 0', fontWeight: 700 }}>or</div>
            <button className="party-btn" onClick={() => {
              setHosting(true);
              setJoinCode(Math.random().toString(36).substring(2, 8).toUpperCase());
            }}>
              Host a Game
            </button>
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
            <button className="party-btn" type="submit">Start Game</button>
          </form>
        )}
        {gameStarted && isHost && !hasSubmitted && (
          <div className="party-card" style={{ textAlign: 'center' }}>
            <h2>Game Started!</h2>
            <div className="party-theme">Theme: {theme}</div>
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
        {/* Voting phase: show all submissions and allow voting */}
        {voting && submissions.length > 0 && !hasVoted && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <h2>Vote for your favorite!</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', marginTop: 24 }}>
              {submissions.map((sub, idx) => (
                <div key={idx} className="party-submission" style={{ maxWidth: 520, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <pre className="party-submission-text" style={{ maxWidth: 480, width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'left', margin: '0 auto' }}>{sub.genText ? sub.genText : 'Loading...'}</pre>
                  {sub.username !== username && (
                    <button className="party-btn" style={{ marginTop: 8 }} onClick={() => handleVote(idx)}>
                      Vote
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* After voting, show winner */}
        {winner && (
          <div className="party-card" style={{ textAlign: 'center', marginTop: 32 }}>
            <h2>Winner!</h2>
            <div className="party-winner">{winner}</div>
            <div style={{ color: '#888', fontSize: 16 }}>Congratulations! +1 point</div>
          </div>
        )}
      </main>
    </div>
  );
}