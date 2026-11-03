export class KartAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.45;
    this.nextNote = 0;
    this.beat = 0;
    this.racing = false;
  }
  unlock() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      this.ctx = new A();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.55;
      this.music.connect(this.master);
      this.engine = this.ctx.createOscillator();
      this.engine.type = "triangle";
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engine.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engine.start();
      this.nextNote = this.ctx.currentTime + 0.2;
    }
    this.ctx.resume().catch(() => {});
    this.mix();
  }
  mix() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }
  tone(f = 600, d = 0.12, type = "sine", v = 0.08, end = 0, at = 0, music = false) {
    if (!this.ctx || this.muted) return;
    const t = at || this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (end) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(music ? this.music : this.master);
    o.start(t);
    o.stop(t + d + 0.025);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  // Filtered white noise: the "whoosh" of nitro and the thud of a bump.
  noise(duration, from, to, volume, q = 0.8, at = 0) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      t = at || c.currentTime;
    if (!this.noiseBuffer) {
      this.noiseBuffer = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = this.noiseBuffer;
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  cue(type) {
    if (type === "boost") {
      this.noise(0.55, 500, 2600, 0.22, 0.7);
      this.tone(95, 0.32, "sine", 0.12, 48);
      return;
    }
    if (type === "pop") {
      this.noise(0.22, 1400, 220, 0.18, 0.9);
      this.tone(220, 0.16, "triangle", 0.08, 90);
      return;
    }
    if (type === "zap") {
      this.noise(0.4, 4200, 700, 0.14, 0.6);
      this.tone(1400, 0.3, "sawtooth", 0.035, 180);
      return;
    }
    if (type === "score") {
      this.tone(784, 0.12, "triangle", 0.1);
      this.tone(1175, 0.18, "triangle", 0.08, 0, (this.ctx?.currentTime || 0) + 0.08);
      return;
    }
    if (type === "bump") {
      this.noise(0.14, 900, 180, 0.16, 1.2);
      this.tone(150, 0.12, "sine", 0.1, 60);
      return;
    }
    if (type === "coin") {
      this.tone(880, 0.1, "sine", 0.09);
      this.tone(1320, 0.13, "sine", 0.06, 0, (this.ctx?.currentTime || 0) + 0.05);
    } else if (type === "hit") this.tone(180, 0.24, "sawtooth", 0.06, 50);
    else if (type === "go" || type === "drift") {
      this.tone(620, 0.13, "triangle", 0.13, 1000);
      this.tone(930, 0.22, "sine", 0.09, 1240, (this.ctx?.currentTime || 0) + 0.1);
    } else if (type === "finish") {
      [523, 659, 784, 1046].forEach((f, i) =>
        this.tone(f, 0.38, "triangle", 0.12, 0, (this.ctx?.currentTime || 0) + i * 0.16),
      );
    } else if (type === "pickup") this.tone(450, 0.16, "sine", 0.09, 1300);
    else if (type === "item") this.tone(330, 0.25, "triangle", 0.1, 800);
    else if (type === "tick") this.tone(660, 0.12, "sine", 0.1);
    else this.tone(760, 0.08, "sine", 0.06);
  }
  update(speed, active) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime;
    this.engine.frequency.setTargetAtTime(45 + speed * 2.4, t, 0.13);
    this.engineGain.gain.setTargetAtTime(active ? 0.012 : 0, t, 0.15);
    if (!active) {
      this.nextNote = t + 0.12;
      return;
    }
    if (this.nextNote < t - 0.5) this.nextNote = t + 0.06;
    const melody = [
      76, 0, 79, 0, 81, 79, 76, 74, 72, 0, 74, 76, 79, 0, 76, 0, 77, 0, 81, 0, 79, 77, 76, 74, 72, 74, 76, 0,
      74, 0, 72, 0,
    ];
    while (this.nextNote < t + 0.15) {
      const n = melody[this.beat % melody.length];
      if (n) this.tone(440 * 2 ** ((n - 69) / 12), 0.18, "triangle", 0.045, 0, this.nextNote, true);
      if (this.beat % 4 === 0)
        this.tone(
          [130.81, 110, 146.83, 98][Math.floor(this.beat / 8) % 4],
          0.3,
          "sine",
          0.08,
          0,
          this.nextNote,
          true,
        );
      this.nextNote += 0.215;
      this.beat++;
    }
  }
}
