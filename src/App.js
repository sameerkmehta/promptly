import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

function App() {
	const [xp, setXp] = useState(2847);
	const [streak, setStreak] = useState(7);
	const [progress, setProgress] = useState(62);
	const botRef = useRef(null);
	const ballRef = useRef(null);

	// course holes positions
	const holes = useMemo(() => [
		{ id: 1, left: '10%' },
		{ id: 2, left: '46%' },
		{ id: 3, left: '82%' },
	], []);

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

	const onStartDailyRound = useCallback(() => {
		const bot = botRef.current;
		const ball = ballRef.current;
		if (bot) {
			bot.classList.remove('swinging');
			// restart animation
			// eslint-disable-next-line no-unused-expressions
			bot.offsetWidth;
			bot.classList.add('swinging');
		}
		if (ball) {
			ball.classList.remove('flying');
			// eslint-disable-next-line no-unused-expressions
			ball.offsetWidth;
			ball.classList.add('flying');
		}

		let gained = 0;
		const t = setInterval(() => {
			gained += 3;
			setXp((v) => v + 3);
			if (gained >= 75) clearInterval(t);
		}, 45);
		setProgress((p) => Math.min(100, p + 6));
		setStreak((s) => s + 1);
	}, []);

	const onJoinChallenge = useCallback(() => {
		document.querySelectorAll('.community-bot').forEach((el, i) => {
			el.classList.remove('swinging');
			// eslint-disable-next-line no-unused-expressions
			el.offsetWidth;
			setTimeout(() => el.classList.add('swinging'), i * 120);
		});
	}, []);

	return (
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
					</div>
				</div>
			</header>

			<main className="layout">
				{/* Left: Daily Course Challenge */}
				<section className="panel panel-left glass">
					<div className="panel-header">
						<h2 className="display">Daily Course Challenge</h2>
						<p className="muted">Holes 1–3 • Cozy Clubhouse start</p>
					</div>
					<div className="map-wrap tilt">
						<div className="layer layer-back parallax" />
						<div className="layer layer-middle parallax" />
						<div className="layer layer-front parallax" />

						{/* fairway path */}
						<div className="fairway" />

						{/* clubhouse */}
						<div className="clubhouse">
							<div className="roof" />
							<div className="house" />
							<div className="door" />
							<div className="flag">🏁</div>
						</div>

						{/* holes */}
						{holes.map((h) => (
							<div className="hole" key={h.id} style={{ left: h.left }}>
								<div className="green">
									<div className="cup" />
									<div className="pin" />
									<div className="flag">⛳</div>
								</div>
								<div className="hole-num">{h.id}</div>
							</div>
						))}

						{/* bot + ball */}
						<div ref={botRef} className="bot swinging">
							<div className="bot-head" />
							<div className="bot-body" />
							<div className="bot-club" />
						</div>
						<div ref={ballRef} className="ball" />
					</div>

					<div className="actions">
						<button className="btn primary" onClick={onStartDailyRound}>🏌️ Start Daily Round</button>
					</div>
					<div className="progress">
						<div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
						<div className="progress-meta">Progress {progress}%</div>
					</div>
				</section>

				{/* Right: Community Driving Range */}
				<section className="panel panel-right glass">
					<div className="panel-header">
						<h2 className="display">Community Driving Range</h2>
						<p className="muted">Horizon targets • Tee line • Live challenges</p>
					</div>

					<div className="range-wrap tilt">
						<div className="horizon" />
						<div className="target-rings">
							<div className="ring outer" />
							<div className="ring mid" />
							<div className="ring inner" />
							<div className="bull">🎯</div>
						</div>

						<div className="tee-line" />

						<div className="stations">
							<div className="station">
								<div className="community-bot swinging">🤖</div>
								<div className="bot-label">Alpha</div>
							</div>
							<div className="station">
								<div className="community-bot">�</div>
								<div className="bot-label">Beta</div>
							</div>
							<div className="station">
								<div className="community-bot">🚀</div>
								<div className="bot-label">Gamma</div>
							</div>
						</div>

						<div className="flying-balls">
							<div className="fly a" />
							<div className="fly b" />
							<div className="fly c" />
						</div>
					</div>

					<div className="actions">
						<button className="btn secondary" onClick={onJoinChallenge}>🎯 Join Live Challenge</button>
					</div>
				</section>
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
					<div className="name">Astra</div>
					<div className="xp">2,930 XP</div>
					<div className="belt">Platinum</div>
				</div>
			</footer>
		</div>
	);
}

export default App;
