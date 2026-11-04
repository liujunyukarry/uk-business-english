// Sound for PAW KART: a procedural soundtrack (one song per track, plus the
// garage theme) and the effect cues, all synthesised with Web Audio, so there
// are no audio files to load.
//
// The music is a 16-step sequencer: drums, a bouncing bass, offbeat chord
// stabs (or pads), an arpeggio and a lead melody. Each song is a short motif
// developed over its chord progression (A A' B C, 16 bars), so it stays
// coherent while looping. On the final lap the tempo rises, as in Mario Kart.

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

// Motifs: [step, degree above the chord root, length in 16th steps].
const MOTIF = {
  climb: [[0, 4, 2], [2, 2, 2], [4, 7, 3], [7, 6, 1], [8, 4, 2], [10, 2, 2], [12, 0, 4]],
  answer: [[0, 2, 3], [3, 4, 1], [4, 5, 2], [6, 4, 2], [8, 2, 4], [12, 1, 2], [14, 0, 2]],
  soar: [[0, 7, 3], [3, 6, 1], [4, 4, 2], [6, 2, 2], [8, 4, 3], [11, 5, 1], [12, 4, 4]],
  bounce: [[0, 0, 1], [2, 2, 1], [3, 4, 2], [6, 2, 1], [8, 7, 2], [10, 4, 1], [11, 5, 1], [12, 4, 2], [14, 2, 2]],
  hop: [[0, 4, 1], [1, 5, 1], [2, 4, 2], [4, 2, 2], [6, 0, 2], [8, 2, 1], [9, 4, 1], [10, 7, 4], [14, 6, 2]],
  glide: [[0, 4, 6], [6, 5, 2], [8, 4, 4], [12, 2, 4]],
  stars: [[0, 7, 2], [2, 4, 2], [4, 2, 2], [6, 4, 2], [8, 9, 4], [12, 7, 2], [14, 4, 2]],
  cadence: [[0, 4, 4], [4, 2, 4], [8, 0, 8]],
  calm: [[0, 2, 4], [4, 4, 4], [8, 5, 2], [10, 4, 2], [12, 2, 4]],
};

const SONGS = {
  // Flower Valley: sunny C major, bright and bouncy.
  meadow: {
    bpm: 152,
    root: 60,
    scale: "major",
    bars: [0, 4, 5, 3, 0, 4, 5, 3, 3, 4, 2, 5, 1, 4, 0, 0],
    melody: ["climb", "answer", "climb", "cadence", "climb", "answer", "soar", "cadence", "soar", "answer", "soar", "answer", "climb", "answer", "climb", "cadence"],
    kick: [0, 8, 10],
    snare: [4, 12],
    bass: [0, 0, 7, 0, 4, 0, 7, 4],
    stabs: [2, 6, 10, 14],
    lead: "square",
    arp: false,
  },
  // Candy Coast: F major, faster, playful.
  candy: {
    bpm: 160,
    root: 65,
    scale: "major",
    bars: [0, 5, 1, 4, 0, 5, 1, 4, 3, 0, 1, 4, 3, 4, 0, 0],
    melody: ["bounce", "hop", "bounce", "cadence", "bounce", "hop", "bounce", "cadence", "hop", "bounce", "hop", "answer", "bounce", "hop", "bounce", "cadence"],
    kick: [0, 6, 8, 14],
    snare: [4, 12],
    bass: [0, 7, 0, 7, 4, 7, 2, 4],
    stabs: [2, 6, 10, 14],
    lead: "triangle",
    arp: false,
  },
  // Stardust Way: A minor, synth arpeggios under a gliding lead.
  starlight: {
    bpm: 140,
    root: 57,
    scale: "minor",
    bars: [0, 5, 2, 6, 0, 5, 2, 6, 3, 0, 6, 4, 3, 5, 6, 6],
    melody: ["glide", "stars", "glide", "cadence", "glide", "stars", "soar", "cadence", "stars", "glide", "stars", "soar", "glide", "stars", "soar", "cadence"],
    kick: [0, 8],
    snare: [4, 12],
    bass: [0, 0, 0, 7, 0, 0, 4, 7],
    stabs: null, // pads instead
    lead: "sawtooth",
    arp: true,
  },
  // Garage theme: relaxed D major.
  menu: {
    bpm: 108,
    root: 62,
    scale: "major",
    bars: [0, 3, 5, 4, 0, 3, 1, 4],
    melody: ["calm", "glide", "calm", "cadence", "calm", "glide", "calm", "cadence"],
    kick: [0, 10],
    snare: [8],
    bass: [0, null, 4, null, 0, null, 7, null],
    stabs: null,
    lead: "triangle",
    arp: false,
    soft: true,
  },
};
const TRACK_SONGS = ["meadow", "candy", "starlight"];

export class KartAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.45;
    this.song = null;
    this.songName = "";
    this.tempo = 1;
    this.step = 0;
    this.nextStep = 0;
    this.wanted = ""; // song to start once audio is unlocked
  }
  unlock() {
    if (!this.ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      const c = (this.ctx = new A());
      this.master = c.createGain();
      // A gentle limiter keeps stacked cues from clipping on phone speakers.
      this.limiter = c.createDynamicsCompressor();
      this.limiter.threshold.value = -10;
      this.limiter.ratio.value = 6;
      this.master.connect(this.limiter);
      this.limiter.connect(c.destination);
      this.music = c.createGain();
      this.music.gain.value = 0.42;
      this.music.connect(this.master);
      this.sfx = c.createGain();
      this.sfx.connect(this.master);
      // Engine: two detuned oscillators through a low-pass filter.
      this.engineFilter = c.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 500;
      this.engineGain = c.createGain();
      this.engineGain.gain.value = 0;
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfx);
      this.engines = ["sawtooth", "square"].map((type, i) => {
        const o = c.createOscillator();
        o.type = type;
        o.detune.value = i ? -7 : 5;
        o.connect(this.engineFilter);
        o.start();
        return o;
      });
      // Drift skid: looped noise through a band-pass, faded in while drifting.
      this.skidFilter = c.createBiquadFilter();
      this.skidFilter.type = "bandpass";
      this.skidFilter.Q.value = 1.4;
      this.skidFilter.frequency.value = 1300;
      this.skidGain = c.createGain();
      this.skidGain.gain.value = 0;
      this.skid = c.createBufferSource();
      this.skid.buffer = this.noiseBuffer();
      this.skid.loop = true;
      this.skid.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.sfx);
      this.skid.start();
    }
    this.ctx.resume().catch(() => {});
    this.mix();
    if (this.wanted && this.songName !== this.wanted) this.play(this.wanted);
  }
  mix() {
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }
  noiseBuffer() {
    if (!this._noise) {
      const c = this.ctx;
      this._noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this._noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this._noise;
  }
  // --- Primitive voices ------------------------------------------------------
  tone(f = 600, d = 0.12, type = "sine", v = 0.08, end = 0, at = 0, bus = null) {
    if (!this.ctx || this.muted) return;
    const t = at || this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (end) o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(bus || this.sfx);
    o.start(t);
    o.stop(t + d + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  // Filtered white noise: whooshes, thuds, snares and hats.
  noise(duration, from, to, volume, q = 0.8, at = 0, type = "bandpass", bus = null) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      t = at || c.currentTime,
      src = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = this.noiseBuffer();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + Math.min(0.03, duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(bus || this.sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.05);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  // Several detuned oscillators through one low-pass: chord stabs and pads.
  chord(notes, at, d, type, v, cutoff, attack = 0.008) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      filter = c.createBiquadFilter(),
      g = c.createGain(),
      oscs = [];
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v, at + attack);
    g.gain.setTargetAtTime(0, at + Math.max(attack, d * 0.6), d * 0.25);
    filter.connect(g);
    g.connect(this.music);
    for (const n of notes)
      for (const det of [-6, 6]) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = midi(n);
        o.detune.value = det;
        o.connect(filter);
        o.start(at);
        o.stop(at + d + 0.4);
        oscs.push(o);
      }
    oscs[0].onended = () => {
      oscs.forEach((o) => o.disconnect());
      filter.disconnect();
      g.disconnect();
    };
  }
  // Lead voice with a little vibrato.
  lead(note, at, d, type, v) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain(),
      f = c.createBiquadFilter(),
      lfo = c.createOscillator(),
      depth = c.createGain();
    o.type = type;
    o.frequency.value = midi(note);
    lfo.frequency.value = 5.5;
    depth.gain.value = d > 0.25 ? 9 : 0;
    lfo.connect(depth);
    depth.connect(o.detune);
    f.type = "lowpass";
    f.frequency.value = type === "sawtooth" ? 2600 : 3800;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v, at + 0.012);
    g.gain.setTargetAtTime(v * 0.7, at + 0.05, 0.08);
    g.gain.setTargetAtTime(0, at + d * 0.92, 0.03);
    o.connect(f);
    f.connect(g);
    g.connect(this.music);
    o.start(at);
    lfo.start(at);
    o.stop(at + d + 0.2);
    lfo.stop(at + d + 0.2);
    o.onended = () => {
      [o, f, g, lfo, depth].forEach((n) => n.disconnect());
    };
  }
  // --- Music -----------------------------------------------------------------
  menu() {
    this.play("menu");
  }
  startRace(trackIndex) {
    this.play(TRACK_SONGS[trackIndex] || "meadow");
  }
  play(name) {
    this.wanted = name;
    this.after = null;
    this.tempo = 1;
    if (!this.ctx) return;
    this.song = SONGS[name];
    this.songName = name;
    this.step = 0;
    this.nextStep = this.ctx.currentTime + 0.12;
  }
  stopMusic() {
    this.song = null;
    this.songName = "";
    this.wanted = "";
  }
  // Final lap: a short fanfare, then the same song a notch faster.
  finalLap() {
    this.tempo = 1.12;
    this.fanfare([72, 76, 79, 84], 0.09, 0.11);
  }
  finish(rank) {
    this.song = null;
    this.songName = "";
    // Back to the garage theme under the results, after the fanfare.
    if (this.ctx) this.after = { name: "menu", at: this.ctx.currentTime + 3 };
    if (rank <= 3) this.fanfare([67, 72, 76, 79, 84, 79, 84, 88], 0.12, 0.12, true);
    else this.fanfare([67, 72, 74, 76, 72], 0.15, 0.1, true);
  }
  fanfare(notes, gap, v, chordEnd = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.03;
    notes.forEach((n, i) => {
      this.lead(n, t + i * gap, i === notes.length - 1 ? 0.7 : gap * 1.6, "square", v);
      this.tone(midi(n - 12), gap * 1.4, "triangle", v * 0.6, 0, t + i * gap, this.music);
    });
    if (chordEnd) {
      const end = notes[notes.length - 1];
      this.chord([end - 12, end - 8, end - 5], t + (notes.length - 1) * gap, 1.2, "sawtooth", 0.06, 2400);
    }
  }
  noteOf(degree, octave = 0) {
    const s = SCALES[this.song.scale],
      o = Math.floor(degree / 7),
      i = ((degree % 7) + 7) % 7;
    return this.song.root + 12 * (o + octave) + s[i];
  }
  // Schedule one 16th step of the current song at time `at`.
  playStep(at, len) {
    const s = this.song,
      bar = Math.floor(this.step / 16) % s.bars.length,
      step = this.step % 16,
      root = s.bars[bar],
      soft = s.soft ? 0.6 : 1;
    // Drums.
    if (s.kick.includes(step)) this.tone(150, 0.22, "sine", 0.55 * soft, 42, at, this.music);
    if (s.snare.includes(step)) {
      this.noise(0.14, 1900, 1500, 0.22 * soft, 0.7, at, "bandpass", this.music);
      this.tone(210, 0.07, "triangle", 0.12 * soft, 150, at, this.music);
    }
    if (step % 2 === 0 && !s.soft) this.noise(0.035, 8000, 8000, step % 4 === 2 ? 0.07 : 0.035, 0.6, at, "highpass", this.music);
    if (step === 14 && bar % 2 === 1 && !s.soft) this.noise(0.16, 7000, 7000, 0.05, 0.6, at, "highpass", this.music);
    // Bass on 8ths.
    if (step % 2 === 0) {
      const b = s.bass[step / 2];
      if (b !== null && b !== undefined) this.tone(midi(this.noteOf(root + b, -2)), len * 1.7, "square", 0.075 * soft, 0, at, this.music);
    }
    // Harmony: offbeat stabs, or a pad held over the bar.
    const triad = [0, 2, 4].map((d) => this.noteOf(root + d, -1));
    if (s.stabs?.includes(step)) this.chord(triad, at, len * 1.2, "sawtooth", 0.035, 2200);
    if (!s.stabs && step === 0) this.chord(triad, at, len * 15, "triangle", s.soft ? 0.05 : 0.04, 1400, 0.25);
    if (s.arp && step % 1 === 0) {
      const arp = [0, 2, 4, 7][step % 4];
      this.tone(midi(this.noteOf(root + arp, 1)), len * 0.9, "triangle", 0.03, 0, at, this.music);
    }
    // Lead melody.
    const motif = MOTIF[s.melody[bar % s.melody.length]];
    for (const [st, deg, l] of motif)
      if (st === step) this.lead(this.noteOf(root + deg, s.scale === "minor" ? 1 : 0), at, l * len, s.lead, (s.soft ? 0.05 : 0.065) * (s.lead === "sawtooth" ? 0.8 : 1));
  }
  // --- Effects ----------------------------------------------------------------
  cue(type, e = {}) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    switch (type) {
      case "boost":
        this.noise(0.6, 500, 3000, 0.24, 0.7);
        this.tone(95, 0.35, "sine", 0.14, 48);
        this.tone(330, 0.3, "sawtooth", 0.035, 990);
        return;
      case "pop":
        this.noise(0.22, 1400, 220, 0.18, 0.9);
        this.tone(220, 0.16, "triangle", 0.08, 90);
        return;
      case "zap":
        this.noise(0.4, 4200, 700, 0.14, 0.6);
        this.tone(1400, 0.3, "sawtooth", 0.035, 180);
        return;
      case "score":
        this.tone(784, 0.12, "triangle", 0.1);
        this.tone(1175, 0.18, "triangle", 0.08, 0, now + 0.08);
        return;
      case "pass":
        this.tone(988, 0.08, "square", 0.05);
        this.tone(1319, 0.14, "square", 0.05, 0, now + 0.07);
        return;
      case "bump":
        this.noise(0.14, 900, 180, 0.16, 1.2);
        this.tone(150, 0.12, "sine", 0.1, 60);
        return;
      case "wall":
        this.noise(0.2, 700, 120, 0.2, 1);
        this.tone(110, 0.16, "sine", 0.12, 50);
        return;
      case "coin":
        this.tone(988, 0.08, "square", 0.045);
        this.tone(1319, 0.16, "square", 0.04, 0, now + 0.06);
        return;
      case "hit":
        // Spin-out: a falling warble.
        for (let i = 0; i < 4; i++) this.tone(520 - i * 90, 0.12, "triangle", 0.08, 300 - i * 60, now + i * 0.09);
        this.noise(0.3, 1200, 300, 0.12, 0.8);
        return;
      case "block":
        this.tone(660, 0.3, "sine", 0.1, 1320);
        this.tone(990, 0.3, "sine", 0.05, 1980, now + 0.04);
        return;
      case "tick":
        this.tone(660, 0.14, "square", 0.07);
        return;
      case "go":
        this.tone(1320, 0.5, "square", 0.08);
        this.tone(660, 0.5, "square", 0.05);
        return;
      case "driftStart":
        // Hop "hup" plus a short tyre chirp.
        this.tone(260, 0.07, "sine", 0.08, 520);
        this.noise(0.12, 2200, 1300, 0.08, 1.2);
        return;
      case "driftLevel": {
        const f = [0, 880, 1175, 1568][e.level] || 880;
        this.tone(f, 0.12, "triangle", 0.09);
        this.tone(f * 1.5, 0.18, "sine", 0.05, 0, now + 0.05);
        return;
      }
      case "drift":
        this.tone([0, 523, 659, 784][e.level] || 523, 0.1, "square", 0.05, 0);
        return;
      case "rocketStart":
        this.noise(0.8, 400, 3600, 0.26, 0.6);
        this.tone(220, 0.5, "sawtooth", 0.05, 880);
        return;
      case "startEarly":
        this.tone(180, 0.35, "sawtooth", 0.05, 70);
        return;
      case "pickup":
        this.noise(0.16, 3200, 1800, 0.1, 1.2); // the box shattering
        // Item roulette: quick ticks, then a bright "ding" as it lands.
        for (let i = 0; i < 6; i++) this.tone(1200 + (i % 2) * 300, 0.04, "square", 0.03, 0, now + i * 0.1);
        this.tone(1568, 0.2, "triangle", 0.08, 0, now + 0.7);
        return;
      case "item": {
        const item = e.item;
        if (item === "rocket") {
          this.noise(1.2, 300, 2400, 0.3, 0.5);
          this.tone(110, 0.8, "sawtooth", 0.07, 330);
        } else if (item === "star") {
          for (let i = 0; i < 6; i++) this.tone(1047 * 2 ** (i / 6), 0.1, "triangle", 0.06, 0, now + i * 0.05);
        } else if (item === "banana") this.tone(330, 0.15, "sine", 0.1, 160);
        else if (item === "shield") this.tone(440, 0.35, "sine", 0.09, 880);
        else if (item === "shell") this.noise(0.3, 900, 2600, 0.14, 0.9);
        else this.tone(330, 0.25, "triangle", 0.1, 800);
        return;
      }
      case "special": {
        // Cut-in sting: a rising arpeggio plus a whoosh, then the move's own
        // sound.
        [72, 76, 79, 84].forEach((n, i) => this.lead(n, now + i * 0.05, 0.16, "square", 0.06));
        this.noise(0.5, 600, 3200, 0.18, 0.7);
        if (e.kind === "mario") for (let i = 0; i < 3; i++) this.noise(0.25, 2400, 600, 0.12, 0.8, now + 0.25 + i * 0.08);
        if (e.kind === "nova") this.tone(1760, 0.6, "sine", 0.05, 220, now + 0.2);
        if (e.kind === "bunny") this.tone(300, 0.35, "sine", 0.1, 900, now + 0.15);
        if (e.kind === "bear") this.tone(90, 0.5, "sawtooth", 0.08, 60, now + 0.15);
        if (e.kind === "milo") this.tone(520, 0.4, "sine", 0.08, 1040, now + 0.15);
        return;
      }
      case "specialFar":
        this.tone(880, 0.12, "triangle", 0.05);
        this.tone(1175, 0.16, "triangle", 0.04, 0, now + 0.08);
        return;
      case "specialReady":
        [76, 83, 88].forEach((n, i) => this.tone(midi(n), 0.14, "triangle", 0.07, 0, now + i * 0.07));
        return;
      case "meteor":
        this.noise(0.6, 1800, 120, 0.3, 0.7);
        this.tone(120, 0.5, "sine", 0.18, 40);
        return;
      case "boxBreak":
        this.noise(0.18, 3000, 1500, 0.1, 1.2);
        return;
      case "dash":
        this.noise(0.35, 700, 2800, 0.16, 0.7);
        return;
      case "finish":
        return; // see finish(rank)
      case "lap":
        if (e.lap !== 3) this.fanfare([72, 76, 79], 0.08, 0.07);
        return;
      case "pad":
        return; // the boost cue covers it
      case "rescue":
        this.tone(400, 0.3, "sine", 0.06, 800);
        return;
      case "tap":
        this.tone(760, 0.06, "sine", 0.05);
        return;
      default:
        this.tone(760, 0.06, "sine", 0.04);
    }
  }
  // Per frame: engine pitch, skid, and the music scheduler.
  update(speed, active, state = {}) {
    if (!this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      boost = !!state.boost,
      f = 48 + speed * 2.3 + (boost ? 18 : 0);
    for (const o of this.engines) o.frequency.setTargetAtTime(f, t, 0.12);
    this.engineFilter.frequency.setTargetAtTime(380 + speed * 22 + (boost ? 900 : 0), t, 0.12);
    this.engineGain.gain.setTargetAtTime(active ? (boost ? 0.03 : 0.018) : 0, t, 0.15);
    const level = state.drift ?? -1;
    this.skidGain.gain.setTargetAtTime(active && level >= 0 ? 0.035 + level * 0.008 : 0, t, 0.05);
    this.skidFilter.frequency.setTargetAtTime(1100 + Math.max(0, level) * 350, t, 0.08);
    this.music.gain.setTargetAtTime(state.paused ? 0.12 : 0.42, t, 0.12);
    if (!this.song && this.after && t > this.after.at) this.play(this.after.name);
    if (!this.song || this.muted) return;
    const len = 60 / (this.song.bpm * this.tempo) / 4;
    if (this.nextStep < t - 0.3) this.nextStep = t + 0.05; // resumed after a stall
    while (this.nextStep < t + 0.18) {
      this.playStep(this.nextStep, len);
      this.nextStep += len;
      this.step++;
    }
  }
}
