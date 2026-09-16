'use strict';
// Drawing primitives and obstacle artwork adapted from the user's supplied
// Paper Pup Run (Claude HTML). Physics bounds below match the visible artwork.
(() => {
const rgb=(v,a=1)=>`rgba(${v.join(',')},${a})`;
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function inked(c, T, lw, fill) {
  if (fill !== false) { c.fillStyle = fill || rgb(T.paper); c.fill(); }
  c.strokeStyle = rgb(T.ink); c.lineWidth = lw || 4.4; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
}
function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * .82);
  c.bezierCurveTo(x - s * 1.15, y - s * .1, x - s * .58, y - s * .95, x, y - s * .3);
  c.bezierCurveTo(x + s * .58, y - s * .95, x + s * 1.15, y - s * .1, x, y + s * .82);
  c.closePath();
}
function bonePath(c,x,y,len,r){
  const h=len/2;c.beginPath();c.moveTo(x-h,y-r);
  c.bezierCurveTo(x-h-r*.5,y-r*2.1,x-h-r*2.1,y-r*1.4,x-h-r*1.35,y);
  c.bezierCurveTo(x-h-r*2.1,y+r*1.4,x-h-r*.5,y+r*2.1,x-h,y+r);
  c.lineTo(x+h,y+r);
  c.bezierCurveTo(x+h+r*.5,y+r*2.1,x+h+r*2.1,y+r*1.4,x+h+r*1.35,y);
  c.bezierCurveTo(x+h+r*2.1,y-r*1.4,x+h+r*.5,y-r*2.1,x+h,y-r);
  c.closePath();
}
function starPath(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .46 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

/* ---------- 障碍：每种都是一张随手涂鸦 ---------- */
const OBS = {
  box: {
    w: 46, h: 74, yOff: 0, tag: 'jump',
    draw(c, T) {
      rrect(c, -23, -52, 46, 52, 5); inked(c, T, 4.4, rgb(T.paper2));
      c.beginPath(); c.moveTo(-23, -37); c.lineTo(23, -37);
      c.moveTo(0, -52); c.lineTo(0, -37);
      c.strokeStyle = rgb(T.ink, .55); c.lineWidth = 3; c.stroke();
      c.beginPath(); c.moveTo(-18, -27); c.lineTo(-4, -27);
      c.strokeStyle = rgb(T.ink, .3); c.lineWidth = 2.6; c.stroke();
    }
  },
  stack: {
    w: 50, h: 104, yOff: 0, tag: 'jump',
    draw(c, T) {
      rrect(c, -25, -50, 50, 50, 5); inked(c, T, 4.4, rgb(T.paper2));
      c.save(); c.translate(-1, -50); c.rotate(-.06);
      rrect(c, -19, -38, 38, 38, 5); inked(c, T, 4.4, rgb(T.paper));
      c.beginPath(); c.moveTo(0, -38); c.lineTo(0, -22); c.strokeStyle = rgb(T.ink, .5); c.lineWidth = 2.8; c.stroke();
      c.restore();
      c.beginPath(); c.moveTo(-25, -34); c.lineTo(25, -34); c.strokeStyle = rgb(T.ink, .5); c.lineWidth = 3; c.stroke();
    }
  },
  bones: {
    w: 58, h: 46, yOff: 0, tag: 'jump',
    draw(c, T) {
      c.save(); c.translate(2, -9); c.rotate(-.12); bonePath(c, 0, 0, 34, 8); inked(c, T, 4.2, rgb(T.paper)); c.restore();
      c.save(); c.translate(-6, -22); c.rotate(.2); bonePath(c, 0, 0, 28, 7); inked(c, T, 4.2, rgb(T.paper2)); c.restore();
    }
  },
  cone: {
    w: 44, h: 80, yOff: 0, tag: 'jump',
    draw(c, T) {
      c.beginPath();
      c.moveTo(-9, -58); c.lineTo(9, -58); c.lineTo(20, -10); c.lineTo(-20, -10); c.closePath();
      inked(c, T, 4.4, rgb(T.accent, .85));
      c.beginPath(); c.moveTo(-14, -32); c.lineTo(14, -32);
      c.strokeStyle = rgb(T.paper); c.lineWidth = 7; c.stroke();
      rrect(c, -23, -12, 46, 12, 4); inked(c, T, 4.4, rgb(T.paper2));
    }
  },
  puddle: {
    w: 92, h: 26, yOff: 0, tag: 'jump',
    draw(c, T) {
      c.beginPath(); c.ellipse(0, -8, 39, 12, 0, 0, 7);
      inked(c, T, 4.2, rgb(T.accent, .22));
      c.beginPath(); c.ellipse(-12, -9, 13, 4, 0, 0, 7);
      c.strokeStyle = rgb(T.ink, .4); c.lineWidth = 2.6; c.stroke();
      c.beginPath(); c.ellipse(14, -6, 8, 2.6, 0, 0, 7); c.stroke();
    }
  },
  bar: {
    w: 88, h: 220, yOff: 52, tag: 'slide',
    draw(c, T, t) {
      const sw = Math.sin(t * 2.2) * .07;
      c.beginPath(); c.moveTo(-70, -196); c.quadraticCurveTo(0, -186, 70, -196);
      c.strokeStyle = rgb(T.ink); c.lineWidth = 3.4; c.stroke();
      const items = [-30, 0, 30];
      items.forEach((x, i) => {
        c.save(); c.translate(x, -192); c.rotate(sw * (i % 2 ? -1 : 1));
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 66); c.strokeStyle = rgb(T.ink); c.lineWidth = 3; c.stroke();
        rrect(c, -16, 66, 32, 78, 13); inked(c, T, 4.2, i === 1 ? rgb(T.accent, .35) : rgb(T.paper));
        c.beginPath(); c.moveTo(-16, 92); c.lineTo(16, 92); c.strokeStyle = rgb(T.ink, .35); c.lineWidth = 2.6; c.stroke();
        c.restore();
      });
    }
  },
  kite: {
    w: 70, h: 220, yOff: 62, tag: 'slide',
    draw(c, T, t) {
      const sw = Math.sin(t * 1.7) * 4;
      for (let i = -1; i <= 1; i++) {
        c.save(); c.translate(i * 24 + sw * .5, 0);
        c.beginPath(); c.moveTo(0, -210); c.quadraticCurveTo(sw, -140, 0, -84);
        c.strokeStyle = rgb(T.ink, .8); c.lineWidth = 2.6; c.stroke();
        heartPath(c, 0, -74, 15); inked(c, T, 4.2, i === 0 ? rgb(T.accent, .8) : rgb(T.paper));
        c.restore();
      }
    }
  }
};


OBS.log={draw(c,T){
  rrect(c,-29,-29,58,28,12);inked(c,T,3.8,rgb(T.paper2));c.beginPath();c.ellipse(20,-15,8,12,0,0,7);inked(c,T,2.5,rgb(T.paper));c.beginPath();c.ellipse(20,-15,3,6,0,0,7);c.strokeStyle=rgb(T.ink,.55);c.lineWidth=2;c.stroke();
  c.beginPath();c.moveTo(-21,-18);c.lineTo(7,-20);c.moveTo(-15,-9);c.lineTo(-2,-10);c.stroke();
}};
const specs={crate:{source:'box',w:46,h:52,stomp:true},stack:{source:'stack',w:50,h:88,stomp:true},log:{source:'log',w:58,h:33,stomp:true},roller:{source:'box',w:46,h:52,stomp:true},cone:{source:'cone',w:44,h:60},puddle:{source:'puddle',w:110,h:14},beam:{source:'bar',w:90,h:192,bottom:48},kite:{source:'kite',w:74,h:210,bottom:58}};
function draw(c,o,ground,time,theme){
 const T=theme;c.save();c.lineJoin='round';c.lineCap='round';c.translate(o.x+o.w/2,ground);c.shadowColor=rgb(T.paper,.98);c.shadowBlur=13;
 if(o.type==='bone'||o.type==='shield'||o.type==='magnet'||o.type==='heart'){
  c.translate(-o.w/2,-o.y+Math.sin(time*5+o.phase)*2);c.shadowBlur=8;
  if(o.type==='bone'){c.rotate(-.3);bonePath(c,0,0,14,4);inked(c,T,2.3,rgb(T.paper));}
  else if(o.type==='heart'){heartPath(c,0,0,13);inked(c,T,2.4,rgb(T.accent));}
  else{c.beginPath();c.arc(0,0,15,0,Math.PI*2);inked(c,T,2.3,rgb(T.paper));c.fillStyle=rgb(T.ink);c.textAlign='center';c.font='bold 19px sans-serif';c.fillText(o.type==='shield'?'♡':'∩',0,7);}c.restore();return;
 }
 const s=specs[o.type];if(!s){c.restore();return;}
 c.globalAlpha=o.hit?.24:1;
 if(o.type==='roller'){c.translate(0,-26);c.rotate(-time*3.4);c.translate(0,26);}
 c.scale(o.w/s.w,1);OBS[s.source].draw(c,T,time);
 // Small chevrons make crate tops read as intentional stepping surfaces.
 if(s.stomp&&o.type!=='roller'){c.shadowBlur=0;c.strokeStyle=rgb(T.accent,.85);c.lineWidth=2.4;c.beginPath();c.moveTo(-7,-s.h+14);c.lineTo(0,-s.h+20);c.lineTo(7,-s.h+14);c.stroke();}
 c.restore();
}
window.PaperProps={specs,draw,starPath};
})();
