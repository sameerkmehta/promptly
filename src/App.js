import './App.css';
import React, { useState, useEffect } from 'react';
import GameLanding from './components/GameLanding';
import PartyPage from './components/PartyPage';

function App() {
  const [page, setPage] = useState(() => (window.location.hash === '#party' ? 'party' : 'home'));

  useEffect(() => {
    const onHash = () => setPage(window.location.hash === '#party' ? 'party' : 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="App">
      <header style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Promptly</h1>
        <nav style={{ marginLeft: 12 }}>
          <button onClick={() => { window.location.hash = ''; }} className="muted" style={{ marginRight: 8 }}>Home</button>
          <button onClick={() => { window.location.hash = '#party'; }} className="muted">Party</button>
        </nav>
      </header>

      <main>
        {page === 'home' && <GameLanding />}
        {page === 'party' && <PartyPage />}
      </main>
    </div>
  );
}

export default App;
