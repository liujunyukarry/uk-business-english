import {sprintMotion} from './sprint.js?v=figurine9d';
import * as T from './vendor/three.module.js';
import {Group,Tween,Easing} from './vendor/tween.esm.js';
// A screen-space effects layer keeps glow, trails and hit bursts crisp on mobile,
// without one draw call or shadow-casting mesh per particle.
export function protectionStatus(run){
 if(!run)return null;
 const pounce=run.character==='gold'?run.powerTime:0;
 if(run.fever>0||pounce>0){const dash=run.fever>=pounce;return {label:dash?'冲刺破障':'飞扑破障',time:Math.max(run.fever,pounce),max:dash?4.2:1.9,gold:true};}
 if(run.itemShield>0||run.powerTime>0&&run.powerShield){const item=run.itemShield>=run.powerTime||!run.powerShield;return {label:'护盾 · 挡一次',time:item?run.itemShield:run.powerTime,max:item?12:3.1,gold:false};}
 if(run.invincible>0&&run.hurtTime<=0)return {label:'余留保护',time:run.invincible,max:.9,gold:false};
 return null;
}
export class Juice {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.group=new Group();this.clock=0;this.particles=[];this.rings=[];this.pop={scale:1,flash:0,boost:0};this.w=0;this.h=0;this.projected=new T.Vector3();this.stepTimer=0;this.boundBeats=[null,null];}
 resize(w,h){this.w=w;this.h=h;this.canvas.width=Math.round(w*Math.min(devicePixelRatio||1,1.5));this.canvas.height=Math.round(h*Math.min(devicePixelRatio||1,1.5));this.ctx.setTransform(this.canvas.width/w,0,0,this.canvas.height/h,0,0);}
 reset(){this.boundBeats=[null,null];this.stepTimer=0;this.lastProtection=null;this.protectionEnd=0;this.group.removeAll();this.particles.length=0;this.rings.length=0;Object.assign(this.pop,{scale:1,flash:0,boost:0});}
 pulse(kind){this.group.removeAll();Object.assign(this.pop,{scale:kind==='land'?.83:1.16,flash:kind==='hurt'?.5:kind==='smash'?.2:.06});new Tween(this.pop,this.group).to({scale:1,flash:0},kind==='hurt'?360:280).easing(Easing.Back.Out).start(this.clock);}
 project(x,y,z,camera){const v=this.projected.set(x,y,z).project(camera);return{x:(v.x+1)*this.w/2,y:(1-v.y)*this.h/2,visible:v.z>-1&&v.z<1};}
 emit(x,y,z,kind='gold',n=14){const colors={dust:['#f6ecd0','#ffffff','#e7dac0'],gold:['#ffe490','#ffba53','#fff8d6'],smash:['#e99c5b','#ffdba1','#fff3bd'],white:['#97efff','#ffffff','#bdc9ff'],hurt:['#ff8c8b','#ffc5a6','#fff5cb']};const palette=colors[kind]||colors.gold;for(let i=0;i<n;i++){if(this.particles.length>190)this.particles.shift();this.particles.push({x,y,z,vx:(Math.random()-.5)*5,vy:1.5+Math.random()*4,vz:(Math.random()-.5)*5,life:.55+Math.random()*.35,max:.9,size:kind==='smash'?5+Math.random()*7:kind==='dust'?2+Math.random()*2:2+Math.random()*4,color:palette[i%3],kind,spin:Math.random()*6});}}
 shatter(o,shield=false,reduced=false){
  const palette=o.type==='snowball'?['#f0fcff','#9bd8ed','#ffffff']:o.type==='wave'?['#75ddec','#e5fffb','#ffffff']:o.type==='gate'?['#b899ed','#ffe19a','#d9c9fa']:shield?['#9de8f5','#e4fcff','#b9c9ff']:['#eab577','#ffd98b','#fff0bc'];
  const count=reduced?10:30;
  for(let i=0;i<count;i++){
   if(this.particles.length>=190)this.particles.shift();const side=i%2?1:-1;
   this.particles.push({x:o.x,y:.35+(i%5)*.32,z:o.z+side*.12,vx:3+Math.random()*4,vy:2+Math.random()*4,vz:side*(2+Math.random()*4),life:.75+Math.random()*.2,max:.95,size:5+Math.random()*7,color:palette[i%3],kind:'smash',spin:i*.7});
  }
  this.ring(o.x,.15,o.z,shield?'#a4f1ff':'#ffe3a1');this.ring(o.x,1.1,o.z,shield?'#efffff':'#fff5d3');
 }
 ring(x,y,z,color='#fff0b8'){this.rings.push({x,y,z,life:.48,color});if(this.rings.length>10)this.rings.shift();}
 collect(o,run){this.emit(o.x,o.y,o.z,run.character==='white'&&run.powerTime>0?'white':'gold',4);this.particles.push({x:o.x,y:o.y,z:o.z,vx:0,vy:0,vz:0,life:.36,max:.36,size:6,color:'#fff1ad',kind:'collect',target:run});}
 drawProtection(dt,camera,run,mode,reduced){
  if(!run||mode!=='running'){this.lastProtection=null;this.protectionEnd=0;return;}
  const state=protectionStatus(run),c=this.ctx;
  if(this.lastProtection&&!state)this.protectionEnd=.65;
  this.lastProtection=state;this.protectionEnd=Math.max(0,(this.protectionEnd||0)-dt);
  if(!state&&!this.protectionEnd)return;
  const centre=this.project(run.x,run.y+1.2,run.z,camera),head=this.project(run.x,run.y+(run.slideTime>0?2:3),run.z,camera);
  if(!head.visible)return;
  const ending=state&&state.time<=.8,color=state?(ending?'#ffae48':state.gold?'#ffe071':'#8eebff'):'#f4f1dd';
  if(state?.gold){
   const r=Math.max(23,Math.min(105,Math.abs(centre.y-head.y)*.86)),pulse=reduced?1:1+Math.sin(this.clock*.009)*.035;
   c.save();c.strokeStyle=color;c.lineWidth=4;c.shadowColor='#ffbd36';c.shadowBlur=reduced?0:14;c.globalAlpha=.95;
   c.beginPath();c.ellipse(centre.x,centre.y,r*.78*pulse,r*pulse,0,0,Math.PI*2);c.stroke();
   c.shadowBlur=0;c.lineWidth=1.5;c.strokeStyle='#fff9cf';c.beginPath();c.ellipse(centre.x,centre.y,r*.87,r*1.06,0,0,Math.PI*2);c.stroke();c.restore();
  }
  // Follow the dog in screen space, with a solid backplate readable on every world.
  const width=132,x=Math.max(8,Math.min(this.w-width-8,head.x-width/2)),y=Math.max(8,Math.min(this.h-46,head.y-36));
  c.save();c.globalAlpha=1;c.fillStyle='#203f45';c.fillRect(x,y,width,32);c.strokeStyle=color;c.lineWidth=1.5;c.strokeRect(x,y,width,32);
  c.font='bold 12px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;
  const label=state?(ending?'快结束 '+(Math.ceil(state.time*10)/10).toFixed(1)+'s':state.label+' '+(Math.ceil(state.time*10)/10).toFixed(1)+'s'):'保护结束 · 注意躲避';
  c.fillText(label,x+width/2,y+12);
  c.fillStyle='#527078';c.fillRect(x+6,y+23,width-12,4);
  if(state){c.fillStyle=color;c.fillRect(x+6,y+23,(width-12)*Math.min(1,state.time/state.max),4);}
  c.restore();
 }
 update(dt,camera,run,mode,reduced=false){this.clock+=dt*1000;this.group.update(this.clock);const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);if(!w)return;
 if(run&&mode==='running'){
  const boost=run.boosted,power=run.powerTime>0;this.pop.boost+=(Number(boost)-this.pop.boost)*Math.min(1,dt*8);
  // Every airborne collectible has a grounded marker and a visible connecting line.
  for(const o of run.data.items){const dx=o.x-run.x;if(o.taken||!['bone','star'].includes(o.type)||dx<-.7||dx>24)continue;const p=this.project(o.x,o.y,o.z,camera),ground=this.project(o.x,Math.max(0,run.ground(o.x,o.z))+.04,o.z,camera);if(!p.visible)continue;
   const a=Math.min(1,(26-dx)/12),s=Math.max(3,14/(1+Math.max(0,dx)/9)),high=o.y>1.25;const color=high?'#66d9ef':'#ffc65d';c.globalAlpha=a*.8;c.strokeStyle=color;c.lineWidth=1.7;c.beginPath();c.ellipse(ground.x,ground.y,s*.85,s*.28,0,0,Math.PI*2);c.stroke();
   if(high){c.globalAlpha=a*.55;c.setLineDash([3,4]);c.beginPath();c.moveTo(ground.x,ground.y);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);}
   const glow=c.createRadialGradient(p.x,p.y,1,p.x,p.y,s*2.7);glow.addColorStop(0,high?'#a8f3ff44':'#ffe48444');glow.addColorStop(1,'#ffffff00');c.globalAlpha=a;c.fillStyle=glow;c.fillRect(p.x-s*3,p.y-s*3,s*6,s*6);
  }c.globalAlpha=1;
  if(!reduced){
   if(boost&&run.y<.3&&run.slideTime<=0){
    for(let i=0;i<2;i++){
     const b=sprintMotion(run.time+i*.12),z=run.z+(i?(run.z<=0?1.35:-1.35):0);
     if(this.boundBeats[i]!==b.beat){
      if(this.boundBeats[i]!==null){this.emit(run.x-.35,.08,z,'dust',5);this.emit(run.x-.5,.14,z,'gold',3);this.ring(run.x-.15,.03,z,'#ffe5a0');}
      this.boundBeats[i]=b.beat;
     }
    }
   }else{this.boundBeats=[null,null];this.stepTimer+=dt;if(this.stepTimer>.11&&run.y<.3){this.stepTimer=0;this.emit(run.x-.4,.1,run.z,power?'white':'dust',1);}}
  }
  if(boost&&!reduced){const centre={x:w*.5,y:h*.42};c.lineCap='round';for(let i=0;i<18;i++){const phase=(this.clock*.00065+i*.618)%1,angle=i*2.4,r=(.4+phase*.7)*Math.max(w,h)*.48;const x=centre.x+Math.cos(angle)*r,y=centre.y+Math.sin(angle)*r;c.globalAlpha=(1-phase)*.35;c.strokeStyle=i%2?'#fff7d4':'#ffd179';c.lineWidth=i%3===0?3:1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*r*.28,y+Math.sin(angle)*r*.28);c.stroke();}c.globalAlpha=1;}
  if(power&&run.character==='white'){
   // A blue protective bubble has a different silhouette from the golden dash.
   const p=this.project(run.x,run.y+1.1,run.z,camera),top=this.project(run.x,run.y+2.7,run.z,camera),r=Math.max(10,Math.abs(p.y-top.y)*.94);
   const glow=c.createRadialGradient(p.x-r*.28,p.y-r*.35,r*.12,p.x,p.y,r);
   glow.addColorStop(0,'#e3fdff08');glow.addColorStop(.78,'#a9f4ff10');glow.addColorStop(1,run.powerShield?'#6fcfe870':'#9be6f228');
   c.fillStyle=glow;c.beginPath();c.ellipse(p.x,p.y,r*.86,r,0,0,Math.PI*2);c.fill();c.strokeStyle=run.powerShield?'#e7ffff':'#9ce4ed';c.lineWidth=run.powerShield?3:1.5;c.stroke();
   c.beginPath();c.ellipse(p.x,p.y,r*.75,r*.87,0,3.6,4.9);c.stroke();
   // Short converging arcs reveal the bone magnet without hiding the course.
   if(!reduced)for(let i=0;i<5;i++){const a=this.clock*.0018+i*Math.PI*.4,q=1-((this.clock*.001+i*.2)%1),rx=r*(1+q*.4);c.globalAlpha=(1-q)*.65;c.strokeStyle='#b4f9ff';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,rx*.95,rx*.65,-.2,a,a+.45);c.stroke();}c.globalAlpha=1;
  }
  if(boost){
   // Low, tapered slipstreams leave both animated bodies fully visible.
   for(const side of [-1,1]){const a=this.project(run.x+.45,run.y+.35,run.z+side*.58,camera),b=this.project(run.x-2.1,run.y+.18,run.z+side*.72,camera);c.globalAlpha=.7*this.pop.boost;c.strokeStyle='#ffeaa0';c.lineWidth=3;c.beginPath();c.moveTo(a.x,a.y);c.quadraticCurveTo((a.x+b.x)/2+side*9,a.y,b.x,b.y);c.stroke();}c.globalAlpha=1;
  }
 }
 for(let i=this.rings.length-1;i>=0;i--){const r=this.rings[i];r.life-=dt;if(r.life<=0){this.rings.splice(i,1);continue;}const p=this.project(r.x,r.y,r.z,camera);const s=(1-r.life/.48)*55;c.globalAlpha=r.life/.48;c.strokeStyle=r.color;c.lineWidth=3*r.life/.48;c.beginPath();c.ellipse(p.x,p.y,s,s*.3,0,0,Math.PI*2);c.stroke();}
 for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.particles.splice(i,1);continue;}if(p.kind==='collect'){p.x+=(p.target.x-p.x)*Math.min(1,dt*17);p.y+=(1.3-p.y)*dt*13;p.z+=(p.target.z-p.z)*dt*13;}else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*8;}
  const v=this.project(p.x,p.y,p.z,camera);if(!v.visible)continue;c.globalAlpha=Math.min(1,p.life*3)*(p.kind==='dust'?.42:1);c.fillStyle=p.color;c.save();c.translate(v.x,v.y);c.rotate(p.spin||this.clock*.004);if(p.kind==='smash')c.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);else{c.beginPath();c.arc(0,0,p.size*Math.min(1,p.life*4),0,Math.PI*2);c.fill();}c.restore();
 }c.globalAlpha=1;if(this.pop.flash>.01&&!reduced){c.fillStyle=`rgba(255,235,194,${this.pop.flash})`;c.fillRect(0,0,w,h);}
 this.drawProtection(dt,camera,run,mode,reduced);
 }
}
