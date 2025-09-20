import React, { useState, useEffect } from 'react';
import '../App.css';
import './GameLanding.css';
import Logo from '../logo.svg';

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

				// Step 2: Evaluate the generated output on backend
				const evaluation = await backendEvaluate(challenge, generation);

				// Create complete attempt entry
				const completeAttempt = { prompt: promptText, generation, evaluation };
				
				// Check for successful score (≥80%)
				const similarity = evaluation?.details?.similarity || 0;
				const scorePercent = similarity * 100;
				const isSuccess = scorePercent >= 80;

				if (isSuccess) {
					// Don't slide down, just update state for confetti
					setHistory((h) => [completeAttempt, ...h]);
					setStrokes(nextStrokes);
					setStatus('success');
					
					// Trigger confetti
					const similarityDisplay = document.querySelector('.cg-similarity-display');
					if (similarityDisplay && !similarityDisplay.querySelector('.cg-confetti')) {
						const confetti = document.createElement('div');
						confetti.className = 'cg-confetti';
						similarityDisplay.appendChild(confetti);
						
						// Remove confetti after animation
						setTimeout(() => {
							confetti.remove();
						}, 3000);
					}
				} else {
					// Normal slide down animation
					setTimeout(() => {
						setHistory((h) => [completeAttempt, ...h]);
						setStrokes(nextStrokes);
						setPromptText('');
						setGeneratedImage(null);
						setGeneratedContent(null);
						
						if (evaluation?.passed) {
							setStatus('success');
						} else {
							setStatus(null);
						}
					}, 1200);

					// Add sliding class for animation
					const currentRow = document.querySelector('.cg-current');
					if (currentRow) {
						currentRow.classList.add('cg-sliding');
					}
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

	function selectHole(index) {
		setChallengeIndex(index);
		resetChallenge();
	}

	function getScoreColor(similarity) {
		const score = similarity * 100;
		if (score >= 80) return 'green';
		if (score >= 40) return 'orange';
		return 'red';
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
			<div className="cg-root">
				{/* Header: logo left, hole nav center, login right */}
				<header className="cg-header">
					<div className="cg-brand">
						<img src={Logo} alt="Promptly" className="cg-logo" />
						<h1 className="cg-title">Promptly</h1>
					</div>
					<nav className="cg-nav">
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(0)}>hole1</button>
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(1)}>hole2</button>
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(2)}>hole3</button>
					</nav>
					<div className="cg-auth">
						<button type="button" className="cg-login-btn">Log In</button>
					</div>
				</header>

				{/* Body: sidebar + full-width content */}
				<div className="cg-body">
					{/* Left sidebar: Score + Target */}
					<aside className="cg-sidebar">
						<div className="cg-score-card">
							<div className="cg-score-title">Score</div>
							<div className="cg-score-row"><span>Strokes</span><span>{strokes}</span></div>
							<div className="cg-score-row"><span>Par</span><span>{challenge?.par ?? '—'}</span></div>
							<div className="cg-score-row"><span>Status</span><span>{status === 'success' ? 'Hole Complete' : 'In Play'}</span></div>
						</div>

						{/* Target box */}
						<div className="cg-target-card">
							<div className="cg-score-title">Target</div>
							<div className="cg-target-media">
								{challenge?.targetImage ? (
									<img
										src={`http://localhost:3001${challenge.targetImage}`}
										alt="Target"
										className="cg-target-image"
									/>
								) : (
									<div className="cg-target-placeholder">Image placeholder</div>
								)}
							</div>
						</div>


					</aside>

					{/* Main content: Instructions + Prompt/Output flow */}
					<main className="cg-content">
						{/* Full-width instructions */}
						<section className="cg-instructions">
							<h2>Instructions</h2>
							<p>{challenge?.description}</p>
						</section>

						{/* Prompt/Output table */}
						<div className="cg-attempts-table">
							{/* Current attempt row */}
							<div className="cg-attempt-row cg-current">
								<div className="cg-attempt-prompt">
									<form className="cg-form" onSubmit={submitPrompt}>
										<textarea
											id="prompt-input"
											className="cg-textarea"
											placeholder={challenge?.type === 'code' ? 'Paste your JavaScript function code here...' : 'Enter your prompt here...'}
											value={promptText}
											onChange={(e) => setPromptText(e.target.value)}
											rows={challenge?.type === 'code' ? 6 : 4}
											disabled={status === 'success'}
										/>
										<div className="cg-actions">
											<button type="submit" className="cg-btn primary" disabled={isLoading || status === 'success'}>
												{isLoading ? 'Generating…' : 'Submit'}
											</button>
											<button type="button" className="cg-btn" onClick={resetChallenge} disabled={isLoading}>Reset</button>
										</div>
									</form>
								</div>
								<div className="cg-attempt-output">
									{isLoading ? (
										<div className="cg-loading-animation">
											<div className="cg-golf-cart">
												<div className="cg-cart-body">
													<div className="cg-cart-roof"></div>
													<div className="cg-cart-windshield"></div>
													<div className="cg-robot">
														<div className="cg-robot-antenna"></div>
														<div className="cg-robot-head"></div>
														<div className="cg-robot-body"></div>
													</div>
												</div>
												<div className="cg-cart-wheel cg-wheel-front"></div>
												<div className="cg-cart-wheel cg-wheel-back"></div>
												<div className="cg-exhaust">
													<div className="cg-exhaust-puff cg-puff-1"></div>
													<div className="cg-exhaust-puff cg-puff-2"></div>
													<div className="cg-exhaust-puff cg-puff-3"></div>
												</div>
											</div>
											<div className="cg-loading-text">Generating your image...</div>
										</div>
									) : (generatedImage || generatedContent || error) ? (
										<div className="cg-output">
											<div className="cg-output-content">
												{generatedImage && (
													<div className="cg-output-block">
														<img src={generatedImage} alt="Generated" className="cg-image" />
													</div>
												)}
												{generatedContent && (
													<div className="cg-output-block">
														<pre className="cg-pre">{generatedContent}</pre>
													</div>
												)}
												{error && <div className="cg-banner error">{error}</div>}
												{status === 'success' && (
													<div className="cg-banner success">Hole completed!</div>
												)}
											</div>
											{history.length > 0 && history[0].evaluation?.details?.similarity !== undefined && (
												<div className="cg-similarity-score">
													<div className="cg-score-circle" key={history[0].evaluation.details.similarity}>
														<div className={`cg-score-ring cg-score-${getScoreColor(history[0].evaluation.details.similarity)}`}>
															<div className="cg-score-number">
																{Math.round(history[0].evaluation.details.similarity * 100)}%
															</div>
														</div>
													</div>
												</div>
											)}
										</div>
									) : (
										<div className="cg-output-placeholder">Intended output will be generated here</div>
									)}
								</div>
							</div>

							{/* Previous attempts */}
							{history.map((attempt, i) => (
								<div key={i} className="cg-attempt-row">
									<div className="cg-attempt-prompt">
										<div className="cg-attempt-text">{attempt.prompt}</div>
									</div>
									<div className="cg-attempt-output">
										<div className="cg-output-content">
											{attempt.generation?.imageUrl && (
												<img src={attempt.generation.imageUrl} alt="Generated" className="cg-image" />
											)}
											{attempt.generation?.content && (
												<pre className="cg-pre">{attempt.generation.content}</pre>
											)}
										</div>
										{attempt.evaluation?.details?.similarity !== undefined && (
											<div className="cg-similarity-score">
												<div className="cg-score-circle">
													<div className={`cg-score-ring cg-score-${getScoreColor(attempt.evaluation.details.similarity)}`}>
														<div className="cg-score-number">
															{Math.round(attempt.evaluation.details.similarity * 100)}%
														</div>
													</div>
												</div>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</main>
				</div>
			</div>
		);
}
