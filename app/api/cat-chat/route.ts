import { env } from 'cloudflare:workers';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

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
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openrouter/free', max_tokens: 140, temperature: 0.8, messages: [
        { role: 'system', content: 'あなたは猫の「むぎ」です。やさしい日本語で、子どもにも分かる短い会話をします。返答は二文まで。危険な行動は勧めず、分からないことは正直に伝えてください。' },
        ...history, { role: 'user', content: message },
      ] }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return json({ error: 'いまはお話ししにくいみたい。少し待ってから試してね。' }, 502);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return json({ error: 'むぎの返事を準備できませんでした。少し待ってから、もう一度話してね。' }, 502);
    return json({ reply: reply.slice(0, 900) });
  } catch { return json({ error: '会話につながりませんでした。少し待ってから試してね。' }, 502); }
}
