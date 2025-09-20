import React, { useState, useEffect } from 'react';
import '../App.css';
import './GameLanding.css';

export default function GameLanding() {
		// Mixed course only (hardcoded)
		const [challengeIndex, setChallengeIndex] = useState(0);
		const [promptText, setPromptText] = useState('');
		// strokes represents the number of prompts (shots) the player has taken on this hole
		const [strokes, setStrokes] = useState(0);
	const [history, setHistory] = useState([]);
		const [status, setStatus] = useState(null); // null | 'success'

		// Image generation state
		const [generatedImage, setGeneratedImage] = useState(null);
		const [generatedContent, setGeneratedContent] = useState(null); // for text/code
		const [isLoading, setIsLoading] = useState(false);
		const [error, setError] = useState(null);
		
		// Challenges state
		const [challenges, setChallenges] = useState([]);
		const [challengesLoading, setChallengesLoading] = useState(true);
		const [challengesError, setChallengesError] = useState(null);
		
		const filtered = challenges; // only mixed course
		const challenge = filtered[challengeIndex % filtered.length];

		// Fetch challenges on component mount
		useEffect(() => {
			async function fetchChallenges() {
				try {
					setChallengesLoading(true);
					let response;
					try {
						console.log('Trying to fetch from /api/challenges...');
						response = await fetch('/api/challenges');
					} catch (err) {
						console.log('Relative API failed, trying localhost:3001...', err.message);
						// Fallback to localhost:3001 if relative endpoint fails
						response = await fetch('http://localhost:3001/api/challenges');
					}
					
					if (!response.ok) {
						const errorText = await response.text();
						console.error('Server response error:', response.status, response.statusText, errorText);
						throw new Error(`Failed to fetch challenges: ${response.status} ${response.statusText}`);
					}
					
					const responseText = await response.text();
					console.log('Raw server response:', responseText);
					
					let challengesData;
					try {
						challengesData = JSON.parse(responseText);
					} catch (parseError) {
						console.error('Failed to parse JSON response:', parseError);
						console.error('Response text was:', responseText);
						throw new Error(`Invalid JSON response from server: ${parseError.message}`);
					}
					
					console.log('Successfully loaded challenges:', challengesData);
					setChallenges(challengesData);
				} catch (err) {
					console.error('Error loading challenges:', err);
					setChallengesError(err.message);
				} finally {
					setChallengesLoading(false);
				}
			}
			fetchChallenges();
		}, []);

		async function backendGenerate(challenge, prompt) {
			// Calls POST /api/challenges/:id/generate
			const post = async (url) => {
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt })
				});
				if (!response.ok) {
					const txt = await response.text().catch(() => '<no body>');
					const err = new Error(`Generation failed (${response.status}): ${txt}`);
					err.status = response.status;
					throw err;
				}
				return response.json();
			};
			try {
				try {
					return await post(`/api/challenges/${challenge.id}/generate`);
				} catch (err) {
					return await post(`http://localhost:3001/api/challenges/${challenge.id}/generate`);
				}
			} catch (err) {
				console.error('Error generating:', err);
				throw err;
			}
		}

		async function backendEvaluate(challenge, generation) {
			// Calls POST /api/challenges/:id/evaluate
			const post = async (url) => {
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ generation })
				});
				if (!response.ok) {
					const txt = await response.text().catch(() => '<no body>');
					const err = new Error(`Evaluation failed (${response.status}): ${txt}`);
					err.status = response.status;
					throw err;
				}
				return response.json();
			};
			try {
				try {
					return await post(`/api/challenges/${challenge.id}/evaluate`);
				} catch (err) {
					return await post(`http://localhost:3001/api/challenges/${challenge.id}/evaluate`);
				}
			} catch (err) {
				console.error('Error evaluating generation:', err);
				throw err;
			}
		}

		async function submitPrompt(e) {
			e.preventDefault();
			if (!challenge) return;
			const nextStrokes = strokes + 1;
			setIsLoading(true);
			setError(null);
			setGeneratedImage(null);
			setGeneratedContent(null);
			try {
				// Step 1: Generate on backend
				const genResp = await backendGenerate(challenge, promptText);
				const generation = genResp?.generation;
				if (!generation) throw new Error('No generation returned');

				// Show generation first
				if (generation.type === 'image' && generation.imageUrl) {
					const url = generation.imageUrl.startsWith('http') ? generation.imageUrl : `http://localhost:3001${generation.imageUrl}`;
					setGeneratedImage(url);
				} else if ((generation.type === 'text' || generation.type === 'code') && generation.content) {
					setGeneratedContent(generation.content);
				}

				// Add a provisional attempt entry with just generation shown
				const entryBase = { prompt: promptText, generation, evaluation: null };
				setHistory((h) => [entryBase, ...h]);
				setStrokes(nextStrokes);
				setPromptText('');

				// Step 2: Evaluate the generated output on backend
				const evaluation = await backendEvaluate(challenge, generation);

				// Update latest entry with evaluation result
				setHistory((h) => {
					const [latest, ...rest] = h;
					return [{ ...latest, evaluation }, ...rest];
				});

				if (evaluation?.passed) {
					setStatus('success');
				} else {
					setStatus(null);
				}
			} catch (err) {
				console.error(err);
				setError(err.message || String(err));
			} finally {
				setIsLoading(false);
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

		// Show loading state while challenges are being fetched
		if (challengesLoading) {
			return (
				<div className="game-root">
					<div style={{ padding: '2rem', textAlign: 'center' }}>
						<h2>Loading Challenges...</h2>
					</div>
				</div>
			);
		}

		// Show error state if challenges failed to load
		if (challengesError) {
			return (
				<div className="game-root">
					<div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
						<h2>Error Loading Challenges</h2>
						<p>{challengesError}</p>
					</div>
				</div>
			);
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

						{/* Special UI for image challenge: render target image and generated image */}
						{challenge?.type === 'image' && (
							<div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 16 }}>
								<div className="pixel-target">
									<div className="small muted" style={{ marginBottom: 8 }}>Target image:</div>
									{challenge?.targetImage ? (
										<img
											src={challenge.targetImage.startsWith('http') ? challenge.targetImage : `http://localhost:3001${challenge.targetImage}`}
											alt="Target"
											style={{ maxWidth: 160, maxHeight: 160, border: '1px solid #ccc', background: '#fff' }}
										/>
									) : (
										<div className="small muted">No target image configured</div>
									)}
								</div>

								<div style={{ minWidth: 160, minHeight: 160 }}>
									{isLoading ? (
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, border: '1px solid #ccc', background: '#f5f5f5' }}>Generating...</div>
									) : error ? (
										<div style={{ color: 'red', padding: 12 }}>{error}</div>
									) : generatedImage ? (
										<div>
											<div className="small muted" style={{ marginBottom: 8 }}>Your generated image:</div>
											<img src={generatedImage} alt="Generated" style={{ maxWidth: 160, maxHeight: 160, border: '1px solid #ccc', background: '#fff' }} />
										</div>
									) : (
										<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, border: '1px solid #eee', background: '#fafafa', color: '#666' }}>Your generated image will appear here</div>
									)}
								</div>
							</div>
						)}

						{/* For text/code show latest generated content */}
						{(challenge?.type === 'text' || challenge?.type === 'code') && (generatedContent || isLoading || error) && (
							<div style={{ marginBottom: 16 }}>
								<div className="small muted" style={{ marginBottom: 8 }}>Your generated output:</div>
								{isLoading ? (
									<div style={{ padding: 12, border: '1px solid #ccc', background: '#f5f5f5' }}>Generating...</div>
								) : error ? (
									<div style={{ color: 'red', padding: 12 }}>{error}</div>
								) : (
									<pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: 12, border: '1px solid #eee', background: '#fafafa' }}>{generatedContent}</pre>
								)}
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
									<li key={i} className={h.evaluation?.passed ? 'correct' : 'incorrect'}>
										<strong>Submission:</strong>
										<pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{h.prompt}</pre>
										{h.generation?.type === 'image' && h.generation?.imageUrl && (
											<div style={{ margin: '8px 0' }}>
												<img src={h.generation.imageUrl.startsWith('http') ? h.generation.imageUrl : `http://localhost:3001${h.generation.imageUrl}`} alt="Generated" style={{ maxWidth: 120, maxHeight: 120, border: '1px solid #ccc', background: '#fff' }} />
											</div>
										)}
										{h.generation?.type !== 'image' && h.generation?.content && (
											<pre style={{ whiteSpace: 'pre-wrap', margin: '6px 0', padding: 8, background: '#fafafa', border: '1px solid #eee' }}>{h.generation.content}</pre>
										)}
										{h.evaluation ? (
											<div className="small">Result: {h.evaluation.passed ? 'Passed' : 'Failed'} — score: {typeof h.evaluation.score === 'number' ? h.evaluation.score.toFixed(2) : 'n/a'}</div>
										) : (
											<div className="small muted">Awaiting evaluation…</div>
										)}
									</li>
								))}
							</ul>
						</aside>
					</section>
				</main>
			</div>
		);
}
