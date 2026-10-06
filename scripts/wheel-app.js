// The game-show window: a prize wheel that spins to an already-decided result while the System heckles.
// Pure presentation: no chat messages, sockets or document writes happen here.

import { MODULE_ID, TEMPLATES, SETTINGS, TONES } from "./constants.js";
import { rotationAt, segmentIndexAt } from "./wheel-math.js";
import { WheelAudio } from "./audio.js";

/** Slice colours by colorIndex, with a readable label colour for each. */
const PALETTE = [
  {fill: "#ff2d75", text: "#ffffff"}, // hot pink
  {fill: "#ffb000", text: "#2b0d00"}, // amber
  {fill: "#00c8f0", text: "#021821"}, // cyan
  {fill: "#7b2ff7", text: "#ffffff"}, // violet
  {fill: "#2ee86a", text: "#03250f"}, // toxic green
  {fill: "#ff5a1f", text: "#ffffff"}, // safety orange
  {fill: "#1f5bff", text: "#ffffff"}, // electric blue
  {fill: "#f7e300", text: "#262000"}  // caution yellow
];

const VERDICTS = {
  good: "Good News (Suspicious)",
  bad: "Bad News (Delightful)",
  weird: "Weird News",
  chaos: "Everyone's Problem"
};

/** Fake chat handles for the floating audience reactions. */
const VIEWER_HANDLES = [
  "beholder_bae", "mimic_irl", "goblin4life", "lich_please", "owlbear_mom", "tarrasque_tim", "kobold_kevin",
  "gelatinous_greg", "bardcore99", "dm_tears", "nat1_enjoyer", "flumph_fan", "xX_paladin_Xx", "rust_monster",
  "sheep_futures", "modron_march", "displacer_kat", "cleric_on_strike", "wizard_no_hat", "tavern_ghost"
];

/** Pause before the spin starts, so everyone sees the wheel at rest while the window fades in. */
const LEAD_MS = 350;
/** Gap between landing and the reveal panel sliding in. */
const REVEAL_DELAY_MS = 750;
/** Gap between landing and the achievement toast. */
const TOAST_DELAY_MS = 2400;
/** How long the achievement toast stays up (clicking it dismisses it sooner). */
const TOAST_HOLD_MS = 9000;
/** Minimum time a ticker line should get before the next one replaces it. */
const MIN_LINE_SLOT_MS = 2200;

const LABEL_FONT = size => `700 ${size}px "Modesto Condensed", "Signika", sans-serif`;
const RANGE_FONT = size => `700 ${size}px "Signika", sans-serif`;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const mod360 = x => ((x % 360) + 360) % 360;
const perfNow = () => ((typeof performance !== "undefined") ? performance.now() : Date.now());

function escapeHTML(value) {
  if ( (value === null) || (value === undefined) ) return "";
  return String(value).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"})[c]);
}

/** Plain text from an HTML snippet, parsed inertly (no scripts run, no images load). */
function htmlToText(html) {
  if ( !html ) return "";
  try {
    const doc = new DOMParser().parseFromString(String(html), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  } catch(err) {
    return String(html).replace(/<[^>]*>/g, "").trim();
  }
}

/** A setting value, or the fallback when the setting is missing or anything goes wrong. */
function getSetting(key, fallback, namespace = MODULE_ID) {
  try {
    const value = game.settings.get(namespace, key);
    return ((value === undefined) || (value === null)) ? fallback : value;
  } catch(err) {
    return fallback;
  }
}

function formatCount(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  try {
    return v.toLocaleString();
  } catch(err) {
    return String(v);
  }
}

function prefersReducedMotion() {
  try {
    return !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch(err) {
    return false;
  }
}

/** "07-08" style for d100 tables (100 reads 00), "3-4" otherwise. */
function segmentRange(seg, d100) {
  const f = n => (d100 ? ((n === 100) ? "00" : String(n).padStart(2, "0")) : String(n));
  return (seg.lo === seg.hi) ? f(seg.lo) : `${f(seg.lo)}-${f(seg.hi)}`;
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = (amount < 0) ? 0 : 255;
  const a = Math.abs(amount);
  const mix = c => Math.round(c + ((target - c) * a));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function paletteFor(seg) {
  const i = Number.isInteger(seg?.colorIndex) ? seg.colorIndex : 0;
  return PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

/** Shorten text with an ellipsis until it fits `maxWidth` in the current canvas font. */
function fitText(ctx, text, maxWidth) {
  if ( ctx.measureText(text).width <= maxWidth ) return text;
  let s = text;
  while ( s.length > 1 ) {
    s = s.slice(0, -1);
    if ( ctx.measureText(`${s.trimEnd()}…`).width <= maxWidth ) return `${s.trimEnd()}…`;
  }
  return "";
}

/* -------------------------------------------- */
/*  Wheel painting (done once, then rotated)     */
/* -------------------------------------------- */

/**
 * Paint the whole wheel face onto a canvas sized by CSS. Returns the CSS size painted, or 0 if it couldn't.
 * @param {HTMLCanvasElement} canvas
 * @param {object[]} segments
 * @param {{d100: boolean}} options
 */
function paintWheel(canvas, segments, {d100 = false} = {}) {
  const size = canvas?.clientWidth || 0;
  if ( !size ) return 0;
  const scale = clamp((globalThis.devicePixelRatio || 1) * 1.25, 1.5, 3);
  const px = Math.round(size * scale);
  if ( canvas.width !== px ) canvas.width = px;
  if ( canvas.height !== px ) canvas.height = px;
  const ctx = canvas.getContext("2d");
  if ( !ctx ) return 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.setTransform(scale, 0, 0, scale, px / 2, px / 2);

  const R = (size / 2) - 0.5;
  const hubR = R * 0.22;
  const rad = deg => ((deg - 90) * Math.PI) / 180;
  const polar = (r, deg) => [r * Math.cos(rad(deg)), r * Math.sin(rad(deg))];

  if ( !segments.length ) {
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = "#2a0b45";
    ctx.fill();
  }

  // Slices, each shaded darker towards the hub and catching light near the rim.
  for ( const seg of segments ) {
    const pal = paletteFor(seg);
    const grad = ctx.createRadialGradient(0, 0, hubR * 0.8, 0, 0, R);
    grad.addColorStop(0, shade(pal.fill, -0.55));
    grad.addColorStop(0.5, shade(pal.fill, -0.08));
    grad.addColorStop(0.9, shade(pal.fill, 0.12));
    grad.addColorStop(1, shade(pal.fill, -0.3));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, rad(seg.start), rad(seg.end));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Separators.
  if ( segments.length > 1 ) {
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(14, 2, 28, 0.9)";
    ctx.lineWidth = (segments.length > 36) ? 1.2 : 2;
    for ( const seg of segments ) {
      const [x0, y0] = polar(hubR, seg.start);
      const [x1, y1] = polar(R, seg.start);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }

  // Labels: range near the rim, name running from the rim towards the hub.
  for ( const seg of segments ) drawLabel(ctx, seg, R, hubR, d100);

  // Pegs on each boundary, which is what the flapper clacks against.
  if ( segments.length > 1 ) {
    const minArc = Math.min(...segments.map(s => s.end - s.start)) * (Math.PI / 180) * R;
    const pegR = clamp(minArc * 0.11, 1.4, 3.6);
    for ( const seg of segments ) {
      const [x, y] = polar(R - pegR - 3, seg.start);
      const g = ctx.createRadialGradient(x - (pegR * 0.35), y - (pegR * 0.35), pegR * 0.1, x, y, pegR);
      g.addColorStop(0, "#fffbe0");
      g.addColorStop(0.5, "#ffd166");
      g.addColorStop(1, "#8a5a00");
      ctx.beginPath();
      ctx.arc(x, y, pegR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  // Rim edge.
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(10, 0, 20, 0.85)";
  ctx.stroke();

  // Hub plate: a gold ring with rivets, which visibly turns around the (static) eye.
  const hub = ctx.createRadialGradient(0, -hubR * 0.3, hubR * 0.1, 0, 0, hubR);
  hub.addColorStop(0, "#3d1563");
  hub.addColorStop(1, "#0d0219");
  ctx.beginPath();
  ctx.arc(0, 0, hubR, 0, Math.PI * 2);
  ctx.fillStyle = hub;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, R * 0.012);
  ctx.strokeStyle = "#ffd166";
  ctx.stroke();
  const rivetR = Math.max(1, R * 0.008);
  for ( let i = 0; i < 12; i++ ) {
    const [x, y] = polar(hubR * 0.88, i * 30);
    ctx.beginPath();
    ctx.arc(x, y, rivetR, 0, Math.PI * 2);
    ctx.fillStyle = (i % 3) ? "#c9a24a" : "#ff2df7";
    ctx.fill();
  }
  return size;
}

function drawLabel(ctx, seg, R, hubR, d100) {
  const pal = paletteFor(seg);
  const width = seg.end - seg.start;
  if ( !(width > 0) ) return;
  const half = (Math.min(width, 170) * Math.PI) / 360;
  const chord = r => 2 * r * Math.sin(half);
  const darkText = pal.text !== "#ffffff";

  ctx.save();
  ctx.rotate((seg.mid * Math.PI) / 180);
  ctx.rotate(Math.PI / 2); // +x now runs from the rim towards the hub
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = pal.text;
  ctx.shadowColor = darkText ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 1.5;

  // Range, small, hugging the rim.
  const rimGap = 8;
  const range = segmentRange(seg, d100);
  let rangeSize = clamp(chord(R - 14) * 0.42, 6.5, 11);
  ctx.font = RANGE_FONT(rangeSize);
  let rangeW = ctx.measureText(range).width;
  const maxRangeW = (R - hubR) * 0.3;
  if ( rangeW > maxRangeW ) {
    rangeSize = Math.max(5, (rangeSize * maxRangeW) / rangeW);
    ctx.font = RANGE_FONT(rangeSize);
    rangeW = ctx.measureText(range).width;
  }
  ctx.globalAlpha = 0.8;
  ctx.fillText(range, -(R - rimGap), 0);
  ctx.globalAlpha = 1;

  // Label: biggest size whose far (inner) end still fits inside the slice.
  const label = String(seg.label ?? "").trim();
  if ( label ) {
    const outer = R - rimGap - rangeW - Math.max(5, rangeSize * 0.7);
    const inner = hubR + 6;
    let text = label;
    let size = (width >= 20) ? 24 : 17;
    let fits = false;
    for ( ; size >= 7; size -= 0.5 ) {
      ctx.font = LABEL_FONT(size);
      const tw = ctx.measureText(text).width;
      if ( tw > (outer - inner) ) continue;
      if ( chord(outer - tw) < (size * 0.92) ) continue;
      fits = true;
      break;
    }
    if ( !fits ) {
      size = 7;
      ctx.font = LABEL_FONT(size);
      const minR = Math.max(inner, (size * 0.92) / (2 * Math.sin(half)));
      text = ((outer - minR) > 10) ? fitText(ctx, text, outer - minR) : "";
    }
    if ( text ) ctx.fillText(text, -outer, 0);
  }
  ctx.restore();
}

/* -------------------------------------------- */
/*  Ticker typewriter                           */
/* -------------------------------------------- */

/** Types out an HTML snippet character by character, keeping its markup intact. */
class Typewriter {
  constructor(el) {
    this.el = el;
    this.nodes = [];
    this.total = 0;
    this.shown = 0;
    this.cps = 60;
    this.t0 = 0;
    this.done = true;
  }

  /**
   * @param {string} html    Safe HTML to show.
   * @param {number} slotMs  Roughly how long the line has before something replaces it.
   */
  show(html, slotMs = 3000) {
    if ( !this.el ) return;
    this.el.innerHTML = html;
    this.nodes = [];
    const walker = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT);
    while ( walker.nextNode() ) {
      const node = walker.currentNode;
      const chars = Array.from(node.nodeValue);
      this.nodes.push({node, chars});
      node.nodeValue = "";
    }
    this.total = this.nodes.reduce((n, entry) => n + entry.chars.length, 0);
    this.shown = 0;
    this.cps = clamp(this.total / Math.max(0.4, (slotMs * 0.6) / 1000), 45, 240);
    this.t0 = perfNow();
    this.done = this.total === 0;
    this.el.classList.toggle("is-typing", !this.done);
    this.el.scrollTop = 0;
  }

  update(now) {
    if ( this.done || !this.el ) return;
    const target = Math.min(this.total, Math.floor(((now - this.t0) / 1000) * this.cps));
    if ( target <= this.shown ) return;
    let remaining = target;
    for ( const {node, chars} of this.nodes ) {
      const take = Math.min(chars.length, remaining);
      node.nodeValue = chars.slice(0, take).join("");
      remaining -= take;
    }
    this.shown = target;
    if ( target >= this.total ) {
      this.done = true;
      this.el.classList.remove("is-typing");
    }
    this.el.scrollTop = this.el.scrollHeight;
  }

  finish() {
    if ( this.done ) return;
    this.update(Infinity);
  }
}

/* -------------------------------------------- */
/*  The window                                  */
/* -------------------------------------------- */

/**
 * The Wheel of Wild Magic game-show window.
 * Built from a SpinPresentation (see the spec); identical on every client and on replays.
 */
export class WheelApp extends Application {
  /**
   * @param {object} presentation  The SpinPresentation to play.
   * @param {object} [options]     Application options.
   */
  constructor(presentation, options = {}) {
    super(options);
    this.presentation = presentation ?? {};
    this._landedPromise = new Promise(resolve => {
      this._resolveLanded = resolve;
    });
    this._phase = "idle"; // idle → spinning → landed → revealed
    this._timers = new Set();
    this._intervals = new Set();
    this._raf = null;
    this._frame = this._frame.bind(this);
    this._audio = null;
    this._muted = false;
    this._dom = null;
    this._typewriter = null;
    this._flap = {angle: 0, vel: 0};
    this._tornDown = false;
    this._closeRequested = false;
    this._reduceMotion = prefersReducedMotion();
    WheelApp._instances.add(this);
  }

  /** Every WheelApp that is open or opening. */
  static _instances = new Set();

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["magic-wheel-app"],
      template: TEMPLATES.wheel,
      popOut: true,
      minimizable: true,
      resizable: false,
      width: 600,
      height: "auto",
      title: "Wheel of Wild Magic"
    });
  }

  /** @override */
  get title() {
    return htmlToText(this.presentation?.chatter?.title) || "Wheel of Wild Magic";
  }

  /**
   * Resolves when the wheel lands (or straight away once the window is closed).
   * @type {Promise<void>}
   */
  get landed() {
    return this._landedPromise;
  }

  /**
   * Close any open wheel and show a new one.
   * @param {object} presentation           The SpinPresentation.
   * @param {object} [options]
   * @param {boolean} [options.replay=false] Mark it as a replay ("RERUN" badge).
   * @returns {WheelApp|null}
   */
  static show(presentation, {replay = false} = {}) {
    if ( !presentation || (typeof presentation !== "object") ) return null;
    WheelApp.closeAll();
    const data = replay ? {...presentation, replay: true} : presentation;
    const app = new WheelApp(data);
    app.render(true);
    return app;
  }

  /** Close every open wheel window. */
  static closeAll() {
    for ( const app of Array.from(WheelApp._instances) ) {
      try {
        app.close();
      } catch(err) {
        console.error(`${MODULE_ID} | Failed to close wheel`, err);
      }
    }
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  getData(options = {}) {
    const p = this.presentation;
    const r = p.result ?? {};
    const c = p.chatter ?? {};
    const tone = this._tone;
    const box = (r.box && (r.box.contents || r.box.tier)) ? {
      tier: r.box.tier || "Mystery",
      tierClass: String(r.box.tierClass || r.box.tier || "bronze").toLowerCase().replace(/[^a-z0-9-]/g, ""),
      contents: r.box.contents || ""
    } : null;
    return {
      uid: this.appId,
      spinId: p.spinId ?? "",
      kind: (p.kind === "wild-magic") ? "wild-magic" : "generic",
      tone,
      replay: !!p.replay,
      headline: (p.kind === "wild-magic") ? game.i18n.localize("MAGICWHEEL.Card.Headline") : (p.tableName || "The Wheel"),
      speakerName: p.speakerName || p.userName || "Mystery Contestant",
      viewers: formatCount(c.viewers?.start ?? 0),
      verdict: VERDICTS[tone] ?? "Results Pending Legal Review",
      result: {
        rangeLabel: r.rangeLabel ?? "",
        label: r.label || "???",
        icon: r.icon || "fa-solid fa-dharmachakra",
        effectHtml: r.effectHtml || "",
        extraHtml: r.extraHtml || null,
        line: r.line || null,
        repeatLine: r.repeatLine || null,
        streakLine: r.streakLine || null,
        achievement: r.achievement?.title ? r.achievement : null,
        box
      },
      sponsor: c.sponsor || null,
      closeLabel: c.closeLabel || "Accept My Fate"
    };
  }

  /** @override */
  async _render(force = false, options = {}) {
    await super._render(force, options);
    // A close requested while the first render was still in flight.
    if ( this._closeRequested && (this._state === Application.RENDER_STATES.RENDERED) ) {
      this._closeRequested = false;
      await super.close();
    }
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    if ( getSetting(SETTINGS.sound, true) !== false ) {
      buttons.unshift({
        label: "",
        class: "mw-mute",
        icon: this._muteIcon,
        tooltip: this._muteTooltip,
        onclick: event => this._onToggleMute(event)
      });
    }
    return buttons;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    const root = html?.filter?.(".mw-root")?.[0] ?? html?.find?.(".mw-root")?.[0] ?? html?.[0];
    if ( !root?.querySelector ) return;
    const q = selector => root.querySelector(selector);
    this._dom = {
      root,
      stage: q(".mw-stage"),
      wheel: q(".mw-wheel"),
      canvas: q(".mw-canvas"),
      spotlight: q(".mw-spotlight"),
      pointer: q(".mw-pointer"),
      bulbs: q(".mw-bulbs"),
      ticker: q(".mw-ticker-text"),
      viewers: q(".mw-viewer-count"),
      reactions: q(".mw-reactions"),
      fx: q(".mw-fx"),
      toast: q(".mw-toast"),
      countdown: q(".mw-countdown")
    };
    this._typewriter = new Typewriter(this._dom.ticker);

    q(".mw-close")?.addEventListener("click", event => {
      event.preventDefault();
      this.close();
    });
    this._dom.toast?.addEventListener("click", () => root.classList.add("hide-toast"));

    this._buildBulbs();
    this._needsPaint = !this._paint();
    if ( this._tornDown || this._closeRequested ) return;
    this._watchSize();
    this._watchFonts();
    if ( this._phase === "idle" ) this._begin();
    else this._restore();
  }

  /** @override */
  async close(options = {}) {
    this._teardown();
    WheelApp._instances.delete(this);
    // Still rendering: let _render finish, then close.
    if ( this._state === Application.RENDER_STATES.RENDERING ) {
      this._closeRequested = true;
      return;
    }
    return super.close(options);
  }

  /* -------------------------------------------- */
  /*  Setup helpers                               */
  /* -------------------------------------------- */

  /** The landed tone, normalised. */
  get _tone() {
    const tone = this.presentation?.result?.tone;
    return TONES.includes(tone) ? tone : "weird";
  }

  get _segments() {
    return Array.isArray(this.presentation?.segments) ? this.presentation.segments : [];
  }

  /** The plan, if it is usable. */
  get _plan() {
    const plan = this.presentation?.plan;
    return (plan && Array.isArray(plan.phases) && plan.phases.length && Number.isFinite(plan.totalMs)) ? plan : null;
  }

  _paint() {
    const canvas = this._dom?.canvas;
    if ( !canvas ) return true;
    const size = paintWheel(canvas, this._segments, {d100: this.presentation?.kind === "wild-magic"});
    if ( size ) this._paintedSize = size;
    return size > 0;
  }

  /** Repaint if the canvas changes size (e.g. the browser window was resized). */
  _watchSize() {
    this._resizeObserver?.disconnect();
    if ( typeof ResizeObserver !== "function" || !this._dom?.canvas ) return;
    this._resizeObserver = new ResizeObserver(() => {
      const w = this._dom?.canvas?.clientWidth;
      if ( w && (Math.abs(w - (this._paintedSize ?? 0)) > 0.5) ) {
        this._needsPaint = true;
        this._wake();
      }
    });
    this._resizeObserver.observe(this._dom.canvas);
  }

  /** Repaint once the wheel fonts are definitely available. */
  _watchFonts() {
    const fonts = globalThis.document?.fonts;
    if ( !fonts?.load ) return;
    const specs = [LABEL_FONT(12), RANGE_FONT(10)];
    try {
      if ( specs.every(s => fonts.check(s)) ) return;
    } catch(err) { /* check unsupported: just load */ }
    Promise.all(specs.map(s => fonts.load(s))).then(() => {
      if ( this._tornDown ) return;
      this._needsPaint = true;
      this._wake();
    }).catch(() => {});
  }

  _buildBulbs() {
    const el = this._dom?.bulbs;
    if ( !el || el.childElementCount ) return;
    const count = 32;
    const frag = document.createDocumentFragment();
    for ( let i = 0; i < count; i++ ) {
      const bulb = document.createElement("i");
      bulb.className = "mw-bulb";
      bulb.style.setProperty("--a", `${(360 / count) * i}deg`);
      bulb.style.setProperty("--k", String(i % 3));
      frag.append(bulb);
    }
    el.append(frag);
  }

  _initAudio() {
    if ( this._audio ) return;
    const enabled = getSetting(SETTINGS.sound, true) !== false;
    const volume = clamp(Number(getSetting(SETTINGS.volume, 0.6)), 0, 1);
    const interfaceVolume = clamp(Number(getSetting("globalInterfaceVolume", 0.5, "core")), 0, 1);
    try {
      this._audio = new WheelAudio({enabled, volume: volume * interfaceVolume});
      this._audio.setMuted(this._muted);
      this._audio.warmup();
    } catch(err) {
      this._audio = null;
    }
  }

  /** The mute header button's icon and tooltip for the current mute state. */
  get _muteIcon() {
    return this._muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
  }

  get _muteTooltip() {
    return game.i18n.localize(this._muted ? "MAGICWHEEL.Wheel.Unmute" : "MAGICWHEEL.Wheel.Mute");
  }

  _onToggleMute(event) {
    this._muted = !this._muted;
    this._audio?.setMuted(this._muted);
    const button = event?.currentTarget;
    const icon = button?.querySelector?.("i");
    if ( icon ) icon.className = this._muteIcon;
    if ( button?.dataset ) {
      button.dataset.tooltip = this._muteTooltip;
      // The tooltip is still showing over the button that was just clicked: show the new text.
      if ( game.tooltip?.element === button ) game.tooltip.activate(button);
    }
  }

  /** setTimeout that is cleared on close. */
  _later(fn, ms) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      if ( !this._tornDown ) fn();
    }, ms);
    this._timers.add(id);
    return id;
  }

  /** setInterval that is cleared on close. */
  _every(fn, ms) {
    const id = setInterval(() => {
      if ( this._tornDown ) return;
      fn(id);
    }, ms);
    this._intervals.add(id);
    return id;
  }

  _clearEvery(id) {
    clearInterval(id);
    this._intervals.delete(id);
  }

  /** Make sure the animation loop is running. */
  _wake() {
    if ( this._raf || this._tornDown ) return;
    this._raf = requestAnimationFrame(this._frame);
  }

  _teardown() {
    if ( this._tornDown ) return;
    this._tornDown = true;
    if ( this._raf ) cancelAnimationFrame(this._raf);
    this._raf = null;
    for ( const id of this._timers ) clearTimeout(id);
    this._timers.clear();
    for ( const id of this._intervals ) clearInterval(id);
    this._intervals.clear();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    try {
      this._audio?.dispose();
    } catch(err) { /* ignore */ }
    this._audio = null;
    this._resolveLanded?.();
  }

  /* -------------------------------------------- */
  /*  The show                                    */
  /* -------------------------------------------- */

  _begin() {
    const plan = this._plan;
    const segments = this._segments;
    const c = this.presentation.chatter ?? {};
    this._initAudio();

    // Choreography derived from the plan.
    const phases = plan?.phases ?? [];
    const main = phases.find(ph => ph.ease === "spinOut") ?? phases[1] ?? phases[0];
    this._mainStart = main?.t0 ?? 0;
    this._mainEnd = main?.t1 ?? (plan?.totalMs ?? 0);
    this._eventIndex = 0;
    this._whooshed = false;
    this._decoyShown = false;
    const start = plan ? plan.startRotation : 0;
    this._setRotation(start);
    this._lastRotation = start;
    this._lastIndex = segmentIndexAt(segments, start);

    // Ticker: intro now, then as many spinning lines as comfortably fit before the wheel starts slowing.
    const slowing = plan?.events?.find(e => e.type === "slowing")?.t ?? ((plan?.totalMs ?? 0) * 0.55);
    const spinning = Array.isArray(c.spinning) ? c.spinning.filter(Boolean) : [];
    const slots = clamp(Math.floor((slowing + LEAD_MS) / MIN_LINE_SLOT_MS) - 1, 0, spinning.length);
    this._lineQueue = spinning.slice(0, slots).map((html, i) => ({
      t: (slowing * (i + 1)) / (slots + 1),
      html,
      slot: slowing / (slots + 1)
    }));
    const introSlot = (slots ? (slowing / (slots + 1)) : slowing) + LEAD_MS;
    this._say(c.intro || `<strong>${escapeHTML(this.presentation.speakerName || "Someone")}</strong> spins the wheel&hellip;`, introSlot);

    // Viewers.
    const vs = Number(c.viewers?.start) || 120000;
    const ve = Math.max(vs, Number(c.viewers?.end) || Math.round(vs * 1.2));
    this._viewers = {start: vs, end: ve, current: vs, last: 0};

    this._phase = "spinning";
    this._dom.root.classList.add("is-spinning");
    this._startAt = perfNow() + LEAD_MS;
    this._lastFrame = null;
    this._wake();
    // Browsers pause animation frames in background tabs; make sure the wheel still lands on time.
    this._later(() => {
      if ( this._phase === "spinning" ) this._land();
    }, LEAD_MS + (plan?.totalMs ?? 0) + 500);
  }

  /** Re-apply state after an unexpected re-render. */
  _restore() {
    const root = this._dom.root;
    if ( this._lastLine ) {
      this._typewriter.show(this._lastLine, 0);
      this._typewriter.finish();
    }
    this._renderViewers(this._viewers?.current ?? 0);
    if ( this._phase === "spinning" ) {
      root.classList.add("is-spinning");
      this._wake();
      return;
    }
    const plan = this._plan;
    if ( plan ) this._setRotation(plan.finalRotation);
    root.classList.add("is-landed");
    this._showSpotlight();
    if ( this._phase === "revealed" ) {
      this._dock();
      root.classList.add("is-revealed", `fx-${this._tone}`);
      if ( this._toastShown && this._dom.toast ) {
        this._fitToast();
        root.classList.add("show-toast", "hide-toast");
      }
    }
  }

  /** One animation frame. */
  _frame(now) {
    this._raf = null;
    if ( this._tornDown || !this._dom ) return;
    const dt = (this._lastFrame === null) ? 16 : clamp(now - this._lastFrame, 0, 100);
    this._lastFrame = now;
    if ( this._needsPaint ) this._needsPaint = !this._paint();
    if ( this._phase === "spinning" ) this._stepSpin(now, dt);
    const flapping = this._stepFlapper(dt);
    this._typewriter?.update(now);
    const busy = (this._phase === "spinning") || flapping || !(this._typewriter?.done ?? true) || this._needsPaint;
    if ( !busy ) this._lastFrame = null;
    // A _say() during this frame may already have queued the next one (through _wake): never queue a second.
    else if ( !this._raf ) this._raf = requestAnimationFrame(this._frame);
  }

  _stepSpin(now, dt) {
    const plan = this._plan;
    const t = now - this._startAt;
    if ( t < 0 ) return;
    if ( !plan ) return this._land();
    const elapsed = Math.min(t, plan.totalMs);
    const rotation = rotationAt(plan, elapsed);
    this._setRotation(rotation);

    // Slice crossings: tick + kick the flapper.
    const index = segmentIndexAt(this._segments, rotation);
    if ( (index !== this._lastIndex) && (index >= 0) ) {
      const delta = rotation - this._lastRotation;
      this._kickFlapper((delta >= 0) ? 1 : -1, Math.abs(delta) / Math.max(dt, 1));
      this._audio?.tick();
      this._lastIndex = index;
    }
    this._lastRotation = rotation;

    if ( !this._whooshed && (elapsed >= this._mainStart) ) {
      this._whooshed = true;
      this._audio?.whoosh();
    }
    while ( this._lineQueue.length && (this._lineQueue[0].t <= elapsed) ) {
      const line = this._lineQueue.shift();
      this._say(line.html, line.slot);
    }
    if ( plan.fakeOut && !this._decoyShown && (elapsed >= this._mainEnd) ) {
      this._decoyShown = true;
      this._onDecoy();
    }
    const events = Array.isArray(plan.events) ? plan.events : [];
    while ( (this._phase === "spinning") && (this._eventIndex < events.length) && (events[this._eventIndex].t <= elapsed) ) {
      this._onEvent(events[this._eventIndex++]);
    }
    // Once landed, the count has spiked to its final value; don't pull it back down.
    if ( this._phase === "spinning" ) this._stepViewers(now, elapsed / plan.totalMs);
    if ( (this._phase === "spinning") && (t >= plan.totalMs) ) this._land();
  }

  _onEvent(event) {
    const c = this.presentation.chatter ?? {};
    const root = this._dom.root;
    switch ( event?.type ) {
      case "slowing":
        root.classList.add("is-slowing");
        this._lineQueue = [];
        this._say(c.slowing || "Slowing down&hellip;", this._mainEnd - event.t);
        this._audio?.drumroll(Math.max(300, this._mainEnd - event.t));
        break;
      case "fakeout": {
        root.classList.remove("is-decoy");
        root.classList.add("is-fakeout");
        const fallback = (this._plan?.fakeOut === "rollback") ? "Hold on. It's rolling <em>back</em>." : "Wait. It's still moving.";
        this._say(c.fakeOut || fallback, (this._plan?.totalMs ?? 0) - event.t);
        this._audio?.scratch();
        this._kickFlapper(1, 0);
        break;
      }
      case "land":
        this._land();
        break;
    }
  }

  /** The main spin has stopped on the wrong slice. Milk it. */
  _onDecoy() {
    const plan = this._plan;
    const decoy = this._segments[segmentIndexAt(this._segments, rotationAt(plan, this._mainEnd))];
    this._dom.root.classList.remove("is-slowing");
    this._dom.root.classList.add("is-decoy");
    this._audio?.stopDrumroll({crash: true});
    const label = escapeHTML(decoy?.label || "something");
    this._say(`And the result is&hellip; <strong>${label}</strong>!`, 700);
  }

  _land() {
    if ( this._phase !== "spinning" ) return;
    this._phase = "landed";
    const plan = this._plan;
    const root = this._dom.root;
    if ( plan ) this._setRotation(plan.finalRotation);
    root.classList.remove("is-spinning", "is-slowing", "is-decoy", "is-fakeout");
    root.classList.add("is-landed", "is-celebrating");
    this._lineQueue = [];
    this._audio?.land(this._tone);
    this._showSpotlight();

    const r = this.presentation.result ?? {};
    this._say(r.landed || `<strong>${escapeHTML(r.label || "Something")}</strong>!`, 1600);

    // Viewers spike, then drift.
    if ( this._viewers ) {
      this._viewers.current = this._viewers.end;
      this._renderViewers(this._viewers.current);
      this._dom.viewers?.classList.add("is-spiking");
      this._every(() => {
        const v = this._viewers;
        v.current = Math.max(1, v.current * (1 + ((Math.random() * 0.006) - 0.0018)));
        this._renderViewers(v.current);
      }, 1100);
    }

    this._later(() => this._dom?.root?.classList.remove("is-celebrating"), 3200);
    this._later(() => this._reveal(), REVEAL_DELAY_MS);
    this._startAutoClose();
    this._resolveLanded?.();
    this._wake();
  }

  _reveal() {
    if ( this._phase !== "landed" ) return;
    this._phase = "revealed";
    const root = this._dom.root;
    this._dock();
    root.classList.add("is-revealed", `fx-${this._tone}`);
    this._effects();
    this._later(() => this._startReactions(), 900);
    if ( this._dom.toast ) {
      this._later(() => {
        this._fitToast();
        this._toastShown = true;
        this._dom?.root?.classList.add("show-toast");
        this._audio?.chime();
        this._later(() => this._dom?.root?.classList.add("hide-toast"), TOAST_HOLD_MS);
      }, TOAST_DELAY_MS - REVEAL_DELAY_MS);
    }
  }

  /** While the toast is up, keep the reveal panel's bottom edge clear of it so nothing is hidden underneath. */
  _fitToast() {
    const {root, stage, toast} = this._dom ?? {};
    if ( !root || !stage || !toast ) return;
    // Not laid out (e.g. the window is minimised): measure again shortly, while the toast is still up.
    if ( !stage.offsetHeight ) {
      if ( !root.classList.contains("hide-toast") ) this._later(() => this._fitToast(), 400);
      return;
    }
    // offsetTop ignores the toast's entrance transform, so this is where it will come to rest.
    const overlap = (stage.offsetTop + stage.offsetHeight) - toast.offsetTop;
    root.style.setProperty("--mw-toast-clear", `${Math.max(0, Math.ceil(overlap))}px`);
  }

  /* -------------------------------------------- */
  /*  Visual helpers                              */
  /* -------------------------------------------- */

  _setRotation(rotation) {
    const canvas = this._dom?.canvas;
    if ( canvas ) canvas.style.transform = `rotate(${rotation.toFixed(3)}deg)`;
  }

  /** Clockwise motion drags the flapper tip right, which is a negative (counter-clockwise) swing. */
  _kickFlapper(direction, speed) {
    const strength = clamp(13 + (speed * 22), 13, 30) * (0.9 + (Math.random() * 0.2));
    this._flap.angle = -direction * strength;
    this._flap.vel = 0;
  }

  /** Damped spring back to rest. Returns true while still moving. */
  _stepFlapper(dt) {
    const f = this._flap;
    const pointer = this._dom?.pointer;
    if ( (Math.abs(f.angle) < 0.05) && (Math.abs(f.vel) < 0.002) ) {
      if ( f.angle !== 0 ) {
        f.angle = 0;
        f.vel = 0;
        if ( pointer ) pointer.style.transform = "";
      }
      return false;
    }
    const K = 0.0027;
    const C = 0.045;
    let remaining = dt;
    while ( remaining > 0 ) {
      const h = Math.min(remaining, 4);
      f.vel += ((-K * f.angle) - (C * f.vel)) * h;
      f.angle += f.vel * h;
      remaining -= h;
    }
    if ( pointer ) pointer.style.transform = `rotate(${f.angle.toFixed(2)}deg)`;
    return true;
  }

  _stepViewers(now, progress) {
    const v = this._viewers;
    if ( !v || ((now - v.last) < 140) ) return;
    v.last = now;
    const p = clamp(progress, 0, 1);
    const base = v.start + ((v.end - v.start) * 0.85 * p * p);
    v.current = base * (1 + ((Math.random() - 0.5) * 0.004));
    this._renderViewers(v.current);
  }

  _renderViewers(value) {
    if ( this._dom?.viewers ) this._dom.viewers.textContent = formatCount(value);
  }

  /** Dim everything but the winning slice. */
  _showSpotlight() {
    const plan = this._plan;
    const spot = this._dom?.spotlight;
    if ( !plan || !spot ) return;
    const seg = this._segments[segmentIndexAt(this._segments, plan.finalRotation)];
    if ( !seg ) return;
    spot.style.setProperty("--mw-spot-from", `${mod360(seg.start + plan.finalRotation).toFixed(3)}deg`);
    spot.style.setProperty("--mw-spot-width", `${(seg.end - seg.start).toFixed(3)}deg`);
  }

  /** Work out where the wheel shrinks to when the reveal panel slides in. */
  _dock() {
    const wheel = this._dom?.wheel;
    if ( !wheel ) return;
    const scale = 0.5;
    const size = wheel.offsetWidth;
    // Not laid out (e.g. the window is minimised): try again shortly.
    if ( !size ) {
      this._later(() => this._dock(), 400);
      return;
    }
    const cx = wheel.offsetLeft + (size / 2);
    const cy = wheel.offsetTop + (size / 2);
    const tx = 12 + ((size * scale) / 2);
    const ty = 14 + ((size * scale) / 2);
    wheel.style.setProperty("--mw-dock-x", `${(tx - cx).toFixed(1)}px`);
    wheel.style.setProperty("--mw-dock-y", `${(ty - cy).toFixed(1)}px`);
    wheel.style.setProperty("--mw-dock-scale", String(scale));
  }

  /** Tone-specific celebration (or commiseration). CSS does the rest. */
  _effects() {
    const fx = this._dom?.fx;
    if ( !fx || this._reduceMotion ) return;
    const tone = this._tone;
    const frag = document.createDocumentFragment();
    const rand = (a, b) => a + (Math.random() * (b - a));
    if ( tone === "good" ) {
      const colours = ["#ff2d75", "#ffb000", "#22e6ff", "#3dff9a", "#f7e300", "#b388ff", "#ffffff"];
      for ( let i = 0; i < 60; i++ ) {
        const piece = document.createElement("i");
        piece.className = "mw-confetti";
        piece.style.cssText = [
          `--x:${rand(0, 100).toFixed(1)}%`, `--dx:${rand(-90, 90).toFixed(0)}px`, `--rot:${rand(-720, 720).toFixed(0)}deg`,
          `--dur:${rand(2.2, 3.8).toFixed(2)}s`, `--delay:${rand(0, 0.7).toFixed(2)}s`, `--c:${colours[i % colours.length]}`,
          `--w:${rand(5, 9).toFixed(1)}px`, `--h:${rand(8, 15).toFixed(1)}px`
        ].join(";");
        frag.append(piece);
      }
    }
    else if ( tone === "weird" ) {
      const glyphs = ["?", "✦", "¿", "✧", "∞", "?!", "◎", "~"];
      for ( let i = 0; i < 16; i++ ) {
        const g = document.createElement("i");
        g.className = "mw-glyph";
        g.textContent = glyphs[i % glyphs.length];
        g.style.cssText = [
          `--x:${rand(4, 96).toFixed(1)}%`, `--dur:${rand(3, 5).toFixed(2)}s`, `--delay:${rand(0, 1.6).toFixed(2)}s`,
          `--s:${rand(14, 30).toFixed(0)}px`, `--hue:${rand(0, 360).toFixed(0)}`
        ].join(";");
        frag.append(g);
      }
    }
    else if ( tone === "bad" ) {
      for ( let i = 0; i < 26; i++ ) {
        const drop = document.createElement("i");
        drop.className = "mw-drop";
        drop.style.cssText = [
          `--x:${rand(0, 100).toFixed(1)}%`, `--dur:${rand(0.9, 1.6).toFixed(2)}s`, `--delay:${rand(0, 1.8).toFixed(2)}s`
        ].join(";");
        frag.append(drop);
      }
    }
    else if ( tone === "chaos" ) {
      const alarm = document.createElement("div");
      alarm.className = "mw-alarm";
      frag.append(alarm);
    }
    fx.append(frag);
    this._later(() => fx.replaceChildren(), 6500);
  }

  /** Audience reactions bubbling up beside the docked wheel. */
  _startReactions() {
    const list = (this.presentation.chatter?.reactions ?? []).filter(Boolean);
    const container = this._dom?.reactions;
    if ( !list.length || !container ) return;
    const order = list.slice().sort(() => Math.random() - 0.5);
    const total = Math.min(12, order.length * 2);
    let i = 0;
    const spawn = () => {
      if ( i >= total ) return;
      const html = order[i % order.length];
      i++;
      const el = document.createElement("div");
      el.className = "mw-reaction";
      const handle = VIEWER_HANDLES[Math.floor(Math.random() * VIEWER_HANDLES.length)];
      const hue = Math.floor(Math.random() * 360);
      el.innerHTML = `<span class="mw-reaction-user" style="color: hsl(${hue} 95% 72%)">${escapeHTML(handle)}</span> `
        + `<span class="mw-reaction-text">${html}</span>`;
      el.style.setProperty("--x", `${Math.round(Math.random() * 30)}px`);
      container.append(el);
      this._later(() => el.remove(), 5200);
      this._later(spawn, 650 + (Math.random() * 650));
    };
    spawn();
  }

  /** Optional auto-close, counting down on the close button (paused while hovered). */
  _startAutoClose() {
    const seconds = Math.round(Number(getSetting(SETTINGS.autoClose, 0)) || 0);
    if ( seconds <= 0 ) return;
    let remaining = seconds;
    const render = () => {
      if ( this._dom?.countdown ) this._dom.countdown.textContent = ` (${remaining})`;
    };
    render();
    this._every(id => {
      if ( this._dom?.root?.matches?.(":hover") ) return;
      remaining -= 1;
      if ( remaining <= 0 ) {
        this._clearEvery(id);
        this.close();
      }
      else render();
    }, 1000);
  }

  /** Show a line in the ticker. */
  _say(html, slotMs = 3000) {
    if ( !html ) return;
    this._lastLine = html;
    this._typewriter?.show(html, Math.max(0, slotMs));
    this._wake();
  }
}
