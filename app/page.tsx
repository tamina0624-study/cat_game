'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Fish, Sparkles, RotateCcw, Download, PawPrint, Volume2, VolumeX, Mic, MicOff, LoaderCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { startGame, type GameAPI } from '@/lib/game';
import { startGame as startSeated } from '@/lib/game-v3';
import { startGame as startOriginal } from '@/lib/game-v1';
export default function Home() {
 const mount=useRef<HTMLDivElement>(null), api=useRef<GameAPI|null>(null);
 const recorder=useRef<MediaRecorder|null>(null), stream=useRef<MediaStream|null>(null), recordTimer=useRef<number|null>(null), history=useRef<Array<{role:'user'|'assistant';content:string}>>([]);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState('pet'),[message,setMessage]=useState('むぎが、あなたを待っています。');
 const [muted,setMuted]=useState(false),[original,setOriginal]=useState(false);
 const [talkState,setTalkState]=useState<'idle'|'listening'|'thinking'|'speaking'|'unavailable'>('idle');
 const [stats,setStats]=useState({affection:42,fullness:55,fun:50});
 useEffect(()=>{let cancelled=false;const el=mount.current;if(!el)return;const isOriginal=new URLSearchParams(window.location.search).get('model')==='original';setOriginal(isOriginal);const init=isOriginal?startOriginal:new URLSearchParams(window.location.search).get('model')==='seated'?startSeated:startGame;Promise.resolve().then(()=>init(el,setMessage,setStats)).then(game=>{if(cancelled){game.dispose();return;}api.current=game;setReady(true);}).catch(e=>{if(cancelled)return;console.error(e);setError('猫を読み込めませんでした。再読み込みするか、ChromeまたはEdgeでお試しください。');});return()=>{cancelled=true;api.current?.dispose();};},[]);

 function choose(next:string){setMode(next);api.current?.mode(next);}
 function releaseMic(){if(recordTimer.current!==null){window.clearTimeout(recordTimer.current);recordTimer.current=null;}stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;recorder.current=null;}
 function stopTalking(){if(recorder.current?.state==='recording'){recorder.current.stop();setTalkState('thinking');setMessage('むぎが声を聞いています…');return;}window.speechSynthesis.cancel();releaseMic();setTalkState('idle');}
 async function answer(transcript:string){
  setTalkState('thinking');setMessage('むぎが考えています…');
  try{const response=await fetch('/api/cat-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:transcript,history:history.current})});const data=await response.json() as {reply?:string;error?:string};if(!response.ok||!data.reply)throw Error(data.error||'会話につながりませんでした。');
   history.current=[...history.current,{role:'user',content:transcript},{role:'assistant',content:data.reply}].slice(-6);setMessage(`むぎ：${data.reply}`);setTalkState('speaking');
   const utterance=new SpeechSynthesisUtterance(data.reply);utterance.lang='ja-JP';utterance.rate=1.08;utterance.pitch=1.22;utterance.onend=()=>setTalkState('idle');utterance.onerror=()=>setTalkState('idle');window.speechSynthesis.speak(utterance);
  }catch(e){setTalkState('idle');setMessage(e instanceof Error?e.message:'会話につながりませんでした。');}}
 async function answerAudio(audio:string){
  try{const response=await fetch('/api/cat-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio,history:history.current})});const data=await response.json() as {reply?:string;transcript?:string;error?:string};if(!response.ok||!data.reply)throw Error(data.error||'音声会話につながりませんでした。');history.current=[...history.current,...(data.transcript?[{role:'user' as const,content:data.transcript}]:[]),{role:'assistant',content:data.reply}].slice(-6);setMessage(`むぎ：${data.reply}`);setTalkState('speaking');const utterance=new SpeechSynthesisUtterance(data.reply);utterance.lang='ja-JP';utterance.rate=1.08;utterance.pitch=1.22;utterance.onend=()=>setTalkState('idle');utterance.onerror=()=>setTalkState('idle');window.speechSynthesis.speak(utterance);
  }catch(e){setTalkState('idle');setMessage(e instanceof Error?e.message:'音声会話につながりませんでした。');}}
 async function startTalking(){
  if(talkState!=='idle')return stopTalking();window.speechSynthesis.cancel();
  try{const input=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=input;const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';const listener=new MediaRecorder(input,{mimeType:mime});const chunks:Blob[]=[];recorder.current=listener;listener.ondataavailable=(event)=>{if(event.data.size)chunks.push(event.data);};listener.onstop=()=>{releaseMic();const blob=new Blob(chunks,{type:'audio/webm'});if(blob.size<800){setTalkState('idle');setMessage('声が小さいみたい。マイクに近づいて、もう一度話してね。');return;}const reader=new FileReader();reader.onload=()=>{const encoded=typeof reader.result==='string'?reader.result.split(',')[1]:'';setTalkState('thinking');setMessage('むぎが声を聞いています…');if(encoded)void answerAudio(encoded);};reader.readAsDataURL(blob);};listener.start();setTalkState('listening');setMessage('録音中。話し終えたら「止める」を押してね。12秒後には自動で送ります。');recordTimer.current=window.setTimeout(()=>{if(listener.state==='recording')listener.stop();},12_000);
  }catch{releaseMic();setTalkState('idle');setMessage('マイクの使用を許可してから、もう一度「話す」を押してね。');}
 }
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['1','2','3'].includes(e.key))choose(({1:'pet',2:'toy',3:'feed'} as Record<string,string>)[e.key]);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>()=>{releaseMic();window.speechSynthesis.cancel();},[]);
 return <main className="game-shell"><div ref={mount} className="viewport" aria-label="猫のむぎが歩き回る3Dの部屋"/>
 <header className="topbar"><div className="brand"><PawPrint size={26}/><div><h1>むぎの部屋</h1><p>いっしょに、のんびり。</p></div></div><div className="model-links"><a href="/">おさんぽ版</a><a href="/?model=seated">座った版と比較</a></div></header>
 <aside className="cat-card"><div className="cat-title"><span className="live-dot"/><h2>むぎ</h2><span>{original?'キジトラ':'キジ白'}</span></div><p>今日は、どんなふうに遊ぶ？</p>{[['affection','なかよし'],['fullness','おなか'],['fun','ごきげん']].map(([key,label])=><div className="stat" key={key}><div><span>{label}</span><span>{Math.round(stats[key as keyof typeof stats])}%</span></div><Progress aria-label={label} value={stats[key as keyof typeof stats]}/></div>)}</aside>
 <div className="view-controls"><button disabled={!ready} title={muted?'音を出す':'音を消す'} aria-label={muted?'音を出す':'音を消す'} aria-pressed={muted} onClick={()=>{api.current?.muted(!muted);setMuted(!muted);}}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><button title="視点を戻す" aria-label="視点を戻す" onClick={()=>api.current?.reset()}><RotateCcw size={20}/></button><button title="猫の3Dモデルを保存" aria-label="猫の3Dモデルを保存" onClick={()=>api.current?.download()}><Download size={20}/></button></div>
 <section className="bottom-panel"><p className="message" role="status">{error||(!ready?'むぎのお部屋を準備しています…':message)}</p><div className="actions"><button disabled={!ready} aria-pressed={mode==='pet'} onClick={()=>choose('pet')}><Hand/><span>なでる<small>猫をドラッグ</small></span><kbd>1</kbd></button><button disabled={!ready} aria-pressed={mode==='toy'} onClick={()=>choose('toy')}><Sparkles/><span>おもちゃ<small>マウスでじゃらす</small></span><kbd>2</kbd></button><button disabled={!ready} aria-pressed={mode==='feed'} onClick={()=>choose('feed')}><Fish/><span>ごはん<small>クリックであげる</small></span><kbd>3</kbd></button><button className="talk-button" disabled={!ready} aria-pressed={talkState==='listening'} onClick={startTalking}>{talkState==='thinking'?<LoaderCircle className="spin"/>:talkState==='listening'||talkState==='speaking'?<MicOff/>:<Mic/>}<span>{talkState==='idle'||talkState==='unavailable'?'話す':'止める'}<small>{talkState==='thinking'?'考え中…':talkState==='speaking'?'お返事中…':'マイクで話しかける'}</small></span></button></div><p className="hint">「話す」を押した時だけマイクを使います <b>·</b> 右ドラッグ：見回す <b>·</b> 1・2・3：触れ合いを選ぶ</p></section></main>;
}

