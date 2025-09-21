// Utility to call GenAI backend for text generation
export async function callGenAIBackend(prompt) {
  const response = await fetch('/api/challenges/3/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!response.ok) throw new Error('Failed to generate with GenAI');
  const data = await response.json();
  return data?.generation?.content || '';
}
