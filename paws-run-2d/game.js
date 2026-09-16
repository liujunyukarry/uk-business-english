'use strict';
(() => {
  const $=id=>document.getElementById(id), canvas=$('canvas'), ctx=canvas.getContext('2d');
  const KEY='paws-and-go-save-v3',LEGACY_KEY='paws-and-go-save-v2';
  const fresh=()=>({best:0,wallet:0,unlocked:['cream'],trail:'cream',sound:true,musicVolume:.65,effectsVolume:.5,reducedMotion:false,runs:0,character:'gold',adventure:{unlocked:0,stars:Array(12).fill(0),best:Array(12).fill(0)}});
  let save=fresh(), dirty=false;
  try {const v=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'null');if(v&&typeof v==='object'){save={...fresh(),...v};save.best=Math.max(0,Number(v.best)||0);save.wallet=Math.max(0,Math.floor(Number(v.wallet)||0));save.unlocked=['cream',...['strawberry','cosmic'].filter(s=>Array.isArray(v.unlocked)&&v.unlocked.includes(s))];if(!save.unlocked.includes(save.trail))save.trail='cream';if(!['gold','white'].includes(save.character))save.character='gold';}else save.best=Number(localStorage.getItem('neon-stride-best-v1'))||0;}catch{$('storageNote').classList.remove('hidden');}
  save.musicVolume=Math.max(0,Math.min(1,Number.isFinite(save.musicVolume)?save.musicVolume:.65));
  save.effectsVolume=Math.max(0,Math.min(1,Number.isFinite(save.effectsVolume)?save.effectsVolume:.5));
  save.sound=save.sound!==false;save.runs=Math.max(0,Math.floor(Number(save.runs)||0));
  if(!Number.isFinite(save.best))save.best=0;if(!Number.isFinite(save.wallet))save.wallet=0;
  const oldAdventure=save.adventure||{};save.adventure={unlocked:Math.max(0,Math.min(11,Math.floor(Number(oldAdventure.unlocked)||0))),stars:Array.from({length:12},(_,i)=>Math.max(0,Math.min(3,Math.floor(Number(oldAdventure.stars?.[i])||0)))),best:Array.from({length:12},(_,i)=>Math.max(0,Number(oldAdventure.best?.[i])||0))};
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(save));dirty=false;}catch{$('storageNote').classList.remove('hidden');}}
  const dogs=new Image(),props=new Image(),expressions=new Image();
  const dogBoxes={gold:Array.from({length:6},(_,i)=>[i*362,0,362,362]),white:Array.from({length:6},(_,i)=>[i*362,362,362,362])};
  // Prop cells are populated with inspected alpha bounds below.
  const propBoxes=[[33,188,340,194],[449,135,258,267],[769,205,371,150],[1175,258,329,94],[45,619,306,264],[430,591,296,294],[828,611,267,272],[1202,621,289,242]];
  let assets=0,loaded=false,assetWait=0;
  function assetReady(){assets++;if(assets>=3){loaded=true;$('loadingError').classList.add('hidden');$('start').disabled=false;$('start').innerHTML='开始冒险 <span>↗</span>';updateLevelUI();}}
  [dogs,props,expressions].forEach(im=>{im.onload=assetReady;im.onerror=()=>$('loadingError').classList.remove('hidden');});
  dogs.src='assets/duo-sprites.webp';props.src='assets/game-props.webp';expressions.src='assets/duo-expressions.webp';
  $('retryAssets').onclick=()=>{assets=0;loaded=false;assetWait=0;$('loadingError').classList.add('hidden');[dogs,props,expressions].forEach(im=>{im.src=im.src.split('?')[0]+'?retry='+Date.now();});};
  let W=800,H=650,G=450,dpr=1,state='home',last=0,clock=0,elapsed=0,dist=0,score=0,bones=0,streak=0,maxStreak=0,mult=1,hp=3,fever=0,dashTime=0,shield=0,magnet=0,invincible=0,shake=0,deadTime=0,spawn=2.6,objects=[],particles=[],floaters=[],slow=0,toastTime=0,held=false,buffer=0,bankTime=0,trailTimer=0,zone=0,modalReturn='home',finishSaved=false;
  const P={x:80,y:0,vy:0,jumps:0,slide:0,squash:0,angle:0,jumpHeld:false,jumpAge:0,cut:false,dive:false};
  let viewScale=1,scrollX=0,stompChain=0,stomps=0,reactionTime=0,stepSound=0,sectionName='';
  let countdownTime=0,bonusActive=false,bonusNext=false,dashes=0,perfects=0,patternCount=0,previousPattern='',zoneBlend=1,previousZone=0,recordShown=false,challengeShown=false,stepCarry=0,hudClock=0;
  const challengeScore=Math.min(100000000,Math.max(0,Math.floor(Number(new URLSearchParams(location.search).get('challenge'))||0)));
  if(challengeScore){$('challenge').classList.remove('hidden');$('challenge').textContent='好友挑战 · 超过 '+challengeScore.toLocaleString()+' 分';}
  const motionReduced=()=>save.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  let missions=[{label:'收集 20 根骨头',goal:20,type:'bones',done:false},{label:'跑到 500 米',goal:500,type:'distance',done:false},{label:'连续躲避 8 次',goal:8,type:'combo',done:false}];
  const zones=[
    {name:'青草公园',scene:0,track:'sunny-journey',song:'Sunny Tails',mood:'轻快拨弦'},
    {name:'蜜桃海岸',scene:1,track:'coast',song:'Peach Tide',mood:'海岸轻摇'},
    {name:'萤火森林',scene:3,track:'forest',song:'Firefly Waltz',mood:'森林圆舞曲'},
    {name:'极光雪山',scene:4,track:'snow',song:'Snowglobe',mood:'空灵钢琴'},
    {name:'星光夜跑',scene:2,track:'night',song:'Starlight Steps',mood:'夜色律动'},
    {name:'云端花园',scene:5,track:'sky',song:'Home Above Clouds',mood:'明亮终章'}
  ];
  const levelNames=['箱子也能踩','风铃捉迷藏','海边翻滚吧','纸箱跳跳桥','森林叠叠乐','树梢送快递','雪球躲猫猫','雪地三级跳','星星与风筝','月光接力赛','云端跳房子','小狗大游行'];
  const lessons=['按下就跳，落在箱顶会弹起！','挂着的风铃要趴低，长按左边滑行','滚动箱子也能踩！看准落点','踩箱接力：弹起来，连续踩下一只','长按跳得高，松手小跳；再点二段跳','跳、踩、滑：记住一小段节奏','雪地路锥要跳过，纸箱可以踩','连踩三只箱子，别急着二段跳','低风筝要滑行，星星指引下一步','空中下划俯冲，落点由你决定','跨过水洼，接住下一只箱子','所有招式一起用，终点有小狗派对'];
  const levels=levelNames.map((name,i)=>({id:i,name,world:Math.floor(i/2),length:1000+i*36,boneGoal:55+i*5,speed:1+i*.022,interval:1.1,lesson:lessons[i]}));
  let hitStop=0,hitFlash=0,feedbackTime=0,landRing=0,collectRun=0,feedbackPriority=0,dashBlend=0,dashBeat=-1,ringX=0,ringY=0;
  let selectedLevel=save.adventure.unlocked,levelIndex=selectedLevel,levelDamage=0,levelResult=null,skillTime=0,skillCooldown=0,switchCooldown=0,skillOwner='gold',celebrateTime=0,petTime=0;
  const stage=()=>levels[levelIndex];
  function updateLevelUI(){const l=levels[selectedLevel];$('levelSelect').textContent='旅途地图 · '+(l.world+1)+'-'+(l.id%2+1)+' '+l.name;$('adventureProgress').textContent=save.adventure.stars.filter(n=>n>0).length+' / 12 关 · '+save.adventure.stars.reduce((a,b)=>a+b,0)+' / 36 星';if(loaded)$('start').innerHTML='出发 · '+l.name+' <span>↗</span>';}
  function worldMap(){if(!['home','over','cleared'].includes(state))return;stopMusic();openModal('<div class="modal-tag">OUR LITTLE ADVENTURE</div><h2 id="modalTitle">两只小狗的旅行地图</h2><p>每关都有终点。通关解锁下一关，随时回来挑战三星。</p><div class="world-map">'+zones.map((z,w)=>'<section class="world-row"><strong>'+String(w+1).padStart(2,'0')+' · '+z.name+'</strong><small>♪ '+z.song+'</small><div>'+levels.filter(l=>l.world===w).map(l=>'<button data-level="'+l.id+'" '+(l.id>save.adventure.unlocked?'disabled':'')+' class="level-node '+(l.id===selectedLevel?'selected':'')+'"><b>'+ (w+1)+'-'+(l.id%2+1)+' '+l.name+'</b><span>'+(l.id>save.adventure.unlocked?'尚未解锁':'★'.repeat(save.adventure.stars[l.id])+'☆'.repeat(3-save.adventure.stars[l.id]))+'</span></button>').join('')+'</div></section>').join('')+'</div><p>★ 到达终点　★ 全程无伤　★ 收集目标</p><button class="modal-primary" id="closeMap">回到出发地</button>');$('modalCard').querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.level);if(i>save.adventure.unlocked)return;selectedLevel=i;home();});$('closeMap').onclick=home;}
  function skill(){if(state!=='running'||skillCooldown>0||dashTime>0)return;skillOwner=save.character;skillTime=skillOwner==='gold'?1.05:2.8;skillCooldown=skillOwner==='gold'?9:10;if(skillOwner==='gold'){magnet=Math.max(magnet,2.5);toast('小金毛 · 飞扑！撞碎前方障碍');}else{shield=Math.max(shield,2.8);magnet=Math.max(magnet,2.8);toast('小白 · 泡泡守护！骨头靠过来');}feedback(skillOwner==='gold'?'飞扑破障！':'泡泡守护！',2);tone(skillOwner==='gold'?420:780,.22,'sine',.055,1100);particlesAt(P.x+30,G-P.y-30,14,skillOwner==='gold'?['#ffcd72','#fff2bc']:['#d4f6ff','#ffffff'],150);hud();}
  function feedback(text,priority=0){if(feedbackTime>0&&priority<feedbackPriority)return;feedbackPriority=priority;$('impactText').textContent=text;feedbackTime=.70;}
  function switchDog(){if(state!=='running'||switchCooldown>0||skillTime>0)return;save.character=save.character==='gold'?'white':'gold';switchCooldown=1.2;dirty=true;toast(save.character==='gold'?'小金毛接棒！飞扑撞障碍':'小白接棒！泡泡吸骨头、挡碰撞');characterUI();hud();}
  function clearLevel(){if(state!=='running'||finishSaved)return;finishSaved=true;state='cleared';held=false;P.jumpHeld=false;pointer=null;stopMusic();celebrateTime=0;P.y=0;P.vy=0;P.slide=0;skillTime=0;dashTime=0;objects=[];const stars=1+(levelDamage===0?1:0)+(bones>=stage().boneGoal?1:0),first=save.adventure.stars[levelIndex]===0;save.adventure.stars[levelIndex]=Math.max(stars,save.adventure.stars[levelIndex]);save.adventure.best[levelIndex]=Math.max(Math.floor(score),save.adventure.best[levelIndex]);save.adventure.unlocked=Math.max(save.adventure.unlocked,Math.min(11,levelIndex+1));save.best=Math.max(save.best,Math.floor(score));if(first)save.wallet+=40;levelResult={stars,first};persist();$('gameControls').classList.add('hidden');hud();$('runHud').classList.add('hidden');feedbackTime=0;floaters=[];toast('通关啦！我们一起做到啦 ♡',2.2);if(save.sound)music.victory();burst(W*.5,G-60,['#f2bb6c','#ecaca5','#aad8cf'],35);}
  function showClear(){const done=levelIndex===11;openModal('<div class="modal-tag">'+(done?'WE MADE IT HOME':'STAGE CLEAR')+'</div><h2 id="modalTitle">'+(done?'我们一起到家啦！':stage().name+' · 通关！')+'</h2><div class="duo-celebration"><span class="cheer gold"></span><span class="cheer white"></span></div><div class="clear-stars">'+'★'.repeat(levelResult.stars)+'☆'.repeat(3-levelResult.stars)+'</div><div class="star-conditions"><span>✓ 到达终点</span><span>'+(levelDamage===0?'✓':'○')+' 全程无伤</span><span>'+(bones>=stage().boneGoal?'✓':'○')+' 骨头 '+bones+'/'+stage().boneGoal+'</span></div><p>'+(levelResult.first?'首次通关 +40 根骨头。':'已保留这关的最高星级。')+'<br>'+(done?'六个世界的风景，都有我们两只的脚印。': '下一关：'+levels[levelIndex+1].name+'<br>'+levels[levelIndex+1].lesson)+'</p><button class="modal-primary" id="nextLevel">'+(done?'回到地图 · 挑战 36 星':'下一关 · '+levels[levelIndex+1].name)+'</button><button class="share-button" id="retryLevel">再跑这关 · 挑战三星</button><button class="modal-secondary" id="clearMap">旅行地图 / 更换小狗</button>');$('nextLevel').onclick=()=>{if(done)worldMap();else{selectedLevel=levelIndex+1;start();}};$('retryLevel').onclick=()=>{selectedLevel=levelIndex;start();};$('clearMap').onclick=worldMap;}
  const trails=[{id:'cream',name:'奶油原味',note:'软乎乎的金色星光',icon:'✦',cost:0,colors:['#ffd773','#fff8c0','#fff0aa']},{id:'strawberry',name:'草莓汽水',note:'粉粉的，冒着快乐泡泡',icon:'◉',cost:60,colors:['#ff95ba','#ffdfef','#ffb3cb']},{id:'cosmic',name:'星河漫游',note:'带着一小片银河出门',icon:'✧',cost:120,colors:['#9296ff','#b9e7ff','#c9bcff']}];
  const music=new JourneyAudio('assets/sunny-journey.mp3?v=paper9',()=>toast('音乐暂时未加载，可在 ♫ 中重试',3));
  function initAudio(){music.mix({music:save.musicVolume,effects:save.effectsVolume,muted:!save.sound});if(save.sound)music.unlock();}
  function tone(...args){if(save.sound)music.tone(...args);}
  function startMusic(reset=false){initAudio();if(save.sound)music.play(reset);}
  function stopMusic(){music.pause();}
  function updateMusic(){music.update(state==='running',dashTime>0);}
  function duckMusic(){music.duck();}
  function soundUI(){$('sound').innerHTML=save.sound?'♫':'♫<span class="sound-off">×</span>';$('sound').setAttribute('aria-label','音乐与音效设置');}
  function selectMissions(){missions=[{label:'收集 '+levels[selectedLevel].boneGoal+' 根骨头',goal:levels[selectedLevel].boneGoal,type:'bones',done:false},{label:'连续躲避 '+(4+Math.floor(selectedLevel/3))+' 次',goal:4+Math.floor(selectedLevel/3),type:'combo',done:false},{label:'开启 1 次双狗冲刺',goal:1,type:'dash',done:false}];$('missionPreview').innerHTML=missions.map(m=>'<span>'+m.label+'</span>').join('');
  }
  function characterUI(){$('characterPicker').querySelectorAll('[data-character]').forEach(b=>{const active=b.dataset.character===save.character;b.classList.toggle('selected',active);b.querySelector('i').textContent=active?'领跑':'选择';b.setAttribute('aria-pressed',String(active));});}
  function homeUI(){$('homeBest').textContent=Math.floor(save.best).toLocaleString();$('wallet').textContent=save.wallet.toLocaleString();soundUI();characterUI();updateLevelUI();if(state==='home')selectMissions();}
  function chooseCharacter(id){if(state!=='home'||!['gold','white'].includes(id))return;save.character=id;persist();characterUI();petTime=2.5;initAudio();tone(id==='gold'?740:880,.12,'sine',.055);}
  function resize(){
    const r=canvas.getBoundingClientRect(),aspect=r.width/r.height,oldX=P.x,oldScale=viewScale;
    const nextW=Math.max(420,Math.min(1000,420+Math.max(0,aspect-.62)*420));
    if(state==='running'&&(Math.abs(W-nextW)>2||Math.abs(H-r.height/(r.width/nextW))>90))pause();
    W=nextW;viewScale=r.width/W;H=r.height/viewScale;G=Math.min(H*.79,H-(aspect>1.3?158:174)/viewScale);
    dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);
    P.x=W*.23;objects.forEach(o=>o.x+=P.x-oldX);ctx.setTransform(dpr*viewScale,0,0,dpr*viewScale,0,0);
  }
  new ResizeObserver(resize).observe(canvas);
  function baseSpeed(){return 300;}
  function currentSpeed(){return baseSpeed()*(stage().speed+Math.min(elapsed/450,.07))*(dashTime>0?1.2:slow>0?.72:1);}
  function toast(text,seconds=1.65){$('toast').textContent=text;toastTime=seconds;$('toast').classList.add('show');}
  function particlesAt(x,y,n,colors,force=150){if(particles.length>150)return;for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*force,vy:-Math.random()*force*.7,life:.4+Math.random()*.4,max:.8,size:2+Math.random()*4,color:colors[i%colors.length]});}
  function float(text,x,y,color='#9c623b'){if(floaters.length>3)floaters.shift();const last=floaters.at(-1);if(last&&Math.abs(last.y-y)<24)y=last.y-27;floaters.push({text,x:Math.max(P.x+38,x),y,color,life:.7});}
  function start(){if(!loaded)return;dashBlend=0;dashBeat=-1;feedbackPriority=0;scrollX=0;stompChain=0;stomps=0;reactionTime=0;P.jumpHeld=false;P.jumpAge=0;P.dive=false;P.cut=false;hitStop=0;hitFlash=0;feedbackTime=0;landRing=0;collectRun=0;levelIndex=selectedLevel;selectMissions();levelDamage=0;levelResult=null;skillTime=0;skillCooldown=0;switchCooldown=0;music.setTrack('assets/'+zones[stage().world].track+'.mp3?v=paper9');initAudio();state='running';$('game').classList.add('playing');elapsed=0;dist=0;score=0;bones=0;streak=0;maxStreak=0;mult=1;hp=3;fever=0;dashTime=0;shield=save.character==='white'?10:0;magnet=0;invincible=0;shake=0;deadTime=0;spawn=.65;bonusActive=false;bonusNext=false;dashes=0;perfects=0;patternCount=0;previousPattern='';zoneBlend=1;previousZone=0;recordShown=false;challengeShown=false;stepCarry=0;countdownTime=0;$('countdown').classList.add('hidden');$('game').classList.remove('bonus');objects=[];particles=[];floaters=[];slow=0;held=false;buffer=0;zone=stage().world;finishSaved=false;P.y=0;P.vy=0;P.jumps=0;P.slide=0;P.squash=0;P.jumpHeld=false;P.dive=false;missions.forEach(m=>m.done=false);save.runs++;dirty=true;$('modal').classList.add('hidden');$('homeScreen').classList.add('hidden');$('homeHud').classList.add('hidden');$('runHud').classList.remove('hidden');$('gameControls').classList.remove('hidden');$('zoneTag').textContent=(stage().world+1)+'-'+(levelIndex%2+1)+' / '+zones[zone].name;boneLine(W*.68,[25,25,25,25,25],31);last=performance.now();startMusic(true);toast(stage().lesson,3.5);hud();}
  function home(){dashBlend=0;stopMusic();state='home';$('game').dataset.world='0';skillTime=0;skillCooldown=0;petTime=0;$('game').classList.remove('playing');countdownTime=0;bonusActive=false;$('countdown').classList.add('hidden');$('game').classList.remove('bonus');held=false;objects=[];P.y=0;P.slide=0;P.squash=0;particles=[];floaters=[];dashTime=0;shield=0;magnet=0;invincible=0;toastTime=0;zone=0;$('toast').classList.remove('show');$('modal').classList.add('hidden');$('runHud').classList.add('hidden');$('gameControls').classList.add('hidden');$('homeScreen').classList.remove('hidden');$('homeHud').classList.remove('hidden');$('zoneTag').textContent='01 / 青草公园';homeUI();persist();}
  function jump(){
    if(state!=='running'||blockedAbove())return;
    P.jumpHeld=true;
    if(P.jumps>=2){buffer=.14;return;}
    P.slide=0;held=false;P.dive=false;P.jumps++;P.jumpAge=0;P.cut=false;
    P.vy=P.jumps===1?825:700;P.y=Math.max(.1,P.y);P.squash=-.24;
    tone(P.jumps===1?440:640,.10,'sine',.065,P.jumps===1?850:1100);
    particlesAt(P.x+25,G-P.y,7,['#e4c9a0','#fffbf1'],120);
  }
  function releaseJump(){P.jumpHeld=false;}
  function blockedAbove(){return objects.some(o=>!o.hit&&['beam','kite'].includes(o.type)&&P.x+50>o.x+6&&P.x+15<o.x+o.w-6&&P.y+60>window.PaperProps.specs[o.type].bottom);}

  function slide(){
    if(state!=='running')return;
    P.slide=.38;P.jumpHeld=false;
    if(P.y>0){P.vy=-900;P.dive=true;}else particlesAt(P.x+10,G,5,['#e4c9a0','#fff9ed'],130);
    if(save.sound)music.foley?.('slide');
  }
  function stomp(o){
    o.hit=true;o.dead=true;o.passed=true;stomps++;stompChain++;streak+=2;maxStreak=Math.max(streak,maxStreak);mult=Math.min(5,1+Math.floor(streak/4));
    const value=80*Math.min(stompChain,5);score+=value;fever=Math.min(100,fever+10);
    const height=window.PaperProps.specs[o.type].h;P.y=height;P.vy=640;P.jumps=1;P.slide=0;P.dive=false;P.jumpHeld=false;P.cut=true;P.squash=.33;
    hitStop=.052;hitFlash=.10;landRing=.23;ringX=o.x+o.w/2;ringY=G-height;shake=motionReduced()?0:.14;reactionTime=.7;
    burst(o.x+o.w/2,G-height,['#edb673','#fffbef','#4c3a28'],16);
    feedback((stompChain>1?stompChain+' 连踩！':'踩顶！')+' +'+value,3);
    if(save.sound)music.foley?.('smash');tone(420+Math.min(stompChain,5)*80,.13,'sine',.065,950);
  }
  function burst(x,y,colors,count=16){
    for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*360,vy:-70-Math.random()*230,life:.45+Math.random()*.35,max:.8,size:3+Math.random()*5,color:colors[i%colors.length],shape:i%3===0?'star':'chip',angle:Math.random()*6});
    if(particles.length>170)particles.splice(0,particles.length-170);
  }
  function dash(){if(state!=='running'||fever<100||dashTime>0)return;fever=0;dashes++;dashTime=4.5;dashBeat=-1;reactionTime=1;feedback('一起冲！4.5 秒无敌',2);hud();if(save.sound)music.flourish?.();burst(P.x+30,G-30,['#edb673','#eaa39a','#fffbf1'],20);invincible=Math.max(invincible,4.5);toast('默契爆发！两只小狗一起冲 ✦',2);tone(420,.4,'triangle',.09,1300);particlesAt(P.x-15,G-8,12,['#eebc79','#fff6d7','#a9d3c8'],180);}
  let focusedBefore=null;
  function openModal(html){focusedBefore=document.activeElement;$('modalCard').innerHTML=html;$('modal').classList.remove('hidden');$('modalCard').querySelector('button')?.focus();}
  function closeModal(){if(state==='paused')resume();else{$('modal').classList.add('hidden');focusedBefore?.focus?.();}}
  function pause(){if(!['running','countdown'].includes(state))return;state='paused';countdownTime=0;$('countdown').classList.add('hidden');held=false;P.jumpHeld=false;pointer=null;stopMusic();persist();openModal('<div class="modal-tag">A LITTLE PAWS</div><h2 id="modalTitle">小狗歇一会儿</h2><p>音乐和赛道都暂停了。<br>准备好了，再一起出发。</p><button class="modal-primary" id="resume">继续撒欢</button><button class="modal-secondary" id="goHome">结束本局，查看成绩</button>');$('resume').onclick=resume;$('goHome').onclick=finish;}
  function resume(){if(state!=='paused')return;state='countdown';countdownTime=2.4;held=false;P.jumpHeld=false;pointer=null;$('modal').classList.add('hidden');$('countdown').classList.remove('hidden');$('countdown').textContent='3';initAudio();last=performance.now();}
  function help(){if(['dying','countdown'].includes(state))return;const prior=state;if(state==='running')pause();openModal('<div class="modal-tag">LET’S PLAY</div><h2 id="modalTitle">一起闯十二关</h2><div class="how-list"><div>↑ <b>点一下跳，再点二段跳</b><br>按下立即跳；长按跳高，松手小跳。再点二段跳。</div><div>↓ <b>向下划，或按住滑行</b><br>风铃和低风筝要趴低通过。空中下划可以俯冲。</div><div>✦ <b>默契满了，点中间冲刺</b><br>搭档会加入！4.5 秒无敌，还能撞碎障碍。</div><div>♥ <b>每关三颗心，抵达终点就通关</b><br>三星：通关、全程无伤、骨头达标。地图保存进度。</div><div>✦ <b>飞扑 / 泡泡守护：小狗专属技能</b><br>小金毛短暂撞碎障碍并吸附骨头；小白留在原路线吸附骨头并抵挡一次碰撞。冷却后可再用。</div><div>⇄ <b>接棒按钮随时换领跑小狗</b><br>箱顶可踩，会自动弹起；连踩分数更高！侧面碰撞仍会受伤。电脑 F 技能、C 接棒。</div><div>♫ 音乐和音效可单独调整。<br>暂停后有倒数，切换 App 也会自动暂停。</div></div><button class="modal-primary" id="closeHelp">'+(prior==='running'?'准备继续':'知道啦')+'</button>');$('closeHelp').onclick=()=>{if(prior==='over')renderResults();else if(prior==='cleared')showClear();else if(prior==='paused'){state='running';pause();}else closeModal();};}
  function shop(message=''){if(state==='running')return;openModal('<div class="modal-tag">A LITTLE EXTRA SPARKLE</div><h2 id="modalTitle">尾迹工坊</h2><p>口袋里有 <b>'+save.wallet+'</b> 根骨头</p><div class="shop-list">'+trails.map(t=>{const owned=save.unlocked.includes(t.id),using=save.trail===t.id;return '<div class="shop-row"><span class="shop-icon" style="color:'+t.colors[0]+'">'+t.icon+'</span><span class="shop-copy"><strong>'+t.name+'</strong><small>'+t.note+'</small></span><button data-trail="'+t.id+'" '+(using||(!owned&&save.wallet<t.cost)?'disabled':'')+'>'+(using?'使用中':owned?'使用':t.cost+' ✦')+'</button></div>';}).join('')+'</div>'+(message?'<p>'+message+'</p>':'')+'<button class="modal-secondary" id="closeShop">回到公园</button>');$('modalCard').querySelectorAll('[data-trail]').forEach(b=>b.onclick=()=>buyTrail(b.dataset.trail));$('closeShop').onclick=()=>{$('modal').classList.add('hidden');homeUI();};}
  function buyTrail(id){const t=trails.find(t=>t.id===id);if(!t)return;if(!save.unlocked.includes(id)){if(save.wallet<t.cost)return;save.wallet-=t.cost;save.unlocked.push(id);}save.trail=id;persist();homeUI();shop('已经戴上快乐尾迹，出发试试吧。');tone(850,.16);}
  let lastRun=null;
  function finish(){if(finishSaved)return;finishSaved=true;stopMusic();const oldBest=save.best;save.best=Math.max(save.best,Math.floor(score));lastRun={newBest:Math.floor(score)>oldBest,oldBest};state='over';persist();homeUI();$('gameControls').classList.add('hidden');renderResults();}
  function renderResults(){
    const completed=missions.filter(m=>m.done).length;
    const next='第 '+(stage().world+1)+'-'+(levelIndex%2+1)+' 关还差 '+Math.max(0,Math.ceil(stage().length-dist))+' 米，下次就能到终点。';
    openModal('<div class="modal-tag">'+(lastRun?.newBest?'NEW PERSONAL BEST':'A GOOD DAY TO RUN')+'</div><h2 id="modalTitle">'+(lastRun?.newBest?'新纪录，搭档击掌！':'差一点点，再试一次！')+'</h2><span class="result-badge">✦ '+stage().name+'</span><div class="result-score">'+Math.floor(score).toLocaleString()+'</div><div class="result-stats"><span>距离<b>'+Math.floor(dist)+' m</b></span><span>骨头<b>'+bones+'</b></span><span>最高连击<b>'+maxStreak+'</b></span></div><div class="mission-results">'+missions.map(m=>'<div class="mission-row '+(m.done?'done':'')+'"><span>'+(m.done?'✓ ':'○ ')+m.label+'</span><b>'+(m.done?'+20 ✦':missionProgress(m))+'</b></div>').join('')+'</div><p class="result-note">'+(lastRun?.newBest&&lastRun.oldBest>0?'比之前多了 '+(Math.floor(score)-lastRun.oldBest)+' 分！':next)+'<br>本局收入 '+(bones+completed*20)+' ✦ · 最高 '+save.best.toLocaleString()+' 分</p><button class="modal-primary" id="restart">再撒欢一次 ↗</button><button class="share-button" id="shareRun">邀请朋友挑战我的成绩</button><div id="shareFallback"></div><button class="modal-secondary" id="resultHome">回到公园 · 换装扮</button>');
    $('restart').onclick=()=>{selectedLevel=levelIndex;start();};$('resultHome').onclick=home;$('shareRun').onclick=shareRun;
  }
  function missionValue(m){return m.type==='bones'?bones:m.type==='distance'?dist:m.type==='dash'?dashes:maxStreak;}
  function missionProgress(m){return Math.min(m.goal,Math.floor(missionValue(m)))+'/'+m.goal;}
  async function shareRun(){const url=new URL('https://neon-stride-karry.junyuliukarry.chatgpt.site');url.searchParams.set('challenge',Math.floor(score));const text='我和'+(save.character==='gold'?'小金毛':'小白')+'跑了 '+Math.floor(dist)+' 米，拿到 '+Math.floor(score)+' 分！来挑战我的成绩。';
    if(navigator.share){try{await navigator.share({title:'小金毛 × 小白 · 默契出逃',text,url:url.href});return;}catch(e){if(e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(text+' '+url.href);$('shareRun').textContent='链接已复制，发给朋友吧';}catch{$('shareFallback').innerHTML='<p>长按复制下面的挑战链接</p><input class="share-link" aria-label="挑战链接" readonly>';const input=$('shareFallback').querySelector('input');input.value=url.href;input.select();}
  }
  function settings(){if(state==='home'){levelIndex=selectedLevel;music.setTrack('assets/'+zones[stage().world].track+'.mp3?v=paper9');}if(['dying','countdown'].includes(state))return;const prior=state;if(state==='running')pause();openModal('<div class="modal-tag">SOUND & FEEL</div><h2 id="modalTitle">舒服地玩</h2><div class="settings-row"><span>声音</span><button id="muteSetting" aria-pressed="'+save.sound+'">'+(save.sound?'已开启':'已静音')+'</button></div><label class="settings-row" for="musicVolume"><span>背景音乐<small id="musicValue">'+Math.round(save.musicVolume*100)+'%</small></span><input id="musicVolume" aria-label="背景音乐音量" type="range" min="0" max="100" value="'+Math.round(save.musicVolume*100)+'"></label><label class="settings-row" for="effectsVolume"><span>动作音效<small id="effectsValue">'+Math.round(save.effectsVolume*100)+'%</small></span><input id="effectsVolume" aria-label="动作音效音量" type="range" min="0" max="100" value="'+Math.round(save.effectsVolume*100)+'"></label><div class="settings-row"><span>减少闪动<small>减少震屏、粒子和冲刺光线</small></span><button id="motionSetting" aria-pressed="'+save.reducedMotion+'">'+(save.reducedMotion?'已开启':'未开启')+'</button></div><p class="track-info">♪ '+zones[stage().world].song+'<br>'+zones[stage().world].mood+' · 每个世界一首主题曲。'+(music.failed?'<br>音乐加载失败，请点下面重试。':'')+'</p><button class="share-button" id="previewMusic">试听音乐</button><button class="modal-primary" id="closeSettings">'+(prior==='running'?'回到赛道':'完成')+'</button>');
    const apply=()=>{music.mix({music:save.musicVolume,effects:save.effectsVolume,muted:!save.sound});soundUI();persist();};
    $('muteSetting').onclick=()=>{save.sound=!save.sound;apply();$('muteSetting').textContent=save.sound?'已开启':'已静音';$('muteSetting').setAttribute('aria-pressed',save.sound);if(save.sound)music.unlock();};
    ['music','effects'].forEach(k=>$(k+'Volume').oninput=e=>{save[k+'Volume']=Number(e.target.value)/100;$(k+'Value').textContent=e.target.value+'%';apply();if(k==='effects')tone(760,.08);});
    $('motionSetting').onclick=()=>{save.reducedMotion=!save.reducedMotion;persist();$('motionSetting').textContent=save.reducedMotion?'已开启':'未开启';$('motionSetting').setAttribute('aria-pressed',save.reducedMotion);};
    $('previewMusic').onclick=()=>{if(music.wantsMusic){stopMusic();$('previewMusic').textContent='试听音乐';}else{save.sound=true;apply();music.unlock();music.play();$('previewMusic').textContent='停止试听';}};
    $('closeSettings').onclick=()=>{stopMusic();if(prior==='over')renderResults();else if(prior==='cleared')showClear();else if(prior==='paused'){state='running';pause();}else closeModal();};
  }

  function collision(o){o.hit=true;if(dashTime>0||(skillTime>0&&skillOwner==='gold')){burst(o.x+o.w/2,G-28,['#edb673','#fffbef','#4c3a28']);if(save.sound)music.foley?.('smash');hitStop=.045;hitFlash=.12;shake=motionReduced()?0:.13;feedback('嘭！+80',3);tone(145,.10,'sine',.08,65);score+=80;float('+80',o.x,G-75);o.dead=true;return;}if(invincible>0)return;duckMusic();if(shield>0){shield=0;invincible=1.4;hitStop=.04;feedback('泡泡挡住了！',3);particlesAt(P.x+30,G-P.y-20,20,['#95e5fa','#efffff'],220);toast('护盾替你挡住了！');tone(600,.15);return;}if(save.sound)music.foley?.('hit');stompChain=0;hp--;levelDamage++;hitStop=.085;hitFlash=.20;feedback('哎呀！',3);collectRun=0;invincible=2;shake=motionReduced()?0:.35;slow=.16;streak=0;mult=1;fever=Math.max(0,fever-12);particlesAt(P.x+30,G-P.y-20,14,['#ffc77d','#fff1bc'],180);tone(180,.2,'triangle',.07,65);if(hp<=0){state='dying';stopMusic();deadTime=0;P.slide=0;held=false;toastTime=0;$('toast').classList.remove('show');}else toast(hp===1?'还有一颗心，稳住！':'蹭了一下，继续跑！');}
  function collect(o){if(o.dead)return;o.dead=true;if(o.type==='bone'){bones++;save.wallet++;dirty=true;score+=12*mult;fever=Math.min(100,fever+(save.character==='gold'?6.5:5.5));tone([659,784,880,988,1175][(bones-1)%5],.085,'sine',.05);collectRun++;reactionTime=.45;if(collectRun%5===0)feedback('骨头 +5');particlesAt(o.x,G-o.y,4,['#fff9bc','#ffd168'],65);}else if(o.type==='shield'){shield=12;toast('泡泡护盾 · 抵挡一次碰撞');tone(850,.18);particlesAt(o.x,G-o.y,12,['#a1e8fb','#ffffff'],100);}else if(o.type==='magnet'){magnet=10;toast('骨头磁铁 · 10 秒自动吸附');tone(550,.2,'sine',.07,1000);}else if(o.type==='heart'){hp=Math.min(3,hp+1);toast('补回一颗心，继续撒欢！');tone(700,.16);}}
  function put(type,x,y=0,w=35){objects.push({type,x,y,w,passed:false,hit:false,dead:false,phase:Math.random()*6});}
  function boneLine(x,heights,step=31){heights.forEach((h,i)=>put('bone',x+i*step,h,22));}
  function pattern(){
    const v=currentSpeed(),beat=60/[112,116,126,112,120,132][stage().world],x=W+45,l=levelIndex;
    patternCount++;
    const finishX=P.x+(stage().length-dist)*baseSpeed()/24;
    if(x>finishX-130){spawn=3;return;}
    if(bonusActive){boneLine(x,[25,25,25,25,25,25,25],30);spawn=1.1;return;}
    const recipes=[
      [['crate'],['log'],['crate','crate'],['crate']],
      [['crate','beam'],['beam','crate'],['crate','crate'],['log','beam']],
      [['roller','roller'],['beam','crate'],['cone','roller'],['crate','crate']],
      [['crate','crate','crate'],['puddle','crate'],['beam','roller'],['crate','crate','crate']],
      [['stack','crate'],['log','beam'],['crate','stack'],['stack','stack']],
      [['stack','beam','crate'],['crate','crate','beam'],['kite','log'],['puddle','stack']],
      [['roller','cone','roller'],['beam','crate'],['crate','crate','crate'],['puddle','roller']],
      [['crate','crate','crate'],['stack','stack'],['kite','roller','crate'],['puddle','stack']],
      [['kite','crate','beam'],['stack','crate','crate'],['cone','kite'],['roller','roller']],
      [['stack','crate','crate'],['beam','log','kite'],['puddle','crate','crate'],['stack','kite']],
      [['crate','crate','crate','crate'],['kite','stack','beam'],['puddle','crate','stack'],['roller','roller','crate']],
      [['crate','crate','crate'],['kite','stack','beam'],['cone','roller','kite'],['puddle','stack','crate']]
    ];
    const phrase=recipes[l][(patternCount-1)%4];
    const chained=phrase.length>1&&phrase.every(t=>t==='crate');
    sectionName=chained?'踩箱接力':phrase.includes('beam')||phrase.includes('kite')?'跳 · 落 · 滑':phrase.includes('stack')?'跳高一点':'跟着骨头走';
    if(patternCount%2===1)toast(sectionName,1.2);
    let at=x;
    phrase.forEach((type,i)=>{
      const spec=window.PaperProps.specs[type];
      if(at>finishX-130)return;
      put(type,at,0,type==='puddle'?(l>6?135:110):spec.w);
      if(type==='beam'||type==='kite')boneLine(at-12,[20,20,20,20],28);
      else if(chained){boneLine(at+4,[spec.h+27,spec.h+43],23);}
      else if(type==='stack'){boneLine(at-32,[80,116,139,116,80],28);}
      else if(type==='puddle'){boneLine(at-8,[50,88,112,88,50],29);}
      else {boneLine(at-24,[48,76,94,76],27);}
      const next=phrase[i+1];
      // Two-beat phrases alternate action and recovery. Same-height crate chains
      // use the physical bounce flight time instead of arbitrary random gaps.
      at+=chained?v*.38:v*Math.max(.98,beat*2)+(type==='stack'?v*.10:0);
    });
    const phraseTime=(at-x)/v;
    spawn=phraseTime+beat*(l<2?1.8:1.15);
    if(patternCount%3===0)put(hp<3?'heart':'magnet',at-20,29,29);
    previousPattern=phrase.join('-');
  }
  function hud(){$('game').dataset.world=String(zone);$('score').textContent=Math.floor(score).toLocaleString();$('distance').textContent=Math.floor(dist)+' m';$('hearts').textContent='♥ '.repeat(hp)+'♡ '.repeat(3-hp);$('hearts').setAttribute('aria-label','剩余 '+hp+' 颗爱心');$('bones').textContent=bones;$('combo').textContent='×'+mult+(streak?' · '+streak+'连击':'');$('speed').textContent=(stage().speed+Math.min(elapsed/450,.07)).toFixed(1)+'×';$('feverFill').style.width=(dashTime>0?dashTime/4.5*100:fever)+'%';$('feverLabel').textContent=dashTime>0?'双狗冲刺 · '+dashTime.toFixed(1)+'s':fever>=100?'已蓄满 · 点下方双狗冲刺':'默契值';$('dash').disabled=fever<100||dashTime>0;$('dash').className='dash'+(dashTime>0?' active':fever>=100?' ready':'');$('dashHint').textContent=dashTime>0?(dashTime<1?'将结束 · ':'无敌 · ')+dashTime.toFixed(1)+'s':fever>=100?'点我 · 4.5秒':'蓄能 '+Math.floor(fever)+'%';$('scoreLabel').textContent=challengeScore?'目标 '+challengeScore.toLocaleString()+' 分':recordShown?'新纪录保持中':'本局得分';const remaining=Math.max(0,stage().length-dist);$('routeLabel').textContent=(stage().world+1)+'-'+(levelIndex%2+1)+' '+stage().name+' · 终点';$('routeDistance').textContent=Math.ceil(remaining)+' m';$('routeFill').style.width=(Math.min(1,dist/stage().length)*100)+'%';skillHUD();$('switchDog').disabled=switchCooldown>0||skillTime>0;$('switchDog').textContent=(save.character==='gold'?'小金毛':'小白')+' ⇄ 接棒';$('game').classList.toggle('bonus',bonusActive);$('effect').textContent=[bonusActive?'✦ 奖励小路 · 放松收集':'',shield>0?'◉ 护盾 '+Math.ceil(shield)+'s':'',magnet>0?'∩ 磁铁 '+Math.ceil(magnet)+'s':''].filter(Boolean).join('　');}
  function skillHUD(){
    const gold=save.character==='gold',active=skillTime>0,phase=active?'active':skillCooldown>0?'cooldown':dashTime>0?'waiting':'ready';
    const name=gold?'飞扑破障':'泡泡守护',detail=gold?'撞碎障碍 · 吸骨头':shield>0||!active?'挡一次 · 吸骨头':'护盾已用 · 吸骨头';
    const status=active?'生效 '+skillTime.toFixed(1)+'s':skillCooldown>0?'冷却 '+Math.ceil(skillCooldown)+'s':dashTime>0?'冲刺后可用':'点我释放';
    const fill=active?skillTime/(gold?1.05:2.8):skillCooldown>0?1-skillCooldown/(gold?9:10):1,b=$('skill');
    if(b.dataset.phase!==phase||b.dataset.dog!==save.character)$('skillAnnounce').textContent=name+'，'+status;
    b.dataset.phase=phase;b.dataset.dog=save.character;b.disabled=phase!=='ready';b.setAttribute('aria-label',name+'，'+detail+'，'+status);
    $('skillName').textContent=name;$('skillDetail').textContent=detail;$('skillState').textContent=status;$('skillIcon').textContent=gold?'✦':'◉';$('skillFill').style.width=Math.max(0,Math.min(1,fill))*100+'%';
    $('game').classList.toggle('reduced',motionReduced());
  }
  function sprintPose(t){const wave=Math.sin(t*18);return {lift:Math.max(0,wave)*10,angle:.06+Math.sin(t*18-.5)*.075,pose:wave>.55?3:1+Math.floor(t*9)%2};}
  function tick(dt){if(state==='paused')return;feedbackTime=Math.max(0,feedbackTime-dt);hitFlash=Math.max(0,hitFlash-dt);landRing=Math.max(0,landRing-dt);$('impactText').style.left=Math.max(100,Math.min(W-100,P.x+85))*viewScale+'px';$('impactText').style.top=Math.max(190,(G-P.y-115)*viewScale)+'px';$('impactText').style.opacity=String(Math.min(1,feedbackTime*5));$('impactText').style.transform='translate(-50%,'+(-22*(1-feedbackTime/.75))+'px) scale('+(1+Math.sin(Math.min(1,(.75-feedbackTime)/.18)*Math.PI)*.16)+')';if(hitStop>0){hitStop=Math.max(0,hitStop-dt);return;}clock+=dt;reactionTime=Math.max(0,reactionTime-dt);if(state==='countdown'){countdownTime-=dt;$('countdown').textContent=Math.max(1,Math.ceil(countdownTime/0.8));if(countdownTime<=0){state='running';$('countdown').classList.add('hidden');startMusic();}return;}toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);floaters.forEach(f=>{f.y-=33*dt;f.life-=dt;});floaters=floaters.filter(f=>f.life>0);if(state==='dying'){deadTime+=dt;shake=Math.max(0,shake-dt);if(deadTime>.85)finish();return;}if(state!=='running'){if(state==='cleared'){celebrateTime+=dt;if(celebrateTime>=2.2&&$('modal').classList.contains('hidden'))showClear();}petTime=Math.max(0,petTime-dt);return;}
    skillTime=Math.max(0,skillTime-dt);skillCooldown=Math.max(0,skillCooldown-dt);switchCooldown=Math.max(0,switchCooldown-dt);elapsed+=dt;zoneBlend=Math.min(1,zoneBlend+dt*.8);bonusNext=dist/stage().length>.48&&dist/stage().length<.62;if(bonusNext!==bonusActive){bonusActive=bonusNext;if(bonusActive){toast('奖励小路 · 地上都是骨头！',2.5);spawn=Math.min(spawn,.3);magnet=Math.max(magnet,5);}else toast('快乐充好电，下一段继续！',1.8);}if(save.best>0&&score>save.best&&!recordShown){recordShown=true;toast('超过自己的最高分啦！',2.6);tone(980,.2);}if(challengeScore&&score>challengeScore&&!challengeShown){challengeShown=true;toast('好友挑战成功！继续创造新纪录',2.8);}const v=currentSpeed();if(landRing>0)ringX-=v*dt;dashBlend+=(Number(dashTime>0)-dashBlend)*Math.min(1,dt*12);const footBeat=Math.floor((clock*18-Math.PI)/(Math.PI*2));if(dashTime>0&&P.y===0&&P.slide<=0&&footBeat!==dashBeat){dashBeat=footBeat;if(!motionReduced())particlesAt(P.x-25,G-3,5,['#e0c49a','#fff8e7'],95);}stepSound-=dt;if(stepSound<=0&&P.y===0&&P.slide<=0){stepSound=90/v;if(save.sound)music.sample?.(zone===3?'snow':'land',dashTime>0?.07:.045);}scrollX+=v*dt;dist+=v/baseSpeed()*24*dt;score+=v*dt/14;spawn-=dt;if(spawn<=0)pattern();[shield,magnet,invincible,shake,slow]=[shield,magnet,invincible,shake,slow].map(t=>Math.max(0,t-dt));if(dashTime>0){dashTime=Math.max(0,dashTime-dt);if(dashTime===0){invincible=Math.max(invincible,1);feedback('冲刺结束',2);toast('冲刺结束，继续跳跃和滑行');}}
    buffer=Math.max(0,buffer-dt);P.slide=Math.max(0,P.slide-dt);
    if((held||blockedAbove())&&P.y<1)P.slide=Math.max(P.slide,.10);
    P.squash*=Math.exp(-dt*15);const oldY=P.y;
    if(P.y>0||P.vy>0){
      P.jumpAge+=dt;
      // A tap has a useful minimum hop. Holding extends to the full arc.
      if(!P.jumpHeld&&!P.cut&&P.jumpAge>.095&&P.vy>0){P.vy=Math.max(320,P.vy*.48);P.cut=true;}
      P.vy-=(P.vy<0?4185:3100)*dt;P.y+=P.vy*dt;
      if(P.y<=0){const impact=Math.min(1,-P.vy/900);P.y=0;P.vy=0;P.jumps=0;P.dive=false;stompChain=0;P.squash=.14+impact*.22;landRing=.23;ringX=P.x+34;ringY=G;
        if(save.sound)music.foley?.(zone===3?'snow':'land');particlesAt(P.x+28,G,8,['#dcc4a0','#fff9eb'],155);if(buffer>0)jump();}
    }
    const sliding=P.slide>0&&P.y<1,ph=sliding?23:56,pl=P.x+13,pr=P.x+53,pt=G-P.y-ph,pb=G-P.y-3;
    for(const o of objects){
      o.x-=v*dt;
      if(['bone','shield','magnet','heart'].includes(o.type)){
        let cy=G-o.y;
        if(magnet>0&&o.type==='bone'&&Math.hypot(o.x-P.x,cy-(G-P.y-25))<(skillTime>0&&skillOwner==='white'?240:170)){
          o.x+=(P.x+30-o.x)*dt*10;o.y+=(P.y+25-o.y)*dt*10;cy=G-o.y;
        }
        if(o.x+14>pl&&o.x-14<pr&&cy+14>pt&&cy-14<pb)collect(o);continue;
      }
      const spec=window.PaperProps.specs[o.type];if(!spec)continue;
      const top=G-spec.h,bottom=G-(spec.bottom||0),overlap=pr>o.x+6&&pl<o.x+o.w-6;
      if(!o.hit&&overlap){
        // Cross the visible top from above; side hits keep their normal damage.
        if(spec.stomp&&P.vy<0&&oldY>=spec.h-9&&P.y<=spec.h+5){stomp(o);continue;}
        if(pb>top+5&&pt<bottom-4){collision(o);if(state==='dying')break;}
      }
      if(!o.passed&&o.x+o.w<pl){o.passed=true;if(!o.hit||dashTime>0){
        streak++;maxStreak=Math.max(maxStreak,streak);mult=Math.min(5,1+Math.floor(streak/4));score+=40*mult;fever=Math.min(100,fever+4);
        if(streak%3===0){feedback(streak+' 连击！');reactionTime=.7;float('+'+40*mult,P.x+60,G-P.y-90,'#886044');}
      }}
    }
    objects=objects.filter(o=>!o.dead&&o.x+o.w>-50);
    missions.forEach(m=>{const n=missionValue(m);if(!m.done&&n>=m.goal){m.done=true;save.wallet+=20;dirty=true;toast('小目标完成！+20 根骨头');tone(1000,.25);}});
    if(dist>=stage().length){dist=stage().length;clearLevel();return;}
    trailTimer-=dt;if(trailTimer<=0&&!motionReduced()){trailTimer=dashTime>0?.06:.1;const t=trails.find(t=>t.id===save.trail);particlesAt(P.x+5,G-P.y-12,dashTime>0?2:1,dashTime>0?['#eec68c','#fff2ce','#aed6ca']:t.colors,45);}
    bankTime+=dt;if(bankTime>3){bankTime=0;if(dirty)persist();}hudClock+=dt;if(hudClock>=.05){hudClock=0;hud();}
  }
  function sprite(im,box,x,y,w,h){if(!im.complete||!im.naturalWidth)return;ctx.drawImage(im,box[0],box[1],box[2],box[3],x,y,w,h);}
  const expressionBoxes={gold:[[28,176,350,275],[418,211,352,240],[811,151,343,298],[1201,120,317,337]],white:[[34,604,350,315],[418,628,351,273],[815,585,345,322],[1195,548,328,361]]};
  function drawDog(kind,pose,x,y,w=100,rotation=0,squash=0){if(!loaded)return;const extended=pose>=6,im=extended?expressions:dogs,b=extended?expressionBoxes[kind][pose-6]:dogBoxes[kind][pose],dw=extended?w*.8:w,h=dw*b[3]/b[2],base=extended?y-8:y;ctx.save();ctx.translate(x+w/2,base-h/2);ctx.rotate(rotation);ctx.scale(1+squash*.42,1-squash);ctx.shadowColor=zone===4&&state!=='home'?'#444359':'#fffbf1';ctx.shadowBlur=12;sprite(im,b,-dw/2,-h/2,dw,h);ctx.restore();}
  function prop(index,x,y,w,h){if(!props.complete||!props.naturalWidth)return;const b=propBoxes[index]||[(index%4)*384,Math.floor(index/4)*512,384,512];sprite(props,b,x,y,w,h);}
  function drawScene(index,alpha){const floor=state==='home'?(W<600?Math.min(H*.65,H-270/viewScale):H*.645):G;ctx.save();ctx.globalAlpha=alpha;window.PaperWorld.draw(ctx,index,W,H,floor,motionReduced()?0:state==='home'?clock*10:scrollX,motionReduced()?0:clock);ctx.restore();}
  function draw(){ctx.setTransform(dpr*viewScale,0,0,dpr*viewScale,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(shake>0&&!motionReduced())ctx.translate(Math.sin(clock*80)*shake*10,Math.cos(clock*65)*shake*4);drawScene(state==='home'?levels[selectedLevel].world:zone,1);if(zoneBlend<1&&state!=='home')drawScene(previousZone,1-zoneBlend);
    if(dashTime>0){ctx.fillStyle='#ffedb733';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#4a3b2c50';ctx.lineWidth=2;for(let i=0;i<(motionReduced()?0:12);i++){const x=(clock*950+i*197)%W,y=H*.25+(i*97)%(H*.4);ctx.beginPath();ctx.moveTo(W-x,y);ctx.lineTo(W-x-35,y);ctx.stroke();}}
    if(state==='home'){const size=W<600?(H<570?104:142):170,floor=(W<600?Math.min(H*.65,H-270/viewScale):H*.645)+Math.sin(clock*2.5)*2,gap=W<600?(H<570?56:64):86;ctx.fillStyle='#94754d20';ctx.beginPath();ctx.ellipse(W*.5-gap/2,floor+2,size*.28,7,0,0,Math.PI*2);ctx.ellipse(W*.5+gap/2,floor+2,size*.28,7,0,0,Math.PI*2);ctx.fill();drawDog('gold',petTime>0&&save.character==='gold'?7:Math.floor(clock/3)%3===0?6:Math.floor(clock/3)%3===1?0:9,W*.5-gap-size/2,floor,size,Math.sin(clock*1.5)*.025);drawDog('white',petTime>0&&save.character==='white'?7:Math.floor(clock/3+1)%3===0?6:Math.floor(clock/3+1)%3===1?0:9,W*.5+gap-size/2,floor,size,-Math.sin(clock*1.5)*.025);const t=trails.find(t=>t.id===save.trail);if(!motionReduced()&&Math.floor(clock*10)%3===0&&particles.length<25)particlesAt(W*.5,floor-28,1,t.colors,40);}else{
      for(const o of objects){if(!o.dead)window.PaperProps.draw(ctx,o,G,clock,window.PaperWorld.theme(zone));}
      const gateX=P.x+(stage().length-dist)*baseSpeed()/24;if(gateX<W+30&&gateX>P.x-50){ctx.strokeStyle='#fff6d8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(gateX,G);ctx.lineTo(gateX,G-160);ctx.stroke();ctx.fillStyle='#285e4b';ctx.fillRect(gateX-45,G-165,90,32);ctx.fillStyle='#fff9d8';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText('终点',gateX,G-143);}
      ctx.fillStyle='#8f76592a';ctx.beginPath();ctx.ellipse(P.x+34,G+3,Math.max(14,30-P.y*.08),4,0,0,Math.PI*2);ctx.fill();if(shield>0||dashTime>0){ctx.beginPath();ctx.ellipse(dashTime>0?P.x-7:P.x+35,G-P.y-27,dashTime>0?90:47,dashTime>0?48:41,0,0,Math.PI*2);ctx.fillStyle=dashTime>0?'#ffd57144':'#bbf4ff44';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=dashTime>0?'#ffd267':'#8cd4e9';ctx.stroke();}
      if(skillTime>0&&skillOwner==='white'){
        ctx.save();ctx.strokeStyle='#74b7b8';ctx.lineWidth=2;
        for(let i=0;i<3;i++){const q=(clock*1.4+i/3)%1;ctx.globalAlpha=(1-q)*.65;ctx.beginPath();ctx.ellipse(P.x+35,G-P.y-30,48+q*40,39+q*15,0,-1.2+q*.4,1.2+q*.4);ctx.stroke();}ctx.restore();
      }
      ctx.globalAlpha=invincible>0&&dashTime<=0&&Math.floor(clock*10)%2===0?.4:1;let pose=P.slide>0&&P.y<1?4:P.y>0?3:1+Math.floor(clock*(dashTime>0?16:10))%2;let angle=P.y>0?Math.max(-.22,Math.min(.18,-P.vy/3100)):Math.sin(clock*18)*.035;if(state==='dying'){pose=0;angle=Math.sin(deadTime*6)*.12;}else if(state==='over')pose=6;else if(state==='cleared')pose=9;else if(skillTime>0&&skillOwner==='gold'&&P.slide<=0&&P.y===0){pose=Math.sin(clock*18)>.1?8:1+Math.floor(clock*10)%2;angle=.08+Math.sin(clock*18)*.08;}else if(P.jumps===2&&P.y>0){pose=7;angle=motionReduced()?0:Math.min(1,P.jumpAge/.36)*Math.PI*2;}else if(invincible>1.5&&dashTime===0){pose=6;angle=Math.sin(clock*35)*.1;}const sprint=sprintPose(clock),companion=sprintPose(clock+.13);if(dashTime>0&&P.y===0&&P.slide<=0){pose=sprint.pose;angle=sprint.angle*dashBlend;}const main=save.character,partner=main==='gold'?'white':'gold',dogWidth=pose===4?108:102,groundY=G-P.y+(P.y===0&&state==='running'?Math.sin(clock*22)*.6:0)-(P.y===0&&P.slide<=0?sprint.lift*dashBlend:0);if(state==='cleared')drawDog(partner,9,W*.5+12,G-Math.abs(Math.sin(celebrateTime*6+.6))*20,102,Math.sin(celebrateTime*5)*.10);// Render exactly the lead dog and its one companion; speed uses particles, never cloned dogs.
      if(dashTime>0)drawDog(partner,P.slide>0&&P.y<1?4:P.y>0?3:companion.pose,P.x-94,G-P.y+4-(P.slide<=0&&P.y===0?companion.lift*dashBlend:0),88,P.slide>0?0:companion.angle*dashBlend,P.squash*.6);drawDog(main,pose,state==='cleared'?W*.5-110:P.x-18,state==='cleared'?G-Math.abs(Math.sin(celebrateTime*6))*20:groundY,dogWidth,state==='cleared'?Math.sin(celebrateTime*5)*-.10:angle,P.squash);ctx.globalAlpha=1;if(reactionTime>0){ctx.save();ctx.fillStyle=zone===4?'#ffd791':'#bc7056';ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.fillText(skillTime>0&&skillOwner==='white'?'♡':'♪',P.x+65,G-P.y-78-Math.sin(clock*9)*4);ctx.restore();}
    }
    if(landRing>0){ctx.save();ctx.globalAlpha=landRing/.23*.55;ctx.strokeStyle='#b0875d';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(ringX,ringY+2,18+(1-landRing/.23)*30,3+(1-landRing/.23)*5,0,0,Math.PI*2);ctx.stroke();ctx.restore();}if(hitFlash>0&&!motionReduced()){ctx.fillStyle='rgba(255,232,187,'+hitFlash*.40+')';ctx.fillRect(0,0,W,H);}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);if(p.shape){ctx.rotate((p.angle||0)+clock*4);if(p.shape==='star'){window.PaperProps.starPath(ctx,0,0,p.size*1.4);ctx.fill();}else ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);}else{ctx.beginPath();ctx.arc(0,0,p.size,0,Math.PI*2);ctx.fill();}ctx.restore();}ctx.globalAlpha=1;for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life*2);ctx.font='bold 17px sans-serif';ctx.textAlign='center';ctx.strokeStyle=zone===4?'#444359':'#fffbf1';ctx.lineWidth=4;ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;ctx.restore();
  }
  function loop(now){const dt=Math.min((now-(last||now))/1000,.1);last=now;if(!loaded){assetWait+=dt;if(assetWait>15)$('loadingError').classList.remove('hidden');}stepCarry+=dt;while(stepCarry>=1/120){tick(1/120);stepCarry-=1/120;}music.update(state==='running'||state==='cleared'&&music.wantsMusic||(state!=='running'&&music.wantsMusic&&!$('modal').classList.contains('hidden')),dashTime>0);draw();requestAnimationFrame(loop);}
  $('start').onclick=start;$('levelSelect').onclick=worldMap;$('skill').onclick=e=>{if(e.detail===0)skill();};$('skill').addEventListener('pointerdown',e=>{e.preventDefault();skill();});$('switchDog').onclick=switchDog;$('pause').onclick=pause;$('help').onclick=help;$('wardrobe').onclick=()=>shop();$('characterPicker').querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>chooseCharacter(b.dataset.character));$('sound').onclick=settings;
  $('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();$('jump').setPointerCapture(e.pointerId);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>$('jump').addEventListener(evt,releaseJump));
  $('slide').addEventListener('pointerdown',e=>{e.preventDefault();held=state==='running';slide();$('slide').setPointerCapture(e.pointerId);});
  const release=()=>held=false;['pointerup','pointercancel','lostpointercapture'].forEach(evt=>$('slide').addEventListener(evt,release));
  $('dash').addEventListener('pointerdown',e=>{e.preventDefault();dash();});$('dash').onclick=e=>{if(e.detail===0)dash();};
  let pointer=null;
  canvas.addEventListener('pointerdown',e=>{
    if(state!=='running'||pointer)return;e.preventDefault();
    const r=canvas.getBoundingClientRect(),low=(e.clientY-r.top)/viewScale>G+18;
    pointer={id:e.pointerId,y:e.clientY,done:low};canvas.setPointerCapture(e.pointerId);
    if(low){held=true;slide();}else jump();
  });
  canvas.addEventListener('pointermove',e=>{if(pointer&&pointer.id===e.pointerId&&!pointer.done&&e.clientY-pointer.y>22){held=true;slide();pointer.done=true;}});
  const endPointer=e=>{if(pointer&&pointer.id===e.pointerId){releaseJump();held=false;pointer=null;}};
  ['pointerup','pointercancel','lostpointercapture'].forEach(evt=>canvas.addEventListener(evt,endPointer));
  document.addEventListener('keydown',e=>{if(e.code==='Tab'&&!$('modal').classList.contains('hidden')){const b=[...$('modalCard').querySelectorAll('button:not([disabled]), input:not([disabled])')];if(!b.length)return;if(e.shiftKey&&document.activeElement===b[0]){e.preventDefault();b[b.length-1].focus();}else if(!e.shiftKey&&document.activeElement===b[b.length-1]){e.preventDefault();b[0].focus();}return;}if(!['Space','ArrowUp','ArrowDown','KeyS','KeyD','KeyF','KeyC','Escape','KeyP'].includes(e.code))return;if(e.code==='Space'&&e.target instanceof HTMLButtonElement&&state!=='running')return;e.preventDefault();if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP'){if(state==='running')pause();else if(state==='paused')resume();return;}if(state==='home'||state==='over'){if(e.code==='Space'&&$('modal').classList.contains('hidden'))start();else if(e.code==='Space'&&state==='over'){selectMissions();start();}return;}if(e.code==='KeyF')skill();else if(e.code==='KeyC')switchDog();else if(e.code==='KeyD')dash();else if(e.code==='Space'||e.code==='ArrowUp')jump();else{held=state==='running';slide();}});document.addEventListener('keyup',e=>{if(e.code==='ArrowDown'||e.code==='KeyS')held=false;if(e.code==='Space'||e.code==='ArrowUp')releaseJump();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopMusic();persist();}});window.addEventListener('pagehide',()=>{pause();stopMusic();held=false;P.jumpHeld=false;persist();});
  resize();homeUI();requestAnimationFrame(loop);
})();
