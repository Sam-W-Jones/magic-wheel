// Cleaning presentations that come from outside this client (socket spins and chat-card replays). Foundry cleans
// HTML fields of documents on the server, but module socket messages and chat-message flags reach other clients
// untouched, and the wheel puts several presentation fields into the page as HTML.

import { TONES, WILD_MAGIC_KIND, PRESENTATION_VERSION } from "./constants.js";
import { escapeHTML } from "./quips.js";
import { EASINGS } from "./wheel-math.js";

/** Elements kept as they are (attributes still filtered). */
const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "li", "ol", "p",
  "s", "small", "span", "strong", "sub", "sup", "u", "ul",
  "table", "caption", "thead", "tbody", "tfoot", "tr", "th", "td"
]);

/** Elements removed together with their content. Anything else that is not allowed is unwrapped to its content. */
const DROPPED_TAGS = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "svg", "math", "img", "picture",
  "video", "audio", "source", "track", "canvas", "form", "input", "button", "select", "textarea", "option",
  "template", "link", "meta", "base", "noscript", "noembed", "noframes", "xmp", "plaintext", "title", "portal"
]);

/** Attributes kept on any allowed element, besides data-* and aria-*. */
const GLOBAL_ATTRS = new Set(["class", "title", "draggable", "dir", "lang"]);

/** Attributes kept on particular elements. */
const TAG_ATTRS = {
  a: new Set(["href", "target", "rel"]),
  ol: new Set(["start"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"])
};

const HTML_MAX = 50000;
const TEXT_MAX = 1000;
const LIST_MAX = {segments: 1000, phases: 16, events: 16, spinning: 12, reactions: 24};
const SPIN_EVENTS = ["start", "slowing", "fakeout", "land"];
const FAKE_OUTS = ["creep", "rollback"];

/* -------------------------------------------- */
/*  HTML                                        */
/* -------------------------------------------- */

/**
 * Clean an HTML snippet with an inert parser and an allowlist: no scripts, no event handlers, no embedded content,
 * no javascript: links. The module's own markup (strong, em, icons, inline-roll and content-link anchors) survives.
 * Without a DOMParser (outside a browser) the snippet is escaped to plain text instead.
 * @param {*} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
  if ( (html === null) || (html === undefined) ) return "";
  const source = String(html).slice(0, HTML_MAX);
  if ( !/[<&]/.test(source) ) return source;
  if ( typeof DOMParser !== "function" ) return escapeHTML(source);
  try {
    const doc = new DOMParser().parseFromString(source, "text/html");
    cleanChildren(doc.body);
    return doc.body.innerHTML;
  } catch(err) {
    return escapeHTML(source);
  }
}

function cleanChildren(parent) {
  for ( const node of Array.from(parent.childNodes) ) {
    if ( node.nodeType === 3 ) continue; // Text
    if ( node.nodeType !== 1 ) { // Comments and anything else that is not an element
      node.remove();
      continue;
    }
    const tag = node.localName;
    if ( DROPPED_TAGS.has(tag) || (node.namespaceURI !== parent.namespaceURI) ) {
      node.remove();
      continue;
    }
    cleanChildren(node);
    if ( !ALLOWED_TAGS.has(tag) ) node.replaceWith(...Array.from(node.childNodes));
    else cleanAttributes(node, tag);
  }
}

function cleanAttributes(el, tag) {
  for ( const {name, value} of Array.from(el.attributes) ) {
    const key = name.toLowerCase();
    let keep = GLOBAL_ATTRS.has(key) || key.startsWith("data-") || key.startsWith("aria-") || !!TAG_ATTRS[tag]?.has(key);
    if ( keep && (key === "href") ) keep = isSafeUrl(value);
    if ( !keep ) {
      el.removeAttribute(name);
      continue;
    }
    // Foundry's tooltip manager inserts data-tooltip as HTML on hover: make it plain text
    if ( key === "data-tooltip" ) el.setAttribute(name, escapeHTML(value.replace(/<[^>]*>/g, "")));
    // The wheel window finds its own parts by their mw- classes; content must not pose as one of them
    else if ( key === "class" ) {
      const classes = value.split(/\s+/).filter(c => c && !c.startsWith("mw-"));
      if ( classes.length ) el.setAttribute(name, classes.join(" "));
      else el.removeAttribute(name);
    }
  }
  if ( (tag === "a") && el.hasAttribute("target") ) {
    if ( el.getAttribute("target") === "_blank" ) el.setAttribute("rel", "noopener noreferrer");
    else el.removeAttribute("target");
  }
}

function isSafeUrl(value) {
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:")
  const url = String(value ?? "").replace(/[\x00-\x20\x7f-\x9f]/g, "").toLowerCase();
  return !/^(javascript|vbscript|data|file):/.test(url);
}

/* -------------------------------------------- */
/*  Presentation                                */
/* -------------------------------------------- */

const isObject = v => !!v && (typeof v === "object") && !Array.isArray(v);
const text = (v, max = TEXT_MAX) => ((v === null) || (v === undefined) || (typeof v === "object") ? "" : String(v).slice(0, max));
const plainText = (v, max) => text(v, max).replace(/[<>]/g, "");
const html = v => (((v === null) || (v === undefined) || (v === "")) ? null : sanitizeHTML(v));
const htmlList = (v, max) => (Array.isArray(v) ? v.slice(0, max).map(html).filter(Boolean) : []);
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max).filter(isObject) : []);

function num(v, fallback = 0) {
  if ( (v === null) || (v === undefined) || (v === "") || (typeof v === "object") ) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cleanSegment(s) {
  return {
    id: text(s.id, 100),
    lo: num(s.lo),
    hi: num(s.hi),
    label: text(s.label, 200),
    tone: TONES.includes(s.tone) ? s.tone : "weird",
    start: num(s.start),
    end: num(s.end),
    mid: num(s.mid),
    colorIndex: Math.trunc(num(s.colorIndex))
  };
}

function cleanPlan(plan) {
  if ( !isObject(plan) ) return null;
  const ease = e => (Object.prototype.hasOwnProperty.call(EASINGS, e) ? e : "linear");
  return {
    startRotation: num(plan.startRotation),
    finalRotation: num(plan.finalRotation),
    totalMs: Math.max(0, num(plan.totalMs)),
    phases: list(plan.phases, LIST_MAX.phases).map(ph => ({
      t0: num(ph.t0), t1: num(ph.t1), from: num(ph.from), to: num(ph.to), ease: ease(ph.ease)
    })),
    fakeOut: FAKE_OUTS.includes(plan.fakeOut) ? plan.fakeOut : null,
    events: list(plan.events, LIST_MAX.events)
      .filter(ev => SPIN_EVENTS.includes(ev.type))
      .map(ev => ({t: num(ev.t), type: ev.type}))
  };
}

/**
 * Rebuild a SpinPresentation from untrusted data: plain-text fields become strings, numbers numbers, enums are
 * checked, lists are capped and every field the wheel shows as HTML goes through {@link sanitizeHTML}. Fields the
 * presentation format does not have are dropped.
 * @param {*} p   A SpinPresentation from another client or a chat message flag.
 * @returns {object|null}
 */
export function sanitizePresentation(p) {
  if ( !isObject(p) ) return null;
  const r = isObject(p.result) ? p.result : {};
  const c = isObject(p.chatter) ? p.chatter : {};
  const box = isObject(r.box) ? r.box : null;
  const achievement = isObject(r.achievement) ? r.achievement : null;
  const viewers = isObject(c.viewers) ? c.viewers : {};
  const icon = text(r.icon, 200);
  return {
    version: num(p.version, PRESENTATION_VERSION),
    spinId: text(p.spinId, 100),
    userId: text(p.userId, 100),
    userName: text(p.userName),
    speakerName: text(p.speakerName),
    tableId: text(p.tableId, 100),
    tableUuid: text(p.tableUuid, 300),
    tableName: text(p.tableName),
    kind: (p.kind === WILD_MAGIC_KIND) ? WILD_MAGIC_KIND : "generic",
    total: num(p.total, null),
    formula: text(p.formula),
    segments: list(p.segments, LIST_MAX.segments).map(cleanSegment),
    targetIndex: Math.trunc(num(p.targetIndex)),
    plan: cleanPlan(p.plan),
    result: {
      rangeLabel: text(r.rangeLabel, 100),
      label: plainText(r.label, 200),
      tone: TONES.includes(r.tone) ? r.tone : "weird",
      icon: /^[\w\s-]+$/.test(icon) && icon.trim() ? icon.trim() : "fa-solid fa-dharmachakra",
      effectHtml: html(r.effectHtml) ?? "",
      line: html(r.line),
      landed: html(r.landed),
      achievement: achievement ? {title: html(achievement.title), text: html(achievement.text) ?? ""} : null,
      box: box ? {
        tier: plainText(box.tier, 100),
        tierClass: text(box.tierClass, 100).toLowerCase().replace(/[^a-z0-9-]/g, ""),
        contents: html(box.contents) ?? ""
      } : null,
      extraHtml: html(r.extraHtml),
      repeatLine: html(r.repeatLine),
      streakLine: html(r.streakLine)
    },
    chatter: {
      title: plainText(c.title, 200),
      intro: html(c.intro),
      spinning: htmlList(c.spinning, LIST_MAX.spinning),
      slowing: html(c.slowing),
      fakeOut: html(c.fakeOut),
      sponsor: html(c.sponsor),
      reactions: htmlList(c.reactions, LIST_MAX.reactions),
      viewers: {start: Math.max(0, num(viewers.start)), end: Math.max(0, num(viewers.end))},
      closeLabel: plainText(c.closeLabel, 200)
    },
    replay: p.replay === true
  };
}
