// Geometry and choreography for the prize wheel.
// Pure and deterministic given an rng: no Foundry globals, safe to unit test under plain Node.
//
// Angles are degrees, 0 = 12 o'clock, increasing clockwise. The pointer is fixed at the top.
// Rotating the wheel clockwise by R puts the wheel angle (360 - (R mod 360)) mod 360 under the pointer,
// so as the wheel turns clockwise the pointer walks through the slices in DECREASING index order.

/** Number of slice colours the UI palette provides. */
export const PALETTE_SIZE = 8;

/** Chance of a fake-out when fake-outs are enabled. */
export const FAKE_OUT_CHANCE = 0.35;

/** Shortest spin we will plan, whatever the caller asks for. */
const MIN_DURATION_MS = 1500;

/**
 * Named easing functions used by spin phases. Plans store the name, so they stay plain JSON.
 * Every function maps 0 → 0 and 1 → 1.
 * @type {Readonly<Record<string, (t: number) => number>>}
 */
export const EASINGS = Object.freeze({
  linear: t => t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - (Math.pow((-2 * t) + 2, 2) / 2)),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - (Math.pow((-2 * t) + 2, 3) / 2)),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuart: t => 1 - Math.pow(1 - t, 4),
  // The main spin: a fast release that bleeds speed hard, so the last few slices crawl past the pointer.
  spinOut: t => 1 - Math.pow(1 - t, 3.2)
});

/** Positive modulo 360. */
const mod360 = x => {
  const m = ((x % 360) + 360) % 360;
  return m >= 360 ? 0 : m;
};

/** Round to 4 decimals so plans serialise tidily. */
const round4 = x => Math.round(x * 1e4) / 1e4;

/**
 * The wheel angle sitting under the (top) pointer for a given clockwise rotation.
 * @param {number} rotation   Wheel rotation in degrees.
 * @returns {number}          Wheel angle in [0, 360).
 */
export function pointerAngle(rotation) {
  return mod360(-Number(rotation || 0));
}

/**
 * Lay out wheel slices for a set of table results.
 * Slice size is proportional to the number of faces the result covers (hi - lo + 1).
 * @param {Array<{id: string, lo: number, hi: number, label: string, tone: string}>} entries
 * @param {object} [options]
 * @param {number} [options.colors=PALETTE_SIZE]  Size of the colour palette to cycle through.
 * @returns {Array<{id: string, lo: number, hi: number, label: string, tone: string,
 *   start: number, end: number, mid: number, colorIndex: number}>}  Sorted by lo; angles in degrees.
 */
export function buildSegments(entries, {colors = PALETTE_SIZE} = {}) {
  if ( !Array.isArray(entries) || !entries.length ) return [];
  const list = entries.map(e => {
    const lo = Number(e?.lo);
    const hi = Number(e?.hi);
    return {
      id: String(e?.id ?? ""),
      lo: Number.isFinite(lo) ? lo : 0,
      hi: Number.isFinite(hi) ? hi : (Number.isFinite(lo) ? lo : 0),
      label: String(e?.label ?? ""),
      tone: String(e?.tone ?? "weird")
    };
  }).sort((a, b) => (a.lo - b.lo) || (a.hi - b.hi));

  const weights = list.map(e => Math.max(1, (e.hi - e.lo) + 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const k = Math.max(1, Math.floor(Number(colors) || PALETTE_SIZE));
  const n = list.length;

  let cumulative = 0;
  let prevEnd = 0;
  const segments = list.map((entry, i) => {
    cumulative += weights[i];
    const start = prevEnd;
    const end = (i === n - 1) ? 360 : (cumulative / total) * 360;
    prevEnd = end;
    return {...entry, start, end, mid: (start + end) / 2, colorIndex: i % k};
  });

  // The wheel is a loop: the last slice also touches the first. Repaint it if it clashes with either neighbour.
  if ( n >= 2 ) {
    const last = segments[n - 1];
    const avoid = new Set([segments[0].colorIndex, segments[n - 2].colorIndex]);
    if ( avoid.has(last.colorIndex) ) {
      for ( let c = 0; c < k; c++ ) {
        if ( !avoid.has(c) ) {
          last.colorIndex = c;
          break;
        }
      }
    }
  }
  return segments;
}

/**
 * Index of the slice under the pointer at a given rotation.
 * @param {Array<{start: number, end: number}>} segments  From buildSegments.
 * @param {number} rotation                               Wheel rotation in degrees.
 * @returns {number}  Segment index, or -1 when there are no segments.
 */
export function segmentIndexAt(segments, rotation) {
  if ( !Array.isArray(segments) || !segments.length ) return -1;
  const a = pointerAngle(rotation);
  let lo = 0;
  let hi = segments.length - 1;
  // Binary search: segments are sorted and contiguous.
  while ( lo <= hi ) {
    const m = (lo + hi) >> 1;
    const s = segments[m];
    if ( a < s.start ) hi = m - 1;
    else if ( a >= s.end ) lo = m + 1;
    else return m;
  }
  return Math.min(Math.max(lo, 0), segments.length - 1);
}

/**
 * Choreograph a spin that lands on a chosen slice.
 * @param {object} options
 * @param {Array<{start: number, end: number}>} options.segments  From buildSegments.
 * @param {number} options.targetIndex       Slice the wheel must finish on.
 * @param {number} [options.durationMs=8000] Length of the wind-up + main spin (fake-outs add ~1.5–2.5 s).
 * @param {boolean} [options.fakeOut=true]   Allow a fake-out ending (chosen with probability FAKE_OUT_CHANCE).
 * @param {() => number} [options.rng=Math.random]  Source of randomness in [0, 1).
 * @returns {{startRotation: number, finalRotation: number, totalMs: number,
 *   phases: Array<{t0: number, t1: number, from: number, to: number, ease: string}>,
 *   fakeOut: null|"creep"|"rollback", events: Array<{t: number, type: string}>}}  A plain-JSON SpinPlan.
 */
export function planSpin({segments, targetIndex, durationMs = 8000, fakeOut = true, rng = Math.random} = {}) {
  const n = Array.isArray(segments) ? segments.length : 0;
  const rand = (typeof rng === "function") ? rng : Math.random;
  const r = () => {
    const v = Number(rand());
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 0.999999) : 0.5;
  };
  const duration = Math.max(MIN_DURATION_MS, Math.round(Number(durationMs) || 8000));

  // Degenerate wheel: nothing to land on, just hold still.
  if ( !n ) {
    return {
      startRotation: 0, finalRotation: 0, totalMs: duration,
      phases: [{t0: 0, t1: duration, from: 0, to: 0, ease: "linear"}],
      fakeOut: null,
      events: [{t: 0, type: "start"}, {t: duration, type: "land"}]
    };
  }

  let target = Math.round(Number(targetIndex));
  if ( !Number.isFinite(target) ) target = 0;
  target = Math.min(Math.max(target, 0), n - 1);
  const seg = segments[target];
  const width = seg.end - seg.start;

  const startRotation = round4(r() * 360);
  const mode = (fakeOut && (n >= 2) && (r() < FAKE_OUT_CHANCE)) ? ((r() < 0.5) ? "creep" : "rollback") : null;

  // Pick where the main spin stops (aMain) and where the wheel finally rests (aFinal), as wheel angles.
  let aMain;
  let aFinal;
  if ( mode === "creep" ) {
    // Stop just short: inside the slice the pointer visits right before the target (index + 1), near the shared edge.
    const decoy = segments[(target + 1) % n];
    const dw = decoy.end - decoy.start;
    const e = Math.min(dw * (0.08 + (0.17 * r())), Math.max(6, dw * 0.04));
    const f = Math.min(width * (0.18 + (0.22 * r())), Math.max(12, width * 0.15));
    aMain = decoy.start + e;
    aFinal = seg.end - f;
  }
  else if ( mode === "rollback" ) {
    // Overshoot: into the slice the pointer visits right after the target (index - 1), then roll back.
    const decoy = segments[(target - 1 + n) % n];
    const dw = decoy.end - decoy.start;
    const e = Math.min(dw * (0.08 + (0.17 * r())), Math.max(6, dw * 0.04));
    const f = Math.min(width * (0.18 + (0.22 * r())), Math.max(12, width * 0.15));
    aMain = decoy.end - e;
    aFinal = seg.start + f;
  }
  else {
    aFinal = seg.start + (width * (0.15 + (0.7 * r())));
    aMain = aFinal;
  }

  // Main spin: 5–8 full turns plus whatever offset reaches aMain, after a short wind-up tug backwards.
  const turns = 5 + Math.floor(r() * 4);
  const back = round4(5 + (r() * 7));
  const mainRotation = round4(startRotation + (turns * 360) + mod360(-aMain - startRotation));
  let finalRotation = mainRotation;
  if ( mode === "creep" ) finalRotation = round4(mainRotation + mod360(aMain - aFinal));
  else if ( mode === "rollback" ) finalRotation = round4(mainRotation - mod360(aFinal - aMain));

  const windupMs = Math.round(Math.min(400, duration * 0.05));
  const phases = [
    {t0: 0, t1: windupMs, from: startRotation, to: round4(startRotation - back), ease: "inOutSine"},
    {t0: windupMs, t1: duration, from: round4(startRotation - back), to: mainRotation, ease: "spinOut"}
  ];
  const events = [
    {t: 0, type: "start"},
    {t: windupMs + Math.round((duration - windupMs) * 0.55), type: "slowing"}
  ];

  let totalMs = duration;
  if ( mode ) {
    const pauseMs = Math.round(600 + (r() * 250));
    const moveMs = Math.round(950 + (r() * 600));
    const moveStart = duration + pauseMs;
    totalMs = moveStart + moveMs;
    phases.push({t0: duration, t1: moveStart, from: mainRotation, to: mainRotation, ease: "linear"});
    phases.push({t0: moveStart, t1: totalMs, from: mainRotation, to: finalRotation,
      ease: (mode === "creep") ? "inOutSine" : "inOutCubic"});
    events.push({t: moveStart, type: "fakeout"});
  }
  events.push({t: totalMs, type: "land"});

  return {startRotation, finalRotation, totalMs, phases, fakeOut: mode, events};
}

/**
 * The wheel rotation at a moment of a planned spin.
 * @param {object} plan   A SpinPlan from planSpin.
 * @param {number} tMs    Milliseconds since the spin started; clamped to [0, plan.totalMs].
 * @returns {number}      Rotation in degrees (exactly startRotation at 0 and finalRotation at totalMs).
 */
export function rotationAt(plan, tMs) {
  const phases = plan?.phases;
  if ( !Array.isArray(phases) || !phases.length ) return Number(plan?.finalRotation) || 0;
  const first = phases[0];
  const last = phases[phases.length - 1];
  const total = Number.isFinite(plan.totalMs) ? plan.totalMs : last.t1;
  const t = Number(tMs);
  if ( !Number.isFinite(t) || (t <= 0) ) return plan.startRotation ?? first.from;
  if ( t >= total ) return plan.finalRotation ?? last.to;
  for ( const phase of phases ) {
    if ( (t >= phase.t1) && (phase !== last) ) continue;
    const span = phase.t1 - phase.t0;
    const p = (span > 0) ? (t - phase.t0) / span : 1;
    if ( p <= 0 ) return phase.from;
    if ( p >= 1 ) return phase.to;
    const ease = EASINGS[phase.ease] ?? EASINGS.linear;
    return phase.from + ((phase.to - phase.from) * ease(p));
  }
  return last.to;
}
