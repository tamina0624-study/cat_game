import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function startModelReview(host:HTMLElement){
 const loaded=await new GLTFLoader().loadAsync('/models/mugi-tabby-white-v7.glb');
 const scene=new T.Scene();scene.background=new T.Color('#e8e4db');
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
 const camera=new T.PerspectiveCamera(34,1,.1,40);camera.position.set(3.7,2.15,6.1);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.04,0);controls.enablePan=false;controls.minDistance=3.4;controls.maxDistance=8;controls.minPolarAngle=.45;controls.maxPolarAngle=Math.PI*.48;controls.autoRotate=true;controls.autoRotateSpeed=.38;controls.enableDamping=true;
 scene.add(new T.HemisphereLight('#fff8eb','#66716a',2.4));const key=new T.DirectionalLight('#fff2d5',3.3);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);const fill=new T.DirectionalLight('#dce7eb',1.2);fill.position.set(4,2,-3);scene.add(fill);
 const floor=new T.Mesh(new T.CircleGeometry(3.25,96),new T.MeshStandardMaterial({color:'#d7d5cb',roughness:.92}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const fuzzCanvas=document.createElement('canvas');fuzzCanvas.width=fuzzCanvas.height=128;const fuzz=fuzzCanvas.getContext('2d')!;fuzz.fillStyle='#808080';fuzz.fillRect(0,0,128,128);for(let i=0;i<1500;i++){const x=Math.random()*128,y=Math.random()*128;fuzz.strokeStyle=Math.random()<.5?'#767676':'#8b8b8b';fuzz.lineWidth=.55;fuzz.beginPath();fuzz.moveTo(x,y);fuzz.lineTo(x+2+Math.random()*3,y+(Math.random()-.5)*1.5);fuzz.stroke();}const fuzzMap=new T.CanvasTexture(fuzzCanvas);fuzzMap.wrapS=fuzzMap.wrapT=T.RepeatWrapping;fuzzMap.repeat.set(7,7);
 const cat=loaded.scene;cat.position.y=.025;scene.add(cat);
 cat.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true;const isFace=/Eye|Whisker|Inner ear|Nose/i.test(o.name);for(const source of (Array.isArray(o.material)?o.material:[o.material]))if(source instanceof T.MeshStandardMaterial){const material=source.clone();material.metalness=0;material.roughness=isFace?.5:.78;if(!isFace){material.bumpMap=fuzzMap;material.bumpScale=.009;}material.needsUpdate=true;o.material=material;}if(o.name==='Torso coat')o.scale.set(.91,1.04,1.14);if(o.name==='Head_Sculpt')o.scale.set(.93,.96,.94);if(/^(Foreleg|Hindleg)_/.test(o.name))o.scale.set(.84,1.09,.87);if(/^Paw_/.test(o.name))o.scale.set(.9,.94,1.02);if(o.name==='Walking tail')o.scale.set(.9,1,1.08);});
 let frame=0,dead=false;const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const tick=()=>{if(dead)return;frame=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera);};tick();
 return {dispose(){dead=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());fuzzMap.dispose();renderer.dispose();renderer.domElement.remove();}};
}
