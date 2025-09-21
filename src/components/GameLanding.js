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
	const [finalAttempt, setFinalAttempt] = useState(null); // store the winning attempt so UI can show final results
	const [finalStrokes, setFinalStrokes] = useState(null);
		const [processingPrompt, setProcessingPrompt] = useState('');

		// Prompt limits
		const MAX_PROMPT_LENGTH = 250; // character limit for prompt textarea

		function handlePromptChange(e) {
			const raw = e.target.value || '';
			// Enforce max-length client-side by slicing extra characters
			const clipped = raw.slice(0, MAX_PROMPT_LENGTH);
			setPromptText(clipped);
		}

		function getCounterClass() {
			if (!promptText) return '';
			const pct = (promptText.length / MAX_PROMPT_LENGTH) * 100;
			if (pct >= 100) return 'cg-counter-full';
			if (pct >= 80) return 'cg-counter-near';
			return 'cg-counter-normal';
		}

		// Include previous prompts checkbox (default: true)
		const [includeHistory, setIncludeHistory] = useState(true);
		
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
			// prevent further submissions after hole has ended or already successful
			if (status === 'ended' || status === 'success' || finalAttempt) return;
			// No max-strokes limit; each submit counts as a stroke
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
				// Build sendPrompt: include previous prompts if requested
				let sendPrompt = currentPrompt;
				if (includeHistory && history && history.length > 0) {
					// history is stored newest-first; reverse to get chronological order
					const chronological = [...history].slice().reverse();
					const numbered = chronological.map((h, idx) => `Prompt ${idx + 1}: ${h.prompt}`);
					sendPrompt = numbered.join('\n') + '\n' + currentPrompt;
				}
				// Step 1: Generate on backend using sendPrompt
				const genResp = await backendGenerate(challenge, sendPrompt);
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
				console.debug('[GameLanding] submitPrompt - setCurrentEvaluation', { evaluation });

				// Create complete attempt entry
				const completeAttempt = { prompt: currentPrompt, generation, evaluation };
				
				// Check for successful score (≥80%)
				const similarity = evaluation?.details?.similarity || 0;
				const scorePercent = similarity * 100;
				const isSuccess = scorePercent >= 80;

				if (isSuccess) {
					// finalize via helper
					finalizeWin(completeAttempt, nextStrokes);
				} else {
					// Normal slide down animation
					setTimeout(() => {
						console.debug('[GameLanding] post-slide timeout - evaluation', { evaluation });
						// Only treat as a completed hole when similarity >= 80%.
						const sim = evaluation?.details?.similarity ?? evaluation?.score ?? 0;
						console.debug('[GameLanding] post-slide timeout - sim:', sim);
						if (sim >= 0.8) {
							// finalize the hole using the same finalization path
							finalizeWin(completeAttempt, nextStrokes);
							return;
						}
						// Not a finalizing attempt: record it and clear the temporary generated content
						setHistory((h) => [completeAttempt, ...h]);
						setStrokes(nextStrokes);
						setGeneratedImage(null);
						setGeneratedContent(null);
						setCurrentEvaluation(null);
						setProcessingPrompt('');
						// only set status to null if it hasn't already been finalized
						setStatus((prev) => ((prev === 'ended' || prev === 'success') ? prev : null));
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

		// Centralized finalization helper: set final attempt, strokes, status and trigger confetti
		function finalizeWin(completeAttempt, strokesCount) {
			try {
				console.debug('[GameLanding] finalizeWin called', { completeAttempt, strokesCount, status });
				setFinalAttempt(completeAttempt);
				setFinalStrokes(strokesCount);
				setStrokes(strokesCount);
				setStatus('ended');
				// Ensure generated content remains visible if provided
				if (completeAttempt?.generation) {
					const gen = completeAttempt.generation;
					if (gen.type === 'image' && gen.imageUrl) {
						const url = gen.imageUrl.startsWith('http') ? gen.imageUrl : `http://localhost:3001${gen.imageUrl}`;
						setGeneratedImage(url);
						setGeneratedContent(null);
					} else if (gen.content) {
						setGeneratedContent(gen.content);
						setGeneratedImage(null);
					}
				}

				// Trigger confetti (idempotent)
				const outputArea = document.querySelector('.cg-output');
				if (outputArea) {
					let confetti = outputArea.querySelector('.cg-confetti');
					if (!confetti) {
						confetti = document.createElement('div');
						confetti.className = 'cg-confetti';
						outputArea.appendChild(confetti);
						for (let i = 0; i < 20; i++) {
							const span = document.createElement('span');
							span.textContent = ['🎉','✨','🎊','🥳','💫'][i % 5];
							span.style.left = `${Math.random() * 100}%`;
							span.style.animationDelay = `${Math.random() * 0.6}s`;
							confetti.appendChild(span);
						}
						setTimeout(() => confetti.remove(), 3500);
					}
				}
			} catch (err) {
				console.error('Error finalizing win:', err);
			}
		}

		function resetChallenge() {
			console.debug('[GameLanding] resetChallenge called - resetting status to null');
			setPromptText('');
			setStrokes(0);
			setHistory([]);
			setStatus(null);
			setFinalAttempt(null);
			setGeneratedImage(null);
			setGeneratedContent(null);
			setCurrentEvaluation(null);
			setProcessingPrompt('');
		}

		function resetPrompt() {
			setPromptText('');
		}

		// If currentEvaluation updates after rendering, ensure we finalize the hole
		useEffect(() => {
		console.debug('[GameLanding] useEffect currentEvaluation', { currentEvaluation, status, processingPrompt });
			if (!currentEvaluation) return;
			const sim = currentEvaluation?.details?.similarity ?? currentEvaluation?.score;
			if (sim === undefined) return;
			if (sim >= 0.8 && !(status === 'ended' || status === 'success')) {
			console.debug('[GameLanding] useEffect - sim >= 0.8, finalizing', { sim, status });
				const generation = generatedImage ? { type: 'image', imageUrl: generatedImage } : (generatedContent ? { type: 'text', content: generatedContent } : null);
				const completeAttempt = { prompt: processingPrompt, generation, evaluation: currentEvaluation };
				finalizeWin(completeAttempt, (finalStrokes ?? strokes));
			}
		}, [currentEvaluation]);

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
							<div className="cg-score-row"><span>Strokes</span><span>{finalStrokes ?? strokes}</span></div>
							<div className="cg-score-row"><span>Par</span><span>{challenge?.par ?? '—'}</span></div>
							<div className="cg-score-row"><span>Status</span><span>{(status === 'success' || status === 'ended' || finalAttempt) ? 'Hole Complete' : 'In Play'}</span></div>
						</div>

						{/* Target box */}
						<div className="cg-target-card">
							<div className="cg-score-title">Target</div>
								<div className="cg-target-media cg-target-media-large">
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


							{/* Prompt History will be rendered next to the prompt input (not in sidebar) */}

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

						{/* If no challenge is defined (new holes), render a blank page for now */}
						{!challenge ? (
							<div style={{ padding: 40 }} />
						) : (
							<>
								{/* Full-width instructions */}
								<section className="cg-instructions">
									<h2>Instructions</h2>
									<p>
										{challenge?.description}
										<br /><br />
										To complete the hole, your output must match the target by more than 80%. Try to finish in as few strokes as possible!
									</p>
								</section>

								{/* Centered prompt input (single column). Prompt history box removed; include-history is a toggle button below the textarea. */}
								<div className="cg-centered-prompt">
									<div className="cg-form-col">
										<form className="cg-form" onSubmit={submitPrompt}>
											<textarea
												id="prompt-input"
												className="cg-textarea"
												placeholder={challenge?.type === 'code' ? 'Paste your JavaScript function code here...' : 'Enter your prompt here...'}
												value={promptText}
												onChange={handlePromptChange}
												rows={challenge?.type === 'code' ? 6 : 6}
												disabled={isLoading}
												maxLength={MAX_PROMPT_LENGTH}
											/>

											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 }}>
												<div className={`cg-char-counter ${getCounterClass()}`} style={{ fontSize: 12 }}>
													{promptText.length}/{MAX_PROMPT_LENGTH}
												</div>

												<div style={{ display: 'flex', gap: 8 }}>
													<button type="submit" className="cg-btn primary" disabled={isLoading || status === 'ended' || status === 'success'}>
															{isLoading ? 'Generating…' : (status === 'ended' || status === 'success' || finalAttempt ? 'Hole Complete' : 'Submit')}
													</button>
													<button type="button" className="cg-btn" onClick={resetPrompt} disabled={isLoading}>Reset</button>

													{/* Include-history toggle (styled green/red inline) */}
													<button
														type="button"
														className="cg-btn"
														onClick={() => setIncludeHistory((v) => !v)}
														disabled={isLoading}
														style={{
															background: includeHistory ? '#ecffe9' : '#ffecec',
															borderColor: includeHistory ? '#cbe7c5' : '#f0c9c9',
															color: includeHistory ? '#166b27' : '#a22929',
															padding: '8px 12px',
															fontWeight: 800
														}}
													>
														{includeHistory ? 'Include History: ON' : 'Include History: OFF'}
													</button>
												</div>
											</div>
										</form>
									</div>
								</div>
							</>
						)}

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
															{(status === 'success' || finalAttempt) && (
																<div className="cg-banner success">
																	Hole completed! You scored a {getGolfScore(strokes, challenge?.par || 3)}!
																</div>
															)}
														</div>
													)}
													{generatedContent && (
														<div className="cg-output-block">
															<pre className="cg-pre">{generatedContent}</pre>
															{(status === 'success' || finalAttempt) && (
																<div className="cg-banner success">
																	Hole completed! You scored a {getGolfScore(strokes, challenge?.par || 3)}!
																</div>
															)}
														</div>
													)}
													{error && <div className="cg-banner error">{error}</div>}
												</div>
												{((finalAttempt && finalAttempt?.evaluation?.details?.similarity !== undefined) || currentEvaluation?.details?.similarity !== undefined) && (
													<div className="cg-similarity-score">
														{(() => {
															const ev = (finalAttempt ? finalAttempt?.evaluation : currentEvaluation) || {};
															const sim = ev?.details?.similarity ?? (ev?.score ?? 0);
															return (
																<div className="cg-score-circle" key={sim}>
																	<div className={`cg-score-ring cg-score-${getScoreColor(sim)}`}>
																		<div className="cg-score-number">
																			{Math.round(sim * 100)}%
																		</div>
																	</div>
																</div>
															)
														})()}
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
