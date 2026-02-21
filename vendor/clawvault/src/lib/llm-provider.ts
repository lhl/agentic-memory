export type LlmProvider = 'anthropic' | 'openai' | 'gemini';

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  anthropic: 'claude-3-5-haiku-latest',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash'
};

export interface LlmCompletionOptions {
  prompt: string;
  provider?: LlmProvider | null;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

export function resolveLlmProvider(): LlmProvider | null {
  if (process.env.CLAWVAULT_NO_LLM) {
    return null;
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }
  return null;
}

export async function requestLlmCompletion(options: LlmCompletionOptions): Promise<string> {
  const provider = options.provider ?? resolveLlmProvider();
  if (!provider) {
    return '';
  }

  if (provider === 'anthropic') {
    return callAnthropic(options, provider);
  }
  if (provider === 'gemini') {
    return callGemini(options, provider);
  }
  return callOpenAI(options, provider);
}

async function callAnthropic(options: LlmCompletionOptions, provider: LlmProvider): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return '';
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODELS[provider],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      messages: [{ role: 'user', content: options.prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed (${response.status})`);
  }

  const payload = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
  };
  return payload.content
    ?.filter((entry) => entry.type === 'text' && entry.text)
    .map((entry) => entry.text as string)
    .join('\n')
    .trim() ?? '';
}

async function callOpenAI(options: LlmCompletionOptions, provider: LlmProvider): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return '';
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemPrompt?.trim()) {
    messages.push({ role: 'system', content: options.systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: options.prompt });

  const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODELS[provider],
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 1200,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callGemini(options: LlmCompletionOptions, provider: LlmProvider): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return '';
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? DEFAULT_MODELS[provider];
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          maxOutputTokens: options.maxTokens ?? 1200
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
