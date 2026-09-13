import { env } from 'cloudflare:workers';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const key = (env as Record<string, unknown>).OPENROUTER_API_KEY;
  if (typeof key !== 'string' || key.length < 10) return json({ error: '会話機能の準備がまだ完了していません。' }, 503);
  let payload: { audio?: unknown; history?: unknown };
  try { payload = await request.json(); } catch { return json({ error: '録音を読み取れませんでした。' }, 400); }
  const audio = typeof payload.audio === 'string' ? payload.audio : '';
  if (!audio || audio.length > 3_000_000) return json({ error: '録音が長すぎるか、読み取れませんでした。' }, 400);
  const history: ChatMessage[] = Array.isArray(payload.history) ? payload.history.slice(-6).flatMap((item): ChatMessage[] => {
    if (!item || typeof item !== 'object') return [];
    const { role, content } = item as Record<string, unknown>;
    return (role === 'user' || role === 'assistant') && typeof content === 'string' && content.length <= 600 ? [{ role, content }] : [];
  }) : [];
  try {
    const transcriptionResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', max_tokens: 180, temperature: 0,
        messages: [
          { role: 'system', content: 'あなたは日本語の音声文字起こし機能です。録音された音声を、聞こえた日本語の文章だけにして返してください。返事、説明、挨拶、話者名、句読点以外の記号は加えません。聞き取れない場合は「聞き取れませんでした」とだけ返してください。' },
          { role: 'user', content: [{ type: 'text', text: 'この音声を書き起こしてください。' }, { type: 'input_audio', input_audio: { data: audio, format: 'webm' } }] },
        ],
      }), signal: AbortSignal.timeout(30_000),
    });
    if (!transcriptionResponse.ok) return json({ error: 'いまは音声を聞き取れないみたい。少し待ってから試してね。' }, 502);
    const transcriptionData = await transcriptionResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const transcript = transcriptionData.choices?.[0]?.message?.content?.trim();
    if (!transcript || transcript === '聞き取れませんでした') return json({ error: '声を聞き取れなかったみたい。もう一度ゆっくり話してね。' }, 502);
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openrouter/free', max_tokens: 140, temperature: 0.8, messages: [
        { role: 'system', content: 'あなたは猫の「むぎ」です。やさしい日本語で、子どもにも分かる短い会話をします。返答は二文まで。危険な行動は勧めず、分からないことは正直に伝えてください。' },
        ...history, { role: 'user', content: transcript },
      ] }), signal: AbortSignal.timeout(20_000),
    });
    if (!chatResponse.ok) return json({ error: 'いまはお話ししにくいみたい。少し待ってから試してね。' }, 502);
    const chatData = await chatResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = chatData.choices?.[0]?.message?.content?.trim();
    if (!reply) return json({ error: 'むぎの返事を作れませんでした。もう一度話してね。' }, 502);
    return json({ reply: reply.slice(0, 900), transcript: transcript.slice(0, 600) });
  } catch { return json({ error: '音声会話につながりませんでした。少し待ってから試してね。' }, 502); }
}
