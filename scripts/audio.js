// Synthesised game-show sound effects for the wheel. No asset files: everything is built with WebAudio.
// Every method is a safe no-op when WebAudio is unavailable, the instance is disabled, or it has been disposed.

/** One AudioContext shared by every wheel, created lazily (browsers cap how many may exist). */
let sharedContext = null;

/** Cached one-second white noise buffers, per context. */
const noiseBuffers = new WeakMap();

function getContext() {
  if ( sharedContext && (sharedContext.state !== "closed") ) return sharedContext;
  const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if ( typeof Ctor !== "function" ) return null;
  try {
    sharedContext = new Ctor();
  } catch(err) {
    sharedContext = null;
  }
  return sharedContext;
}

function noiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if ( buffer ) return buffer;
  const length = Math.floor(ctx.sampleRate);
  buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for ( let i = 0; i < length; i++ ) data[i] = (Math.random() * 2) - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

const clamp01 = v => Math.min(Math.max(Number(v) || 0, 0), 1);
const now = () => ((typeof performance !== "undefined") ? performance.now() : Date.now());

/** Minimum gap between tick sounds, so a fast spin purrs instead of machine-gunning. */
const TICK_GAP_MS = 42;

/**
 * Sound board for one wheel window.
 */
export class WheelAudio {
  /**
   * @param {object} [options]
   * @param {boolean} [options.enabled=true]  Play anything at all?
   * @param {number} [options.volume=0.5]     Master volume, 0–1.
   */
  constructor({enabled = true, volume = 0.5} = {}) {
    this.enabled = !!enabled;
    this.volume = clamp01(volume);
    this.muted = false;
    this._ctx = null;
    this._master = null;
    this._drum = null;
    this._voices = new Set();
    this._lastTick = -Infinity;
    this._disposed = false;
  }

  /* -------------------------------------------- */

  /** Lazily build the output chain. Returns the running context, or null when nothing should play. */
  _ready() {
    if ( this._disposed || !this.enabled || this.muted || (this.volume <= 0) ) return null;
    try {
      if ( !this._ctx ) {
        const ctx = getContext();
        if ( !ctx ) return null;
        const master = ctx.createGain();
        master.gain.value = this.volume;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        master.connect(comp);
        comp.connect(ctx.destination);
        this._ctx = ctx;
        this._master = master;
        this._comp = comp;
      }
      if ( this._ctx.state === "suspended" ) this._ctx.resume().catch(() => {});
      // A suspended context would queue sounds and blurt them all out later. Skip until it runs.
      if ( this._ctx.state !== "running" ) return null;
      return this._ctx;
    } catch(err) {
      return null;
    }
  }

  /** Remember a source so dispose() can silence it. */
  _track(source) {
    this._voices.add(source);
    source.onended = () => {
      this._voices.delete(source);
      try {
        source.disconnect();
      } catch(err) { /* already gone */ }
    };
    return source;
  }

  /** Run a sound builder, swallowing any WebAudio error. */
  _play(build) {
    const ctx = this._ready();
    if ( !ctx ) return;
    try {
      build(ctx, ctx.currentTime + 0.01, this._master);
    } catch(err) {
      console.debug("magic-wheel | audio error", err);
    }
  }

  /** A gain node with an attack/decay envelope. */
  _env(ctx, t, {peak = 0.5, attack = 0.005, hold = 0, decay = 0.2, out}) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    if ( hold > 0 ) g.gain.setValueAtTime(Math.max(peak, 0.0002), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
    g.connect(out);
    return g;
  }

  /** An oscillator playing into `out` between t0 and t1. */
  _osc(ctx, type, freq, t0, t1, out) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.connect(out);
    o.start(t0);
    o.stop(t1);
    return this._track(o);
  }

  /** A burst of noise playing into `out` between t0 and t1. */
  _noise(ctx, t0, t1, out, {loop = false} = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = loop || ((t1 - t0) > 0.45);
    src.connect(out);
    src.start(t0, src.loop ? 0 : Math.random() * 0.5);
    src.stop(t1);
    return this._track(src);
  }

  _filter(ctx, type, freq, q, out) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(out);
    return f;
  }

  /* -------------------------------------------- */
  /*  Public API                                  */
  /* -------------------------------------------- */

  /** Create (or wake) the audio context ahead of the first sound, so the opening whoosh isn't lost. */
  warmup() {
    this._ready();
  }

  /** Change the master volume (0–1). */
  setVolume(volume) {
    this.volume = clamp01(volume);
    try {
      if ( this._master ) this._master.gain.setTargetAtTime(this.volume, this._ctx.currentTime, 0.02);
    } catch(err) { /* ignore */ }
  }

  /** Mute or unmute this wheel without forgetting the volume. */
  setMuted(muted) {
    this.muted = !!muted;
    if ( this.muted ) this.stopDrumroll();
    try {
      if ( this._master ) this._master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this._ctx.currentTime, 0.02);
    } catch(err) { /* ignore */ }
  }

  /** A flapper click as a peg passes the pointer. Rate-limited. */
  tick() {
    const t = now();
    if ( (t - this._lastTick) < TICK_GAP_MS ) return;
    this._lastTick = t;
    this._play((ctx, t0, out) => {
      const click = this._env(ctx, t0, {peak: 0.55, attack: 0.001, decay: 0.028, out});
      const bp = this._filter(ctx, "bandpass", 2400 + (Math.random() * 1400), 1.4, click);
      this._noise(ctx, t0, t0 + 0.05, bp);
      const body = this._env(ctx, t0, {peak: 0.22, attack: 0.001, decay: 0.04, out});
      const o = this._osc(ctx, "triangle", 1500, t0, t0 + 0.06, body);
      o.frequency.exponentialRampToValueAtTime(520, t0 + 0.04);
    });
  }

  /** The big release at the start of the spin. */
  whoosh() {
    this._play((ctx, t0, out) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.18);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      g.connect(out);
      const bp = this._filter(ctx, "bandpass", 300, 0.9, g);
      bp.frequency.setValueAtTime(260, t0);
      bp.frequency.exponentialRampToValueAtTime(2200, t0 + 0.3);
      bp.frequency.exponentialRampToValueAtTime(380, t0 + 1.1);
      this._noise(ctx, t0, t0 + 1.15, bp);
      // A low swoop underneath for weight.
      const sub = this._env(ctx, t0, {peak: 0.35, attack: 0.03, decay: 0.6, out});
      const o = this._osc(ctx, "sine", 140, t0, t0 + 0.7, sub);
      o.frequency.exponentialRampToValueAtTime(48, t0 + 0.65);
    });
  }

  /**
   * A snare-ish drumroll that builds for `ms` milliseconds (or until stopDrumroll).
   * @param {number} ms
   */
  drumroll(ms) {
    this.stopDrumroll();
    this._play((ctx, t0, out) => {
      const dur = Math.min(Math.max((Number(ms) || 0) / 1000, 0.2), 20);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.connect(out);
      const hp = this._filter(ctx, "highpass", 900, 0.7, gain);
      const peak = this._filter(ctx, "peaking", 3200, 1.2, hp);
      peak.gain.value = 5;
      const src = this._noise(ctx, t0, t0 + dur + 0.3, peak, {loop: true});
      // Individual stick hits, accelerating and swelling.
      let t = 0;
      let i = 0;
      while ( t < dur ) {
        const p = t / dur;
        const amp = (0.07 + (0.33 * Math.pow(p, 1.4))) * ((i % 2) ? 0.82 : 1);
        const at = t0 + t;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.linearRampToValueAtTime(amp, at + 0.003);
        gain.gain.exponentialRampToValueAtTime(Math.max(amp * 0.12, 0.0002), at + 0.034);
        t += (1 / (16 + (14 * p))) * (0.92 + (Math.random() * 0.16));
        i++;
      }
      this._drum = {src, gain};
    });
  }

  /**
   * Cut the drumroll short.
   * @param {object} [options]
   * @param {boolean} [options.crash=false]  Finish with a cymbal crash (used for the fake-out "landing").
   */
  stopDrumroll({crash = false} = {}) {
    const drum = this._drum;
    this._drum = null;
    if ( drum && this._ctx ) {
      try {
        const t = this._ctx.currentTime;
        drum.gain.gain.cancelScheduledValues(t);
        drum.gain.gain.setValueAtTime(drum.gain.gain.value, t);
        drum.gain.gain.setTargetAtTime(0.0001, t, 0.03);
        drum.src.stop(t + 0.25);
      } catch(err) { /* already stopped */ }
    }
    if ( crash ) this._play((ctx, t0, out) => this._crash(ctx, t0, out, 0.35));
  }

  /** Cymbal crash: bright noise with a long tail. */
  _crash(ctx, t0, out, peak = 0.4, decay = 1.3) {
    const g = this._env(ctx, t0, {peak, attack: 0.002, decay, out});
    const hp = this._filter(ctx, "highpass", 5200, 0.6, g);
    this._noise(ctx, t0, t0 + decay + 0.1, hp, {loop: true});
  }

  /** A record scratch, for when the wheel changes its mind. */
  scratch() {
    this._play((ctx, t0, out) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.setValueAtTime(0.5, t0 + 0.14);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.16);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      g.connect(out);
      const bp = this._filter(ctx, "bandpass", 800, 4, g);
      bp.frequency.setValueAtTime(500, t0);
      bp.frequency.exponentialRampToValueAtTime(2600, t0 + 0.14);
      bp.frequency.exponentialRampToValueAtTime(700, t0 + 0.2);
      bp.frequency.exponentialRampToValueAtTime(3000, t0 + 0.4);
      this._noise(ctx, t0, t0 + 0.45, bp);
      const o = this._osc(ctx, "sawtooth", 180, t0, t0 + 0.42, this._env(ctx, t0, {peak: 0.12, attack: 0.01, decay: 0.4, out}));
      o.frequency.exponentialRampToValueAtTime(720, t0 + 0.14);
      o.frequency.exponentialRampToValueAtTime(200, t0 + 0.2);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 0.4);
    });
  }

  /** A sparkly two-note chime for achievements. */
  chime() {
    this._play((ctx, t0, out) => {
      [[1318.5, 0], [1975.5, 0.11], [2637, 0.22]].forEach(([f, dt]) => {
        const g = this._env(ctx, t0 + dt, {peak: 0.22, attack: 0.004, decay: 0.7, out});
        this._osc(ctx, "sine", f, t0 + dt, t0 + dt + 0.8, g);
        const g2 = this._env(ctx, t0 + dt, {peak: 0.06, attack: 0.004, decay: 0.35, out});
        this._osc(ctx, "triangle", f * 2, t0 + dt, t0 + dt + 0.4, g2);
      });
    });
  }

  /**
   * The landing stinger.
   * @param {string} tone  "good" | "bad" | "weird" | "chaos" (anything else gets a neutral ding).
   */
  land(tone) {
    this.stopDrumroll();
    this._play((ctx, t0, out) => {
      switch ( tone ) {
        case "good": return this._fanfare(ctx, t0, out);
        case "bad": return this._sadTrombone(ctx, t0, out);
        case "weird": return this._boing(ctx, t0, out);
        case "chaos": return this._alarm(ctx, t0, out);
        default: return this._ding(ctx, t0, out);
      }
    });
  }

  /** Bright brassy arpeggio into a held chord. */
  _fanfare(ctx, t0, out) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const lp = this._filter(ctx, "lowpass", 3800, 0.7, out);
    notes.forEach((f, i) => {
      const t = t0 + (i * 0.085);
      const g = this._env(ctx, t, {peak: 0.16, attack: 0.008, decay: 0.16, out: lp});
      this._osc(ctx, "square", f, t, t + 0.2, g);
      this._osc(ctx, "sawtooth", f * 1.003, t, t + 0.2, g);
    });
    const tc = t0 + (notes.length * 0.085) + 0.02;
    for ( const f of [523.25, 659.25, 783.99, 1046.5] ) {
      const g = this._env(ctx, tc, {peak: 0.09, attack: 0.02, hold: 0.45, decay: 0.6, out: lp});
      const o = this._osc(ctx, "sawtooth", f, tc, tc + 1.15, g);
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.value = f * 0.006;
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(tc + 0.15);
      lfo.stop(tc + 1.15);
      this._track(lfo);
    }
    this._crash(ctx, tc, out, 0.18, 1.4);
  }

  /** Wah-wah-wah-waaah. */
  _sadTrombone(ctx, t0, out) {
    const notes = [[311.13, 0.36], [293.66, 0.36], [277.18, 0.36], [261.63, 1.25]];
    let t = t0;
    notes.forEach(([f, d], i) => {
      const last = i === notes.length - 1;
      const g = this._env(ctx, t, {peak: 0.3, attack: 0.03, hold: d - 0.12, decay: last ? 0.35 : 0.08, out});
      const wah = this._filter(ctx, "lowpass", 400, 7, g);
      wah.frequency.setValueAtTime(380, t);
      wah.frequency.exponentialRampToValueAtTime(1500, t + 0.09);
      wah.frequency.exponentialRampToValueAtTime(520, t + d);
      const o = this._osc(ctx, "sawtooth", f, t, t + d + 0.4, wah);
      o.frequency.setValueAtTime(f, t + (d * 0.7));
      o.frequency.exponentialRampToValueAtTime(f * 0.97, t + d);
      if ( last ) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = 5.2;
        depth.gain.value = 7;
        lfo.connect(depth);
        depth.connect(o.frequency);
        lfo.start(t + 0.25);
        lfo.stop(t + d + 0.4);
        this._track(lfo);
      }
      t += d;
    });
  }

  /** A spring boing, then a kazoo warble. */
  _boing(ctx, t0, out) {
    const g = this._env(ctx, t0, {peak: 0.35, attack: 0.005, decay: 0.75, out});
    const o = this._osc(ctx, "triangle", 160, t0, t0 + 0.8, g);
    o.frequency.exponentialRampToValueAtTime(420, t0 + 0.06);
    o.frequency.exponentialRampToValueAtTime(300, t0 + 0.75);
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 16;
    depth.gain.setValueAtTime(140, t0);
    depth.gain.exponentialRampToValueAtTime(2, t0 + 0.75);
    lfo.connect(depth);
    depth.connect(o.frequency);
    lfo.start(t0);
    lfo.stop(t0 + 0.8);
    this._track(lfo);

    const kazoo = [[392, 0.18], [349.23, 0.18], [523.25, 0.5]];
    let t = t0 + 0.55;
    for ( const [f, d] of kazoo ) {
      const kg = this._env(ctx, t, {peak: 0.2, attack: 0.02, hold: d - 0.06, decay: 0.08, out});
      const bp = this._filter(ctx, "bandpass", 1100, 3, kg);
      const k = this._osc(ctx, "sawtooth", f, t, t + d + 0.1, bp);
      const vib = ctx.createOscillator();
      const vd = ctx.createGain();
      vib.frequency.value = 7;
      vd.gain.value = f * 0.025;
      vib.connect(vd);
      vd.connect(k.frequency);
      vib.start(t);
      vib.stop(t + d + 0.1);
      this._track(vib);
      t += d;
    }
  }

  /** A rising and falling siren over a low boom. */
  _alarm(ctx, t0, out) {
    const boom = this._env(ctx, t0, {peak: 0.5, attack: 0.005, decay: 0.7, out});
    const b = this._osc(ctx, "sine", 110, t0, t0 + 0.75, boom);
    b.frequency.exponentialRampToValueAtTime(34, t0 + 0.6);
    const g = this._env(ctx, t0, {peak: 0.14, attack: 0.05, hold: 1.5, decay: 0.3, out});
    const lp = this._filter(ctx, "lowpass", 2600, 0.8, g);
    for ( const detune of [0, 7] ) {
      const o = this._osc(ctx, "sawtooth", 560, t0, t0 + 1.9, lp);
      o.detune.value = detune;
      for ( let c = 0; c < 3; c++ ) {
        const tc = t0 + (c * 0.6);
        o.frequency.setValueAtTime(560, tc);
        o.frequency.linearRampToValueAtTime(1120, tc + 0.3);
        o.frequency.linearRampToValueAtTime(560, tc + 0.6);
      }
    }
  }

  /** Neutral ding-dong for tables without a tone. */
  _ding(ctx, t0, out) {
    [[987.77, 0], [783.99, 0.22]].forEach(([f, dt]) => {
      const g = this._env(ctx, t0 + dt, {peak: 0.3, attack: 0.004, decay: 0.9, out});
      this._osc(ctx, "sine", f, t0 + dt, t0 + dt + 1, g);
    });
  }

  /** Stop everything and release the output chain. Further calls do nothing. */
  dispose() {
    if ( this._disposed ) return;
    this.stopDrumroll();
    this._disposed = true;
    for ( const source of this._voices ) {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch(err) { /* already stopped */ }
    }
    this._voices.clear();
    try {
      if ( this._master ) {
        this._master.disconnect();
        this._comp?.disconnect();
      }
    } catch(err) { /* ignore */ }
    this._master = null;
    this._comp = null;
    this._ctx = null;
  }
}
