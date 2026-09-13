'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Rotate3D } from 'lucide-react';
import { startModelReview } from '@/lib/model-review';
import './review.css';

export default function ModelReviewPage(){
 const mount=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false,stop:{dispose:()=>void}|undefined;const host=mount.current;if(!host)return;startModelReview(host).then(model=>{stop=model;if(!cancelled)setReady(true);else model.dispose();}).catch(()=>{});return()=>{cancelled=true;stop?.dispose();};},[]);
 return <main className="review-shell"><div className="review-stage" ref={mount}/><header><a href="/"><ArrowLeft size={17}/>ゲームへ戻る</a><div><p>MODEL STUDY 01</p><h1>むぎ — 立ち姿レビュー</h1></div><span className={ready?'ready':''}>{ready?'REVIEW READY':'LOADING'}</span></header><aside className="review-note"><span>01 / 体型・骨格</span><h2>猫らしい輪郭へ</h2><p>胴を少し長く細く、頭を控えめに。前後脚は細く長くし、足先のボリュームを整えています。</p><span>02 / 短毛の質感</span><h2>毛は線ではなく表面へ</h2><p>全身の毛を細かな凹凸と粗さで表現しています。近づくと短毛の方向性が見え、離れると自然な毛並みに見える設計です。</p></aside><footer><Rotate3D size={16}/> ドラッグで回転　・　ホイールで拡大／縮小　・　この画面ではゲーム行動を実行しません</footer></main>;
}
