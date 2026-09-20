import * as T from './vendor/three.module.js';
import {sphereGeo,material,ellipsoid,roundedBox,bone,star,heart} from './models.js?v=touchsound15b';
import {WORLDS,LANES,HAZARDS,moverZ,rampHeight} from './levels.js?v=rules18';
const cylinder=new T.CylinderGeometry(1,1,1,9),ball=new T.SphereGeometry(1,10,8),cone=new T.ConeGeometry(1,1,7);
function mesh(parent,geo,color,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
const cube=new T.BoxGeometry(1,1,1);
export function createWorld(scene,data,options={}){if(options.home)return createHomeWorld(scene,WORLDS[data.level.world]);const w=WORLDS[data.level.world],root=new T.Group();scene.add(root);const meshes=new Map(),animated=[];const assets=[];const biome=data.level.world;const pathColors=[0xf1dec0,0xe8bb86,0xafba83,0xc4e7f6,0x7c84b2,0xf0d4b1];
 function island(a,b,lane){if(b-a<=.00001)return;if(b-a>8.00001){for(let x=a;x<b-.00001;x+=8)island(x,Math.min(x+8,b),lane);return;}const centre=(a+b)/2,length=b-a,z=LANES[lane];
  const soil=mesh(root,cube,w.soil,centre,-.50,z,length,.85,2.25);soil.receiveShadow=true;
  const track=mesh(root,cube,pathColors[biome],centre,-.065,z,length,.15,2.25);track.receiveShadow=true;
 }
 for(let lane=0;lane<3;lane++){let cursor=-18;for(const g of data.gaps.filter(g=>g.lane===undefined||g.lane===lane).sort((a,b)=>a.a-b.a)){island(cursor,g.a,lane);cursor=g.b;}island(cursor,data.level.length+18,lane);}
 // A broad path with continuous verges gives every obstacle an unambiguous silhouette.
 for(const z of [-3.70,3.70])for(let x=-14;x<data.level.length+20;x+=8){if(data.gaps.some(g=>g.lane===(z<0?0:2)&&x+4>g.a&&x-4<g.b))continue;mesh(root,cube,w.grass,x,-.02,z,8,.32,.62);mesh(root,cube,0xfff8e8,x,.15,z,8,.12,.13);}
 // Deck seams describe wood piers, woodland boardwalks, translucent ice and star tiles.
 const seamPoints=[];for(let x=-12;x<data.level.length+12;x+=(biome===1||biome===2?1.7:4))for(let lane=0;lane<3;lane++){
  if(data.gaps.some(g=>g.lane===lane&&x>g.a-.12&&x<g.b+.12))continue;
  seamPoints.push([x,LANES[lane]]);
 }
 const seams=new T.InstancedMesh(cube,material([0xe4c7a0,0xc29163,0x879765,0xeaffff,0xb7b3dc,0xffefca][biome]),seamPoints.length),sm=new T.Matrix4();
 seamPoints.forEach(([x,z],i)=>{sm.compose(new T.Vector3(x,.019,z),new T.Quaternion(),new T.Vector3(biome===3?.08:.035,.012,2.1));seams.setMatrixAt(i,sm);});root.add(seams);
 const marks=[];for(let x=-14;x<data.level.length+18;x+=3.6)for(const z of [-1.125,1.125])if(!data.gaps.some(g=>x>g.a-1&&x<g.b+1&&Math.abs(LANES[g.lane]-z)<1.2))marks.push([x,z]);
 const roadMarks=new T.InstancedMesh(cube,material(0xfffcf3),marks.length),mm=new T.Matrix4();marks.forEach(([x,z],i)=>{mm.compose(new T.Vector3(x,.022,z),new T.Quaternion(),new T.Vector3(1.35,.012,.035));roadMarks.setMatrixAt(i,mm);});root.add(roadMarks);
 for(const gap of data.gaps){const lanes=gap.lane===undefined?[0,1,2]:[gap.lane];for(const lane of lanes){for(const x of [gap.a-.17,gap.b+.17])mesh(root,cube,biome===3?0x7baeca:0xe29b65,x,.05,LANES[lane],.24,.06,2.1);for(let k=0;k<3;k++)mesh(root,cube,0xfff6c8,gap.a-1.8+k*.4,.04,LANES[lane],.10,.025,.55-k*.12);}}
 for(const p of data.platforms){const z=LANES[p.lane];for(let x=p.a;x<p.b;x+=.6){const end=Math.min(x+.6,p.b),h=rampHeight(p,(x+end)/2);const deck=mesh(root,cube,biome===2?0xac895f:biome===3?0xb6dcea:0x79b7af,(x+end)/2,h-.09,z,end-x,.18,1.83);deck.receiveShadow=true;for(const side of [-1,1])mesh(root,cube,0xfff4cb,(x+end)/2,h+.07,z+side*.91,end-x,.12,.045);}for(const x of [p.a+6,p.b-6])mesh(root,cylinder,0x6b948f,x,.45,z,.10,.9,.10);}
 // Instanced scenery keeps the number of draw calls stable on phones.
 const trunkPoints=[],leafPoints=[],flowerPoints=[],cloudPoints=[],rockPoints=[];
 for(let i=0;i<Math.ceil(data.level.length/8)+4;i++)for(const side of [-1,1]){const x=i*8-12+Math.sin(i*7+side)*2,z=side*(5.6+(i%3)*1.6);const islandSize=1.9+(i%3)*.5;
 rockPoints.push({p:[x,-1.35,z],s:[islandSize,1.4,islandSize*.7]});
 if(data.level.world===3){for(let k=0;k<3;k++)leafPoints.push({p:[x,1.5+k*.57,z],s:[1.1-k*.24,1.5-k*.25,1.1-k*.24],pine:true});}
 else if(data.level.world===1){trunkPoints.push({p:[x,.75,z],s:[.17,2.2,.17]});for(let k=0;k<5;k++){const a=k/5*Math.PI*2;leafPoints.push({p:[x+Math.cos(a)*.6,2.1,z+Math.sin(a)*.6],s:[.8,.18,.55]});}}
 else{trunkPoints.push({p:[x,.5,z],s:[.18,1.8,.18]});for(let k=0;k<4;k++)leafPoints.push({p:[x+Math.sin(k*2.2)*.7,1.65+(k%2)*.55,z+Math.cos(k*2.2)*.4],s:[1.0,.95,.95]});}
 for(let k=0;k<4;k++)flowerPoints.push({p:[x+(k-1.5)*.5,.18,z-side*.4],s:[.14,.17,.14]});
 if(i%3===0)cloudPoints.push({p:[x+4,-4.5,side*12],s:[5,1.7,2.8]});
 }
 const matrix=new T.Matrix4(),quat=new T.Quaternion(),v=new T.Vector3();function instances(geo,color,points){const m=new T.InstancedMesh(geo,material(color),points.length);points.forEach((p,i)=>{matrix.compose(new T.Vector3(...p.p),quat,new T.Vector3(...p.s));m.setMatrixAt(i,matrix);});m.instanceMatrix.needsUpdate=true;root.add(m);assets.push(m);return m;}
 instances(ball,w.soil,rockPoints);instances(cylinder,0x997557,trunkPoints);instances(data.level.world===3?cone:ball,data.level.world===0||data.level.world===5?w.accent:data.level.world===3?0xe6faff:0x7aac8c,leafPoints);instances(ball,0xfff5b9,flowerPoints);instances(ball,0xf6f7f2,cloudPoints);
 // World-specific silhouettes and moving landmarks, all outside the playable lanes.
 for(const [i,x] of [35,125,235].entries()){
 const g=new T.Group();g.position.set(x,0,(i%2?1:-1)*7);root.add(g);
 if(data.level.world===0){mesh(g,cylinder,0xffebcb,0,1.9,0,.65,3.8,.65);mesh(g,cone,0xda967a,0,4.25,0,1.0,1.1,1);const rotor=new T.Group();rotor.position.set(0,3.4,.76);g.add(rotor);for(let k=0;k<4;k++){const blade=mesh(rotor,cube,0xfff7dd,Math.sin(k*Math.PI/2)*.8,Math.cos(k*Math.PI/2)*.8,0,.20,1.85,.07);blade.rotation.z=-k*Math.PI/2;}ellipsoid(rotor,0xf2c069,[0,0,.12],[.2,.2,.15]);animated.push({m:rotor,kind:'rotor'});}
 else if(data.level.world===1){mesh(g,cylinder,0xfff0d7,0,2.0,0,.70,4,.70);for(const y of [1.0,2.4])mesh(g,cylinder,0xe99785,0,y,0,.72,.40,.72);mesh(g,cylinder,0xffdb7e,0,4.25,0,.55,.50,.55);mesh(g,cone,0xd28d7e,0,4.85,0,.94,.75,.94);}
 else if(data.level.world===2){for(let k=0;k<3;k++){const xx=(k-1)*1.3;mesh(g,cylinder,0xf0d6a8,xx,1.0,0,.26,2,.26);ellipsoid(g,k%2?0xe2b86a:0xc38894,[xx,2.0,0],[.95,.47,.95]);for(let q=0;q<3;q++)ellipsoid(g,0xffefc1,[xx+(q-1)*.36,2.38,.12],[.10,.07,.10]);}for(let k=0;k<7;k++){const glow=ellipsoid(g,0xffee9c,[Math.sin(k*2.1)*1.7,1.5+k*.32,Math.cos(k)*1.5],[.07,.07,.07]);animated.push({m:glow,kind:'glow',y:glow.position.y});}}
 else if(data.level.world===3){for(let k=0;k<5;k++){const crystal=mesh(g,cone,k%2?0x9bdddf:0xb0bce3,(k-2)*.5,1.5,Math.sin(k),.55,3+(k%2),.55);crystal.rotation.z=(k-2)*.12;}}
 else if(data.level.world===4){mesh(g,cylinder,0xb2bbb3,0,2,0,.09,4,.09);const moon=new T.Mesh(new T.TorusGeometry(.68,.15,8,26,Math.PI*1.6),material(0xffe4aa));moon.position.y=4.3;g.add(moon);for(let k=0;k<4;k++){const st=star();st.position.set((k-1.5)*.75,2.7+Math.sin(k)*.6,.3);st.scale.setScalar(.6);g.add(st);animated.push({m:st,kind:'star'});}}
 else{for(const z of [-1.3,1.3]){mesh(g,cylinder,0xffe6c2,0,2.1,z,.8,4.2,.8);mesh(g,cone,0xd4979b,0,4.85,z,1.06,1.5,1.06);for(let q=0;q<3;q++)mesh(g,cube,0xbfa8a1,.72,1.2+q*.8,z,.03,.40,.23);}roundedBox(g,0xf0cfaa,0,2.2,0,1.25,1.0,2.6,.15);}
 }
 const water=new T.Mesh(new T.PlaneGeometry(data.level.length+150,150),new T.MeshStandardMaterial({color:w.water,roughness:.3,metalness:.08}));water.rotation.x=-Math.PI/2;water.position.set(data.level.length/2,-6,0);root.add(water);
 for(const o of data.items){let m=new T.Group();root.add(m);
 if(o.type==='bone'){const b=bone();b.scale.setScalar(1.28);if(o.y>1.25)b.material=material(0x8bdfea,.3);m.add(b);}
 else if(o.type==='star'){m.add(star());const ring=new T.Mesh(new T.TorusGeometry(.56,.015,5,28),material(0xfff3c1));m.add(ring);}
 else if(o.type==='heart')m.add(heart());
 else if(o.type==='magnet'||o.type==='shieldOrb'){
  const shield=o.type==='shieldOrb',color=shield?0x80d9ee:0xf5bd6d;
  const halo=new T.Mesh(new T.TorusGeometry(.50,.045,6,28),material(color));halo.rotation.y=Math.PI/2;m.add(halo);
  if(shield){ellipsoid(m,0xb7ecf6,[0,0,0],[.27,.36,.31]);const st=star();st.scale.setScalar(.44);st.rotation.y=-Math.PI/2;st.position.x=-.3;m.add(st);}
  else{const horseshoe=new T.Mesh(new T.TorusGeometry(.25,.09,6,20,Math.PI),material(0xee9d6e));horseshoe.rotation.set(0,Math.PI/2,Math.PI);m.add(horseshoe);for(const side of [-1,1])roundedBox(m,0xfff4d4,0,.1,side*.25,.16,.27,.16,.04);}
 }
 else if(o.type==='portal'||o.type==='portalExit'){
  const col=[0xad9af4,0x86dce5,0xf6bfdb][o.pair%3];
  const gate=new T.Mesh(new T.TorusGeometry(1.08,.12,7,32),material(col));gate.rotation.y=Math.PI/2;gate.scale.y=1.15;gate.position.y=1.3;m.add(gate);
  for(const z of [-.92,.92])roundedBox(m,0xffdfb7,0,.15,z,.55,.3,.38,.08);
  for(let k=0;k<4;k++){const jewel=star();jewel.position.set(0,1.3+Math.sin(k*Math.PI/2)*1.25,Math.cos(k*Math.PI/2)*1.08);jewel.scale.setScalar(.3);jewel.rotation.y=Math.PI/2;m.add(jewel);}
  // Clearly painted exit arrow; the portal stays transparent so the route is visible.
  for(let k=0;k<3;k++)mesh(m,cube,col,-1-k*.45,.025,0,.16,.025,.55-k*.1);
 }

 else if(o.type==='crate'){ // Low picnic hamper: broad enough to read, clearly jumpable.
  roundedBox(m,[0xc98c54,0xe2af75,0xab8261,0xafc9df,0xa492bb,0xdfae74][biome],0,.40,0,1.05,.76,1.38,.11);
  roundedBox(m,0xf4c48b,0,.80,0,1.12,.14,1.47,.06);
  for(const z of [-.45,.45])mesh(m,cube,0xffe5b4,-.58,.42,z,.035,.7,.10);
  for(const y of [.25,.51])mesh(m,cube,0xe8b577,-.585,y,0,.02,.035,1.30);
 }
 else if(o.type==='tall'){ // Tall flower trolley: a lane-change obstacle, not a tiny stacked crate.
  roundedBox(m,0x7eaaa0,0,.52,0,1.24,1.02,1.65,.12);
  roundedBox(m,[0x719b74,0xe3b894,0x6d8e70,0xc3e4ed,0x9583bd,0xd8bd8e][biome],0,1.72,0,1.20,1.46,1.63,.23);
  for(const z of [-.5,0,.5])ellipsoid(m,w.accent,[-.64,2.32,z],[.13,.15,.14]);
  for(const z of [-.49,.49])mesh(m,cube,0xffe7b0,-.70,.55,z,.03,.6,.12);
 }
 else if(o.type==='bar'){ // The opening and the actual collision threshold both start at 1.34.
  for(const z of [-.93,.93])mesh(m,cylinder,0x809c91,0,1.40,z,.06,2.80,.06);
  roundedBox(m,0xe89679,0,2.15,0,.76,1.60,1.84,.09);
  for(let i=0;i<4;i++){const stripe=mesh(m,cube,0xfff4d5,-.43,2.15,(i-1.5)*.43,.02,1.43,.17);stripe.rotation.x=-.2;}
  // Downward chevron faces the approaching runner.
  for(const sign of [-1,1]){const chevron=mesh(m,cube,0x55766e,-.46,1.90,sign*.18,.025,.44,.09);chevron.rotation.x=sign*.65;}
 }
 else if(o.type==='mover'||o.type==='snowball'){
  const snow=o.type==='snowball',r=snow?.72:.63;
  ellipsoid(m,snow?0xf1faff:0xffb851,[0,r,0],[r,r,r]);
  for(const angle of [0,Math.PI/2]){const ring=new T.Mesh(new T.TorusGeometry(r,.04,5,24),material(snow?0xbad9e7:angle===0?0xf27e81:0xfff7dd));ring.rotation.y=angle;ring.position.y=r;m.add(ring);}
 }
 else if(o.type==='wave'){
  roundedBox(m,0x5fcbd8,0,.24,0,1,.40,2.22,.12);
  for(const z of [-.85,-.42,0,.42,.85])ellipsoid(m,0xe9fffb,[0,.58,z],[.32,.17,.30]);
 }
 else if(o.type==='log'){
  const trunk=mesh(m,cylinder,0xc09166,0,.46,0,.46,1.9,.46);trunk.rotation.x=Math.PI/2;
  for(const z of [-.97,.97]){const end=mesh(m,cylinder,0xf6d3a0,0,.46,z,.37,.025,.37);end.rotation.x=Math.PI/2;}
  for(const z of [-.65,0,.65])mesh(m,cube,0x9d724b,-.43,.47,z,.035,.09,.10);
 }
 else if(o.type==='tunnel'){
  roundedBox(m,0x91b19b,0,2.32,0,2.8,2.0,1.96,.22);
  for(const z of [-.94,.94])mesh(m,cube,0x648c75,0,.81,z,2.8,1.62,.15);
  for(const x of [-1.48,1.48]){const arch=new T.Mesh(new T.TorusGeometry(.93,.055,6,24,Math.PI),material(0xffe3a0));arch.rotation.y=Math.PI/2;arch.position.set(x,1.34,0);m.add(arch);}
 }
 else if(o.type==='gate'){
  roundedBox(m,0x8974bd,0,1.62,0,1.1,3.2,1.8,.18);
  for(const z of [-.63,.63])mesh(m,cube,0xffd983,-.62,1.62,z,.04,2.8,.09);
  const st=star();st.rotation.y=-Math.PI/2;st.position.set(-.64,2.05,0);st.scale.setScalar(1.2);m.add(st);
 }
 else if(o.type==='break'){
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){roundedBox(m,0xe7ac68,0,.29+row*.51,(col-1)*.52,.65,.47,.48,.075);for(const h of [-.11,.11])ellipsoid(m,0xac713e,[-.355,.29+row*.51+h,(col-1)*.52],[.018,.031,.031]);}
 }
 else if(o.type==='spring'){
  mesh(m,cylinder,0x729e82,0,.1,0,.70,.2,.70);
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2;ellipsoid(m,0xffeab2,[Math.cos(a)*.45,.22,Math.sin(a)*.45],[.28,.09,.25]);}
  mesh(m,cylinder,0xf3b653,0,.26,0,.32,.17,.32);
  for(const side of [-1,1]){const chevron=mesh(m,cube,0xfffcdd,-.05,.365,side*.12,.06,.018,.32);chevron.rotation.y=side*.65;}
 }
 else if(o.type==='checkpoint'){for(const z of [-3.5,3.5]){mesh(m,cylinder,0xfff4d1,0,1.1,z,.09,2.2,.09);const f=mesh(m,cube,0x95cfad,.4,1.98,z,.8,.43,.04);animated.push({m:f,kind:'flag'});}}
 m.position.set(o.x,o.y,o.z);meshes.set(o.id,m);
 }
 const finish=new T.Group();finish.position.x=data.level.length;root.add(finish);for(const z of [-3.65,3.65]){mesh(finish,cylinder,0xfff5cf,0,2.35,z,.15,4.7,.15);ellipsoid(finish,0xffd280,[0,4.78,z],[.24,.24,.24]);}
 mesh(finish,cube,w.accent,0,4.10,0,.15,.7,7.4);for(let i=0;i<12;i++)mesh(finish,cube,i%2?0xfff6d7:0x5d8572,.12,4.11,(i-5.5)*.58,.025,.55,.57);
 const gateStar=star();gateStar.position.set(0,4.65,0);gateStar.scale.setScalar(1.7);finish.add(gateStar);
 return {root,meshes,update(run,t){for(const o of data.items){const m=meshes.get(o.id);m.visible=(!o.taken||['spring','portal'].includes(o.type))&&o.x>run.x-(HAZARDS[o.type]?HAZARDS[o.type].half+.35:12)&&o.x<run.x+65;if(!m.visible)continue;if(['bone','star','heart','magnet','shieldOrb'].includes(o.type)){m.rotation.y=-Math.PI/2+Math.sin(t*2+o.id)*.3;m.position.y=o.y+Math.sin(t*3+o.id)*.08;}if(o.type==='spring')m.scale.y=1+Math.sin(t*4)*.09;if(o.type==='portal'||o.type==='portalExit'){m.children[0].material.emissive.setHex([0x261838,0x0a282a,0x301522][o.pair%3]);}if(o.type==='mover'||o.type==='snowball'){m.position.z=moverZ(o,run.time);m.rotation.x=t*.9;}if(o.hit){m.scale.y=Math.max(.12,m.scale.y*.86);m.rotation.z+=.03;}}for(const a of animated){if(a.kind==='rotor')a.m.rotation.z=t*.48;else if(a.kind==='star')a.m.rotation.y=t*.6;else if(a.kind==='glow')a.m.position.y=a.y+Math.sin(t*1.8+a.y)*.3;else a.m.rotation.y=Math.sin(t*3)*.08;}},dispose(){scene.remove(root);root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared&&![cube,ball,cylinder,cone,sphereGeo].includes(o.geometry))o.geometry.dispose();});}};
}

function createHomeWorld(scene,w){const root=new T.Group();scene.add(root);const ground=new T.CylinderGeometry(5.4,5.0,.8,64);const base=mesh(root,ground,w.soil,0,-.47,0,1,1,.75);const lawn=mesh(root,new T.CylinderGeometry(5.43,5.4,.17,64),w.grass,0,-.02,0,1,1,.75);lawn.receiveShadow=true;
 for(const side of [-1,1]){const x=side*3.1,z=-2.7;mesh(root,cylinder,0xc59d7b,x,.7,z,.16,1.8,.16);for(let k=0;k<4;k++)ellipsoid(root,w.accent,[x+Math.sin(k*2)*.5,1.8+(k%2)*.5,z],[.8,.8,.65]);}
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2,x=Math.cos(a)*4.55,z=Math.sin(a)*2.65;if(z>1.9&&Math.abs(x)<2)continue;mesh(root,cylinder,0x75a36e,x,.13,z,.025,.30,.025);ellipsoid(root,0xffedb4,[x,.3,z],[.15,.10,.15]);}
 for(const x of [-7,7])ellipsoid(root,0xf8fbf2,[x,-2.1,-1],[3.0,.8,1.5]);
 return{root,update(){},dispose(){scene.remove(root);root.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared&&![cube,ball,cylinder,cone,sphereGeo].includes(o.geometry))o.geometry.dispose();});}};
}
