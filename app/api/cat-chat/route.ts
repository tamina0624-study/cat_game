import { env } from 'cloudflare:workers';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type RouterChoice = { finish_reason?: unknown; message?: { content?: unknown } };
type RouterResponse = { model?: unknown; choices?: unknown; error?: unknown; usage?: unknown };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const OPENROUTER_MODEL = 'inclusionai/ling-3.0-flash-vl:free';

function responseSummary(status: number, data: RouterResponse, attempt: number) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0] as RouterChoice | undefined;
  const content = first?.message?.content;
  return {
    attempt, status, model: typeof data.model === 'string' ? data.model : null,
    choicesLength: choices.length, finishReason: typeof first?.finish_reason === 'string' ? first.finish_reason : null,
    contentType: content === null ? 'null' : typeof content,
    contentLength: typeof content === 'string' ? content.trim().length : null,
    hasError: Boolean(data.error), usage: data.usage ?? null,
  };
}

export async function POST(request: Request) {
  const key = (env as Record<string, unknown>).OPENROUTER_API_KEY;
  if (typeof key !== 'string' || key.length < 10) return json({ error: '会話機能の準備がまだ完了していません。' }, 503);
  let payload: { message?: unknown; history?: unknown };
  try { payload = await request.json(); } catch { return json({ error: '内容を読み取れませんでした。' }, 400); }
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message || message.length > 600) return json({ error: 'もう少し短く話しかけてね。' }, 400);
  const history: ChatMessage[] = Array.isArray(payload.history) ? payload.history.slice(-6).flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object') return [];
    const { role, content } = item as Record<string, unknown>;
    return (role === 'user' || role === 'assistant') && typeof content === 'string' && content.length <= 600 ? [{ role, content }] : [];
  }) : [];
  const body = JSON.stringify({ model: OPENROUTER_MODEL, messages: [
    { role: 'system', content: 'あなたは猫の「むぎ」です。やさしい日本語で、子どもにも分かる短い会話をします。返答は二文まで。危険な行動は勧めず、分からないことは正直に伝えてください。' },
    ...history, { role: 'user', content: message },
  ] });

  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60_000),
      });
      const data = await response.json() as RouterResponse;
      console.info('cat-chat OpenRouter response summary', responseSummary(response.status, data, attempt));
      if (!response.ok) return json({ error: 'いまはお話ししにくいみたい。少し待ってから試してね。' }, 502);
      const content = (Array.isArray(data.choices) ? data.choices[0] as RouterChoice | undefined : undefined)?.message?.content;
      if (typeof content === 'string' && content.trim()) return json({ reply: content.trim().slice(0, 900) });
      if (attempt === 1) console.warn('cat-chat retrying after an empty OpenRouter content field');
    }
    return json({ error: 'むぎの返事が届きませんでした。もう一度話しかけてみてね。' }, 502);
  } catch (error) {
    console.error('cat-chat OpenRouter request failed', error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    return json({ error: '会話につながりませんでした。少し待ってから試してね。' }, 502);
  }
}
