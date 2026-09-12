export type Point={x:number;z:number};
export const ROOM={minX:-3.45,maxX:3.45,minZ:-2.45,maxZ:2.65};
export const BOWL:Point={x:1.3,z:1.45};
export const FEED_SPOT:Point={x:1.3,z:.11};
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Clearance includes the cat's head and tail at the low bench, and paws at the bowl. */
export function isFree(p:Point){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=ROOM.minX&&p.x<=ROOM.maxX&&p.z>=ROOM.minZ&&p.z<=ROOM.maxZ&&!(p.x>.5&&p.x<4.8&&p.z<-.98)&&distance(p,BOWL)>1.26;}
export function clearSegment(a:Point,b:Point){const n=Math.max(1,Math.ceil(distance(a,b)/.08));for(let i=0;i<=n;i++)if(!isFree({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;}
export function findPath(start:Point,goal:Point):Point[]{
 if(!isFree(start)||!isFree(goal))return [];if(clearSegment(start,goal))return [{...goal}];
 const step=.24,nx=Math.floor((ROOM.maxX-ROOM.minX)/step)+1,nz=Math.floor((ROOM.maxZ-ROOM.minZ)/step)+1;
 const point=(id:number)=>({x:ROOM.minX+(id%nx)*step,z:ROOM.minZ+Math.floor(id/nx)*step});
 const valid=Array.from({length:nx*nz},(_,i)=>isFree(point(i)));
 const nearest=(p:Point)=>{let id=-1,best=Infinity;for(let i=0;i<valid.length;i++)if(valid[i]){const d=distance(p,point(i));if(d<best&&clearSegment(p,point(i))){best=d;id=i;}}return id;};
 const first=nearest(start),last=nearest(goal);if(first<0||last<0)return [];
 const open=new Set([first]),g=new Map([[first,0]]),parent=new Map<number,number>();
 while(open.size){let current=-1,best=Infinity;for(const i of open){const score=(g.get(i)??Infinity)+distance(point(i),point(last));if(score<best){best=score;current=i;}}
  if(current===last){const ids=[last];while(ids[ids.length-1]!==first)ids.push(parent.get(ids[ids.length-1])!);const raw=[start,...ids.reverse().map(point),goal],result:Point[]=[];let at=0;while(at<raw.length-1){let next=raw.length-1;while(next>at+1&&!clearSegment(raw[at],raw[next]))next--;result.push(raw[next]);at=next;}return result;}
  open.delete(current);const x=current%nx,z=Math.floor(current/nx);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const id=zz*nx+xx;if(!valid[id]||!clearSegment(point(current),point(id)))continue;const cost=best===Infinity?Infinity:(g.get(current)??Infinity)+step*Math.hypot(dx,dz);if(cost<(g.get(id)??Infinity)){g.set(id,cost);parent.set(id,current);open.add(id);}}
 }
 return [];
}
export function groundHeight(x:number,z:number){const r=Math.hypot(x/2.5,(z-.2)/2);const a=Math.max(0,Math.min(1,(1.025-r)/.05));return .053*a*a*(3-2*a);}
export class WanderController{
 position:Point={x:0,z:0};yaw=0;speed=0;path:Point[]=[];wait=3;goal:Point|null=null;kind:'roam'|'feed'='roam';turning=0;
 constructor(private random= Math.random){}
 request(goal:Point,kind:'roam'|'feed'='roam'){const route=findPath(this.position,goal);if(!route.length)return false;this.path=route;this.goal={...goal};this.kind=kind;this.wait=0;return true;}
 pause(seconds:number){this.path=[];this.goal=null;this.speed=0;this.wait=Math.max(this.wait,seconds);}
 update(dt:number,paused=false){dt=Math.min(.05,Math.max(0,dt));const previous={...this.position};this.turning=0;
  if(paused){this.speed=0;return {dx:0,dz:0,arrived:false};}
  if(!this.path.length){this.speed=0;this.wait-=dt;if(this.wait<=0&&this.kind==='roam'){for(let i=0;i<40;i++){const target={x:ROOM.minX+.2+this.random()*(ROOM.maxX-ROOM.minX-.4),z:ROOM.minZ+.2+this.random()*(ROOM.maxZ-ROOM.minZ-.4)};if(distance(target,this.position)>.9&&this.request(target))break;}if(!this.path.length)this.wait=2;}return {dx:0,dz:0,arrived:false};}
  const target=this.path[0],d=distance(this.position,target),desired=Math.atan2(target.x-this.position.x,target.z-this.position.z);const angle=Math.atan2(Math.sin(desired-this.yaw),Math.cos(desired-this.yaw));const turn=Math.max(-dt*1.7,Math.min(dt*1.7,angle));this.yaw+=turn;this.turning=turn;
  const wanted=Math.abs(angle)>.38?0:Math.min(.55,d*1.8);this.speed+=(wanted-this.speed)*(1-Math.exp(-dt*6));
  const step=Math.min(d,this.speed*dt),next={x:this.position.x+Math.sin(this.yaw)*step,z:this.position.z+Math.cos(this.yaw)*step};
  if(clearSegment(this.position,next))this.position=next;else{this.path=[];this.speed=0;this.wait=.5;}
  let arrived=false;if(d<.075){this.path.shift();if(!this.path.length){this.speed=0;this.wait=3+this.random()*4;arrived=true;}}
  return {dx:this.position.x-previous.x,dz:this.position.z-previous.z,arrived};
 }
}
