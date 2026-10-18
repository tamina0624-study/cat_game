'use client';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import { ArrowLeft, Volume2 } from 'lucide-react';

const line = 'こんにちは。むぎだよ。いっしょに遊ぼう？';
const styles = [
  { name: '明るく', note: '少し高め・軽やか', rate: 1.04, pitch: 1.18, volume: 0.82 },
  { name: 'ふんわり', note: 'やわらかく・親しみやすい', rate: 0.96, pitch: 1.08, volume: 0.8 },
  { name: 'おっとり', note: 'ゆっくり・穏やか', rate: 0.88, pitch: 1, volume: 0.76 },
];

export default function VoiceSamples() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('ja')));
    load(); window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel(); };
  }, []);
  function play(voice: SpeechSynthesisVoice, index: number) {
    const style = styles[index % styles.length], id = `${voice.name}-${index}`;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = 'ja-JP'; utterance.voice = voice; utterance.rate = style.rate; utterance.pitch = style.pitch; utterance.volume = style.volume;
    utterance.onend = utterance.onerror = () => setPlaying(null); setPlaying(id); window.speechSynthesis.speak(utterance);
  }
  return <main className="voice-sample-page"><Link className="voice-back" href="/"><ArrowLeft size={18} />むぎの部屋へ戻る</Link><section><p className="voice-kicker">VOICE PREVIEW</p><h1>むぎの声を試聴</h1><p>このブラウザで使える日本語音声を、実際の声ごとに聞き比べられます。ゲームの声はまだ変更されません。</p><div className="voice-presets">{voices.length === 0 ? <p className="voice-device">日本語音声を読み込んでいます…</p> : voices.map((voice, index) => { const style = styles[index % styles.length], id = `${voice.name}-${index}`; return <article key={id}><h2>{voice.name}</h2><p>{style.name}：{style.note}</p><button onClick={() => play(voice, index)}><Volume2 size={19} />{playing === id ? '再生中…' : 'この声を試聴'}</button></article>; })}</div><p className="voice-note">気に入った「声の名前」と雰囲気を教えてください。その声をむぎの返事に適用します。</p></section></main>;
}
