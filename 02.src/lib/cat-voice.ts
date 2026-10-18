/** Meow by IgnasD, CC0: https://opengameart.org/content/meow */
export function createCatVoice(){
 let context:AudioContext|null=null,buffer:Promise<AudioBuffer>|null=null,active:AudioBufferSourceNode|null=null;
 let muted=false,disposed=false,pending=false,lastStart=-Infinity;
 const ensure=()=>context??(context=new AudioContext());
 function unlock(){if(disposed)return;const ctx=ensure();void ctx.resume().catch(()=>{});}
 async function play(afterMeal=false){
  if(disposed||muted||pending||active||(!afterMeal&&performance.now()-lastStart<3000))return;
  pending=true;
  try {const ctx=ensure();if(ctx.state!=='running')await ctx.resume();
   buffer??=fetch('/audio/meow.ogg').then(r=>{if(!r.ok)throw Error('Meow audio unavailable');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b));
   const clip=await buffer;
   if(disposed||muted||ctx.state!=='running')return;
   const source=ctx.createBufferSource(),volume=ctx.createGain();source.buffer=clip;volume.gain.value=.55;source.connect(volume);volume.connect(ctx.destination);active=source;
   source.onended=()=>{source.disconnect();volume.disconnect();if(active===source)active=null;};
   lastStart=performance.now();source.start();
  }catch {buffer=null;}finally{pending=false;}
 }
 return {unlock,play,muted:(value:boolean)=>{muted=value;if(value&&active){active.stop();active=null;}},dispose:()=>{disposed=true;if(active){active.stop();active=null;}if(context)void context.close();}};
}
