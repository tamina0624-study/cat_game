'use client';
/* oxlint-disable nextjs/no-html-link-for-pages -- Full navigation releases the voice worker and avoids the current vinext client navigation error. */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Check, Volume2 } from 'lucide-react';
import { createBrowserTts } from '@/lib/browser-tts';
import { DEFAULT_VOICE, DEFAULT_TUNING, F2_DEFAULT_TUNING, OFFICIAL_VOICES, saveVoice, selectedVoice, subscribeVoice, tuningSnapshot, saveTuning, type VoiceId, type VoiceTuning } from '@/lib/tts-voices';

const line = 'こんにちは。むぎだよ。今日は何をして遊ぼうか。一緒にいると楽しいにゃ。';

export default function VoiceSamples() {
  const tts = useRef<ReturnType<typeof createBrowserTts> | null>(null);
  const alive = useRef(false);
  const selected = useSyncExternalStore(subscribeVoice, selectedVoice, () => DEFAULT_VOICE);
  const savedTuning = useSyncExternalStore(subscribeVoice, tuningSnapshot, () => JSON.stringify(F2_DEFAULT_TUNING));
  const [draft, setDraft] = useState<VoiceTuning | null>(null);
  const tuning: VoiceTuning = draft ?? JSON.parse(savedTuning);
  const [playing, setPlaying] = useState<VoiceId | null>(null);
  const [status, setStatus] = useState('試聴ボタンを押すと声を準備します。');
  const [saveNotice, setSaveNotice] = useState('');
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; tts.current?.dispose(); tts.current = null; };
  }, []);

  async function play(voice: VoiceId, settings?: VoiceTuning) {
    if (playing) return;
    setPlaying(voice);
    setStatus(`${voice}を準備しています…`);
    tts.current ??= createBrowserTts(message => { if (alive.current) setStatus(message); });
    try {
      await tts.current.speak(line, voice, settings);
      if (alive.current) setStatus(`${voice}の試聴が終わりました。気に入ったら「この声を使う」を押してください。`);
    } catch {
      if (alive.current) setStatus('試聴できませんでした。接続環境を確認して、もう一度試してください。');
    } finally { if (alive.current) setPlaying(null); }
  }

  function select(voice: VoiceId) {
    if (saveVoice(voice)) {
      setSaveNotice(`${voice}を保存しました。むぎの部屋で次の返答から使います。`);
    } else {
      setSaveNotice('声の設定を保存できませんでした。ブラウザのサイトデータ保存を許可して再度選択してください。');
    }
  }

  function applyF2() {
    if (saveTuning('F2', tuning) && saveVoice('F2')) {
      setDraft(null);
      setSaveNotice('カスタマイズしたF2を保存しました。次の会話から使います。');
    } else setSaveNotice('設定を保存できませんでした。ブラウザのサイトデータ保存を許可してください。');
  }

  return <main className="voice-sample-page">
    <a className="voice-back" href="/"><ArrowLeft size={18} />むぎの部屋へ戻る</a>
    <section>
      <p className="voice-kicker">SUPERTONIC 3 · OFFICIAL VOICES</p>
      <h1>むぎの声を選ぶ</h1>
      <p>公式の10種類を、同じ日本語の文章で聞き比べられます。気に入った声を選ぶと、会話の読み上げにも適用します。</p>
      <p className="voice-device">会話に使う声：<strong>{selected}</strong> · 設定はこのブラウザに保存します。</p>
      <div className="voice-customizer">
        <h2>F2をむぎの声に仕上げる</h2>
        <p>まずはそのまま、ふんわり、明るめを聞き比べてから微調整できます。</p>
        <div className="voice-tuning-presets">
          <button disabled={playing !== null} onClick={() => setDraft({ ...F2_DEFAULT_TUNING })}>アプリの標準</button>
          <button disabled={playing !== null} onClick={() => setDraft({ ...DEFAULT_TUNING })}>そのまま</button>
          <button disabled={playing !== null} onClick={() => setDraft({ speed: 0.94, pitch: 0.5, pause: 0.2 })}>ふんわり</button>
          <button disabled={playing !== null} onClick={() => setDraft({ speed: 1.03, pitch: 1.5, pause: 0.12 })}>明るめ</button>
        </div>
        <label htmlFor="voice-speed">話す速さ <strong>{tuning.speed.toFixed(2)}倍</strong></label>
        <input id="voice-speed" type="range" min="0.85" max="1.2" step="0.01" value={tuning.speed} disabled={playing !== null} onChange={event => setDraft({ ...tuning, speed: Number(event.target.value) })} />
        <label htmlFor="voice-pitch">声の高さ <strong>{tuning.pitch > 0 ? '+' : ''}{tuning.pitch.toFixed(1)}半音</strong></label>
        <input id="voice-pitch" type="range" min="-2" max="3" step="0.5" value={tuning.pitch} disabled={playing !== null} onChange={event => setDraft({ ...tuning, pitch: Number(event.target.value) })} />
        <label htmlFor="voice-pause">文の間隔 <strong>{tuning.pause.toFixed(2)}秒</strong></label>
        <input id="voice-pause" type="range" min="0" max="0.5" step="0.01" value={tuning.pause} disabled={playing !== null} onChange={event => setDraft({ ...tuning, pause: Number(event.target.value) })} />
        <p className="voice-note">高さを変えると声の質感も少し変わります。保存するまでは試聴だけに使います。</p>
        <div className="voice-preset-actions">
          <button disabled={playing !== null} onClick={() => { void play('F2', tuning); }}>調整したF2を試聴</button>
          <button disabled={playing !== null} onClick={() => { void play('F2', DEFAULT_TUNING); }}>元のF2と比較</button>
          <button className="voice-apply-tuning" disabled={playing !== null} onClick={applyF2}>このF2設定を会話に使う</button>
        </div>
      </div>
      <blockquote className="voice-preview-line">{line}</blockquote>
      <output className="voice-preview-status" aria-live="polite">{status}</output>
      {saveNotice && <output className="voice-save-notice">{saveNotice}</output>}
      <div className="voice-presets">{OFFICIAL_VOICES.map(voice => <article key={voice} className={selected === voice ? 'voice-selected' : ''}>
        <h2>{voice}{selected === voice && <span className="voice-selected-badge"><Check size={14} />使用中</span>}</h2>
        <p>Supertonic 3 公式プリセット</p>
        <div className="voice-preset-actions">
          <button disabled={playing !== null} onClick={() => { void play(voice); }} aria-label={`${voice}を試聴`}><Volume2 size={18} />{playing === voice ? '準備・再生中…' : '試聴する'}</button>
          <button className="voice-select-button" disabled={selected === voice} onClick={() => select(voice)} aria-label={`${voice}を会話の声に設定`}>{selected === voice ? '使用中' : 'この声を使う'}</button>
        </div>
      </article>)}</div>
      <p className="voice-note">初回は共通モデル約400MBを取得します。声の切り替えは約0.29MBのデータを追加するだけで、共通モデルを再取得しません。音声合成は端末内で行います。</p>
      <a className="voice-back" href="/">この声でむぎと話す<ArrowLeft className="voice-return-arrow" size={18} /></a>
    </section>
  </main>;
}
