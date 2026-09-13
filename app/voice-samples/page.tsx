'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Volume2 } from 'lucide-react';

type Preset = { name: string; note: string; rate: number; pitch: number; volume: number };
const presets: Preset[] = [
  { name: '元気なむぎ', note: '明るく、少しだけ高め', rate: 1.08, pitch: 1.38, volume: 0.82 },
  { name: 'ふんわりむぎ', note: 'やわらかく、親しみやすい', rate: 0.96, pitch: 1.24, volume: 0.8 },
  { name: 'おっとりむぎ', note: 'ゆっくり、穏やか', rate: 0.88, pitch: 1.16, volume: 0.76 },
];
const line = 'こんにちは。むぎだよ。いっしょに遊ぼう？';

export default function VoiceSamples() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices().filter(voice => voice.lang.toLowerCase().startsWith('ja')));
    load(); window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel(); };
  }, []);
  const voice = voices.find(item => /haruka|ayumi|sayaka|google.*japanese/i.test(item.name)) ?? voices[0];
  function play(preset: Preset) {
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = 'ja-JP'; utterance.rate = preset.rate; utterance.pitch = preset.pitch; utterance.volume = preset.volume; if (voice) utterance.voice = voice;
    utterance.onend = utterance.onerror = () => setPlaying(null); setPlaying(preset.name); window.speechSynthesis.speak(utterance);
  }
  return <main className="voice-sample-page"><a className="voice-back" href="/"><ArrowLeft size={18} />むぎの部屋へ戻る</a><section><p className="voice-kicker">VOICE PREVIEW</p><h1>むぎの声を試聴</h1><p>同じ台詞を、3種類の雰囲気で聞き比べられます。ゲームの声はまだ変更されません。</p><p className="voice-device">使用する日本語音声：{voice?.name ?? '読み込み中…'}</p><div className="voice-presets">{presets.map(preset => <article key={preset.name}><h2>{preset.name}</h2><p>{preset.note}</p><button onClick={() => play(preset)}><Volume2 size={19} />{playing === preset.name ? '再生中…' : '試聴する'}</button></article>)}</div><p className="voice-note">声の種類は、このブラウザ・PCに入っている日本語音声を使います。気に入った雰囲気を教えてください。</p></section></main>;
}
