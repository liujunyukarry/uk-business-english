'use strict';
// Paper landscape brushwork adapted from the user's supplied Paper Pup Run HTML.
// Six chapter-specific compositions, with independent parallax for silhouettes and ground.
(() => {
const hex=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const rgb=(v,a=1)=>`rgba(${v.join(',')},${a})`;
const themes=[
 ['#FFFBF1','#F3EAD5','#332C25','#E5E5CC','#E88864','#FAE7B9','line'],
 ['#FFF7F0','#F4E1D5','#413331','#D7E6E5','#DE8B77','#F8D7BC','none'],
 ['#F4F7ED','#E3EBDD','#283D35','#C9D8C4','#C89B5C','#E9EED0','line'],
 ['#F4F8FA','#E0EAF0','#344352','#D0DDE8','#9AACE0','#E1E8F3','grid'],
 ['#37364C','#444359','#FFF5E5','#595570','#F1C779','#716580','grid'],
 ['#FFF9F4','#EFE4E3','#493B43','#E6DCE6','#D68D9A','#F9E5D1','none']
].map((t,idx)=>({idx,paper:hex(t[0]),paper2:hex(t[1]),ink:hex(t[2]),hill:hex(t[3]),accent:hex(t[4]),glow:hex(t[5]),rule:t[6],pop:['#EFA18F','#F2CE82','#B4C9AF','#ADCBD4','#C8B7D9']}));
function hash1(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
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
function doodleAt(c, k, s) {
  c.beginPath();
  if (k === 0) {                                        // 五角星
    for (let i = 0; i < 5; i++) {
      const a = -1.5708 + i * 2.5133;
      const x = Math.cos(a) * s, y = Math.sin(a) * s;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  } else if (k === 1) {                                 // 螺旋
    for (let i = 0; i <= 20; i++) {
      const a = i * .6, r = s * .07 * i;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
  } else if (k === 2) {                                 // 波浪
    c.moveTo(-s * 1.4, 0);
    for (let i = 0; i < 3; i++) {
      const x0 = -s * 1.4 + s * .93 * i;
      c.quadraticCurveTo(x0 + s * .47, (i % 2 ? s : -s) * .62, x0 + s * .93, 0);
    }
  } else if (k === 3) {                                 // 小爱心
    heartPath(c, 0, 0, s * .9);
  } else if (k === 4) {                                 // 肉垫
    c.arc(0, s * .34, s * .55, 0, 6.2832);
    for (let i = -1; i <= 1; i++) {
      c.moveTo(i * s * .62 + s * .28, -s * .48);
      c.arc(i * s * .62, -s * .48, s * .28, 0, 6.2832);
    }
  } else {                                              // 圈
    c.arc(0, 0, s * .9, 0, 6.2832);
  }
}

// 远景剪影：每一章有自己的景物，藏在近山后面只露上半截
function referenceProp(c, T, idx, x, gy, seed) {
  const k = hash1(seed), k2 = hash1(seed + 3.3), k3 = hash1(seed + 7.7);
  const F = () => { c.fill(); c.stroke(); };
  if (idx === 0) {                                      // 01 草稿公园：树、白杨、长椅
    if (k < .34) {                                      // 圆冠树
      const hh = 92 + k2 * 62;
      c.beginPath(); c.moveTo(x, gy + 6); c.lineTo(x, gy - hh * .38); c.stroke();
      c.beginPath(); c.arc(x, gy - hh * .70, hh * .36, 0, 6.2832); F();
      c.beginPath(); c.arc(x - hh * .24, gy - hh * .52, hh * .22, 0, 6.2832); F();
    } else if (k < .58) {                               // 白杨
      const hh = 130 + k2 * 80;
      c.beginPath(); c.moveTo(x, gy + 6); c.lineTo(x, gy - hh * .3); c.stroke();
      c.beginPath(); c.ellipse(x, gy - hh * .62, 20 + k3 * 8, hh * .38, 0, 0, 6.2832); F();
    } else if (k < .74) {                               // 长椅
      const w = 62;
      c.beginPath(); c.rect(x - w / 2, gy - 30, w, 8); F();
      c.beginPath(); c.rect(x - w / 2, gy - 52, w, 7); F();
      c.beginPath(); c.moveTo(x - w / 2 + 6, gy - 22); c.lineTo(x - w / 2 + 6, gy + 4);
      c.moveTo(x + w / 2 - 6, gy - 22); c.lineTo(x + w / 2 - 6, gy + 4); c.stroke();
    } else {                                            // 灌木
      const r = 26 + k2 * 16;
      c.beginPath(); c.arc(x - r * .6, gy - r * .5, r * .7, 0, 6.2832);
      c.arc(x + r * .5, gy - r * .6, r * .8, 0, 6.2832); F();
    }
  } else if (idx === 1) {                               // 02 方格街区：楼、水塔、路灯
    if (k < .70) {
      const w = 62 + k2 * 46, hh = 96 + k3 * 150;
      c.beginPath(); c.rect(x - w / 2, gy - hh, w, hh + 6); F();
      c.lineWidth = 1.6;                                // 窗格
      c.beginPath();
      for (let r = 1; r * 26 < hh - 10; r++) { c.moveTo(x - w / 2 + 8, gy - r * 26); c.lineTo(x + w / 2 - 8, gy - r * 26); }
      for (let cc = 1; cc * 24 < w - 8; cc++) { c.moveTo(x - w / 2 + cc * 24, gy - hh + 8); c.lineTo(x - w / 2 + cc * 24, gy - 6); }
      c.stroke(); c.lineWidth = 2.6;
    } else if (k < .86) {                               // 水塔
      const hh = 150 + k2 * 60;
      c.beginPath(); c.moveTo(x - 14, gy + 6); c.lineTo(x - 8, gy - hh * .6);
      c.moveTo(x + 14, gy + 6); c.lineTo(x + 8, gy - hh * .6); c.stroke();
      c.beginPath(); c.rect(x - 26, gy - hh, 52, hh * .42); F();
      c.beginPath(); c.moveTo(x - 30, gy - hh); c.lineTo(x, gy - hh - 22); c.lineTo(x + 30, gy - hh); c.closePath(); F();
    } else {                                            // 路灯
      const hh = 118 + k2 * 40;
      c.beginPath(); c.moveTo(x, gy + 6); c.lineTo(x, gy - hh);
      c.quadraticCurveTo(x, gy - hh - 14, x + 20, gy - hh - 14); c.stroke();
      c.beginPath(); c.arc(x + 24, gy - hh - 10, 8, 0, 6.2832); F();
    }
  } else if (idx === 2) {                               // 03 便签花园：花架、高花、小温室
    if (k < .40) {                                      // 高花
      const hh = 88 + k2 * 70;
      c.beginPath(); c.moveTo(x, gy + 6);
      c.quadraticCurveTo(x + (k3 - .5) * 26, gy - hh * .6, x, gy - hh * .82); c.stroke();
      for (let p = 0; p < 6; p++) {                     // 花瓣
        const a = p * 1.047;
        c.beginPath(); c.ellipse(x + Math.cos(a) * 15, gy - hh * .82 + Math.sin(a) * 15, 11, 8, a, 0, 6.2832); F();
      }
      c.beginPath(); c.arc(x, gy - hh * .82, 8, 0, 6.2832); F();
    } else if (k < .70) {                               // 花架拱门
      const w = 96, hh = 130 + k2 * 40;
      c.beginPath();
      c.moveTo(x - w / 2, gy + 6); c.lineTo(x - w / 2, gy - hh + 30);
      c.quadraticCurveTo(x, gy - hh - 24, x + w / 2, gy - hh + 30);
      c.lineTo(x + w / 2, gy + 6); c.stroke();
      for (let p = 0; p < 5; p++) {                     // 攀藤的花
        const u = (p + .5) / 5, fx = x - w / 2 + w * u;
        const fy = gy - hh + 30 - 44 * Math.sin(u * Math.PI);
        c.beginPath(); c.arc(fx, fy, 7, 0, 6.2832); F();
      }
    } else {                                            // 小温室
      const w = 88, hh = 92 + k2 * 40;
      c.beginPath(); c.rect(x - w / 2, gy - hh, w, hh + 6); F();
      c.beginPath(); c.moveTo(x - w / 2 - 6, gy - hh); c.lineTo(x, gy - hh - 34); c.lineTo(x + w / 2 + 6, gy - hh); c.closePath(); F();
      c.lineWidth = 1.6; c.beginPath();
      c.moveTo(x, gy - hh); c.lineTo(x, gy);
      c.moveTo(x - w / 2, gy - hh * .5); c.lineTo(x + w / 2, gy - hh * .5);
      c.stroke(); c.lineWidth = 2.6;
    }
  } else {                                              // 04 台灯夜路：路灯、台灯、矮房
    if (k < .52) {                                      // 路灯：带光晕
      const hh = 128 + k2 * 56;
      c.beginPath(); c.moveTo(x, gy + 6); c.lineTo(x, gy - hh); c.stroke();
      c.beginPath(); c.arc(x, gy - hh - 6, 22, 0, 6.2832);
      c.fillStyle = rgb(T.accent, .22); c.fill();
      c.beginPath(); c.moveTo(x - 13, gy - hh); c.lineTo(x + 13, gy - hh); c.lineTo(x + 8, gy - hh - 15); c.lineTo(x - 8, gy - hh - 15);
      c.closePath(); c.fillStyle = rgb(T.accent, .75); F();
      c.fillStyle = rgb(T.paper2);
    } else if (k < .74) {                               // 大台灯
      const hh = 190 + k2 * 60;
      c.beginPath(); c.ellipse(x, gy, 34, 9, 0, 0, 6.2832); F();
      c.beginPath(); c.moveTo(x, gy - 6); c.lineTo(x + 10, gy - hh * .6); c.lineTo(x - 16, gy - hh); c.stroke();
      c.beginPath();
      c.moveTo(x - 16, gy - hh); c.lineTo(x - 52, gy - hh + 30); c.lineTo(x - 16, gy - hh + 44); c.closePath();
      c.fillStyle = rgb(T.accent, .55); F(); c.fillStyle = rgb(T.paper2);
    } else {                                            // 矮房
      const w = 74 + k2 * 30, hh = 66 + k3 * 40;
      c.beginPath(); c.rect(x - w / 2, gy - hh, w, hh + 6); F();
      c.beginPath(); c.moveTo(x - w / 2 - 5, gy - hh); c.lineTo(x, gy - hh - 26); c.lineTo(x + w / 2 + 5, gy - hh); c.closePath(); F();
      c.beginPath(); c.rect(x - 9, gy - hh * .62, 18, 16);
      c.fillStyle = rgb(T.accent, .6); F(); c.fillStyle = rgb(T.paper2);
    }
  }
}

function drawSkyline(c, T, W, cam) {
  const gy = W.ground, span = 168, par = .24;
  const first = Math.floor(cam * par / span) - 1;
  c.save();
  c.fillStyle = rgb(T.paper2); c.strokeStyle = rgb(T.ink, .23);
  c.lineWidth = 2.7; c.lineJoin = 'round'; c.lineCap = 'round';
  for (let k = 0; k < Math.ceil(W.vw / span) + 3; k++) {
    const i = first + k;
    const x = i * span - cam * par + hash1(i * 3.1) * 48;
    if (x < -160 || x > W.vw + 160) continue;
    zoneProp(c, T, T.idx | 0, x, gy, i + 17);
  }
  c.restore();
}

function drawSky(c, T, W, cam, t) {
  const gy = W.ground, night = T.idx === 4;
  c.fillStyle = rgb(T.paper); c.fillRect(0, 0, W.vw, W.vh);
  {                                                     // 地平线附近透一层暖光，整张纸就活了
    const g = c.createLinearGradient(0, gy - Math.min(430, gy * .62), 0, gy);
    g.addColorStop(0, rgb(T.glow, 0));
    g.addColorStop(1, rgb(T.glow, night ? .42 : .42));
    c.fillStyle = g; c.fillRect(0, gy - Math.min(430, gy * .62), W.vw, Math.min(430, gy * .62));
  }
  // 纸纹：横线 / 方格
  c.strokeStyle = rgb(T.paper2); c.lineWidth = 1.6;
  if (T.rule !== 'none') {
    c.beginPath();
    for (let y = (gy % 46); y < W.vh; y += 46) { c.moveTo(0, y); c.lineTo(W.vw, y); }
    if (T.rule === 'grid') {
      const off = -(cam * .06) % 46;
      for (let x = off; x < W.vw + 46; x += 46) { c.moveTo(x, 0); c.lineTo(x, W.vh); }
    }
    c.stroke();
  }
  const top = Math.min(210, gy * .38), band = Math.max(100, gy - 95 - top);  // 可用天空带

  // 1) 纸上涂鸦（几乎不动，铺满整条天空带）
  c.strokeStyle = rgb(T.ink, night ? .13 : .09);
  c.lineWidth = 2.3; c.lineCap = 'round'; c.lineJoin = 'round';
  {
    const span = 112, par = .05, first = Math.floor(cam * par / span) - 1;
    for (let k = 0; k < Math.ceil(W.vw / span) + 3; k++) {
      const i = first + k, h = hash1(i * 1.7);
      const x = i * span - cam * par + h * 70;
      if (x < -70 || x > W.vw + 70) continue;
      for (let j = 0; j < 2; j++) {
        const n = i * 2 + j;
        if (hash1(n + 33) < .12) continue;
        const y = top + 14 + (j * .5 + hash1(n + 4.1) * .5) * (band - 30);
        c.save(); c.translate(x + (j ? 42 : 0), y); c.rotate((hash1(n + 9) - .5) * 1.1);
        doodleAt(c, Math.floor(hash1(n + 2.3) * 6), 9 + hash1(n + 5) * 14);
        c.stroke(); c.restore();
      }
    }
  }

  // 2) 太阳 / 月亮
  {
    const sx = W.vw * .83, sy = top + 28, r = 22;  // 避开右上角图标与刘海
    c.save();
    c.strokeStyle = rgb(T.ink, .3); c.lineWidth = 3;
    c.beginPath(); c.arc(sx, sy, r, 0, 6.2832);
    c.fillStyle = rgb(night ? T.accent : T.paper2, night ? .85 : .95);
    c.fill(); c.stroke();
    if (night) {                                        // 挖个缺口变月牙
      c.beginPath(); c.arc(sx - r * .44, sy - r * .3, r * .9, 0, 6.2832);
      c.fillStyle = rgb(T.paper); c.fill();
    } else {                                            // 光芒
      c.lineWidth = 2.6; c.strokeStyle = rgb(T.ink, .22); c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * .7854 + t * .05;
        c.moveTo(sx + Math.cos(a) * (r + 8), sy + Math.sin(a) * (r + 8));
        c.lineTo(sx + Math.cos(a) * (r + 17), sy + Math.sin(a) * (r + 17));
      }
      c.stroke();
    }
    c.restore();
  }

  // 3) 云：两层深度，铺满高度
  for (let d = 0; d < 2; d++) {
    const par = d ? .13 : .06, span = d ? 248 : 208, base = d ? .56 : .36;
    c.lineWidth = d ? 3.2 : 2.3;
    c.strokeStyle = rgb(T.ink, d ? .2 : .13);
    c.fillStyle = rgb(T.paper2, d ? .8 : .5);
    const first = Math.floor(cam * par / span) - 1;
    for (let k = 0; k < Math.ceil(W.vw / span) + 3; k++) {
      const i = first + k, seed = i + d * 71, h = hash1(seed * 2.9);
      const x = i * span - cam * par + h * 120;
      if (x < -190 || x > W.vw + 190) continue;
      const y = top + 8 + hash1(i + 13) * band * (d ? .6 : .98);
      const s = base + hash1(i + 6) * .42;
      c.save(); c.translate(x, y + Math.sin(t * .5 + i) * 3); c.scale(s, s);
      c.beginPath();
      c.moveTo(-52, 14); c.bezierCurveTo(-70, 14, -70, -8, -48, -10);
      c.bezierCurveTo(-44, -32, -8, -36, 2, -18);
      c.bezierCurveTo(18, -32, 48, -22, 46, -2);
      c.bezierCurveTo(64, 2, 60, 14, 44, 14);
      c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  }

  // 3.5) 气球 / 纸飞机
  {
    const span = 340, par = .11, first = Math.floor(cam * par / span) - 1;
    for (let k = 0; k < Math.ceil(W.vw / span) + 3; k++) {
      const i = first + k, h = hash1(i * 7.9);
      const x = i * span - cam * par + h * 320;
      if (x < -80 || x > W.vw + 80) continue;
      const y = top + 30 + hash1(i + 41) * band * .72 + Math.sin(t * .7 + i) * 7;
      c.save(); c.translate(x, y);
      if (h < .62) {                                    // 气球：一串糖果色
        const r = 15 + hash1(i + 2) * 8;
        const col = T.pop[Math.floor(hash1(i + 31) * T.pop.length) % T.pop.length];
        c.rotate(Math.sin(t * .8 + i) * .12);
        c.beginPath(); c.ellipse(0, 0, r * .84, r, 0, 0, 6.2832);
        c.fillStyle = col + (night ? 'CC' : 'B0'); c.fill();
        c.strokeStyle = rgb(T.ink, .34); c.lineWidth = 2.6; c.stroke();
        c.beginPath(); c.moveTo(0, r); c.lineTo(-4, r + 6); c.lineTo(4, r + 6); c.closePath();
        c.fillStyle = rgb(T.paper2); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(0, r + 6);
        c.quadraticCurveTo(9, r + 28, -3, r + 50);
        c.lineWidth = 2; c.stroke();
      } else {                                          // 纸飞机
        c.rotate(-.16 + Math.sin(t * .9 + i) * .08); c.scale(1.1, 1.1);
        c.beginPath();
        c.moveTo(-20, -8); c.lineTo(22, 0); c.lineTo(-20, 10); c.lineTo(-13, 1); c.closePath();
        c.fillStyle = rgb(T.paper2); c.fill();
        c.strokeStyle = rgb(T.ink, .34); c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke();
        c.beginPath(); c.moveTo(-20, -8); c.lineTo(-13, 1); c.lineTo(-20, 10); c.stroke();
      }
      c.restore();
    }
  }

  // 4) 小鸟
  {
    const span = 296, par = .2, first = Math.floor(cam * par / span) - 1;
    c.strokeStyle = rgb(T.ink, .32); c.lineWidth = 2.6;
    for (let k = 0; k < Math.ceil(W.vw / span) + 3; k++) {
      const i = first + k, h = hash1(i * 5.3);
      if (h < .26) continue;
      const x = i * span - cam * par + h * 190;
      if (x < -70 || x > W.vw + 70) continue;
      const y = top + 26 + hash1(i + 21) * band * .5;
      const f = 4 + Math.sin(t * 5 + i) * 4;
      c.beginPath();
      for (let b = 0; b < 2; b++) {
        const bx = x + b * 27, by = y + b * 14;
        c.moveTo(bx - 9, by); c.quadraticCurveTo(bx - 4.5, by - f, bx, by);
        c.quadraticCurveTo(bx + 4.5, by - f, bx + 9, by);
      }
      c.stroke();
    }
  }

  // 4.5) 彩虹：每隔一段路挂一道，远远的、淡淡的
  {
    const span = 2600, par = .07, first = Math.floor(cam * par / span) - 1;
    for (let k = 0; k < 3; k++) {
      const i = first + k;
      const x = i * span - cam * par + hash1(i * 1.3) * 500;
      if (x < -300 || x > W.vw + 300) continue;
      const R = 140 + hash1(i + 7) * 60, base = gy - 6;
      c.save(); c.globalAlpha = night ? .17 : .22; c.lineWidth = 11; c.lineCap = 'butt';
      T.pop.forEach((col, b) => {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(x, base, R - b * 11, Math.PI, Math.PI * 2);
        c.stroke();
      });
      c.restore();
    }
  }

  // 4.6) 三角彩旗：挂在一条下垂的绳上
  {
    const span = 1500, par = .17, first = Math.floor(cam * par / span) - 1;
    for (let k = 0; k < 3; k++) {
      const i = first + k;
      const x0 = i * span - cam * par, x1 = x0 + 520, sag = 34;
      if (x1 < -120 || x0 > W.vw + 120) continue;
      const y0 = top + 54 + hash1(i * 2.1) * 130;
      // 绳：二次贝塞尔，控制点在正下方，所以 y(u) = y0 + 4*sag*u*(1-u)
      c.strokeStyle = rgb(T.ink, .38); c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0);
      c.stroke();
      for (let f = 1; f < 9; f++) {
        const u = f / 9;
        const fx = x0 + (x1 - x0) * u, fy = y0 + 4 * sag * u * (1 - u);
        const sw = Math.sin(t * 1.6 + i * 2 + u * 5) * 2.2;   // 风里轻轻摆
        c.beginPath();
        c.moveTo(fx - 9, fy); c.lineTo(fx + 9, fy); c.lineTo(fx + sw, fy + 23);
        c.closePath();
        c.fillStyle = T.pop[((f + i) % T.pop.length + T.pop.length) % T.pop.length] + (night ? 'C0' : 'D0'); c.fill();
        c.strokeStyle = rgb(T.ink, .32); c.lineWidth = 1.8; c.stroke();
      }
    }
  }

  // 5) 远山（两层）+ 中间夹一层屋顶树梢
  c.lineCap = 'round';
  for (let layer = 0; layer < 2; layer++) {
    if (layer === 1) drawSkyline(c, T, W, cam);
    c.fillStyle = rgb(T.hill); c.strokeStyle = rgb(T.ink, .17); c.lineWidth = 3;
    const par = layer ? .3 : .16, span = layer ? 430 : 620, hgt = layer ? 96 : 150;
    const off = -((cam * par) % span);
    c.beginPath();
    c.moveTo(off - span * 2, gy + 10);
    for (let x = off - span * 2; x < W.vw + span; x += span) {
      c.quadraticCurveTo(x + span * .5, gy - hgt - (layer ? 0 : 30), x + span, gy + 10);
    }
    c.lineTo(W.vw + span, gy + 10); c.closePath();
    c.globalAlpha *= layer ? 1 : .62; c.fill(); c.stroke(); c.globalAlpha = 1;
  }
}
function drawGround(c, T, W, cam) {
  const gy = W.ground, dep = W.vh - gy;
  c.fillStyle = rgb(T.paper2); c.fillRect(0, gy, W.vw, dep);
  // 地面斜排线（紧贴地平线）
  c.strokeStyle = rgb(T.ink, .3); c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath();
  const step = 34, off = -(cam % step);
  for (let x = off; x < W.vw + step; x += step) { c.moveTo(x, gy + 5); c.lineTo(x - 9, gy + 17); }
  c.stroke();
  // 地面纵深：两层小石子 / 草，越靠下越快越大
  for (let d = 0; d < 2; d++) {
    const par = d ? 1.5 : 1.16, sp = d ? 128 : 96;
    const yy = gy + dep * (d ? .58 : .27);
    const sz = d ? 1.5 : 1, first = Math.floor(cam * par / sp) - 1;
    c.strokeStyle = rgb(T.ink, d ? .22 : .16); c.lineWidth = 2.2 * sz;
    c.beginPath();
    for (let k = 0; k < Math.ceil(W.vw / sp) + 3; k++) {
      const i = first + k, h = hash1((i + d * 41) * 4.3);
      const x = i * sp - cam * par + h * 60;
      if (x < -40 || x > W.vw + 40) continue;
      const y = yy + (hash1(i + 11) - .5) * dep * .3;
      if (h > .55) {                                  // 小草
        c.moveTo(x, y); c.quadraticCurveTo(x + 3 * sz, y - 11 * sz, x + 9 * sz, y - 13 * sz);
        c.moveTo(x + 4 * sz, y); c.quadraticCurveTo(x + 9 * sz, y - 8 * sz, x + 16 * sz, y - 7 * sz);
      } else {                                        // 石子
        c.moveTo(x + 7 * sz, y);
        c.arc(x, y, 7 * sz, 0, 6.2832);
      }
    }
    c.stroke();
  }
  // 地平线本身（压在最上层，保证判定线清晰）
  c.beginPath(); c.moveTo(0, gy); c.lineTo(W.vw, gy);
  c.strokeStyle = rgb(T.ink); c.lineWidth = 3.5; c.lineCap = 'round'; c.stroke();
  // 前景草丛（贴着线跑，制造速度感）
  c.strokeStyle = rgb(T.ink, .5); c.lineWidth = 3;
  const step2 = 190, off2 = -((cam * 1.16) % step2);
  c.beginPath();
  for (let x = off2; x < W.vw + step2; x += step2) {
    c.moveTo(x, gy); c.quadraticCurveTo(x + 3, gy - 13, x + 10, gy - 15);
    c.moveTo(x + 4, gy); c.quadraticCurveTo(x + 10, gy - 9, x + 18, gy - 8);
  }
  c.stroke();
}

function zoneProp(c,T,idx,x,gy,seed){
 const k=hash1(seed),h=90+hash1(seed+3)*85;
 if(idx===0)return referenceProp(c,T,0,x,gy,seed);
 if(idx===5)return referenceProp(c,T,2,x,gy,seed);
 if(idx===4)return referenceProp(c,T,3,x,gy,seed);
 c.save();c.translate(x,gy);c.lineCap='round';c.lineJoin='round';
 const finish=()=>{c.fill();c.stroke();};
 if(idx===1){
  if(k<.42){ // Lighthouse, with a quiet striped body and lantern.
   c.beginPath();c.moveTo(-23,6);c.lineTo(-15,-h);c.lineTo(15,-h);c.lineTo(23,6);c.closePath();finish();
   c.beginPath();c.rect(-21,-h-23,42,23);finish();
   c.beginPath();c.moveTo(-26,-h-23);c.lineTo(0,-h-40);c.lineTo(26,-h-23);c.closePath();finish();
   c.beginPath();for(let y=-25;y>-h;y-=32){c.moveTo(-19,y);c.lineTo(19,y);}c.stroke();
   c.fillStyle=rgb(T.accent,.45);c.fillRect(-8,-h-18,16,14);
  }else if(k<.76){ // Sailboat over the horizon.
   c.beginPath();c.moveTo(-46,-20);c.quadraticCurveTo(0,18,46,-20);c.closePath();finish();
   c.beginPath();c.moveTo(0,-20);c.lineTo(0,-h);c.lineTo(36,-30);c.closePath();finish();
   c.beginPath();c.moveTo(-6,-h+12);c.lineTo(-6,-30);c.lineTo(-40,-30);c.closePath();finish();
  }else{ // Beach umbrella.
   c.beginPath();c.moveTo(0,6);c.lineTo(0,-h);c.stroke();
   c.beginPath();c.moveTo(-48,-h+24);c.quadraticCurveTo(0,-h-42,48,-h+24);c.quadraticCurveTo(24,-h+14,0,-h+24);c.quadraticCurveTo(-24,-h+14,-48,-h+24);finish();
  }
 }else if(idx===2){
  if(k<.72){ // Tall, rounded forest canopy.
   c.beginPath();c.moveTo(-9,8);c.lineTo(-7,-h);c.lineTo(8,-h);c.lineTo(13,8);finish();
   c.beginPath();c.moveTo(-42,-h*.32);c.bezierCurveTo(-66,-h*.52,-51,-h*.87,-27,-h*.89);c.bezierCurveTo(-25,-h*1.22,25,-h*1.28,32,-h*.91);c.bezierCurveTo(68,-h*.83,59,-h*.4,42,-h*.32);c.closePath();finish();
   c.beginPath();c.moveTo(0,-h*.34);c.lineTo(0,-h*.83);c.moveTo(0,-h*.55);c.lineTo(-18,-h*.69);c.moveTo(0,-h*.7);c.lineTo(19,-h*.85);c.stroke();
  }else{ // Button mushrooms.
   c.beginPath();c.roundRect(-9,-54,18,59,8);finish();c.beginPath();c.moveTo(-42,-54);c.bezierCurveTo(-39,-110,39,-110,42,-54);c.closePath();finish();
   c.beginPath();c.arc(-14,-72,5,0,Math.PI*2);c.arc(17,-69,4,0,Math.PI*2);c.stroke();
  }
 }else if(idx===3){
  if(k<.7){ // Snow peaks with a folded white cap.
   c.beginPath();c.moveTo(-70,5);c.lineTo(0,-h*1.35);c.lineTo(78,5);c.closePath();finish();
   c.beginPath();c.moveTo(-24,-h*.87);c.lineTo(-9,-h*.96);c.lineTo(4,-h*.82);c.lineTo(16,-h*.97);c.lineTo(28,-h*.85);c.stroke();
  }else{ // A little alpine cabin.
   c.beginPath();c.rect(-34,-61,68,66);finish();c.beginPath();c.moveTo(-43,-61);c.lineTo(0,-100);c.lineTo(43,-61);c.closePath();finish();c.beginPath();c.rect(-9,-35,18,40);c.stroke();
  }
 }
 c.restore();
}
function atmosphere(c,T,W,cam,t){
 if(![1,2,3,5].includes(T.idx))return;
 c.save();c.strokeStyle=rgb(T.ink,.16);c.lineWidth=1.5;
 if(T.idx===1){for(let row=0;row<3;row++){const y=W.ground-22-row*21;c.beginPath();for(let x=-40-(cam*(.12+row*.04))%80;x<W.vw+40;x+=80){c.moveTo(x,y);c.quadraticCurveTo(x+18,y-5,x+40,y);c.quadraticCurveTo(x+60,y+5,x+80,y);}c.stroke();}}
 else {for(let i=0;i<16;i++){const x=((hash1(i+33)*W.vw-cam*.12)%(W.vw+60)+(W.vw+60))%(W.vw+60)-30,y=W.ground-25-hash1(i+53)*Math.min(220,W.ground*.45)+Math.sin(t*(T.idx===3?.4:1.2)+i)*12;
 c.beginPath();c.arc(x,y,T.idx===2?2.1:1.8,0,Math.PI*2);c.fillStyle=rgb(T.idx===2?T.accent:T.paper,T.idx===2?.45+Math.sin(t*2+i)*.3:.8);c.fill();
 }}c.restore();
}
window.PaperWorld={theme:index=>themes[index]||themes[0],draw(c,index,width,height,ground,cam,time){
 const T=themes[index]||themes[0],W={vw:width,vh:height,ground};
 c.save();drawSky(c,T,W,cam,time);atmosphere(c,T,W,cam,time);drawGround(c,T,W,cam);c.restore();
}};
})();
