'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Rotate3D } from 'lucide-react';
import { startModelReview } from '@/lib/model-review';
import './review.css';

export default function ModelReviewPage(){
 const mount=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false,stop:{dispose:()=>void}|undefined;const host=mount.current;if(!host)return;startModelReview(host).then(model=>{stop=model;if(!cancelled)setReady(true);else model.dispose();}).catch(()=>{});return()=>{cancelled=true;stop?.dispose();};},[]);
 return <main className="review-shell"><div className="review-stage" ref={mount}/><header><a href="/"><ArrowLeft size={17}/>ゲームへ戻る</a><div><p>MODEL STUDY 02</p><h1>むぎ — 毛並みレビュー</h1></div><span className={ready?'ready':''}>{ready?'REVIEW READY':'LOADING'}</span></header><aside className="review-note"><span>01 / 毛流れ</span><h2>首からしっぽへ</h2><p>色・凹凸・粗さを同じ方向へ揃え、ランダムな粒ではなく短毛の流れとして見えるようにしています。</p><span>02 / 部位ごとの差</span><h2>胸・脚・しっぽを分ける</h2><p>背中としっぽは少し長めで柔らかく、脚と足先は短く整った毛として扱います。</p><span>03 / 輪郭と縞</span><h2>必要な場所だけ毛束を足す</h2><p>頬・胸・しっぽ・脚の外側にだけ控えめな毛束カードを置き、縞の境界にも暖色の色ムラを残しています。</p></aside><footer><Rotate3D size={16}/> ドラッグで回転　・　ホイールで拡大／縮小　・　この画面ではゲーム行動を実行しません</footer></main>;
}
