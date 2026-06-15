import { config, assertDeepSeekReady } from './config.js';

export async function streamDeepSeek(messages, onDelta) {
  assertDeepSeekReady();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.deepseek.timeoutMs);

  try {
    const response = await fetch(`${config.deepseek.url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`
      },
      body: JSON.stringify({
        model: config.deepseek.model,
        messages,
        temperature: 0.82,
        max_tokens: 220,
        extra_body: {
          thinking: {
            type: 'disabled'
          }
        },
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`DeepSeek HTTP ${response.status}`);
    }
    if (!response.body || typeof response.body.getReader !== 'function') {
      throw new Error('DeepSeek stream unavailable');
    }

    return await readDeepSeekStream(response, onDelta);
  } finally {
    clearTimeout(timer);
  }
}

async function readDeepSeekStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  let finishReason = '';

  // We deliberately do NOT forward deltas to the client while the stream is in
  // flight: the truncation / empty-reply checks below can only run once the
  // stream ends, and forwarding mid-stream would leak a half-finished reply to
  // the user before we decide to fall back. Instead we buffer here, validate,
  // and replay the validated text as deltas only on success.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const lines = event
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'));

      for (const line of lines) {
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        const parsed = JSON.parse(data);
        const choice = parsed?.choices?.[0];
        finishReason = choice?.finish_reason || finishReason;
        const delta = choice?.delta?.content || '';
        if (!delta) continue;

        fullText += delta;
      }
    }
  }

  if (!fullText) throw new Error('DeepSeek empty stream');
  if (finishReason === 'length') throw new Error('DeepSeek token limit');
  if (isLikelyTruncated(fullText)) throw new Error('DeepSeek incomplete reply');

  replayValidatedReply(fullText, onDelta);
  return fullText;
}

// Replay the validated reply in small chunks so the client still gets a typing
// effect, without ever having seen an unvalidated (possibly truncated) reply.
function replayValidatedReply(fullText, onDelta) {
  if (typeof onDelta !== 'function') return;
  const chunkSize = 6;
  let sent = '';
  for (let i = 0; i < fullText.length; i += chunkSize) {
    const piece = fullText.slice(i, i + chunkSize);
    sent += piece;
    onDelta(piece, sent);
  }
}

function isLikelyTruncated(reply) {
  const text = String(reply || '').trim();
  if (!text) return true;
  if (/^[（(][^）)]*$/.test(text)) return true;
  if (/^[（(][^）)]*[，,、;；]$/.test(text)) return true;
  if (/[，,、;；：:]$/.test(text)) return true;
  if (/(但是|但|可是|不过|然后|因为|所以|而且|要不|咱们|我们|我想|你先)$/.test(text)) return true;
  if (/[“‘《（(]$/.test(text)) return true;
  return false;
}
