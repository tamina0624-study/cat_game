import * as T from 'three';
import {groundHeight} from './navigation';
const DOWN=new T.Vector3(0,-1,0);
export class CatGait {
 legs: {name:string;upper:T.Object3D;lower:T.Object3D;foot:T.Object3D;l1:number;l2:number;front:boolean;neutral:T.Vector3;anchor:T.Vector3;from:T.Vector3;to:T.Vector3;progress:number;swing:boolean;wasSwing:boolean;offset:number}[]=[];
 cycle=0;
 constructor(private cat:T.Object3D){for(const [i,name] of ['FL','HR','FR','HL'].entries()){
  const upper=cat.getObjectByName('Upper'+name)!,lower=cat.getObjectByName('Lower'+name)!,foot=cat.getObjectByName('Foot'+name)!;if(!upper||!lower||!foot)throw Error('Missing walking joint '+name);
  const front=name[0]==='F',neutral=new T.Vector3(upper.position.x,.064,upper.position.z+.015),anchor=cat.localToWorld(neutral.clone());anchor.y=groundHeight(anchor.x,anchor.z)+.064;
  this.legs.push({name,upper,lower,foot,front,l1:front?.50:.47,l2:.48,neutral,anchor,from:anchor.clone(),to:anchor.clone(),progress:1,swing:false,wasSwing:false,offset:i*.25});
 }}
 update(dt:number,velocity:T.Vector3,turn:number,activity:'walk'|'play'|'groom'|'sit'|'sleep'|'stretch'='walk',time=0){
  const moving=velocity.length()>.035||Math.abs(turn)>.002;this.cycle+=velocity.length()*dt/.45+Math.abs(turn)*.38;
  this.cat.updateMatrixWorld(true);
  for(const leg of this.legs){
   const neutral=this.cat.localToWorld(leg.neutral.clone());neutral.y=groundHeight(neutral.x,neutral.z)+.064;
   const q=(this.cycle+leg.offset)%1,wantSwing=q>.72;
   const targetLocal=this.cat.worldToLocal(leg.anchor.clone()),reach=targetLocal.distanceTo(leg.upper.position),needsStep=reach>leg.l1+leg.l2-.012||(!moving&&neutral.distanceTo(leg.anchor)>.13);
   if(!leg.swing&&((moving&&wantSwing&&!leg.wasSwing)||(needsStep&&this.legs.filter(l=>l.swing).length<2))){leg.swing=true;leg.progress=0;leg.from.copy(leg.anchor);leg.to.copy(neutral).addScaledVector(velocity,.30);leg.to.y=groundHeight(leg.to.x,leg.to.z)+.064;}
   leg.wasSwing=wantSwing;
   if(leg.swing){leg.progress=Math.min(1,leg.progress+dt/.27);const p=leg.progress,s=p*p*(3-2*p);leg.anchor.lerpVectors(leg.from,leg.to,s);leg.anchor.y+=Math.sin(Math.PI*p)*.11;if(p===1)leg.swing=false;}
   let goal=leg.anchor.clone();
   if(activity==='play'&&leg.name==='FL'){
    goal=neutral.clone();goal.y+=.20+Math.sin(time*7)*.045;goal.add(this.cat.getWorldDirection(new T.Vector3()).multiplyScalar(.15));
   }
   if(activity==='groom'&&leg.front){
    const paw=(Math.floor(time*1.7)%2===0)===(leg.name==='FL');
    if(paw){
     const side=leg.name==='FL'?.18:-.18;
     goal=this.cat.localToWorld(new T.Vector3(side,1.36,.58));
     goal.y+=Math.sin(time*9)*.035;
    }
   }
   if(activity==='sit')goal=this.cat.localToWorld(new T.Vector3(leg.upper.position.x,.08,leg.front?.42:-.16));
   if(activity==='sleep')goal=this.cat.localToWorld(new T.Vector3(leg.upper.position.x*.78,.14,leg.front?.18:-.10));
   if(activity==='stretch')goal=this.cat.localToWorld(new T.Vector3(leg.upper.position.x,.07,leg.front?.64:-.36));
   this.solve(leg,this.cat.worldToLocal(goal));
  }
 }
 solve(leg:CatGait['legs'][number],goal:T.Vector3){
  const delta=goal.sub(leg.upper.position),d=Math.max(.05,Math.min(leg.l1+leg.l2-.002,delta.length())),dir=delta.normalize(),a=(leg.l1**2-leg.l2**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,leg.l1**2-a*a));
  const bend=new T.Vector3(0,0,leg.front?-1:1).addScaledVector(dir,-dir.z*(leg.front?-1:1)).normalize();const knee=dir.clone().multiplyScalar(a).addScaledVector(bend,h),end=dir.clone().multiplyScalar(d);
  leg.upper.quaternion.setFromUnitVectors(DOWN,knee.clone().normalize());const lowerWorld=new T.Quaternion().setFromUnitVectors(DOWN,end.sub(knee).normalize());leg.lower.quaternion.copy(leg.upper.quaternion).invert().multiply(lowerWorld);leg.foot.quaternion.copy(lowerWorld).invert();
 }
 inspect(){this.cat.updateMatrixWorld(true);return this.legs.map(l=>{const p=l.foot.getWorldPosition(new T.Vector3());return {name:l.name,swing:l.swing,x:p.x,y:p.y,z:p.z,ground:groundHeight(p.x,p.z),target:l.anchor.toArray()};});}
}
