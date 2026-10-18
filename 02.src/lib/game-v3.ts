import { createCatVoice } from './cat-voice';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
type Stats={affection:number;fullness:number;fun:number};
export type GameAPI={mode:(m:string)=>void;reset:()=>void;muted:(value:boolean)=>void;download:()=>void;dispose:()=>void};
export async function startGame(host:HTMLElement,say:(s:string)=>void,report:(s:Stats)=>void):Promise<GameAPI>{
 const loaded=await new GLTFLoader().loadAsync('/models/mugi-calico-v3.glb');
 const voice=createCatVoice();
 const scene=new T.Scene();scene.background=new T.Color('#e3e7dd');scene.fog=new T.Fog('#e3e7dd',15,35);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(36,1,.1,70);camera.position.set(4.2,3.1,7.9);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,1.18,0);orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=4.2;orbit.maxDistance=12;orbit.maxPolarAngle=Math.PI*.48;orbit.minPolarAngle=.45;orbit.mouseButtons={LEFT:null as unknown as T.MOUSE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};orbit.update();
 scene.add(new T.HemisphereLight('#fff8e5','#7a8270',2.6));const sun=new T.DirectionalLight('#fff1d2',4);sun.position.set(-3,7,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:22});sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;scene.add(sun);
 const mat=(color:string,roughness=.8)=>new T.MeshStandardMaterial({color,roughness});const wood=mat('#bc9874'),cream=mat('#e1e4d3'),dark=mat('#3e4941'),white=mat('#d9d2bd');
 function mesh(g:T.BufferGeometry,m:T.Material,p:T.Object3D,pos:number[],scale=[1,1,1],name=''){const x=new T.Mesh(g,m);x.position.set(...pos as [number,number,number]);x.scale.set(...scale as [number,number,number]);x.castShadow=true;x.receiveShadow=true;x.name=name;p.add(x);return x;}
 const sphere=new T.SphereGeometry(1,40,28);
 function ell(p:T.Object3D,m:T.Material,pos:number[],s:number[],name=''){return mesh(sphere,m,p,pos,s,name);}
 function box(p:T.Object3D,m:T.Material,pos:number[],s:number[]){return mesh(new T.BoxGeometry(1,1,1),m,p,pos,s);}
 function tube(p:T.Object3D,m:T.Material,points:number[][],radius:number){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v as [number,number,number]))),32,radius,8,false),m,p,[0,0,0]);}
 box(scene,wood,[0,-.14,0],[24,.25,24]);for(let i=-10;i<11;i++)box(scene,mat('#a98b6b'),[i,-.01,0],[.015,.005,24]);
 box(scene,cream,[0,3,-4],[24,6,.16]);box(scene,mat('#afbca9'),[-5,3,0],[.15,6,16]);box(scene,white,[0,.15,-3.86],[24,.28,.1]);
 // Soft woven rug and a low window with afternoon light.
 const rug=mesh(new T.CylinderGeometry(2.5,2.5,.055,96),mat('#b5c3b1'),scene,[0,.025,.2],[1,1,.8]);rug.receiveShadow=true;
 for(let i=0;i<9;i++){const ring=mesh(new T.TorusGeometry(2.46-i*.025,.006,4,100),mat('#d1d7c1'),scene,[0,.057,.2],[1,.8,1]);ring.rotation.x=-Math.PI/2;}
 box(scene,mat('#9caa93'),[-2,2.85,-3.74],[2.7,2.8,.12]);box(scene,new T.MeshStandardMaterial({color:'#d6e8e4',emissive:'#d6e8e4',emissiveIntensity:.35}),[-2,2.85,-3.65],[2.46,2.55,.08]);for(const x of [-3.28,-2,-.72])box(scene,white,[x,2.85,-3.52],[.075,2.75,.12]);box(scene,white,[-2,2.85,-3.52],[2.7,.07,.12]);box(scene,wood,[-2,1.4,-3.45],[3,.14,.6]);
 box(scene,wood,[2.65,.62,-2.7],[1.6,.13,.7]);for(const x of [2,3.3])box(scene,dark,[x,.3,-2.7],[.07,.6,.5]);
 mesh(new T.CylinderGeometry(.29,.2,.5,32),mat('#bd7350'),scene,[2.7,.92,-2.7]);for(let i=0;i<7;i++){const a=i*2.4;const leaf=ell(scene,mat(i%2?'#45674d':'#6a845a'),[2.7+Math.sin(a)*.2,1.45+(i%3)*.12,-2.7+Math.cos(a)*.2],[.12,.4,.045]);leaf.rotation.z=Math.sin(a)*.6;}
 const cat=loaded.scene;scene.add(cat);
 cat.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 const required=(name:string)=>{const o=cat.getObjectByName(name);if(!o)throw new Error('Missing model node '+name);return o;};
 const head=required('HeadRoot'),tail=required('TailRoot'),paws=[required('PawL'),required('PawR')],eyes=[required('EyeL'),required('EyeR')];
 const bowl=new T.Group();bowl.position.set(.9,.09,1.3);scene.add(bowl);mesh(new T.CylinderGeometry(.37,.3,.16,40),mat('#698c81',.4),bowl,[0,0,0]);mesh(new T.CylinderGeometry(.3,.3,.025,40),mat('#4e695c'),bowl,[0,.085,0]);const food=new T.Group();bowl.add(food);for(let i=0;i<20;i++){const a=i*2.4,r=.25*Math.sqrt(i/20);ell(food,mat('#976140'),[Math.cos(a)*r,.12,Math.sin(a)*r],[.04,.028,.035]);}food.visible=false;
 const toy=new T.Group();scene.add(toy);toy.visible=false;const ball=ell(toy,mat('#c96b48'),[0,0,0],[.11,.13,.11]);for(let i=0;i<3;i++){const f=ell(toy,mat(['#cc9d48','#76997e','#e8d2a6'][i]),[i*.04-.03,.15+i*.05,0],[.038,.18,.015]);f.rotation.z=(i-1)*.45;}
 const string=tube(toy,mat('#dbd8b9'),[[0,.1,0],[.2,.7,0],[.6,1.2,0]],.009);string.castShadow=false;
 const ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,0,1),-.85),target=new T.Vector3(0,1.4,1);let wasEating=false;let active='pet',down=false,petUntil=0,feedUntil=0,playUntil=0,lastReward=0,lastReport=0,lastMove=0,frame=0,disposed=false;const stats={affection:42,fullness:55,fun:50};const clock=new T.Clock();
 function reward(key:keyof Stats,n:number,t:number){if(t-lastReward<.3)return;stats[key]=Math.min(100,stats[key]+n);lastReward=t;report({...stats});}
 function locate(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);ray.ray.intersectPlane(plane,target);target.x=T.MathUtils.clamp(target.x,-1.5,1.5);target.y=T.MathUtils.clamp(target.y,.5,2.6);}
 function pet(t:number){if(ray.intersectObject(cat,true).length){petUntil=t+1.3;void voice.play();reward('affection',2,t);say('ごろごろ… なでてもらえて、うれしそう。');}}
 function onDown(e:PointerEvent){if(e.button!==0)return;voice.unlock();down=true;locate(e);if(active==='pet')pet(clock.elapsedTime);if(active==='toy'){playUntil=clock.elapsedTime+1.2;reward('fun',2,clock.elapsedTime);}if(active==='feed')feed();}
 function onMove(e:PointerEvent){locate(e);const t=clock.elapsedTime;if(active==='pet'&&down)pet(t);if(active==='toy'){lastMove=t;playUntil=t+.7;if(Math.abs(target.x)<1&&target.y<2.5){reward('fun',1,t);say('おもちゃに夢中！ 前足で、ちょいちょい。');}}}
 function up(){down=false;}
 function feed(){const t=clock.elapsedTime;if(t<feedUntil){say('もぐもぐ… ゆっくり食べています。');return;}if(stats.fullness>=98){say('おなかいっぱい。少し休もうね。');return;}feedUntil=t+4;food.visible=true;stats.fullness=Math.min(100,stats.fullness+18);stats.affection=Math.min(100,stats.affection+3);report({...stats});say('ごはんの時間。もぐもぐ、おいしいね。');}
 function mode(m:string){voice.unlock();active=m;toy.visible=m==='toy';say(m==='pet'?'猫の頭や体を、押しながらやさしくなでてね。':m==='toy'?'猫の近くでマウスを動かして、じゃらしてみよう。':'ごはんをあげました。もう一度あげるときは、部屋をクリック。');if(m==='feed')feed();}
 renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointermove',onMove);window.addEventListener('pointerup',up);
 const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function animate(){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;const eating=t<feedUntil,petting=t<petUntil,playing=active==='toy'&&t<playUntil;cat.scale.y=1+Math.sin(t*2.2)*.007;head.rotation.x=T.MathUtils.damp(head.rotation.x,eating?.65+Math.sin(t*9)*.045:petting?-.15:playing?T.MathUtils.clamp((1.8-target.y)*.3,-.25,.35):Math.sin(t*.5)*.035,6,dt);head.rotation.y=T.MathUtils.damp(head.rotation.y,eating?.34:playing?target.x*.35:petting?Math.sin(t*4)*.08:Math.sin(t*.42)*.09,5,dt);head.position.y=T.MathUtils.damp(head.position.y,eating?1.70:1.94,5,dt);const blink=(t%5.3)>5.1;for(const e of eyes)e.scale.y=T.MathUtils.damp(e.scale.y,petting?.16:blink?.08:1,22,dt);tail.rotation.y=Math.sin(t*(playing?5:1.4))*(playing?.2:.06);paws[0].rotation.x=T.MathUtils.damp(paws[0].rotation.x,playing?-.65-Math.sin(t*9)*.35:0,8,dt);paws[0].rotation.z=playing?Math.sin(t*7)*.2:0;toy.position.lerp(target,1-Math.exp(-dt*12));toy.rotation.z=Math.sin(t*5)*.1;ball.rotation.y=t;
 if(active==='toy'&&t-lastMove>3)toy.position.y+=Math.sin(t*3)*.04;
 if(wasEating&&!eating){void voice.play(true);say('ごちそうさま。ニャー！');}wasEating=eating;
 if(eating){bowl.position.lerp(new T.Vector3(.32,.09,.95),.08);food.scale.setScalar(Math.max(.05,(feedUntil-t)/4));}else {bowl.position.lerp(new T.Vector3(.9,.09,1.3),.08);food.visible=false;}
 if(t-lastReport>1){stats.fullness=Math.max(0,stats.fullness-.045);stats.fun=Math.max(0,stats.fun-.025);report({...stats});lastReport=t;}orbit.update();renderer.render(scene,camera);
 }
 animate();
 return {mode,muted:voice.muted,reset:()=>{camera.position.set(4.2,3.1,7.9);orbit.target.set(0,1.18,0);orbit.update();},download:()=>{const a=document.createElement('a');a.href='/models/mugi-calico-v3.glb';a.download='mugi-calico-v3.glb';a.click();say('Blenderで制作した猫のモデルを保存しました。');},dispose:()=>{voice.dispose();disposed=true;cancelAnimationFrame(frame);observer.disconnect();orbit.dispose();window.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointermove',onMove);const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>ms.add(m));}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
