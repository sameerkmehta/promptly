// Game challenges and evaluation logic

export const CHALLENGES = [
	{
		id: 1,
		hole: 1,
		title: 'Smiley (Image Match)',
		type: 'image',
		description: 'Recreate the target smiley image using an image-generation prompt.',
		// Target image file served by backend (place file in server/public)
		targetImage: '/target_smiley.png',
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

export function evaluatePrompt(challenge, prompt) {
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
			// NOTE: In Node.js, we can use vm module for safer evaluation, but for this demo we'll use Function constructor
			// In production, evaluate user code in a trusted server-side sandbox instead.
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

// New: evaluate the generated output for a given challenge.
// Contract:
// - Inputs: `challenge` (object from CHALLENGES), `generation` (object that contains the model's output)
//   For generation, shape is:
//     { type: 'image'|'text'|'code', content?: string, imageUrl?: string, meta?: any }
// - Output: { score: number (0.0-1.0), passed: boolean, details?: any }
// Implementation scaffolds per type are provided below; fill in the TODOs.
import path from 'path';
import { fileURLToPath } from 'url';
import { getImageSimilarityScore } from './imageSimilarity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function evaluateGeneratedOutput(challenge, generation) {
	if (!challenge || !generation) return { score: 0, passed: false, details: 'missing-input' };
	const type = generation.type || challenge.type;

		if (type === 'image') {
		// Image evaluation scaffold
		// Inputs available:
			//  - challenge.targetImage: URL path to target image file (served by backend)
			//  - generation.imageUrl: URL to generated image file (served by backend)
		// Suggested options:
			//  - Simple keyword heuristics on generation.meta.prompt (if present)
			//  - Load both images and compare (histogram / SSIM / perceptual hash) and normalize to [0, 1].
		const details = {
				targetImage: challenge.targetImage || null,
				imageUrl: generation.imageUrl || null
		};

		// TODO: Implement your scoring here. Example placeholders:
		// const promptText = generation.meta?.prompt || '';
		// const keywordHits = (challenge.keywords || []).filter(k => promptText.toLowerCase().includes(k.toLowerCase()));
		// const keywordScore = Math.min(1, keywordHits.length / Math.max(1, (challenge.keywords || []).length));
		// Optionally compute pixel similarity score by reading the image and comparing.

			// Attempt to compute similarity using Gemini with both images
			let score = 1.0;
			try {
				if (challenge.targetImage && generation.imageUrl) {
					// Build absolute paths on disk for both images
					// targetImage may be like '/target_smiley.svg' (served from server/public)
					const targetAbs = path.resolve(__dirname, 'public', path.basename(challenge.targetImage));
					// generated images are saved either under server/public or public; normalize by basename
					const generatedAbs = path.resolve(__dirname, 'public', path.basename(generation.imageUrl));
					const s = await getImageSimilarityScore(targetAbs, generatedAbs);
					if (s >= 0) score = s;
					details.similarity = s;
				}
			} catch (e) {
				details.error = String(e);
			}

			const passed = score >= 0.8; // default threshold; adjust as needed
			return { score, passed, details };
	}

	if (type === 'text') {
		// Text evaluation scaffold (e.g., haiku)
		// Inputs available:
		//  - generation.content: string
		//  - challenge.keywords, challenge.description, etc.
		const content = `${generation.content || ''}`.trim();
		const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
		const details = {
			lineCount: lines.length,
			sample: content.slice(0, 160)
		};

		// TODO: Improve scoring (e.g., syllable counts 5/7/5, required keywords like 'coffee')
		// Example basic checks:
		const threeLines = lines.length === 3;
		const hasKeywords = (challenge.keywords || []).every(k => content.toLowerCase().includes(k.toLowerCase()));

		// Example heuristic scoring:
		let score = 0;
		if (threeLines) score += 0.5;
		if (hasKeywords) score += 0.3;
		// Remaining 0.2 could be for syllable checks or style; keep 0 for now

		score = Math.max(0, Math.min(1, score));
		const passed = score >= 0.8; // TODO: adjust threshold
		return { score, passed, details };
	}

		if (type === 'code') {
		// Code evaluation scaffold
		// Inputs available:
		//  - generation.content: user-submitted JS function(s)
		//  - challenge.tests: array of { input, expected }
		const code = `${generation.content || ''}`;
		const tests = Array.isArray(challenge.tests) ? challenge.tests : [];
		const details = { total: tests.length, passed: 0, errors: [] };

		try {
			// WARNING: Running arbitrary code is dangerous. This is for demo purposes.
			const wrapper = new Function(`${code}\n; return (typeof isPalindrome === 'function') ? isPalindrome : null;`);
			const fn = wrapper();
			if (typeof fn !== 'function') {
				return { score: 0, passed: false, details: { ...details, error: 'no-function' } };
			}

			for (const t of tests) {
				try {
					const out = fn(t.input);
					if (Boolean(out) === Boolean(t.expected)) {
						details.passed += 1;
					} else {
						details.errors.push({ test: t, reason: 'mismatch', got: out });
					}
				} catch (err) {
					details.errors.push({ test: t, reason: 'runtime', error: String(err) });
				}
			}

			const score = tests.length ? details.passed / tests.length : 0;
			const passed = score >= 1; // require all tests by default; tweak as needed
					return { score, passed, details };
		} catch (err) {
			return { score: 0, passed: false, details: { ...details, error: String(err) } };
		}
	}

	// Unknown type fallback
		return { score: 0, passed: false, details: 'unknown-type' };
}