'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Fish, Sparkles, RotateCcw, Download, PawPrint, Volume2, VolumeX, Mic, MicOff, LoaderCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { startGame, type GameAPI } from '@/lib/game';
import { startGame as startSeated } from '@/lib/game-v3';
import { startGame as startOriginal } from '@/lib/game-v1';
type SpeechListener={lang:string;interimResults:boolean;continuous:boolean;maxAlternatives:number;start:()=>void;abort:()=>void;onstart:()=>void;onresult:(event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void;onerror:(event:{error:string})=>void;onend:()=>void};
type SpeechFactory=new()=>SpeechListener;
type SpeechWindow=Window&{SpeechRecognition?:SpeechFactory;webkitSpeechRecognition?:SpeechFactory};
export default function Home() {
 const mount=useRef<HTMLDivElement>(null), api=useRef<GameAPI|null>(null);
 const recognition=useRef<SpeechListener|null>(null), history=useRef<Array<{role:'user'|'assistant';content:string}>>([]), listeningUntil=useRef(0);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState('pet'),[message,setMessage]=useState('むぎが、あなたを待っています。');
 const [muted,setMuted]=useState(false),[original,setOriginal]=useState(false);
 const [talkState,setTalkState]=useState<'idle'|'listening'|'thinking'|'speaking'|'unavailable'>('idle');
 const [stats,setStats]=useState({affection:42,fullness:55,fun:50});
 useEffect(()=>{let cancelled=false;const el=mount.current;if(!el)return;const isOriginal=new URLSearchParams(window.location.search).get('model')==='original';setOriginal(isOriginal);const init=isOriginal?startOriginal:new URLSearchParams(window.location.search).get('model')==='seated'?startSeated:startGame;Promise.resolve().then(()=>init(el,setMessage,setStats)).then(game=>{if(cancelled){game.dispose();return;}api.current=game;setReady(true);}).catch(e=>{if(cancelled)return;console.error(e);setError('猫を読み込めませんでした。再読み込みするか、ChromeまたはEdgeでお試しください。');});return()=>{cancelled=true;api.current?.dispose();};},[]);

 function choose(next:string){setMode(next);api.current?.mode(next);}
 function stopTalking(){listeningUntil.current=0;recognition.current?.abort();recognition.current=null;window.speechSynthesis.cancel();setTalkState('idle');}
 async function answer(transcript:string){
  setTalkState('thinking');setMessage('むぎが考えています…');
  try{const response=await fetch('/api/cat-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:transcript,history:history.current})});const data=await response.json() as {reply?:string;error?:string};if(!response.ok||!data.reply)throw Error(data.error||'会話につながりませんでした。');
   history.current=[...history.current,{role:'user',content:transcript},{role:'assistant',content:data.reply}].slice(-6);setMessage(`むぎ：${data.reply}`);setTalkState('speaking');
   const utterance=new SpeechSynthesisUtterance(data.reply);utterance.lang='ja-JP';utterance.rate=1.08;utterance.pitch=1.22;utterance.onend=()=>setTalkState('idle');utterance.onerror=()=>setTalkState('idle');window.speechSynthesis.speak(utterance);
  }catch(e){setTalkState('idle');setMessage(e instanceof Error?e.message:'会話につながりませんでした。');}}
 function startTalking(){
  if(talkState!=='idle')return stopTalking();
  const browser=window as SpeechWindow;const Recognition=browser.SpeechRecognition||browser.webkitSpeechRecognition;if(!Recognition){setTalkState('unavailable');setMessage('このブラウザでは音声入力を使えません。Chrome または Edge で開いてね。');return;}
  window.speechSynthesis.cancel();listeningUntil.current=Date.now()+12_000;
  const listen=()=>{if(Date.now()>=listeningUntil.current){recognition.current=null;setTalkState('idle');setMessage('聞いている時間が終わりました。もう一度「話す」を押してね。');return;}const listener=new Recognition();recognition.current=listener;listener.lang='ja-JP';listener.interimResults=false;listener.continuous=false;listener.maxAlternatives=1;
   listener.onstart=()=>{setTalkState('listening');setMessage('聞いているよ。12秒以内に、むぎに話しかけてね。');};listener.onresult=(event)=>{const words=event.results[0]?.[0]?.transcript?.trim();listeningUntil.current=0;recognition.current=null;if(words)void answer(words);else{setTalkState('idle');setMessage('もう一度、話しかけてね。');}};listener.onerror=(event)=>{recognition.current=null;if(event.error==='no-speech'&&Date.now()<listeningUntil.current){setMessage('聞いているよ。むぎに話しかけてね。');window.setTimeout(listen,120);return;}listeningUntil.current=0;setTalkState('idle');setMessage(event.error==='not-allowed'?'マイクの使用を許可してから、もう一度押してね。':event.error==='audio-capture'?'マイクが見つかりません。PCのマイク接続を確認してね。':event.error==='network'?'音声認識に接続できませんでした。少し待ってから試してね。':'声を聞き取れませんでした。もう一度話しかけてね。');};listener.onend=()=>{if(recognition.current===listener){recognition.current=null;if(Date.now()<listeningUntil.current)window.setTimeout(listen,120);else{setTalkState('idle');setMessage('聞いている時間が終わりました。もう一度「話す」を押してね。');}}};listener.start();};listen();
 }
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['1','2','3'].includes(e.key))choose(({1:'pet',2:'toy',3:'feed'} as Record<string,string>)[e.key]);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>()=>{recognition.current?.abort();window.speechSynthesis.cancel();},[]);
 return <main className="game-shell"><div ref={mount} className="viewport" aria-label="猫のむぎが歩き回る3Dの部屋"/>
 <header className="topbar"><div className="brand"><PawPrint size={26}/><div><h1>むぎの部屋</h1><p>いっしょに、のんびり。</p></div></div><div className="model-links"><a href="/">おさんぽ版</a><a href="/?model=seated">座った版と比較</a></div></header>
 <aside className="cat-card"><div className="cat-title"><span className="live-dot"/><h2>むぎ</h2><span>{original?'キジトラ':'キジ白'}</span></div><p>今日は、どんなふうに遊ぶ？</p>{[['affection','なかよし'],['fullness','おなか'],['fun','ごきげん']].map(([key,label])=><div className="stat" key={key}><div><span>{label}</span><span>{Math.round(stats[key as keyof typeof stats])}%</span></div><Progress aria-label={label} value={stats[key as keyof typeof stats]}/></div>)}</aside>
 <div className="view-controls"><button disabled={!ready} title={muted?'音を出す':'音を消す'} aria-label={muted?'音を出す':'音を消す'} aria-pressed={muted} onClick={()=>{api.current?.muted(!muted);setMuted(!muted);}}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><button title="視点を戻す" aria-label="視点を戻す" onClick={()=>api.current?.reset()}><RotateCcw size={20}/></button><button title="猫の3Dモデルを保存" aria-label="猫の3Dモデルを保存" onClick={()=>api.current?.download()}><Download size={20}/></button></div>
 <section className="bottom-panel"><p className="message" role="status">{error||(!ready?'むぎのお部屋を準備しています…':message)}</p><div className="actions"><button disabled={!ready} aria-pressed={mode==='pet'} onClick={()=>choose('pet')}><Hand/><span>なでる<small>猫をドラッグ</small></span><kbd>1</kbd></button><button disabled={!ready} aria-pressed={mode==='toy'} onClick={()=>choose('toy')}><Sparkles/><span>おもちゃ<small>マウスでじゃらす</small></span><kbd>2</kbd></button><button disabled={!ready} aria-pressed={mode==='feed'} onClick={()=>choose('feed')}><Fish/><span>ごはん<small>クリックであげる</small></span><kbd>3</kbd></button><button className="talk-button" disabled={!ready} aria-pressed={talkState==='listening'} onClick={startTalking}>{talkState==='thinking'?<LoaderCircle className="spin"/>:talkState==='listening'||talkState==='speaking'?<MicOff/>:<Mic/>}<span>{talkState==='idle'||talkState==='unavailable'?'話す':'止める'}<small>{talkState==='thinking'?'考え中…':talkState==='speaking'?'お返事中…':'マイクで話しかける'}</small></span></button></div><p className="hint">「話す」を押した時だけマイクを使います <b>·</b> 右ドラッグ：見回す <b>·</b> 1・2・3：触れ合いを選ぶ</p></section></main>;
}

