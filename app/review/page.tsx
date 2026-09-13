'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Rotate3D } from 'lucide-react';
import { startModelReview } from '@/lib/model-review';
import './review.css';

export default function ModelReviewPage(){
 const mount=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false,stop:{dispose:()=>void}|undefined;const host=mount.current;if(!host)return;startModelReview(host).then(model=>{stop=model;if(!cancelled)setReady(true);else model.dispose();}).catch(()=>{});return()=>{cancelled=true;stop?.dispose();};},[]);
 return <main className="review-shell"><div className="review-stage" ref={mount}/><header><a href="/"><ArrowLeft size={17}/>ゲームへ戻る</a><div><p>MODEL STUDY 02</p><h1>むぎ — 毛並みレビュー</h1></div><span className={ready?'ready':''}>{ready?'REVIEW READY':'LOADING'}</span></header><aside className="review-note"><span>01 / マットな短毛</span><h2>光沢を抑える</h2><p>毛の反射を大きく下げ、柔らかな拡散光だけが残る短毛に変更しました。</p><span>02 / 部位ごとの差</span><h2>胸・脚・しっぽを分ける</h2><p>背中としっぽは少し長めで柔らかく、脚と足先は短く整った毛として扱います。</p><span>03 / 模様の境目</span><h2>毛束で淡くつなぐ</h2><p>色のムラは撤回し、模様の境目だけを控えめな毛束カードで淡く見せる方針に変更しました。</p></aside><footer><Rotate3D size={16}/> ドラッグで回転　・　ホイールで拡大／縮小　・　この画面ではゲーム行動を実行しません</footer></main>;
}
