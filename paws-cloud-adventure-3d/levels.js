export const WORLDS=[
 {name:'花田浮岛',song:'童话出发 · Fairytale Waltz',texture:'钢片琴 · 双簧管 · 大提琴',track:'sunny-journey',sky:0xb7e9f1,fog:0xc8eff0,grass:0x95c976,soil:0xe4c394,accent:0xf8b6c4,water:0x8bcbd4},
 {name:'蜜桃海岸',song:'蜜桃潮汐 · Easy Lemon',texture:'吉他 · 马林巴 · 轻打击',track:'coast',sky:0xffd2ac,fog:0xffe0bd,grass:0xf7dd99,soil:0xd8ac86,accent:0xffafa0,water:0x63c6ca},
 {name:'萤火森林',song:'萤火秘境 · Enchanted Valley',texture:'木管 · 弦乐 · 幻想氛围',track:'forest',sky:0x8fc2b7,fog:0xb0d7bb,grass:0x72aa86,soil:0x927d62,accent:0xefd47a,water:0x5faba5},
 {name:'极光雪山',song:'雪间圆舞 · Frost Waltz',texture:'钢片琴 · 钟琴 · 弦乐',track:'snow',sky:0x9eafdc,fog:0xd4dff0,grass:0xe8f5fb,soil:0xa2c2dc,accent:0xa9eee1,water:0x6a9bbd},
 {name:'星光花园',song:'星光回忆 · Dreamy Flashback',texture:'竖琴 · 梦幻管弦',track:'night',sky:0x27364f,fog:0x526781,grass:0x76a9a5,soil:0x65728c,accent:0xffdba0,water:0x3d6480},
 {name:'云端城堡',song:'一起到家 · Eternal Hope',texture:'钢琴 · 弦乐 · 温暖渐进',track:'sky',sky:0xf7ccb8,fog:0xffe8cf,grass:0xc0d598,soil:0xebcbb0,accent:0xf6d37b,water:0xc3d9df}
];

const names=['野餐大作战','风车追逐','浪花节奏','沙滩滚球赛','树洞穿梭','树梢快递','雪球来啦','冰桥接力','星门节拍','月光冲刺','彩虹试炼','最后的派对'];
export const TEMPOS=[112,116,126,112,120,132];
const recipes=[
 ['intro','jump','springTrail','weave','reward','slide','choice','springTrail','treasure','final'],
 ['weave','jumpSlide','springTrail','choice','reward','break','slalom','springTrail','skywalk','final'],
 ['intro','wave','islands','wave','reward','ball','choice','islands','ramp','final'],
 ['ball','islands','wave','choice','reward','slalom','islands','jumpSlide','treasure','final'],
 ['intro','tunnel','skywalk','log','reward','springTrail','tunnel','skywalk','weave','final'],
 ['ramp','log','skywalk','jumpSlide','reward','gap','tunnel','skywalk','treasure','final'],
 ['intro','snowball','slalom','slide','reward','islands','snowball','slalom','ramp','final'],
 ['gap','snowball','islands','slalom','reward','gap','weave','snowball','skywalk','final'],
 ['intro','gate','portalRun','gate','reward','skywalk','choice','portalRun','treasure','final'],
 ['gate','portalRun','weave','break','reward','gate','portalRun','choice','ramp','final'],
 ['ramp','springTrail','tunnel','islands','reward','portalRun','slalom','jumpSlide','treasure','final'],
 ['weave','jumpSlide','springTrail','portalRun','reward','islands','skywalk','wave','break','final']
];
const labels={springTrail:'花朵弹跳 · 踩上自动起跳',islands:'跳岛小径 · 看准落点',skywalk:'树梢高桥 · 高低两条路',portalRun:'星光传送 · 同色门相连',slalom:'曲折冰隙 · 沿骨头换道',treasure:'礼物小径 · 收集道具',intro:'跟上骨头 · 热身',jump:'跳跃节拍',slide:'低头穿过',weave:'左右穿梭',choice:'选一条路',jumpSlide:'先跳，再滑',reward:'骨头派对',break:'饼干墙 · 飞扑击碎',ramp:'登上高桥',wave:'跳过浪花',ball:'滚球来袭',tunnel:'树洞滑行',log:'跨过倒木',gap:'断桥接力',snowball:'雪球滚过来了',gate:'星门 · 找到空位',final:'终点冲刺'};
export const LEVELS=names.map((name,i)=>{const world=Math.floor(i/2),speed=9.2+i*.28,beat=60/TEMPOS[world],phrase=beat*speed*8;return{id:i,name,world,speed,beat,length:18+phrase*10+12,lesson:labels[recipes[i][0]]+' · 左右换道，上跳下滑'};});
export const LANES=[-2.25,0,2.25];
export const FEVER_DURATION=4.2,FEVER_TARGET=28,SLIDE_DURATION=1.05;
export function resultStars(run){return run.state==='clear'?1+Number(run.stars===3)+Number(run.hp===3):0;}
export const HAZARDS={crate:{height:.88,low:0,half:.55},tall:{height:2.9,low:0,half:.70},bar:{height:3.02,low:1.34,half:.42},mover:{height:1.3,low:0,half:.65},wave:{height:.75,low:0,half:.5},log:{height:.93,low:0,half:.7},tunnel:{height:3.42,low:1.34,half:1.4},snowball:{height:1.45,low:0,half:.72},gate:{height:3.3,low:0,half:.6},break:{height:1.1,low:0,half:.45}};
export function moverZ(o,time){return LANES[o.lane]+Math.sin(time*1.7+o.phase)*.38;}
export function rampHeight(p,x){return p.height*Math.max(0,Math.min(1,(x-p.a)/p.ramp,(p.b-x)/p.ramp));}
export function platformHeight(platforms,x,z){let h=0;for(const p of platforms)if(x>=p.a&&x<=p.b&&Math.abs(z-LANES[p.lane])<.91)h=Math.max(h,rampHeight(p,x));return h;}
export function levelData(index){
 const l=LEVELS[index],items=[],gaps=[],platforms=[],sections=[];let id=0;
 const put=(type,x,lane=1,y=0,extra={})=>{const o={id:id++,type,x,lane,z:LANES[lane],y,...extra};items.push(o);return o;};
 const line=(x,lane,n=5,step=1.2,y=.72)=>{for(let k=0;k<n;k++)put('bone',x+k*step,lane,y);};
 const B=l.beat*l.speed,P=B*8;
 const jumpRow=(type,x)=>{for(let a=0;a<3;a++)put(type,x,a);};
 const wall=(x,safe,type='tall')=>{for(let a=0;a<3;a++)if(a!==safe)put(type,x,a);line(x-4,safe,7,1.2);};
 recipes[index].forEach((kind,n)=>{
  const x=18+n*P,lane=(n+index)%3,other=(lane+1)%3;
  sections.push({a:x,b:x+P,kind,label:labels[kind],number:n});
  if(kind==='intro'){line(x,1,8);put('crate',x+B*3,1);line(x+B*4,2,6);put('bar',x+B*6,2);}
  if(kind==='jump'||kind==='log'||kind==='wave'){for(const beat of [2,5.8])jumpRow(kind==='jump'?'crate':kind,x+B*beat);line(x,1,6);line(x+B*3.2,lane,6);}
  if(kind==='slide'||kind==='tunnel'){jumpRow(kind==='slide'?'bar':'tunnel',x+B*2);line(x,1,9);wall(x+B*6,lane);}
  if(kind==='jumpSlide'){jumpRow('crate',x+B*1.7);jumpRow('bar',x+B*4.0);wall(x+B*6.5,lane);line(x,1,5);line(x+B*2.6,1,5);}
  if(kind==='weave'||kind==='gate'){[1.7,4.1,6.5].forEach((b,k)=>wall(x+B*b,(lane+k)%3,kind==='gate'?'gate':'tall'));}
  if(kind==='choice'){put('bar',x+B*2,lane);put('crate',x+B*2,other);put('tall',x+B*2,(lane+2)%3);line(x,lane,9);line(x,other,5);wall(x+B*5.5,other);}
  if(kind==='ball'||kind==='snowball'){wall(x+B*1.5,lane);put(kind==='ball'?'mover':'snowball',x+B*4,lane,0,{phase:n});put('tall',x+B*4,(lane+2)%3);line(x+B*3.3,other,7);wall(x+B*6.5,other);}
  if(kind==='gap'){gaps.push({a:x+B*2,b:x+B*2+3.5,lane});put('tall',x+B*2,(lane+2)%3);line(x,other,8);jumpRow('crate',x+B*5.5);line(x+B*4,other,5);}
  if(kind==='break'){[1.8,4.4,6.8].forEach(b=>{jumpRow('break',x+B*b);line(x+B*(b-1.1),1,4);});}
  if(kind==='ramp'||kind==='skywalk'){
   const p={a:x+2,b:x+P-2,lane,height:1.22,ramp:5};platforms.push(p);
   for(let xx=p.a;xx<p.b;xx+=1.25)put('bone',xx,lane,.72+rampHeight(p,xx),{elevated:true});
   put('star',x+P*.52,lane,2.2,{elevated:true});
   if(kind==='skywalk'){put('magnet',x+P*.32,lane,1.85);put('log',x+B*5,other);gaps.push({a:x+B*3,b:x+B*3+3,lane:other});}
   if(kind==='skywalk')put('tall',x+B*2,(lane+2)%3);else wall(x+B*2,lane); // Skywalk keeps one ground route open beside the elevated reward lane.
  }
  if(kind==='springTrail'){
   // Optional spring lane: the adjacent path remains safe and readable.
   for(const b of [1.8,5.2]){const at=x+B*b;put('spring',at,lane);gaps.push({a:at+2.5,b:at+5.1,lane});line(at-3,lane,3,1);line(at+6,lane,3,1);}
   put('magnet',x+B*3.8,other,.82);line(x+1,other,8);put('crate',x+B*6.9,other);
  }
  if(kind==='islands'){
   // Staggered missing tiles form two genuine routes instead of a painted strip.
   for(let k=0;k<3;k++){const a=(lane+k)%3,at=x+B*(1.8+k*2.15);gaps.push({a:at,b:at+3.15,lane:a});line(at-3,a,3,1);line(at+3.8,(a+1)%3,3,1);}
   put('shieldOrb',x+B*1.0,other,.82);put('wave',x+B*6.8,lane);
  }
  if(kind==='slalom'){
   for(let k=0;k<3;k++){const safe=(lane+k)%3,at=x+B*(1.8+k*2.2);wall(at,safe);gaps.push({a:at-.5,b:at+2.5,lane:(safe+1)%3});}
   put('magnet',x+B*.5,lane,.82);
  }
  if(kind==='portalRun'){
   const entry=x+B*1.7,exitLane=(lane+2)%3;
   put('portal',entry,lane,0,{toLane:exitLane,pair:n});
   // Exit has a marked safe landing pocket; no forward skip or surprise collision.
   put('portalExit',entry+.2,exitLane,0,{pair:n});line(entry+1,exitLane,7,1.15);
   put('shieldOrb',entry+3,exitLane,.82);wall(x+B*5.4,exitLane,'gate');line(x,lane,5);
  }
  if(kind==='treasure'){
   line(x,1,6);put('magnet',x+B*.8,1,.82);
   for(let k=0;k<5;k++)for(let a=0;a<3;a++)put('bone',x+B*2+k*1.3,a,.72);
   put('shieldOrb',x+B*4.7,lane,.82);wall(x+B*6.5,lane);
  }
  if(kind==='reward'||kind==='final'){
   for(let k=0;k<24;k++)put('bone',x+k*(P-3)/24,Math.floor(k/8)%3,.72);
   if(kind==='final'&&index>0){jumpRow('crate',x+B*3);jumpRow('bar',x+B*5.7);}
  }
  // Ground-level stars live in readable entry pockets. Every route has exactly three.
  if(n===2||n===6){put('star',x+1,lane,1.15);line(x-5,lane,5,1.15);}
  if(n===4){put('checkpoint',x);put('heart',x+1,1,.72);if(index===0)put('shieldOrb',x+B*2,1,.82);}
 });
 if(!items.some(o=>o.type==='star'&&o.elevated)){const s=sections[8];put('star',s.a+1,(8+index)%3,1.15);}
 // Several levels use two ramps; only the first carries a star.
 const stars=items.filter(o=>o.type==='star').sort((a,b)=>a.x-b.x);for(const o of stars.slice(3)){o.type='bone';const p=platforms.find(p=>p.lane===o.lane&&o.x>=p.a&&o.x<=p.b);o.y=.72+(p?rampHeight(p,o.x):0);}
 return{level:l,items:items.sort((a,b)=>a.x-b.x),gaps,platforms,sections};
}
export class Run {
 constructor(index,character='gold'){
  this.data=levelData(index);this.level=this.data.level;Object.assign(this,{character,x:0,z:0,lane:1,y:0,vy:0,jumps:0,hp:3,bones:0,stars:0,damage:0,combo:0,maxCombo:0,score:0,time:0,state:'running',slideTime:0,powerTime:0,powerCooldown:0,swapCooldown:0,invincible:0,checkpoint:0,coyote:.12,landPulse:0,laneFrom:0,laneT:1,jumpBuffer:0,powerShield:false,hitStop:0,impact:0,collectPulse:0,charge:0,fever:0,perfect:0,section:-1,lastCleanX:-10,lastLaneTime:-1,posePulse:0,magnetTime:0,itemShield:0,portalTime:0,hurtTime:0});this.events=[];
 }
 emit(type,data={}){this.events.push({type,...data});}
 switch(){if(this.state!=='running'||this.powerTime>0||this.swapCooldown>0)return;this.character=this.character==='gold'?'white':'gold';this.swapCooldown=.65;this.emit('swap');}
 laneMove(d){if(this.state!=='running')return;const direction=Math.sign(d),next=Math.max(0,Math.min(2,this.lane+direction));if(next===this.lane)return;
  // Elevated decks are separate routes, not lanes that can be entered or
  // exited sideways. Check the full 130 ms lane-change window so a swipe
  // immediately before a ramp cannot finish through the deck's side wall.
  for(const ahead of [0,.065,.13]){const x=this.x+this.speed*ahead,from=platformHeight(this.data.platforms,x,this.z),to=platformHeight(this.data.platforms,x,LANES[next]);if(Math.abs(from-to)>.08){this.emit('rail',{direction});return;}}
  this.laneFrom=this.z;this.laneT=0;this.lane=next;this.lastLaneTime=this.time;this.emit('lane',{direction});}
 jump(){if(this.state!=='running')return;if(this.jumps>=2){this.jumpBuffer=.12;return;}this.slideTime=0;this.vy=this.jumps===0?10.8:8.7;this.jumps++;this.posePulse=.3;this.emit('jump',{double:this.jumps===2});}
 slide(){if(this.state!=='running')return;this.slideTime=SLIDE_DURATION;if(this.y>.2)this.vy=-17;this.emit('slide',{air:this.y>.2});}
 ceilingAhead(){return this.data.items.some(o=>!o.taken&&['bar','tunnel'].includes(o.type)&&Math.abs(this.z-o.z)<1.03&&o.x-this.x>-(HAZARDS[o.type].half+.82)&&o.x-this.x<HAZARDS[o.type].half+.42);}
 power(){if(this.state!=='running'||this.powerCooldown>0)return;this.powerTime=this.character==='gold'?1.9:3.1;this.powerCooldown=this.character==='gold'?8:9;this.powerShield=this.character==='white';this.emit('power');}
 get boosted(){return this.fever>0||this.powerTime>0&&this.character==='gold';}
 get speed(){return this.level.speed*(this.fever>0?1.18:1);}
 ground(x=this.x,z=this.z){let h=this.data.gaps.some(g=>x>g.a&&x<g.b&&Math.abs(z-LANES[g.lane])<1.07)?-20:0,p=platformHeight(this.data.platforms,x,z);if(p>0)h=Math.max(h,p);return h;}
 rescue(){
  // Find solid ground nearby with a full second to react. Never rewind
  // collected rewards or send a surviving player back to the start.
  const lanes=[this.lane,...[0,1,2].filter(l=>l!==this.lane)];let landing;
  for(let offset=0;offset<60&&!landing;offset+=.5)for(const lane of lanes){const x=this.x+offset,z=LANES[lane],end=x+this.level.speed;
   if(this.data.gaps.some(g=>g.lane===lane&&g.b>x-.6&&g.a<end+.6))continue;
   if(this.data.platforms.some(p=>p.lane===lane&&p.b>x-.6&&p.a<end+.6))continue;
   if(this.data.items.some(o=>!o.taken&&HAZARDS[o.type]&&o.x>x-1.5&&o.x<end+1.5&&(['mover','snowball'].includes(o.type)?Math.abs(moverZ(o,this.time)-z)<1.2:o.lane===lane)))continue;
   landing={x,z,lane};break;
  }
  if(!landing){this.state='over';this.emit('over');return;}
  Object.assign(this,landing,{y:0,vy:0,laneFrom:landing.z,laneT:1,jumps:0,jumpBuffer:0,slideTime:0,powerTime:0,powerShield:false,fever:0,invincible:2.5});this.emit('respawn');
 }
 hurt(fall=false){if(this.invincible>0&&!fall)return;this.hp--;this.damage++;this.combo=0;this.charge=Math.max(0,this.charge-5);this.invincible=1.65;this.hurtTime=.65;this.hitStop=.08;this.impact=1;this.emit('hurt',{fall});if(this.hp<=0){this.state='over';this.emit('over');return;}if(fall)this.rescue();}
 tick(dt){
  if(this.state!=='running')return;
  if(this.hitStop>0){this.hitStop=Math.max(0,this.hitStop-dt);return;}
  const wasSliding=this.slideTime>0,wasFever=this.fever>0;
  this.time+=dt;for(const k of ['slideTime','powerTime','powerCooldown','swapCooldown','invincible','landPulse','jumpBuffer','impact','collectPulse','fever','posePulse','magnetTime','itemShield','portalTime','hurtTime'])this[k]=Math.max(0,this[k]-dt);
  if(wasFever&&this.fever===0)this.emit('feverEnd');
  const oldY=this.y;this.x+=this.speed*dt;this.laneT=Math.min(1,this.laneT+dt/.13);const u=this.laneT;this.z=this.laneFrom+(LANES[this.lane]-this.laneFrom)*(1-(1-u)**3);this.score+=dt*10;
  // Never stand up while the body is still under a low beam. Keep the pose
  // through the trailing edge; the normal timer resumes on open ground.
  if(wasSliding&&this.slideTime<.16&&this.ceilingAhead())this.slideTime=.16;
  const sec=this.data.sections.findIndex(s=>this.x>=s.a&&this.x<s.b);if(sec>=0&&sec!==this.section){this.section=sec;this.emit('section',{section:this.data.sections[sec]});}
  const ground=this.ground();this.vy-=(this.vy<0?43:35)*dt;this.y+=this.vy*dt;
  if(this.y<=ground&&oldY>=ground-.19&&this.vy<=0){if(this.jumps>0||oldY-ground>.1){this.emit('land',{force:Math.min(1,-this.vy/14)});this.landPulse=.24;}this.y=ground;this.vy=0;this.jumps=0;this.coyote=.12;if(this.jumpBuffer>0){this.jumpBuffer=0;this.jump();}}else this.coyote=Math.max(0,this.coyote-dt);
  if(this.y<-4){this.hurt(true);return;}
  for(const o of this.data.items){if(o.taken)continue;const dx=o.x-this.x;if(dx>10)break;
   if(o.type==='checkpoint'){if(dx<.15&&dx>-.9&&this.checkpoint<o.x){this.checkpoint=o.x+1.5;o.taken=true;this.emit('checkpoint');}continue;}
   const zz=['mover','snowball'].includes(o.type)?moverZ(o,this.time):o.z;
   if(o.type==='spring'){
    if(Math.abs(dx)<.55&&Math.abs(this.z-zz)<.8&&this.y<.42&&this.vy<=0){o.taken=true;this.y=.12;this.vy=12.2;this.jumps=1;this.slideTime=0;this.emit('spring',{item:o});}continue;
   }
   if(o.type==='portal'){
    if(Math.abs(dx)<.65&&Math.abs(this.z-zz)<.85&&this.y<1.3){o.taken=true;this.lane=o.toLane;this.z=LANES[o.toLane];this.laneFrom=this.z;this.laneT=1;this.portalTime=.65;this.emit('portal',{item:o});}continue;
   }
   if(o.type==='portalExit')continue;
   if(['bone','star','heart','magnet','shieldOrb'].includes(o.type)){
    const magnet=(this.powerTime>0||this.fever>0||this.magnetTime>0)&&o.type==='bone';
    if(Math.abs(dx)<(magnet?4.8:.86)&&Math.abs(this.z-zz)<(magnet?4.8:.86)&&Math.abs(this.y+.82-o.y)<(magnet?4.8:.91)){
     o.taken=true;if(o.type==='bone'){this.bones++;this.collectPulse=.18;this.score+=this.fever>0?40:20;if(this.fever===0){this.charge++;if(this.charge>=FEVER_TARGET){this.charge=0;this.fever=FEVER_DURATION;this.emit('fever');}}}
     let healed=false;if(o.type==='star'){this.stars++;this.score+=250;}if(o.type==='heart'){healed=this.hp<3;this.hp=Math.min(3,this.hp+1);if(!healed)this.score+=50;}if(o.type==='magnet')this.magnetTime=6;if(o.type==='shieldOrb')this.itemShield=12;this.emit(o.type,{item:o,healed});
    }continue;
   }
   const spec=HAZARDS[o.type];if(!spec)continue;
   if(!o.passed&&dx<-1.3){o.passed=true;const close=Math.abs(this.z-zz)<1.0||this.time-this.lastLaneTime<.32;if(!o.hit&&close&&Math.abs(o.x-this.lastCleanX)>1){this.lastCleanX=o.x;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.perfect++;this.score+=50*Math.min(5,1+Math.floor(this.combo/3));this.charge=Math.min(27,this.charge+2);this.emit('clean',{combo:this.combo,item:o});}}
   if(o.hit||Math.abs(dx)>spec.half+.28||Math.abs(this.z-zz)>.77)continue;
   // Box tops reward a descending landing; side impacts still cost a heart.
   if(['crate','break'].includes(o.type)&&this.vy<0&&oldY>=spec.height-.12&&this.y<=spec.height+.10){
    o.hit=true;o.taken=true;o.passed=true;this.y=spec.height;this.vy=8.4;this.jumps=1;this.slideTime=0;this.landPulse=.18;this.hitStop=.045;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.score+=80;this.emit('stomp',{item:o,combo:this.combo});continue;
   }
   const ph=this.slideTime>0?1.18:1.98;
   if(this.y+ph>spec.low&&this.y<spec.height-.18){o.hit=true;
    if(this.boosted||this.itemShield>0||this.powerTime>0&&this.powerShield||this.invincible>0){
     // A protected contact breaks the obstacle; recoil belongs only to actual damage.
     let event='protectedSmash';
     if(this.boosted){this.score+=50;event='smash';}
     else if(this.itemShield>0){this.itemShield=0;this.invincible=.9;event='itemShieldBlock';}
     else if(this.powerTime>0&&this.powerShield){this.powerShield=false;this.invincible=.9;event='shield';}
     o.taken=true;this.hitStop=0;this.impact=0;this.hurtTime=0;this.emit(event,{item:o});
    }else this.hurt();
   }
  }
  if(this.x>=this.level.length){this.x=this.level.length;this.state='clear';this.emit('clear');}
 }
}
