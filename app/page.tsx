'use client';
import { useEffect, useRef, useState } from 'react';
import { Hand, Fish, Sparkles, RotateCcw, Download, PawPrint } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { startGame, type GameAPI } from '@/lib/game';
export default function Home() {
 const mount=useRef<HTMLDivElement>(null), api=useRef<GameAPI|null>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState('pet'),[message,setMessage]=useState('むぎが、あなたを待っています。');
 const [stats,setStats]=useState({affection:42,fullness:55,fun:50});
 useEffect(()=>{if(!mount.current)return;try{api.current=startGame(mount.current,setMessage,setStats);setReady(true);}catch(e){console.error(e);setError('3Dを起動できませんでした。ChromeまたはEdgeのハードウェア アクセラレーションを有効にしてください。');}return()=>api.current?.dispose();},[]);
 function choose(next:string){setMode(next);api.current?.mode(next);}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['1','2','3'].includes(e.key))choose(({1:'pet',2:'toy',3:'feed'} as Record<string,string>)[e.key]);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 return <main className="game-shell"><div ref={mount} className="viewport" aria-label="座った猫のむぎがいる3Dの部屋"/>
 <header className="topbar"><div className="brand"><PawPrint size={26}/><div><h1>むぎの部屋</h1><p>いっしょに、のんびり。</p></div></div><span className="prototype">3D 試作版</span></header>
 <aside className="cat-card"><div className="cat-title"><span className="live-dot"/><h2>むぎ</h2><span>キジトラ</span></div><p>今日は、どんなふうに遊ぶ？</p>{[['affection','なかよし'],['fullness','おなか'],['fun','ごきげん']].map(([key,label])=><div className="stat" key={key}><div><span>{label}</span><span>{Math.round(stats[key as keyof typeof stats])}%</span></div><Progress aria-label={label} value={stats[key as keyof typeof stats]}/></div>)}</aside>
 <div className="view-controls"><button title="視点を戻す" aria-label="視点を戻す" onClick={()=>api.current?.reset()}><RotateCcw size={20}/></button><button title="猫の3Dモデルを保存" aria-label="猫の3Dモデルを保存" onClick={()=>api.current?.download()}><Download size={20}/></button></div>
 <section className="bottom-panel"><p className="message" role="status">{error||(!ready?'むぎのお部屋を準備しています…':message)}</p><div className="actions"><button disabled={!ready} aria-pressed={mode==='pet'} onClick={()=>choose('pet')}><Hand/><span>なでる<small>猫をドラッグ</small></span><kbd>1</kbd></button><button disabled={!ready} aria-pressed={mode==='toy'} onClick={()=>choose('toy')}><Sparkles/><span>おもちゃ<small>マウスでじゃらす</small></span><kbd>2</kbd></button><button disabled={!ready} aria-pressed={mode==='feed'} onClick={()=>choose('feed')}><Fish/><span>ごはん<small>クリックであげる</small></span><kbd>3</kbd></button></div><p className="hint">右ドラッグ：見回す <b>·</b> ホイール：ズーム <b>·</b> 1・2・3：触れ合いを選ぶ</p></section></main>;
}
