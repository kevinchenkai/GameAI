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
        onDelta?.(delta, fullText);
      }
    }
  }

  if (!fullText) throw new Error('DeepSeek empty stream');
  if (finishReason === 'length') throw new Error('DeepSeek token limit');
  if (isLikelyTruncated(fullText)) throw new Error('DeepSeek incomplete reply');
  return fullText;
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
