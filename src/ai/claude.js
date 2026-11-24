const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT, buildUserPrompt } = require('./prompt');
const { parseAuditResult } = require('./schema');
const { generateMockAnalysis } = require('../mocks/claude.mock');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

// Real Claude when a key is present; otherwise the realistic mock (same output schema).
function useRealClaude() {
  return !!process.env.ANTHROPIC_API_KEY && process.env.MOCK_CLAUDE !== 'true';
}

// Streamed: a full audit is ~7K output tokens (~2+ minutes), which trips idle timeouts on a
// plain request. finalMessage() still hands back one complete message.
async function callClaude(messages) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 300000, maxRetries: 1 });
  const response = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages,
    })
    .finalMessage();
  if (response.stop_reason === 'max_tokens') throw new Error('Claude response truncated (max_tokens)');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, usage: response.usage, id: response.id };
}

/**
 * Returns { result, meta } where result matches the brief's JSON structure and meta records
 * where it came from (shown in the admin portal and stored on the Audit row).
 */
async function analyzeSignals(client, sections) {
  const userPrompt = buildUserPrompt(client, sections);

  if (!useRealClaude()) {
    console.log('[MOCK CLAUDE] → Generating analysis from collected signals');
    return {
      result: parseAuditResult(generateMockAnalysis(client, sections)),
      meta: { source: 'mock', model: 'mock-analyst', promptChars: userPrompt.length },
    };
  }

  const messages = [{ role: 'user', content: userPrompt }];
  const first = await callClaude(messages);
  try {
    const result = parseAuditResult(first.text);
    return { result, meta: { source: 'claude', model: MODEL, usage: first.usage, messageId: first.id, promptChars: userPrompt.length } };
  } catch (err) {
    // One corrective retry: show the model its own output and the validation error.
    console.warn('[CLAUDE] Invalid JSON, retrying once:', err.message);
    const retry = await callClaude([
      ...messages,
      { role: 'assistant', content: first.text },
      { role: 'user', content: `Your response was not valid against the required structure (${err.message}). Respond again with ONLY the corrected JSON object.` },
    ]);
    const result = parseAuditResult(retry.text);
    return { result, meta: { source: 'claude', model: MODEL, usage: retry.usage, messageId: retry.id, retried: true, promptChars: userPrompt.length } };
  }
}

module.exports = { analyzeSignals, useRealClaude, MODEL };
