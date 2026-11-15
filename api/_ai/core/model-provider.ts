import type {
  ModelMessage,
  ModelProvider,
  ModelResponse,
  ModelToolCallHandler,
  ModelToolDefinition,
} from './types';
import { HttpError } from './supabase-server';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
];
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_TOOL_ROUNDS = 3;

interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface GroqApiResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: GroqToolCall[];
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
    code?: number;
  };
}

async function postProviderJson<T extends { error?: { message?: string } }>(
  endpoint: string,
  headers: Record<string, string>,
  payload: unknown
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => ({}))) as T;

    if (!res.ok) {
      const msg =
        data?.error?.message || `AI model request failed (${res.status}).`;
      throw new HttpError(res.status === 429 ? 429 : 502, msg);
    }

    return data;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if ((err as Error)?.name === 'AbortError') {
      throw new HttpError(
        504,
        'The AI request timed out. Please try a shorter or more specific prompt.'
      );
    }
    throw new HttpError(
      502,
      (err as Error)?.message || 'Failed to communicate with the AI provider.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class GroqModelProvider implements ModelProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new HttpError(
        503,
        'Ideora AI is not configured on the server yet (missing GROQ_API_KEY).'
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  }

  async generate(params: {
    systemPrompt: string;
    messages: ModelMessage[];
    maxOutputTokens?: number;
    temperature?: number;
    tools?: ModelToolDefinition[];
    onToolCall?: ModelToolCallHandler;
  }): Promise<ModelResponse> {
    const conversationMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: params.systemPrompt },
      ...params.messages.map((m) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.text,
      })),
    ];

    const openAiTools =
      params.tools && params.tools.length > 0 && params.onToolCall
        ? params.tools.map((tool) => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          }))
        : undefined;

    const candidateModels = [
      this.model,
      ...GROQ_FALLBACK_MODELS.filter((m) => m !== this.model),
    ];

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let activeModelIndex = 0;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const currentModel = candidateModels[activeModelIndex];
      const payload: Record<string, unknown> = {
        model: currentModel,
        messages: conversationMessages,
        temperature: params.temperature ?? 0.4,
        max_tokens: params.maxOutputTokens ?? 800,
      };
      if (openAiTools && round < MAX_TOOL_ROUNDS) {
        payload.tools = openAiTools;
        payload.tool_choice = 'auto';
      }

      let data: GroqApiResponse;
      try {
        data = await postProviderJson<GroqApiResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          { Authorization: `Bearer ${this.apiKey}` },
          payload
        );
      } catch (err) {
        if (
          err instanceof HttpError &&
          err.statusCode === 429 &&
          activeModelIndex < candidateModels.length - 1
        ) {
          activeModelIndex += 1;
          round -= 1;
          continue;
        }
        throw err;
      }

      totalPromptTokens += data.usage?.prompt_tokens ?? 0;
      totalCompletionTokens += data.usage?.completion_tokens ?? 0;
      totalTokens +=
        data.usage?.total_tokens ??
        (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

      const choiceMsg = data.choices?.[0]?.message;
      const toolCalls = choiceMsg?.tool_calls;

      if (
        toolCalls &&
        toolCalls.length > 0 &&
        params.onToolCall &&
        round < MAX_TOOL_ROUNDS
      ) {
        conversationMessages.push({
          role: 'assistant',
          content: choiceMsg?.content ?? '',
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = call.function?.arguments
              ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
              : {};
          } catch {
            parsedArgs = {};
          }
          const result = await params.onToolCall(call.function?.name || '', parsedArgs);
          conversationMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      const text = choiceMsg?.content?.trim() || '';
      if (!text) {
        throw new HttpError(
          502,
          'The AI model returned an empty response. Please try rephrasing your request.'
        );
      }

      return {
        text,
        model: currentModel,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens,
      };
    }

    throw new HttpError(
      502,
      'The AI model exceeded maximum tool steps. Please try a simpler question.'
    );
  }
}

export class GeminiModelProvider implements ModelProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new HttpError(
        503,
        'Ideora AI is not configured on the server yet (missing GEMINI_API_KEY).'
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  }

  async generate(params: {
    systemPrompt: string;
    messages: ModelMessage[];
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<ModelResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model
    )}:generateContent`;

    const data = await postProviderJson<GeminiApiResponse>(
      endpoint,
      { 'x-goog-api-key': this.apiKey },
      {
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents: params.messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        })),
        generationConfig: {
          temperature: params.temperature ?? 0.4,
          maxOutputTokens: params.maxOutputTokens ?? 1400,
        },
      }
    );

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    if (!text) {
      throw new HttpError(
        502,
        'The AI model returned an empty response. Please try rephrasing your request.'
      );
    }

    return {
      text,
      model: this.model,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    };
  }
}

export function getModelProvider(): ModelProvider {
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred === 'gemini') {
    return new GeminiModelProvider();
  }
  if (preferred === 'groq' || process.env.GROQ_API_KEY?.trim()) {
    return new GroqModelProvider();
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    return new GeminiModelProvider();
  }
  return new GroqModelProvider();
}

