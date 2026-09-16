import {sprintMotion} from './sprint.js?v=figurine9d';
import * as T from './vendor/three.module.js';
import {Group,Tween,Easing} from './vendor/tween.esm.js';
import {SHAPES} from './assets/dog-shapes.js?v=figurine9d';
const black=new T.MeshStandardMaterial({color:0x191b1b,roughness:.30,metalness:0});
const outlineMat=new T.MeshBasicMaterial({color:0x302b27,side:T.BackSide});
export const sphereGeo=new T.SphereGeometry(1,40,28);
const matCache=new Map();export function material(color,roughness=.78){const key=color+'-'+roughness;if(!matCache.has(key))matCache.set(key,new T.MeshStandardMaterial({color,roughness,metalness:0}));return matCache.get(key);}
export function ellipsoid(parent,color,pos,scale,outline=false){const m=new T.Mesh(sphereGeo,typeof color==='number'?material(color):color);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;if(outline){const o=new T.Mesh(sphereGeo,outlineMat);o.scale.setScalar(1.035);m.add(o);}parent.add(m);return m;}
export function roundedBox(parent,color,x,y,z,w,h,d,r=.12){const shape=new T.Shape();const a=-w/2,b=-h/2;shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);const g=new T.ExtrudeGeometry(shape,{depth:d-r*2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:r*.5,bevelThickness:r,curveSegments:3});g.translate(0,0,-d/2+r);const m=new T.Mesh(g,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function tube(parent,points,r,color=black){const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(c,20,r,7,false),typeof color==='number'?material(color):color);parent.add(m);return m;}
const sculptureCache=new Map();
function sculpture(name){if(!sculptureCache.has(name)){const a=SHAPES[name],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(a.normal,3));g.setIndex(a.index);g.computeBoundingSphere();sculptureCache.set(name,g);}return sculptureCache.get(name);}
function faceDepth(x,y){const yy=y/.80,p=2.3-.30*yy,rx=.88*(1-.10*yy);return .65*Math.pow(Math.max(.001,1-Math.pow(Math.abs(x/rx),p)-Math.pow(Math.abs(yy),p)),1/p);}
function addFace(head){
 const eyes=[],happyEyes=[],hurtEyes=[],blush=[],eyebrows=[];
 for(const side of [-1,1]){const x=side*.285,y=-.04,z=faceDepth(x,y);const eye=ellipsoid(head,black,[x,y,z+.017],[.055,.061,.034]);eye.userData.baseY=.061;eyes.push(eye);
  const smile=tube(head,[[x-.058,y-.015,z+.035],[x-.04,y+.04,z+.035],[x,y+.057,z+.035],[x+.04,y+.04,z+.035],[x+.058,y-.015,z+.035]],.021);smile.visible=false;happyEyes.push(smile);
  const cross=new T.Group();head.add(cross);for(const sign of [-1,1])tube(cross,[[x-.05,y-.05*sign,z+.034],[x+.05,y+.05*sign,z+.034]],.018);cross.visible=false;hurtEyes.push(cross);
  const bx=side*.48,by=-.22,m=ellipsoid(head,0xeeb2a0,[bx,by,faceDepth(bx,by)+.012],[.075,.027,.014]);m.visible=false;blush.push(m);
  const brow=tube(head,[[x-.045,.07,faceDepth(x,.07)+.025],[x+.045,.085,faceDepth(x,.085)+.025]],.013);brow.visible=false;eyebrows.push(brow);
 }
 ellipsoid(head,black,[0,-.075,faceDepth(0,-.075)+.028],[.094,.065,.046]);
 tube(head,[[0,-.10,faceDepth(0,-.10)+.024],[0,-.19,faceDepth(0,-.19)+.026],[0,-.255,faceDepth(0,-.255)+.025]],.034);
 const mouth=[[-.305,-.245],[-.278,-.290],[-.19,-.316],[-.09,-.298],[0,-.255],[.09,-.298],[.19,-.316],[.278,-.290],[.305,-.245]];
 tube(head,mouth.map(([x,y])=>[x,y,faceDepth(x,y)+.025]),.038);
 for(const side of [-1,1])ellipsoid(head,black,[side*.305,-.245,faceDepth(side*.305,-.245)+.025],[.038,.038,.038]);
 const tongue=ellipsoid(head,0xf19493,[.035,-.35,faceDepth(.035,-.35)+.02],[.044,.052,.015]);tongue.visible=false;
 return {eyes,tongue,happyEyes,hurtEyes,blush,eyebrows};
}
export function dog(kind,lowDetail=false){const detail=lowDetail?'Low':'';
 const root=new T.Group(),rig=new T.Group();root.add(rig);if(!lowDetail){for(let i=0;i<4;i++){const shadow=new T.Mesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x5b554a,transparent:true,opacity:.028,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.01+i*.001;shadow.scale.set(.58+i*.12,.48+i*.12,1);root.add(shadow);}}const cream=kind==='gold'?0xf1d5ba:0xf8f6f2,bodyMat=material(cream,.76),base=new T.Bone();rig.add(base);
 const head=new T.Bone();head.position.y=1.66;base.add(head);
 const legs=[];for(const side of [-1,1]){const leg=new T.Bone();leg.position.set(side*.31,.28,0);base.add(leg);legs.push(leg);}
 const arms=[];for(const side of [-1,1]){const arm=new T.Bone();arm.position.set(side*.50,1.01,0);base.add(arm);arms.push(arm);}
 const ears=[];for(const side of [-1,1]){const ear=new T.Bone();ear.position.set(side*.69,kind==='gold'?.25:.49,0);head.add(ear);ears.push(ear);}
 const geometry=sculpture(kind+'Body'+detail).clone(),weights=[],indices=[],pp=geometry.attributes.position;
 for(let i=0;i<pp.count;i++){
  const x=pp.getX(i),y=pp.getY(i),armWeight=T.MathUtils.smoothstep(Math.abs(x), .46+(1.06-y)*.40,.62+(1.06-y)*.40)*T.MathUtils.smoothstep(y,.49,.65),legWeight=T.MathUtils.smoothstep(.42-y,0,.22)*(1-armWeight);
  indices.push(0,x<0?1:2,x<0?3:4,0);weights.push(1-armWeight-legWeight,legWeight,armWeight,0);
 }
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const body=new T.SkinnedMesh(geometry,bodyMat);body.castShadow=body.receiveShadow=true;rig.add(body);
 const hg=sculpture(kind+'Head'+detail).clone(),hi=[],hw=[],hp=hg.attributes.position;
 for(let i=0;i<hp.count;i++){
  const x=hp.getX(i),y=hp.getY(i),w=kind==='gold'?T.MathUtils.smoothstep(Math.abs(x),.74,1.04)*T.MathUtils.smoothstep(.45-y,0,.40):T.MathUtils.smoothstep(Math.abs(x),.68,.97)*T.MathUtils.smoothstep(y,.30,.62);
  hi.push(0,x<0?1:2,0,0);hw.push(1-w,w,0,0);
 }
 hg.setAttribute('skinIndex',new T.Uint16BufferAttribute(hi,4));hg.setAttribute('skinWeight',new T.Float32BufferAttribute(hw,4));
 const headMesh=new T.SkinnedMesh(hg,bodyMat);headMesh.castShadow=headMesh.receiveShadow=true;head.add(headMesh);
 rig.updateMatrixWorld(true);body.bind(new T.Skeleton([base,...legs,...arms]));headMesh.bind(new T.Skeleton([head,...ears]));
 const face=addFace(head);const {eyes,tongue,happyEyes,hurtEyes,blush,eyebrows}=face;
 let collar=null;if(kind==='gold'){
  collar=new T.Group();collar.position.y=.97;base.add(collar);
  const band=new T.Mesh(new T.CylinderGeometry(.62,.62,.105,80,1,true),material(0xe43d43,.67));band.scale.z=.84;collar.add(band);
  for(const y of [-.0525,.0525]){const rim=new T.Mesh(new T.TorusGeometry(.62,.014,8,80),band.material);rim.rotation.x=Math.PI/2;rim.scale.y=.84;rim.position.y=y;collar.add(rim);}
 }
 // The little cross-body companion bag follows the torso, not a hand joint.
 const bag=new T.Group();bag.position.set(.20,.50,.56);bag.rotation.z=-.10;bag.scale.setScalar(.34);base.add(bag);
 const buddy=kind==='gold'?'white':'gold',bagShell=new T.Mesh(sculpture(buddy+'Head'+detail),material(buddy==='gold'?0xf1d5ba:0xf8f6f2,.82));bagShell.castShadow=bagShell.receiveShadow=true;bag.add(bagShell);addFace(bag);
 const strapPoints=[[-.43,1.075,.32],[-.34,.94,.43],[-.16,.77,.49],[.08,.61,.54],[.26,.51,.60]];
 const strap=tube(base,strapPoints,.025,material(kind==='gold'?0xf2dfcf:0x8ec7e2,.9));
 const tail=new T.Group();tail.position.set(0,.32,-.47);base.add(tail);ellipsoid(tail,bodyMat,[0,0,-.055],[.108,.113,.135]);
 const guard=new T.Group();guard.position.y=1.15;guard.visible=false;root.add(guard);for(const axis of [0,1]){const ring=new T.Mesh(new T.TorusGeometry(1.28,.018,5,40),material(0xa8e5ea,.5));ring.rotation.y=axis*Math.PI/2;guard.add(ring);}
 root.userData={guard,kind,rig,head,headMesh,body,bag,strap,collar,ears,arms,legs,eyes,tongue,tail,blush,happyEyes,hurtEyes,eyebrows,animation:new Group(),pose:{run:0,air:0,slide:0,pounce:0,cheer:0,pet:0},lastMode:'idle',animationTime:0,mood:'normal',moodTime:0};return root;
}

export function reactDog(d,mood,duration=.7){d.userData.mood=mood;d.userData.moodTime=duration;}
export function animateDog(d,t,mode='idle',state={}){
 const r=d.userData,{rig,head,ears,arms,legs,eyes,tongue,tail,pose}=r,dt=state.dt??1/60;
 r.animationTime+=dt*1000;r.moodTime=Math.max(0,r.moodTime-dt);if(r.moodTime===0)r.mood='normal';
 if(mode!==r.lastMode){r.lastMode=mode;r.animation.removeAll();const target={run:Number(mode==='run'),air:Number(mode==='jump'),slide:Number(mode==='slide'),pounce:Number(mode==='pounce'),cheer:Number(mode==='cheer'),pet:Number(mode==='pet')};new Tween(pose,r.animation).to(target,mode==='slide'?90:mode==='jump'?100:170).easing(Easing.Quadratic.Out).start(r.animationTime);}
 r.animation.update(r.animationTime);
 const f=t*(r.kind==='gold'?17.6:18.8),stride=Math.sin(f),air=pose.air,slide=pose.slide,run=pose.run,pounce=pose.pounce,joy=pose.cheer+pose.pet;
 const landing=state.land||0,turn=state.turn||0;
 const bound=sprintMotion(t),spring=pounce*bound.lift,contact=pounce*bound.contact;
 rig.position.y=Math.abs(stride)*.095*run+Math.sin(t*2.1)*.018*(1-run-pounce-slide)+slide*.645+spring*.24+pose.cheer*Math.abs(Math.sin(t*6))*.27;
 rig.position.z=-slide*.10+pounce*Math.sin(bound.phase-.4)*.045;
 head.position.y=1.66-slide*.65;head.position.z=slide*.35;
 if(r.collar)r.collar.position.set(0,.97+slide*.06,slide*.12);
 const squash=landing*.06+contact*.015;rig.scale.set(1+squash,1-squash,1+squash);
 rig.rotation.x=.10*run+1.17*slide+pounce*(.24+Math.sin(bound.phase-.5)*.12)-.10*air;rig.rotation.z=turn*.16*(1-slide*.95)+Math.sin(f*.5)*.025*run+pounce*Math.sin(bound.phase*.5)*.035+Math.sin(t*5)*.11*pose.pet;
 // Head trails the body, then turns toward the player after a clean combo.
 const happy=joy>0.2||r.mood==='happy'||r.mood==='confident',hurt=r.mood==='hurt',look=r.moodTime>0&&r.mood==='happy'?Math.sin(Math.min(1,r.moodTime/.8)*Math.PI)*1.35*(1-pounce*.85):0;
 const smooth=1-Math.exp(-dt*15);
 head.rotation.y+=(Math.sin(t*1.2)*.07*(1-slide)+look*(1-slide)+turn*.20*(1-slide)-head.rotation.y)*smooth;
 head.rotation.x+=(-.06*run-1.06*slide+pounce*(-.18-Math.sin(bound.phase-1)*.10)-.13*pose.pet+Math.sin(f-.45)*.028*run-head.rotation.x)*smooth;
 head.rotation.z+=(Math.sin(t*1.5)*.035*(1-slide)-.10*pose.pet-turn*.05*(1-slide)-head.rotation.z)*smooth;
 for(let i=0;i<2;i++){
  const sign=i?1:-1,wave=Math.sin(f+i*Math.PI);
  legs[i].rotation.x=wave*.48*run+sign*.37*air-slide*.7+pounce*(Math.sin(bound.phase-.65+i*.48)*.65-.08);
  arms[i].position.set(sign*.50,1.01,0); // Embedded shoulders never translate away from the torso.
  arms[i].rotation.x=-wave*.73*run-air*.95-slide*.35+pounce*(-.62+Math.sin(bound.phase+.8+i*.38)*.88)-pose.pet*.75;
  arms[i].rotation.z=sign*(slide*.22+air*.40+pounce*(.23+bound.lift*.18)+pose.cheer*(1.08+Math.sin(t*7+i*.8)*.18)+pose.pet*.28);
  ears[i].rotation.z=sign*.035+Math.sin(f-.75+i*.4)*.12*run-air*sign*.16+pounce*sign*Math.sin(bound.phase-1.1)*.13+(r.kind==='white'?-sign*.10:0);
  ears[i].rotation.x=(r.kind==='white'?slide*.85:0)+Math.sin(f-1.1)*.20*run-air*.2+pounce*(-.22+Math.sin(bound.phase-1.5)*.25)+Math.sin(t*3+i)*.045;
  const blink=t%4.1>3.97;eyes[i].visible=!happy&&!hurt;eyes[i].scale.y=eyes[i].userData.baseY*(blink?.1:r.mood==='surprise'?1.3:1);
  r.happyEyes[i].visible=happy;r.hurtEyes[i].visible=hurt;r.blush[i].visible=happy;r.eyebrows[i].visible=r.mood==='surprise';
 }
 tail.rotation.z=Math.sin(t*(pounce>.2?28:run>0.5?21:joy>0?25:9))*(r.kind==='gold'?.8:.55);tail.rotation.y=Math.sin(t*11)*.24;
 tongue.visible=joy>.2||pounce>.2||happy||run>.5&&Math.sin(t*.75)>.7;
}
let boneGeo;
export function bone(){if(!boneGeo){const g=new T.Group(),smallSphere=new T.SphereGeometry(1,10,7),shaft=new T.Mesh(new T.CylinderGeometry(.08,.08,.42,8));shaft.rotation.z=Math.PI/2;g.add(shaft);for(const x of [-.23,.23])for(const y of [-.07,.07]){const m=new T.Mesh(smallSphere);m.position.set(x,y,0);m.scale.set(.115,.10,.095);g.add(m);}g.updateMatrixWorld(true);const positions=[],normals=[];g.children.forEach(m=>{const geo=m.geometry.toNonIndexed();geo.applyMatrix4(m.matrixWorld);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();});boneGeo=new T.BufferGeometry();boneGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));boneGeo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));boneGeo.userData.shared=true;}
 return new T.Mesh(boneGeo,material(0xffce57,.35));}
export function star(){const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.18:.39;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();const g=new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSize:.04,bevelThickness:.035,bevelSegments:2,steps:1});g.translate(0,0,-.06);const m=new T.Mesh(g,new T.MeshStandardMaterial({color:0xffd46b,emissive:0xb16f0c,emissiveIntensity:.15,roughness:.28,metalness:.18}));m.castShadow=true;return m;}
export function heart(){const s=new T.Shape();s.moveTo(0,-.23);s.bezierCurveTo(-.55,.13,-.2,.53,0,.23);s.bezierCurveTo(.2,.53,.55,.13,0,-.23);const geo=new T.ExtrudeGeometry(s,{depth:.06,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,steps:1});return new T.Mesh(geo,material(0xff879f));}
