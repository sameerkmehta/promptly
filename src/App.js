import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import HomePage from './components/HomePage';
import GameLanding from './components/GameLanding';
import PartyPage from './components/PartyPage';

function App() {
	const [xp, setXp] = useState(2847);
	const [streak, setStreak] = useState(7);
	const [progress, setProgress] = useState(62);

	// mouse parallax for flavor
	useEffect(() => {
		const onMouseMove = (e) => {
			const rx = (e.clientX / window.innerWidth - 0.5) * 6;
			const ry = (e.clientY / window.innerHeight - 0.5) * 6;
			document.documentElement.style.setProperty('--tilt-x', `${ry}deg`);
			document.documentElement.style.setProperty('--tilt-y', `${-rx}deg`);
		};
		window.addEventListener('mousemove', onMouseMove);
		return () => window.removeEventListener('mousemove', onMouseMove);
	}, []);

	return (
		<Router>
			<div className="app-root">
				{/* Parallax sky + noise */}
				<div className="noise-overlay" />
				<div className="sky-gradients" />
				<header className="header glass">
					<div className="nav">
						<div className="brand">
							<div className="brand-icon">🏌️‍♂️</div>
							<div className="brand-text">
								<div className="title">Promptly</div>
								<div className="subtitle">Mini‑Golf Prompt Engineering</div>
							</div>
						</div>
						<div className="user-stats">
							<div className="stat-pill"><span>🏆</span>{xp.toLocaleString()} XP</div>
							<div className="stat-pill"><span>🎯</span>Streak {streak}</div>
							<div className="stat-pill"><span>🥋</span>Gold Belt</div>
							<Link to="/"><button className="btn secondary">Home</button></Link>
							<Link to="/game"><button className="btn secondary">Game Landing</button></Link>
							<Link to="/party"><button className="btn secondary">Party Mode</button></Link>
						</div>
					</div>
				</header>

				<main className="layout">
					<Routes>
						<Route path="/" element={<HomePage xp={xp} setXp={setXp} streak={streak} setStreak={setStreak} progress={progress} setProgress={setProgress} />} />
						<Route path="/game" element={<GameLanding />} />
						<Route path="/party" element={<PartyPage />} />
					</Routes>
				</main>

				{/* Footer mini leaderboard for context */}
				<footer className="footer glass">
					<div className="lb-item you">
						<div className="rank">#42</div>
						<div className="name">You</div>
						<div className="xp">{xp.toLocaleString()} XP</div>
						<div className="belt">Gold</div>
					</div>
					<div className="lb-item">
						<div className="rank">#41</div>
						<div className="name">Miko</div>
						<div className="xp">2,905 XP</div>
						<div className="belt">Gold</div>
					</div>
					<div className="lb-item">
						<div className="rank">#40</div>
						<div className="name">Zoe</div>
						<div className="xp">3,120 XP</div>
						<div className="belt">Gold</div>
					</div>
				</footer>
			</div>
		</Router>
	);
}

export default App;
