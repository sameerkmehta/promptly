import React, { useState, useEffect } from 'react';
import '../App.css';
import './GameLanding.css';
import Logo from '../robot_full_transparent.svg';

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
		const [generatedMeta, setGeneratedMeta] = useState(null);
		const [isLoading, setIsLoading] = useState(false);
		const [error, setError] = useState(null);
		const [currentEvaluation, setCurrentEvaluation] = useState(null);
		const [processingPrompt, setProcessingPrompt] = useState('');
		
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
			const maxStrokes = Math.ceil(2.5 * (challenge.par || 3));
			if (strokes >= maxStrokes) {
				setStatus('ended');
				setError('Out of strokes. Hole ended.');
				return;
			}
			const nextStrokes = strokes + 1;
			const currentPrompt = promptText;
			setIsLoading(true);
			setError(null);
			setGeneratedImage(null);
			setGeneratedContent(null);
			setCurrentEvaluation(null);
			setPromptText(''); // Clear prompt immediately for next input
			setProcessingPrompt(currentPrompt); // Store current prompt for display
			try {
				// Step 1: Generate on backend
				const genResp = await backendGenerate(challenge, currentPrompt);
				const generation = genResp?.generation;
				if (!generation) throw new Error('No generation returned');

				// Show generation first
				if (generation.type === 'image' && generation.imageUrl) {
					const url = generation.imageUrl.startsWith('http') ? generation.imageUrl : `http://localhost:3001${generation.imageUrl}`;
					setGeneratedImage(url);
					setGeneratedMeta(generation.meta || null);
				} else if ((generation.type === 'text' || generation.type === 'code') && generation.content) {
					setGeneratedContent(generation.content);
					setGeneratedMeta(generation.meta || null);
				}

				// Step 2: Evaluate the generated output on backend
				const evaluation = await backendEvaluate(challenge, generation);

				// Update current evaluation immediately to show correct score
				setCurrentEvaluation(evaluation);

				// Create complete attempt entry
				const completeAttempt = { prompt: currentPrompt, generation, evaluation };
				
				// Check for successful score (≥80%)
				const similarity = evaluation?.details?.similarity || 0;
				const scorePercent = similarity * 100;
				const isSuccess = scorePercent >= 80;

				if (isSuccess) {
					// Don't slide down or add to history, just update state for confetti
					setStrokes(nextStrokes);
					setStatus('success');
					setProcessingPrompt('');
					
					// Trigger confetti
					const outputArea = document.querySelector('.cg-output');
					if (outputArea && !outputArea.querySelector('.cg-confetti')) {
						const confetti = document.createElement('div');
						confetti.className = 'cg-confetti';
						outputArea.appendChild(confetti);
						
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
						setGeneratedImage(null);
						setGeneratedContent(null);
						setCurrentEvaluation(null);
						setProcessingPrompt('');
						
						if (evaluation?.passed) {
							setStatus('success');
						} else {
							// Check if nextStrokes hits maxStrokes
							if (nextStrokes >= maxStrokes) {
								setStatus('ended');
								setError('You have reached the maximum number of strokes for this hole. Hole ended.');
							} else {
								setStatus(null);
							}
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
			setGeneratedImage(null);
			setGeneratedContent(null);
			setCurrentEvaluation(null);
			setProcessingPrompt('');
		}

		function resetPrompt() {
			setPromptText('');
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

	function getGolfScore(strokes, par) {
		const difference = strokes - par;
		if (difference <= -4) return 'condor';
		if (difference === -3) return 'albatross';
		if (difference === -2) return 'eagle';
		if (difference === -1) return 'birdie';
		if (difference === 0) return 'par';
		if (difference === 1) return 'bogey';
		if (difference === 2) return 'double bogey';
		if (difference === 3) return 'triple bogey';
		return `${difference > 0 ? '+' : ''}${difference}`;
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
				{/* Header: logo left, hole nav center, login right - stays at top */}
				<header className="cg-header">
					<div className="cg-brand">
						<img src={Logo} alt="Promptly" className="cg-logo" />
						<h1 className="cg-title">Promptly</h1>
					</div>
					<nav className="cg-nav">
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(0)}>
							<span className="cg-hole-icon">⛳</span>Hole 1
						</button>
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(1)}>
							<span className="cg-hole-icon">⛳</span>Hole 2
						</button>
						<button type="button" className="cg-nav-btn" onClick={() => selectHole(2)}>
							<span className="cg-hole-icon">⛳</span>Hole 3
						</button>
					</nav>
						<div className="cg-auth" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
							<button type="button" className="cg-party-btn" onClick={() => window.location.href = '/party'}>Party</button>
							<button type="button" className="cg-login-btn">Log In</button>
						</div>
				</header>

				<div className="cg-body">
					{/* Fixed left sidebar: Score + Target only */}
					<aside className="cg-sidebar">
						<div className="cg-score-card">
							<div className="cg-score-title">Score</div>
							<div className="cg-score-row"><span>Strokes</span><span>{strokes}</span></div>
							<div className="cg-score-row"><span>Par</span><span>{challenge?.par ?? '—'}</span></div>
							<div className="cg-score-row"><span>Status</span><span>{status === 'success' ? 'Hole Complete' : status === 'ended' ? 'Hole Ended' : 'In Play'}</span></div>
						</div>

						{/* Target box */}
						<div className="cg-target-card">
							<div className="cg-score-title">Target</div>
							<div className="cg-target-media">
								{challenge?.frontImage ? (
									<img
										src={`http://localhost:3001${challenge.frontImage}`}
										alt="Target"
										className="cg-target-image"
									/>
								) : (
									<div className="cg-target-placeholder">Image placeholder</div>
								)}
							</div>
						</div>


						{/* Challenge Modifier box (reads modifier from current challenge) */}
						<div className="cg-target-card">
							<div className="cg-score-title">Challenge Modifier</div>
							<div className="cg-target-media">
								{challenge?.modifier ? (
									<div style={{ padding: 8 }}>
										<p style={{ margin: 0 }}>{challenge.modifier.safetyRestraint || JSON.stringify(challenge.modifier)}</p>
									</div>
								) : (
									<div className="cg-target-placeholder">N/A</div>
								)}
							</div>
						</div>

					</aside>

					{/* Main scrollable content area */}
					<div className="cg-main-content">
						<main className="cg-content">
						{/* Full-width instructions */}
						<section className="cg-instructions">
										<h2>Instructions</h2>
										<p>
											{challenge?.description}
											<br /><br />
											To complete the hole, your output must match the target by more than 80%. If you take too many shots (over the allowed limit), you will be forced to give up and the hole will end automatically. Try to finish in as few strokes as possible!
										</p>
						</section>

						{/* Centered prompt input */}
						<div className="cg-centered-prompt">
							<form className="cg-form" onSubmit={submitPrompt}>
								<textarea
									id="prompt-input"
									className="cg-textarea"
									placeholder={challenge?.type === 'code' ? 'Paste your JavaScript function code here...' : 'Enter your prompt here...'}
									value={promptText}
									onChange={(e) => setPromptText(e.target.value)}
									rows={challenge?.type === 'code' ? 6 : 4}
									disabled={isLoading}
								/>
								<div className="cg-actions">
									<button type="submit" className="cg-btn primary" disabled={isLoading}>
										{isLoading ? 'Generating…' : 'Submit'}
									</button>
									<button type="button" className="cg-btn primary" onClick={resetPrompt} disabled={isLoading}>Reset</button>
								</div>
							</form>
						</div>

						{/* Scrollable attempts stack */}
						<div className="cg-attempts-stack">
							{/* Current attempt processing */}
							{(isLoading || generatedImage || generatedContent || error) && (
								<div className="cg-attempt-card">
									<div className="cg-attempt-prompt-display">
										<div className="cg-attempt-text">{processingPrompt}</div>
									</div>
									<div className="cg-attempt-output">
										{isLoading ? (
											<div className="cg-loading-animation">
												<div className="cg-golf-cart">
													<img src="/golf-cart.svg" alt="Golf Cart" />
												</div>
												<div className="cg-loading-text">Generating your image...</div>
											</div>
										) : (generatedImage || generatedContent || error) ? (
											<div className="cg-output">
												<div className="cg-output-content">
													{generatedImage && (
														<div className="cg-output-block">
															<img src={generatedImage} alt="Generated" className="cg-image" />
															{status === 'success' && (
																<div className="cg-banner success">
																	Hole completed! You scored a {getGolfScore(strokes, challenge?.par || 3)}!
																</div>
															)}
														</div>
													)}
													{generatedContent && (
														<div className="cg-output-block">
															<pre className="cg-pre">{generatedContent}</pre>
															{status === 'success' && (
																<div className="cg-banner success">
																	Hole completed! You scored a {getGolfScore(strokes, challenge?.par || 3)}!
																</div>
															)}
														</div>
													)}
													{error && <div className="cg-banner error">{error}</div>}
												</div>
												{currentEvaluation?.details?.similarity !== undefined && (
													<div className="cg-similarity-score">
														<div className="cg-score-circle" key={currentEvaluation.details.similarity}>
															<div className={`cg-score-ring cg-score-${getScoreColor(currentEvaluation.details.similarity)}`}>
																<div className="cg-score-number">
																	{Math.round(currentEvaluation.details.similarity * 100)}%
																</div>
															</div>
														</div>
													</div>
												)}
											</div>
										) : null}
									</div>
								</div>
							)}

							{/* Previous attempts */}
							{history.map((attempt, i) => (
								<div key={i} className="cg-attempt-card">
									<div className="cg-attempt-prompt-display">
										<div className="cg-attempt-text">{attempt.prompt}</div>
									</div>
									<div className="cg-attempt-output">
										<div className="cg-output-content">
											{attempt.generation?.imageUrl && (
												<>
													{attempt.generation?.meta?.foiled && (
														<div className="cg-banner error" style={{ marginBottom: 8 }}>{attempt.generation.meta.foiledMessage || 'ELON CAUGHT YOU SNOOPING!'}</div>
													)}
													<img src={attempt.generation.imageUrl} alt="Generated" className="cg-image" />
												</>
											)}
											{attempt.generation?.content && (
												<pre className="cg-pre">{attempt.generation.content}</pre>
											)}
										</div>
										{(attempt.evaluation?.score !== undefined || attempt.evaluation?.details?.similarity !== undefined) && (() => {
											const ev = attempt.evaluation;
											const val = typeof ev?.score === 'number' ? ev.score : ev?.details?.similarity || 0;
											const pct = Math.round(val * 100);
											return (
												<div className="cg-similarity-score">
													<div className="cg-score-circle">
														<div className={`cg-score-ring cg-score-${getScoreColor(val)}`}>
															<div className="cg-score-number">
																{pct}%
															</div>
														</div>
													</div>
												</div>
											)
										})()}
									</div>
								</div>
							))}
						</div>
					</main>
					</div>
				</div>
			</div>
		);
}
