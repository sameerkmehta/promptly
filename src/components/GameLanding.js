import React, { useState } from 'react';
import '../App.css';
import './GameLanding.css';

// Mixed course (hardcoded): one image pixel-art target, one code challenge, one text challenge
const CHALLENGES = [
	{
		id: 1,
		hole: 1,
		title: 'Pixel Smiley',
		type: 'image',
		description: 'Recreate this 8x8 pixel art smiley using an image-generation prompt (pixel art style).',
		// pixel data: 8x8 grid of color names (null means transparent/background)
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
		// test cases: array of {input, expected}
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

function evaluatePrompt(challenge, prompt) {
	// Demo evaluation logic per challenge type.
	if (!prompt || !prompt.trim()) return { correct: false, reason: 'empty' };

	if (challenge.type === 'image') {
		// For image hole, accept if the prompt mentions 'pixel' and 'smiley' or 'yellow'
		const lower = prompt.toLowerCase();
		const found = challenge.keywords.some((k) => lower.includes(k.toLowerCase()));
		return { correct: found, reason: found ? 'matched' : 'no-keyword' };
	}

	if (challenge.type === 'text') {
		// For text hole (haiku), a simple check: three lines present.
		const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
		const isThreeLines = lines.length === 3;
		return { correct: isThreeLines, reason: isThreeLines ? '3-lines' : 'not-3-lines' };
	}

	if (challenge.type === 'code') {
		// For code challenge, attempt to run the user's code and check tests.
		// Expect the user to submit JS code that defines a function named `isPalindrome`.
		try {
		// Build a wrapper that executes the user code and returns the isPalindrome function if defined
		// NOTE: using the Function constructor here is intentionally limited and only for a local demo.
		// In production evaluate user code on a trusted server-side sandbox instead.
		/* eslint-disable-next-line no-new-func */
		const wrapper = new Function(`${prompt}\n; return (typeof isPalindrome === 'function') ? isPalindrome : null;`);
			const fn = wrapper();
			if (typeof fn !== 'function') {
				return { correct: false, reason: 'no-function' };
			}

			// run tests
			for (const t of challenge.tests) {
				let out;
				try {
					out = fn(t.input);
				} catch (err) {
					return { correct: false, reason: 'runtime-error', error: String(err) };
				}
				// normalize boolean-ish results
				if (Boolean(out) !== Boolean(t.expected)) {
					return { correct: false, reason: 'test-failed', failedTest: t };
				}
			}
			return { correct: true, reason: 'all-tests-pass' };
		} catch (err) {
			return { correct: false, reason: 'eval-error', error: String(err) };
		}
	}

	return { correct: false, reason: 'unknown-type' };
}

export default function GameLanding() {
		// Mixed course only (hardcoded)
		const [challengeIndex, setChallengeIndex] = useState(0);
		const [promptText, setPromptText] = useState('');
		// strokes represents the number of prompts (shots) the player has taken on this hole
		const [strokes, setStrokes] = useState(0);
	const [history, setHistory] = useState([]);
		const [status, setStatus] = useState(null); // null | 'success'
		const filtered = CHALLENGES; // only mixed course
		const challenge = filtered[challengeIndex % filtered.length];

		function submitPrompt(e) {
			e.preventDefault();
			if (!challenge) return;
			const nextStrokes = strokes + 1;
			const result = evaluatePrompt(challenge, promptText);
			const entry = { prompt: promptText, result };
			setHistory((h) => [entry, ...h]);
			setStrokes(nextStrokes);
			setPromptText('');

			// In golf-style scoring we allow unlimited strokes; success ends the hole and records strokes
			if (result.correct) {
				setStatus('success');
			} else {
				setStatus(null);
			}
		}

		function resetChallenge() {
			setPromptText('');
			setStrokes(0);
			setHistory([]);
			setStatus(null);
		}

	function nextHole() {
		setChallengeIndex((i) => i + 1);
		resetChallenge();
	}

		return (
			<div className="game-root">
				<aside className="game-sidebar">
					<h2>Prompt Golf — Mixed Course</h2>

					<div className="holes">
						{filtered.map((h, idx) => (
							<div
								key={h.id}
								className={idx === (challengeIndex % filtered.length) ? 'hole active' : 'hole'}
								onClick={() => {
									setChallengeIndex(idx);
									resetChallenge();
								}}
							>
								Hole {h.hole}: {h.title}
							</div>
						))}
					</div>
				</aside>

				<main className="game-main">
					<header className="challenge-header">
						<h3>
							Hole {challenge ? challenge.hole : '-'}: {challenge ? challenge.title : '—'}
						</h3>
						<p className="challenge-type">Type: {challenge?.type || '—'}</p>
					</header>

					<section className="challenge-card">
						<p className="challenge-desc">{challenge?.description}</p>

						<div className="prompt-meta">
							<div>Strokes: {strokes}</div>
							<div className="remaining">Par: {challenge?.par ?? '—'}</div>
						</div>

						{status === 'success' && (
							<div className="banner success">Hole completed — {strokes} stroke{strokes === 1 ? '' : 's'} ({strokes - (challenge?.par || 0) >= 0 ? '+' : ''}{strokes - (challenge?.par || 0)})</div>
						)}

						{/* Special UI for image challenge: render pixel art target */}
						{challenge?.type === 'image' && (
							<div className="pixel-target" style={{ marginBottom: 12 }}>
								<div style={{ display: 'grid', gridTemplateColumns: `repeat(${challenge.pixelData[0].length}, 18px)`, gap: 2 }}>
									{challenge.pixelData.flat().map((c, i) => (
										<div key={i} style={{ width: 18, height: 18, background: c || 'transparent', border: c ? '1px solid rgba(0,0,0,0.06)' : '1px dashed rgba(0,0,0,0.03)', boxSizing: 'border-box' }} />
									))}
								</div>
								<div className="small muted" style={{ marginTop: 8 }}>Target pixel art (8x8). Try to craft a pixel-art prompt that would reproduce this.</div>
							</div>
						)}

						{/* For code challenges show tests */}
						{challenge?.type === 'code' && (
							<div className="code-info" style={{ marginBottom: 12 }}>
								<div className="small">Your submission should define a function named <code>isPalindrome</code>. Tests:</div>
								<ul>
									{challenge.tests.map((t, i) => (
										<li key={i} className="small">{JSON.stringify(t.input)} → {String(t.expected)}</li>
									))}
								</ul>
								<div className="small muted">Submit JavaScript code that defines the function. (This runs in-browser for demo.)</div>
							</div>
						)}

						<form className="prompt-form" onSubmit={submitPrompt}>
							<textarea
								placeholder={challenge?.type === 'code' ? "Paste your JavaScript function code here..." : "Enter your prompt or response here..."}
								value={promptText}
								onChange={(e) => setPromptText(e.target.value)}
								rows={challenge?.type === 'code' ? 10 : 4}
								disabled={status === 'success'}
							/>

							<div className="prompt-actions">
								<button type="submit" className="primary" disabled={status === 'success'}>
									Submit
								</button>
								<button type="button" onClick={resetChallenge} className="muted">
									Reset
								</button>
								{status === 'success' && (
									<button type="button" onClick={nextHole} className="primary">
										Next Hole →
									</button>
								)}
							</div>
						</form>

						<aside className="attempts">
							<h4>Attempts</h4>
							{history.length === 0 && <div className="muted">No attempts yet.</div>}
							<ul>
								{history.map((h, i) => (
									<li key={i} className={h.result.correct ? 'correct' : 'incorrect'}>
										<strong>Submission:</strong>
										<pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{h.prompt}</pre>
										<div className="small">Result: {h.result.correct ? 'Passed' : 'Failed'} — {h.result.reason}
											{h.result.error ? ` — ${h.result.error}` : ''}
										</div>
									</li>
								))}
							</ul>
						</aside>
					</section>
				</main>
			</div>
		);
}
