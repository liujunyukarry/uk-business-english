// Screen and particle effects (v2.7).
//
// 1. createPost: an HDR post-processing chain — the scene is drawn into a
//    multisampled half-float target, bright parts are blurred into a soft
//    glow (bloom), and one final pass adds the glow, tone-maps, grades the
//    colour, darkens the corners and streaks the frame edges during a boost.
//    Everything is optional: when a device cannot draw into half-float
//    targets, or the first frames come out black, the game falls back to
//    drawing straight to the screen (see `ok` / `verify`).
// 2. createSprites: camera-facing particles drawn in two instanced meshes
//    (glowing ones add light, smoke and confetti blend), simulated in typed
//    arrays so a frame allocates nothing.
// 3. createSkids: tyre marks laid on the road while a kart drifts.
import * as T from "./vendor/three.module.js";

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
const pass = (fragmentShader, uniforms, extra = {}) =>
  new T.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    blending: T.NoBlending,
    ...extra,
  });
// Half-size copy: the centre and four diagonal taps (each a bilinear average
// of four texels). The first one also keeps only what is brighter than the
// threshold, with a soft knee so the glow does not switch on abruptly.
const DOWN = `
uniform sampler2D tMap; uniform vec2 texel; uniform float threshold; uniform float knee;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tMap, vUv).rgb * 4.0;
  c += texture2D(tMap, vUv + texel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + texel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + texel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tMap, vUv + texel * vec2( 1.0,  1.0)).rgb;
  c *= 0.125;
  if (threshold > 0.0) {
    float br = max(c.r, max(c.g, c.b));
    float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    c *= max(soft, br - threshold) / max(br, 1e-4);
    c = min(c, vec3(6.0)); // one tiny very bright spark must not flash the whole frame
  }
  gl_FragColor = vec4(c, 1.0);
}`;
// Tent-filtered enlargement, added onto the next larger level.
const UP = `
uniform sampler2D tMap; uniform vec2 texel; uniform float strength;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tMap, vUv + texel * vec2(-1.0,  1.0)).rgb + texture2D(tMap, vUv + texel * vec2(1.0,  1.0)).rgb
         + texture2D(tMap, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tMap, vUv + texel * vec2(1.0, -1.0)).rgb;
  c = c * 2.0 + texture2D(tMap, vUv + texel * vec2(-2.0, 0.0)).rgb + texture2D(tMap, vUv + texel * vec2(2.0, 0.0)).rgb
              + texture2D(tMap, vUv + texel * vec2(0.0, -2.0)).rgb + texture2D(tMap, vUv + texel * vec2(0.0, 2.0)).rgb;
  gl_FragColor = vec4(c / 12.0 * strength, 1.0);
}`;
// The final pass. Tone mapping is the Khronos PBR Neutral curve (the same one
// the renderer uses when this chain is off), which leaves colours as painted
// up to bright values and only rolls off highlights; ACES, used before v2.7,
// washed the pastel scenery out.
const FINAL = `
uniform sampler2D tScene; uniform sampler2D tBloom;
uniform float bloom; uniform float exposure; uniform float saturation; uniform float contrast;
uniform float vignette; uniform float rush; uniform vec3 lift; uniform vec3 gain;
varying vec2 vUv;
vec3 neutral(vec3 color){
  const float start = 0.8 - 0.04;
  const float desat = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  float d = 1.0 - start;
  float newPeak = 1.0 - d * d / (peak + d - start);
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / (desat * (peak - newPeak) + 1.0);
  return mix(color, vec3(newPeak), g);
}
void main(){
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  vec3 c = texture2D(tScene, vUv).rgb;
  if (rush > 0.003) {
    // Boost: the edges of the frame streak outward and split slightly into
    // colours; the middle, where the kart is, stays sharp.
    float k = rush * smoothstep(0.03, 0.36, r2) * 0.06;
    vec3 acc = c;
    for (int i = 1; i <= 4; i++) {
      float t = float(i) * 0.25 * k;
      acc += vec3(texture2D(tScene, vUv - d * t * 1.1).r, texture2D(tScene, vUv - d * t).g, texture2D(tScene, vUv - d * t * 0.9).b);
    }
    c = acc * 0.2;
  }
  c += texture2D(tBloom, vUv).rgb * bloom;
  c = neutral(max(c, vec3(0.0)) * exposure);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = clamp(mix(vec3(l), c, saturation), 0.0, 1.0);
  c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
  c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
  c = c * gain + lift * (1.0 - c);
  c *= 1.0 - vignette * smoothstep(0.1, 0.62, r2);
  // A touch of noise hides banding in the sky gradients.
  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}`;
export const POST_LEVELS = 5;
// Looks: how strong the glow and the grade are. `gain` / `lift` tint the
// bright and the dark end.
export const LOOKS = {
  garage: { bloom: 0.5, threshold: 0.92, exposure: 1, saturation: 1.06, contrast: 0.16, vignette: 0.16, gain: [1, 1, 1], lift: [0, 0, 0] },
};
export function createPost(renderer) {
  if (renderer.software || !renderer.capabilities?.isWebGL2) return null;
  const ext = renderer.extensions;
  if (!ext.has("EXT_color_buffer_float") && !ext.has("EXT_color_buffer_half_float")) return null;
  const gl = renderer.getContext(),
    tri = new T.BufferGeometry();
  tri.setAttribute("position", new T.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  tri.setAttribute("uv", new T.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new T.Mesh(tri),
    quadScene = new T.Scene(),
    quadCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const down = pass(DOWN, { tMap: { value: null }, texel: { value: new T.Vector2() }, threshold: { value: 0 }, knee: { value: 0.35 } }),
    up = pass(UP, { tMap: { value: null }, texel: { value: new T.Vector2() }, strength: { value: 1 } }, { blending: T.AdditiveBlending, transparent: true }),
    final = pass(FINAL, {
      tScene: { value: null },
      tBloom: { value: null },
      bloom: { value: 0.6 },
      exposure: { value: 1 },
      saturation: { value: 1.08 },
      contrast: { value: 0.2 },
      vignette: { value: 0.2 },
      rush: { value: 0 },
      lift: { value: new T.Vector3() },
      gain: { value: new T.Vector3(1, 1, 1) },
    });
  let sceneRT = null,
    levels = [],
    width = 0,
    height = 0,
    samples = 4,
    checked = 0,
    verified = false; // the chain has drawn a good frame on this device
  const post = {
    ok: true,
    reason: "",
    calls: 0, // draw calls of the scene itself in the last frame (for profiling)
    triangles: 0,
    threshold: 0.92,
    get samples() {
      return samples;
    },
    get size() {
      return [width, height];
    },
    get verified() {
      return verified;
    },
    builds: 0, // times the targets were (re)allocated
    uniforms: final.uniforms,
    look(l) {
      const u = final.uniforms;
      u.bloom.value = l.bloom;
      u.exposure.value = l.exposure;
      u.saturation.value = l.saturation;
      u.contrast.value = l.contrast;
      u.vignette.value = l.vignette;
      u.gain.value.fromArray(l.gain);
      u.lift.value.fromArray(l.lift);
      post.threshold = l.threshold;
    },
    // Check the next frames again (after the GPU context was restored).
    recheck() {
      verified = false;
      checked = 0;
    },
    fail(reason) {
      post.ok = false;
      post.reason = reason;
      post.dispose();
    },
    dispose() {
      sceneRT?.dispose();
      levels.forEach((l) => l.dispose());
      sceneRT = null;
      levels = [];
      width = height = 0;
    },
    // (Re)build the targets for a drawing-buffer size. Returns false, and
    // turns the chain off, when the device cannot complete them.
    setSize(w, h) {
      w = Math.max(2, Math.floor(w));
      h = Math.max(2, Math.floor(h));
      if (!post.ok || (w === width && h === height && sceneRT)) return post.ok;
      post.dispose();
      width = w;
      height = h;
      const complete = () => gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      try {
        for (;;) {
          sceneRT = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples, depthBuffer: true, stencilBuffer: false });
          renderer.setRenderTarget(sceneRT);
          const good = complete();
          renderer.setRenderTarget(null);
          if (good) break;
          sceneRT.dispose();
          sceneRT = null;
          if (samples === 0) return post.fail("half-float targets are not renderable"), false;
          samples = 0; // some GPUs cannot multisample float buffers: go without
        }
        let lw = w,
          lh = h;
        for (let i = 0; i < POST_LEVELS; i++) {
          lw = Math.max(2, lw >> 1);
          lh = Math.max(2, lh >> 1);
          const rt = new T.WebGLRenderTarget(lw, lh, { type: T.HalfFloatType, depthBuffer: false, stencilBuffer: false });
          rt.texture.minFilter = rt.texture.magFilter = T.LinearFilter;
          rt.texture.generateMipmaps = false;
          levels.push(rt);
        }
        renderer.setRenderTarget(levels[0]);
        const good = complete();
        renderer.setRenderTarget(null);
        if (!good) return post.fail("bloom targets are not renderable"), false;
      } catch (e) {
        return post.fail("targets: " + (e?.message || e)), false;
      }
      post.builds++;
      // Only the first frames this chain ever draws are read back: a read
      // makes the CPU wait for the GPU (a hitch), so a later rebuild for a
      // new size is not checked again (v2.7 checked after every rebuild).
      checked = verified ? 2 : 0;
      return true;
    },
    // Compile the scene's shaders for this chain's target (programs differ
    // from the ones used when drawing straight to the screen).
    compile(scene, camera) {
      if (!post.ok || !sceneRT) return;
      renderer.setRenderTarget(sceneRT);
      try {
        renderer.compile(scene, camera);
      } catch {}
      renderer.setRenderTarget(null);
    },
    render(scene, camera) {
      if (!post.ok || !sceneRT) return false;
      const auto = renderer.autoClear;
      try {
        renderer.setRenderTarget(sceneRT);
        renderer.render(scene, camera);
        post.calls = renderer.info.render.calls;
        post.triangles = renderer.info.render.triangles;
        renderer.autoClear = false;
        const run = (material, target) => {
          quad.material = material;
          renderer.setRenderTarget(target);
          renderer.render(quadScene, quadCam);
        };
        let src = sceneRT;
        for (let i = 0; i < levels.length; i++) {
          down.uniforms.tMap.value = src.texture;
          down.uniforms.texel.value.set(1 / src.width, 1 / src.height);
          down.uniforms.threshold.value = i ? 0 : post.threshold;
          run(down, levels[i]);
          src = levels[i];
        }
        for (let i = levels.length - 2; i >= 0; i--) {
          const from = levels[i + 1];
          up.uniforms.tMap.value = from.texture;
          up.uniforms.texel.value.set(0.5 / from.width, 0.5 / from.height);
          run(up, levels[i]);
        }
        final.uniforms.tScene.value = sceneRT.texture;
        final.uniforms.tBloom.value = levels[0].texture;
        run(final, null);
      } catch (e) {
        renderer.autoClear = auto;
        renderer.setRenderTarget(null);
        post.fail("render: " + (e?.message || e));
        return false;
      }
      renderer.autoClear = auto;
      // The first frames after each (re)build are checked: a chain that
      // leaves the screen black is switched off for good.
      if (checked < 2 && ++checked) {
        if (!post.verify()) {
          post.fail("blank frame");
          return false;
        }
        if (checked === 2) verified = true;
      }
      return true;
    },
    // Reads a few pixels of the frame just drawn; true when any is lit.
    verify() {
      const px = new Uint8Array(4),
        w = gl.drawingBufferWidth,
        h = gl.drawingBufferHeight;
      renderer.setRenderTarget(null);
      for (const [fx, fy] of [
        [0.5, 0.5],
        [0.2, 0.8],
        [0.8, 0.8],
        [0.3, 0.3],
        [0.7, 0.3],
        [0.5, 0.92],
        [0.5, 0.1],
      ]) {
        gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (px[0] + px[1] + px[2] > 9) return true;
      }
      return false;
    },
  };
  return post;
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------
// Shapes (by `kind`): 0 soft glow, 1 smoke puff, 2 four-point sparkle,
// 3 confetti (a flat coloured card that tumbles).
export const GLOW = 0,
  PUFF = 1,
  STAR = 2,
  CARD = 3;
const SPRITE_VERT = `
attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iCol; attribute vec4 iPar;
varying vec2 vQ; varying vec4 vCol; varying float vKind;
void main(){
  vQ = position.xy * 2.0;
  vCol = iCol;
  vKind = iPar.z;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  // Shrink what drifts right up to the lens instead of filling the screen.
  float lens = clamp((-mv.z - 1.6) / 2.6, 0.0, 1.0);
  vec2 q = position.xy;
  float cs = cos(iPar.w), sn = sin(iPar.w);
  vec2 off = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs) * iPar.x;
  if (vKind > 2.5) off.y *= cos(iPar.w * 2.3); // confetti flips as it spins
  // Streaks: stretched along the motion as the eye sees it, which is the
  // part of the velocity (relative to the camera) across the line of sight.
  vec3 vv = (modelViewMatrix * vec4(iVel, 0.0)).xyz;
  vec3 ray = normalize(mv.xyz);
  vec3 across = vv - dot(vv, ray) * ray;
  float sp = length(across);
  if (iPar.y > 0.0 && sp > 0.01) {
    vec3 ax = across / sp;
    vec3 wd = normalize(cross(ray, ax));
    mv.xyz += (ax * position.x * (iPar.x + iPar.y * sp) + wd * position.y * iPar.x) * lens;
  } else mv.xy += off * lens;
  gl_Position = projectionMatrix * mv;
}`;
const SPRITE_FRAG = `
uniform float gain;
varying vec2 vQ; varying vec4 vCol; varying float vKind;
void main(){
  float r = length(vQ), a;
  if (vKind < 0.5) a = exp(-r * r * 4.2) * 1.12 - 0.017;
  else if (vKind < 1.5) { a = max(0.0, 1.0 - r); a = a * a * (3.0 - 2.0 * a) * 0.9; }
  else if (vKind < 2.5) {
    vec2 q = abs(vQ);
    float s = max(0.0, 1.0 - (q.x * q.y * 30.0 + r * 1.05));
    a = s * s + exp(-r * r * 16.0) * 0.9;
  } else a = step(max(abs(vQ.x), abs(vQ.y)), 0.94);
  if (a <= 0.004) discard;
  gl_FragColor = vec4(vCol.rgb * gain, vCol.a * a);
}`;
const FIELDS = ["vx", "vy", "vz", "life", "max", "size", "grow", "drag", "grav", "alpha", "spin", "fadeIn"];
function spriteLayer(cap, blending) {
  const geo = new T.InstancedBufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const a = { pos: new Float32Array(cap * 3), vel: new Float32Array(cap * 3), col: new Float32Array(cap * 4), par: new Float32Array(cap * 4) };
  const attr = {};
  for (const [name, key, n] of [
    ["iPos", "pos", 3],
    ["iVel", "vel", 3],
    ["iCol", "col", 4],
    ["iPar", "par", 4],
  ]) {
    attr[key] = new T.InstancedBufferAttribute(a[key], n).setUsage(T.DynamicDrawUsage);
    geo.setAttribute(name, attr[key]);
  }
  geo.instanceCount = 0;
  const material = new T.ShaderMaterial({
    vertexShader: SPRITE_VERT,
    fragmentShader: SPRITE_FRAG,
    uniforms: { gain: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending,
    toneMapped: false,
    fog: false,
  });
  const mesh = new T.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = blending === T.AdditiveBlending ? 6 : 5;
  const s = { cap, n: 0, a, attr, geo, mesh, base: new Float32Array(cap * 3) }; // base = the colour before fading
  for (const f of FIELDS) s[f] = new Float32Array(cap);
  return s;
}
const tmpColour = new T.Color();
export function createSprites({ glow = 420, solid = 220 } = {}) {
  const layers = [spriteLayer(glow, T.AdditiveBlending), spriteLayer(solid, T.NormalBlending)];
  const group = new T.Group();
  group.add(layers[1].mesh, layers[0].mesh);
  return {
    group,
    layers,
    get count() {
      return layers[0].n + layers[1].n;
    },
    // Glowing kinds are drawn brighter than 1 when the frame is HDR, so the
    // bloom picks them up.
    setGain(g) {
      layers[0].mesh.material.uniforms.gain.value = g;
    },
    clear() {
      for (const l of layers) l.n = l.geo.instanceCount = 0;
    },
    // kind, position, velocity, seconds, size (m), colour, then options.
    add(kind, x, y, z, vx, vy, vz, life, size, colour, alpha = 1, grow = 0, drag = 2.2, grav = 10, stretch = 0, spin = 0, fadeIn = 0) {
      const l = layers[kind === PUFF || kind === CARD ? 1 : 0];
      let i = l.n;
      if (i >= l.cap) {
        // Full: replace the particle closest to its end.
        i = 0;
        for (let k = 1; k < l.cap; k++) if (l.life[k] < l.life[i]) i = k;
      } else l.n++;
      const { pos, par } = l.a;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      l.vx[i] = vx;
      l.vy[i] = vy;
      l.vz[i] = vz;
      l.life[i] = l.max[i] = life;
      l.size[i] = size;
      l.grow[i] = grow;
      l.drag[i] = drag;
      l.grav[i] = grav;
      l.alpha[i] = alpha;
      l.spin[i] = spin;
      l.fadeIn[i] = fadeIn;
      tmpColour.set(colour);
      l.base[i * 3] = tmpColour.r;
      l.base[i * 3 + 1] = tmpColour.g;
      l.base[i * 3 + 2] = tmpColour.b;
      par[i * 4] = size;
      par[i * 4 + 1] = stretch;
      par[i * 4 + 2] = kind;
      par[i * 4 + 3] = spin ? Math.random() * 6.283 : 0;
      return i;
    },
    // `cvx..` is the camera's velocity: streaks follow the motion relative
    // to it. `floor` (a height) makes confetti settle instead of sinking.
    update(dt, cvx = 0, cvy = 0, cvz = 0) {
      for (const l of layers) {
        const { pos, vel, col, par } = l.a;
        for (let i = l.n - 1; i >= 0; i--) {
          l.life[i] -= dt;
          if (l.life[i] <= 0) {
            // Swap the last live particle into this slot.
            const j = --l.n;
            if (j !== i) {
              pos.copyWithin(i * 3, j * 3, j * 3 + 3);
              par.copyWithin(i * 4, j * 4, j * 4 + 4);
              l.base.copyWithin(i * 3, j * 3, j * 3 + 3);
              for (const f of FIELDS) l[f][i] = l[f][j];
            }
            continue;
          }
          const k = Math.exp(-dt * l.drag[i]);
          l.vx[i] *= k;
          l.vy[i] = l.vy[i] * k - l.grav[i] * dt;
          l.vz[i] *= k;
          pos[i * 3] += l.vx[i] * dt;
          pos[i * 3 + 1] += l.vy[i] * dt;
          pos[i * 3 + 2] += l.vz[i] * dt;
          l.size[i] += l.grow[i] * dt;
          par[i * 4] = l.size[i];
          par[i * 4 + 3] += l.spin[i] * dt;
        }
        for (let i = 0; i < l.n; i++) {
          const age = 1 - l.life[i] / l.max[i],
            fade = Math.min(1, (l.life[i] / l.max[i]) * 2.6) * (l.fadeIn[i] > 0 ? Math.min(1, age / l.fadeIn[i]) : 1);
          vel[i * 3] = l.vx[i] - cvx;
          vel[i * 3 + 1] = l.vy[i] - cvy;
          vel[i * 3 + 2] = l.vz[i] - cvz;
          col[i * 4] = l.base[i * 3];
          col[i * 4 + 1] = l.base[i * 3 + 1];
          col[i * 4 + 2] = l.base[i * 3 + 2];
          col[i * 4 + 3] = l.alpha[i] * fade;
        }
        l.geo.instanceCount = l.n;
        l.mesh.visible = l.n > 0;
        if (l.n) for (const k in l.attr) l.attr[k].needsUpdate = true;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Tyre marks
// ---------------------------------------------------------------------------
// A ring of quads; each wheel that is marking adds one from its last pair of
// edge points to the new one. Marks fade out over `life` seconds.
export function createSkids({ quads = 560, life = 7 } = {}) {
  const pos = new Float32Array(quads * 12),
    col = new Float32Array(quads * 16),
    born = new Float32Array(quads * 4).fill(-1e6),
    index = [];
  for (let i = 0; i < quads; i++) index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2);
  const geo = new T.BufferGeometry();
  geo.setIndex(index);
  const aPos = new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage),
    aCol = new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage),
    aBorn = new T.BufferAttribute(born, 1).setUsage(T.DynamicDrawUsage);
  geo.setAttribute("position", aPos);
  geo.setAttribute("tint", aCol);
  geo.setAttribute("born", aBorn);
  const material = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, life: { value: life }, gain: { value: 1 } },
    vertexShader: `attribute vec4 tint; attribute float born; uniform float time; uniform float life; varying vec4 vTint;
      void main(){ float age = (time - born) / life; vTint = vec4(tint.rgb, tint.a * (1.0 - smoothstep(0.45, 1.0, age)) * step(age, 1.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float gain; varying vec4 vTint; void main(){ if (vTint.a < 0.004) discard; gl_FragColor = vec4(vTint.rgb * gain, vTint.a); }`,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: T.DoubleSide,
    toneMapped: false,
    fog: false,
  });
  const mesh = new T.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  const wheels = new Map();
  let head = 0,
    dirty = false,
    laid = 0;
  return {
    mesh,
    get laid() {
      return laid;
    },
    // Glowing marks (the night track): added light instead of dark rubber.
    setGlow(on, gain = 1) {
      material.blending = on ? T.AdditiveBlending : T.NormalBlending;
      material.uniforms.gain.value = gain;
      material.needsUpdate = true;
    },
    clear() {
      wheels.clear();
      born.fill(-1e6);
      aBorn.needsUpdate = true;
      head = 0;
    },
    lift(key) {
      const w = wheels.get(key);
      if (w) w.on = false;
    },
    // A wheel at (x, y, z) marking the road; (rx, rz) is the unit vector
    // across the kart, `half` half the mark's width.
    mark(key, x, y, z, rx, rz, half, r, g, b, a, now) {
      let w = wheels.get(key);
      if (!w) wheels.set(key, (w = { on: false, x: 0, y: 0, z: 0, rx: 0, rz: 0 }));
      const dx = x - w.x,
        dz = z - w.z,
        d2 = dx * dx + dz * dz;
      if (w.on && d2 < 0.09) return; // not far enough yet for the next piece
      if (w.on && d2 < 36) {
        const o = head * 12,
          c = head * 16;
        pos[o] = w.x - w.rx * half;
        pos[o + 1] = w.y;
        pos[o + 2] = w.z - w.rz * half;
        pos[o + 3] = w.x + w.rx * half;
        pos[o + 4] = w.y;
        pos[o + 5] = w.z + w.rz * half;
        pos[o + 6] = x - rx * half;
        pos[o + 7] = y;
        pos[o + 8] = z - rz * half;
        pos[o + 9] = x + rx * half;
        pos[o + 10] = y;
        pos[o + 11] = z + rz * half;
        for (let k = 0; k < 4; k++) {
          col[c + k * 4] = r;
          col[c + k * 4 + 1] = g;
          col[c + k * 4 + 2] = b;
          col[c + k * 4 + 3] = a;
          born[head * 4 + k] = now;
        }
        head = (head + 1) % quads;
        dirty = true;
        laid++;
      }
      w.on = true;
      w.x = x;
      w.y = y;
      w.z = z;
      w.rx = rx;
      w.rz = rz;
    },
    update(now) {
      material.uniforms.time.value = now;
      if (dirty) {
        aPos.needsUpdate = aCol.needsUpdate = aBorn.needsUpdate = true;
        dirty = false;
      }
    },
  };
}
