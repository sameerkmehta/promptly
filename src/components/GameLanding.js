
import React, { useState } from 'react';
import './GameLanding.css';

// Example challenge data (replace with your actual data source as needed)
const CHALLENGES = [
	{
		id: 1,
		hole: 1,
		title: 'Pixel Smiley',
		type: 'image',
		description: 'Recreate this 8x8 pixel art smiley using an image-generation prompt (pixel art style).',
		pixelData: [
			[null, null, 'yellow', 'yellow', 'yellow', 'yellow', null, null],
			[null, 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
			['yellow', 'yellow', 'black', 'yellow', 'yellow', 'black', 'yellow', 'yellow'],
			['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
			['yellow', 'yellow', 'black', 'yellow', 'yellow', 'black', 'yellow', 'yellow'],
			['yellow', 'yellow', 'yellow', 'black', 'black', 'yellow', 'yellow', 'yellow'],
			[null, 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow', null],
			[null, null, 'yellow', 'yellow', 'yellow', 'yellow', null, null],
		],
		keywords: ['pixel', 'pixel art', '8-bit', 'smiley', 'yellow'],
		par: 3,
	},
	{
		id: 2,
		hole: 2,
		title: 'Palindrome Function (JS)',
		type: 'code',
		description:
			'Submit a JavaScript function named `isPalindrome` that returns true for palindromes and false otherwise. Your function will be run against test cases.',
		tests: [
			{ input: 'racecar', expected: true },
			{ input: 'madam', expected: true },
			{ input: 'step on no pets', expected: true },
			{ input: 'hello', expected: false },
			{ input: '', expected: true },
		],
		par: 2,
	},
	{
		id: 3,
		hole: 3,
		title: 'Haiku about Coffee',
		type: 'text',
		description: 'Produce a 3-line haiku (5/7/5) about coffee.',
		keywords: ['haiku', 'coffee'],
		par: 3,
	},
];

// Dummy evaluation function (replace with your actual logic)
function evaluatePrompt(challenge, prompt) {
	if (!prompt) return { correct: false, reason: 'Empty prompt' };
	// For demo, always return correct for any non-empty prompt
	return { correct: true, reason: 'Accepted' };
}

export default function GameLanding() {
	const [challengeIndex, setChallengeIndex] = useState(0);
	const [promptText, setPromptText] = useState('');
	const [history, setHistory] = useState([]);
	const [status, setStatus] = useState(null);
	const [strokes, setStrokes] = useState(0);
	const [generatedImage, setGeneratedImage] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const challenge = CHALLENGES[challengeIndex];

	async function submitPrompt(e) {
		e.preventDefault();
		if (!challenge) return;
		const nextStrokes = strokes + 1;
		const result = evaluatePrompt(challenge, promptText);
		const entry = { prompt: promptText, result };
		setHistory((h) => [entry, ...h]);
		setStrokes(nextStrokes);
		setPromptText('');

		// If this is the image hole, simulate image generation
		if (challenge.type === 'image') {
			setIsLoading(true);
			setTimeout(() => {
				setGeneratedImage('https://placehold.co/256x256/yellow/black?text=Smiley');
				setIsLoading(false);
			}, 1000);
		}

		if (result.correct) {
			setStatus('success');
		} else {
			setStatus('failed');
		}
	}

	function resetChallenge() {
		setPromptText('');
		setStrokes(0);
		setHistory([]);
		setStatus(null);
		setGeneratedImage(null);
		setError(null);
		setIsLoading(false);
	}

	function nextHole() {
		if (challengeIndex < CHALLENGES.length - 1) {
			setChallengeIndex((i) => i + 1);
			resetChallenge();
		}
	}

	return (
		<main className="game-root">
			<aside className="game-sidebar glass" aria-label="Sidebar">
				<div className="modes">
					<button className="mode active">Mixed Course</button>
				</div>
				<nav className="holes" aria-label="Challenge Holes">
					{CHALLENGES.map((c, i) => (
						<button
							key={c.id}
							className={`hole${i === challengeIndex ? ' active' : ''}`}
							onClick={() => { setChallengeIndex(i); resetChallenge(); }}
							aria-current={i === challengeIndex ? 'page' : undefined}
						>
							Hole {c.hole}: {c.title}
						</button>
					))}
				</nav>
			</aside>
			<section className="game-main" aria-label="Main Content">
				<header className="main-header">
					<h1>Prompt Golf — Mixed Course</h1>
				</header>
				<article className="challenge-header">
					<h2>Hole {challenge.hole}: {challenge.title}</h2>
					<div className="challenge-type">({challenge.type} challenge)</div>
				</article>
				<section className="challenge-card glass" aria-label="Challenge Card">
					<div className="challenge-details">
						<p className="challenge-desc">{challenge.description}</p>
						<form onSubmit={submitPrompt} className="prompt-form">
							<textarea
								placeholder="Enter your prompt..."
								value={promptText}
								onChange={(e) => setPromptText(e.target.value)}
								rows={6}
							/>
							<div className="prompt-actions">
								<button type="submit" className="primary">Submit</button>
								<button type="button" className="muted" onClick={() => setPromptText('')}>Clear</button>
								{status === 'success' && challengeIndex < CHALLENGES.length - 1 && (
									<button type="button" className="primary" onClick={nextHole}>Next Hole</button>
								)}
							</div>
						</form>
						{status === 'success' && (
							<div className="banner success">✅ Correct! You got it in {strokes} strokes (Par {challenge.par})</div>
						)}
						{status === 'failed' && (
							<div className="banner failed">❌ Incorrect. Try again!</div>
						)}
						{generatedImage && challenge.type === 'image' && (
							<div style={{ marginTop: 20 }}>
								<h4>Generated Image:</h4>
								{isLoading ? (
									<div>Generating image...</div>
								) : error ? (
									<div style={{ color: 'red' }}>Error: {error}</div>
								) : (
									<img src={generatedImage} alt="Generated" style={{ maxWidth: '100%', height: 'auto' }} />
								)}
							</div>
						)}
						<div className="attempts glass">
							<h4>History</h4>
							{history.length === 0 && <div className="muted">No attempts yet.</div>}
							<ul>
								{history.map((h, i) => (
									<li key={i} className={h.result.correct ? 'correct' : 'incorrect'}>
										<pre className="small">{h.prompt}</pre>
										<div className="small">Result: {h.result.reason}  Passed: {String(h.result.correct)}</div>
									</li>
								))}
							</ul>
						</div>
					</div>
					{challenge.type === 'image' && (
						<div className="image-target">
							<h4>Target Image:</h4>
							<div className="pixel-grid">
								{challenge.pixelData.map((row, rowIndex) => (
									<div key={rowIndex} className="pixel-row">
										{row.map((color, colIndex) => (
											<div key={colIndex} className="pixel" style={{ backgroundColor: color || 'transparent' }} />
										))}
									</div>
								))}
							</div>
						</div>
					)}
				</section>
			</section>
		</main>
	);
}
