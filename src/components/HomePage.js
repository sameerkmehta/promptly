import React, { useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage({ xp, setXp, streak, setStreak, progress, setProgress }) {
	const botRef = useRef(null);
	const ballRef = useRef(null);
	const navigate = useNavigate();

	const holes = useMemo(() => [
		{ id: 1, left: '10%' },
		{ id: 2, left: '46%' },
		{ id: 3, left: '82%' },
	], []);


	const onStartDailyRound = useCallback(() => {
		setXp((v) => v + 75);
		setProgress((p) => Math.min(100, p + 6));
		setStreak((s) => s + 1);
		navigate('/game');
	}, [navigate, setXp, setProgress, setStreak]);

	const onJoinChallenge = useCallback(() => {
		navigate('/game');
	}, [navigate]);

	return (
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
	);
}

export default HomePage;
