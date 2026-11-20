// ==========================================
// Workstream 1 — provider-agnostic JSON generation for the house agent.
//
//   generateJson({ system, user, schema, name, maxTokens }, { env, budgetLeft, anthropic, fetchImpl })
//     → { data, tokens, provider, model }
//
// Provider: Anthropic when ANTHROPIC_API_KEY is set (model AGENT_MODEL, default claude-haiku-5-5,
// structured output via output_config.format), otherwise OpenAI chat completions with the existing
// OPENAI_API_KEY (model AGENT_MODEL or AI_CAPTION_MODEL, default gpt-5-nano, json_schema output).
// 30 s timeout, one retry. Throws LlmError('budget_exceeded') before calling when the day's token
// budget is used up, and after a call that would overshoot it.
//
// The Anthropic client is injected (the Edge Function passes `new Anthropic()` from the SDK) so
// this file stays free of runtime imports and runs under node --test.
// ==========================================

export const LLM_DEFAULTS = {
  anthropicModel: 'claude-haiku-5-5',
  openaiModel: 'gpt-5-nano',
  timeoutMs: 30000,
  retries: 1,
  maxTokens: 4000
};

export class LlmError extends Error {
  constructor(code, detail = '') {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

export function pickProvider(env) {
  const get = (k) => env?.get?.(k) || '';
  if (get('ANTHROPIC_API_KEY')) {
    return { provider: 'anthropic', model: get('AGENT_MODEL') || LLM_DEFAULTS.anthropicModel };
  }
  if (get('OPENAI_API_KEY')) {
    return { provider: 'openai', model: get('AGENT_MODEL') || get('AI_CAPTION_MODEL') || LLM_DEFAULTS.openaiModel };
  }
  return { provider: 'none', model: '' };
}

async function callAnthropic(client, { model, system, user, schema, maxTokens }) {
  const res = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } }
    },
    { timeout: LLM_DEFAULTS.timeoutMs, maxRetries: 0 }
  );
  const tokens = (res?.usage?.input_tokens || 0) + (res?.usage?.output_tokens || 0);
  if (res?.stop_reason === 'refusal') throw Object.assign(new LlmError('refused'), { tokens });
  if (res?.stop_reason === 'max_tokens') throw Object.assign(new LlmError('truncated'), { tokens });
  const text = (res?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Object.assign(new LlmError('bad_json'), { tokens });
  }
  return { data, tokens };
}

async function callOpenAI(fetchImpl, key, { model, system, user, schema, name, maxTokens }) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), LLM_DEFAULTS.timeoutMs);
  try {
    const body = {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      max_completion_tokens: maxTokens
    };
    if (/^gpt-5|^o\d/.test(model)) body.reasoning_effort = 'minimal';
    const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new LlmError('http', String(res.status));
    const tokens = Number(json?.usage?.total_tokens) || 0;
    const content = json?.choices?.[0]?.message?.content;
    try {
      return { data: JSON.parse(content), tokens };
    } catch {
      throw Object.assign(new LlmError('bad_json'), { tokens });
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw new LlmError('timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{system:string,user:string,schema:object,name?:string,maxTokens?:number}} req
 * @param {{env:any,budgetLeft:number,anthropic?:any,fetchImpl?:Function}} ctx
 */
export async function generateJson(req, ctx) {
  const { env, anthropic, fetchImpl = globalThis.fetch } = ctx || {};
  const budgetLeft = Number(ctx?.budgetLeft);
  if (Number.isFinite(budgetLeft) && budgetLeft <= 0) throw new LlmError('budget_exceeded');
  const { provider, model } = pickProvider(env);
  if (provider === 'none') throw new LlmError('no_provider');
  const args = {
    model,
    system: req.system,
    user: req.user,
    schema: req.schema,
    name: req.name || 'house_agent',
    maxTokens: req.maxTokens || LLM_DEFAULTS.maxTokens
  };

  let spent = 0;
  let lastErr;
  for (let attempt = 0; attempt <= LLM_DEFAULTS.retries; attempt += 1) {
    try {
      const out =
        provider === 'anthropic'
          ? await callAnthropic(anthropic, args)
          : await callOpenAI(fetchImpl, env.get('OPENAI_API_KEY'), args);
      spent += out.tokens;
      if (Number.isFinite(budgetLeft) && spent > budgetLeft) {
        throw Object.assign(new LlmError('budget_exceeded'), { tokens: spent, final: true });
      }
      return { data: out.data, tokens: spent, provider, model };
    } catch (err) {
      spent += err?.final ? 0 : Number(err?.tokens) || 0;
      lastErr = err;
      // A refusal or a blown budget will not change on retry.
      if (err?.code === 'refused' || err?.code === 'budget_exceeded') break;
      if (Number.isFinite(budgetLeft) && spent >= budgetLeft) break;
    }
  }
  const e = lastErr instanceof LlmError ? lastErr : new LlmError('provider_error', String(lastErr?.message || lastErr).slice(0, 120));
  e.tokens = spent;
  throw e;
}
