// Recognize a swipe on movement, without waiting for the finger to lift.
export class SwipeInput {
 constructor(emit){this.emit=emit;this.pointer=null;}
 down(x,y,id){if(this.pointer)return false;this.pointer={x,y,id,fired:false,axis:null,direction:0,extreme:0};return true;}
 move(x,y,id){
  const p=this.pointer;if(!p||p.id!==id)return;
  // A continuous drag can reverse direction or turn down to crouch. A long
  // deliberate horizontal drag can cross both lanes; jitter cannot repeat it.
  if(p.fired&&p.axis==='x'){
   if((x-p.extreme)*p.direction<-24){p.direction=-p.direction;p.x=x;p.y=y;p.extreme=x;this.emit(p.direction>0?'right':'left');return;}
   if((x-p.extreme)*p.direction>0)p.extreme=x;
  }
  const dx=x-p.x,dy=y-p.y,ax=Math.abs(dx),ay=Math.abs(dy);
  const axis=ax>ay*1.15?'x':ay>ax*1.15?'y':null;if(!axis)return;
  const delta=axis==='x'?dx:dy,direction=Math.sign(delta);
  const threshold=!p.fired?18:axis!==p.axis?24:direction!==p.direction?24:58;
  if(Math.abs(delta)<threshold||p.fired&&axis==='y'&&p.axis==='y')return;
  p.fired=true;p.axis=axis;p.direction=direction;p.x=x;p.y=y;p.extreme=x;
  this.emit(axis==='x'?(direction>0?'right':'left'):(direction>0?'slide':'jump'));
 }
 up(x,y,id){const p=this.pointer;if(!p||p.id!==id)return;if(!p.fired){this.move(x,y,id);if(!p.fired&&Math.hypot(x-p.x,y-p.y)<12)this.emit('jump');}this.pointer=null;}
 cancel(){this.pointer=null;}
}

// A button tap and a swipe are different intents, including when a gesture
// starts on a button. Keep keyboard/assistive activation through click detail 0.
export function bindTap(element,activate){
 let pointer=null;
 element.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||pointer)return;
  if(e.cancelable)e.preventDefault();
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
  try{element.setPointerCapture(e.pointerId);}catch{pointer=null;}
 });
 element.addEventListener('pointermove',e=>{
  if(pointer?.id===e.pointerId&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>12)pointer.moved=true;
 });
 element.addEventListener('pointerup',e=>{
  if(pointer?.id!==e.pointerId)return;
  const tap=!pointer.moved&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)<=12;
  pointer=null;if(e.cancelable)e.preventDefault();if(tap)activate();
 });
 for(const event of ['pointercancel','lostpointercapture'])element.addEventListener(event,()=>{pointer=null;});
 element.addEventListener('click',e=>{if(e.detail===0)activate();else e.preventDefault();});
}

// Focus can move to browser chrome while the page remains visible. Only actual
// visibility/page lifecycle events suspend the run; a swipe cancel just resets input.
export function bindPagePause(doc,win,suspend){
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden||doc.visibilityState==='hidden')suspend();});
 win.addEventListener('pagehide',suspend);
}
