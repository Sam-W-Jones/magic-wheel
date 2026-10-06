// Unit tests for Wheel of Wild Magic: the surge data, quips, wheel maths, the extra sub-rolls, the core helpers,
// and a mocked end-to-end draw (table -> wheel -> socket -> chat card). Foundry's globals are replaced with small
// mocks. Run with `npm test` (Node 18+). No dependencies; the sanitizer's DOM cases also run when parse5 can be
// found (installed, PARSE5_PATH, or the copy inside a local Foundry install), and are skipped otherwise.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = p => path.join(ROOT, ...p.split("/"));
const importProject = p => import(pathToFileURL(rel(p)).href);

const tests = [];
const test = (name, fn) => tests.push({name, fn});

/** Deterministic rng for repeatable "random" tests. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- pure modules (imported before any Foundry global exists) ---------------- */

assert.equal(typeof globalThis.game, "undefined", "tests must start without Foundry globals");
const C = await importProject("scripts/constants.js");
const { SURGE_TEXT } = await importProject("scripts/data/surge-text.js");
const { SURGES_LOW } = await importProject("scripts/data/surges-low.js");
const { SURGES_HIGH } = await importProject("scripts/data/surges-high.js");
const SD = await importProject("scripts/surge-data.js");
const Q = await importProject("scripts/quips.js");
const WM = await importProject("scripts/wheel-math.js");
const { SURGES } = SD;

const ALLOWED_TAGS = /<\/?(strong|em)>/g;
const placeholdersOf = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]);

/** Only <strong>/<em>, balanced and properly nested; no other markup or stray braces. */
function assertSafeMarkup(s, where) {
  const stack = [];
  for ( const m of String(s).matchAll(/<\/?([a-z]+)[^>]*>/gi) ) {
    const tag = m[0];
    assert.match(tag, /^<\/?(strong|em)>$/, `${where}: forbidden tag ${tag}`);
    if ( tag.startsWith("</") ) assert.equal(stack.pop(), m[1], `${where}: badly nested ${tag}`);
    else stack.push(m[1]);
  }
  assert.equal(stack.length, 0, `${where}: unclosed tag`);
  const text = String(s).replace(ALLOWED_TAGS, "");
  assert.ok(!/[<>]/.test(text), `${where}: stray angle bracket`);
  assert.ok(!/[{}]/.test(text.replace(/\{\w+\}/g, "")), `${where}: stray brace`);
}

/* ---------------- surge data ---------------- */

test("SURGES: 50 entries covering 1..100 contiguously, two faces each", () => {
  assert.equal(SURGES_LOW.length, 25);
  assert.equal(SURGES_HIGH.length, 25);
  assert.equal(SURGES.length, 50);
  let next = 1;
  for ( const e of SURGES ) {
    assert.ok(Array.isArray(e.range) && e.range.length === 2, `bad range ${e.range}`);
    assert.equal(e.range[0], next, `gap or overlap before ${e.range}`);
    assert.equal(e.range[1], e.range[0] + 1);
    next = e.range[1] + 1;
  }
  assert.equal(next, 101);
  assert.deepEqual(SURGES_LOW.at(-1).range, [49, 50]);
  assert.deepEqual(SURGES_HIGH[0].range, [51, 52]);
});

test("SURGES: text comes from SURGE_TEXT and the halves carry no text of their own", () => {
  assert.equal(Object.keys(SURGE_TEXT).length, 50);
  for ( const raw of [...SURGES_LOW, ...SURGES_HIGH] ) assert.ok(!("text" in raw), `${raw.range} has its own text`);
  for ( const e of SURGES ) {
    const key = SD.rangeKey(e.range);
    assert.equal(typeof SURGE_TEXT[key], "string", `no SURGE_TEXT for ${key}`);
    assert.equal(e.text, SURGE_TEXT[key]);
    assert.ok(e.text.length > 20);
  }
  assert.match(SD.findSurgeByRange([7, 8]).text, /Fireball/);
  assert.match(SD.findSurgeByRange([99, 100]).text, /Wild Magic Surge|regain all expended sorcery points/i);
});

test("SURGES: field constraints from the spec", () => {
  const allowedKeys = new Set(["range", "label", "tone", "icon", "lines", "achievement", "box", "extra", "text"]);
  const labels = new Set();
  const titles = new Set();
  for ( const e of SURGES ) {
    const where = SD.rangeKey(e.range);
    for ( const k of Object.keys(e) ) assert.ok(allowedKeys.has(k), `${where}: unknown key ${k}`);
    // Label
    assert.equal(typeof e.label, "string");
    assert.ok(e.label.length > 0 && e.label.length <= 18, `${where}: label length ${e.label}`);
    assert.equal(e.label, e.label.toUpperCase(), `${where}: label not ALL CAPS`);
    assert.ok(!/[<>&{}]/.test(e.label), `${where}: label not plain text`);
    assert.ok(!labels.has(e.label), `${where}: duplicate label ${e.label}`);
    labels.add(e.label);
    // Tone and icon
    assert.ok(C.TONES.includes(e.tone), `${where}: tone ${e.tone}`);
    assert.match(e.icon, /^fa-solid fa-[a-z0-9-]+$/, `${where}: icon ${e.icon}`);
    // Lines
    assert.ok(Array.isArray(e.lines) && e.lines.length >= 5 && e.lines.length <= 7, `${where}: ${e.lines?.length} lines`);
    assert.equal(new Set(e.lines).size, e.lines.length, `${where}: duplicate line`);
    for ( const line of e.lines ) {
      assert.equal(typeof line, "string");
      assert.ok(line.trim().length > 0 && line.length <= 300, `${where}: line length ${line.length}`);
      assertSafeMarkup(line, `${where} line`);
      for ( const p of placeholdersOf(line) ) assert.ok(["name", "user"].includes(p), `${where}: placeholder {${p}}`);
    }
    // Achievement
    if ( e.achievement !== undefined ) {
      const {title, text} = e.achievement;
      assert.ok(title.length > 0 && title.length <= 40, `${where}: achievement title length`);
      assert.ok(!title.trim().endsWith("!"), `${where}: achievement title ends with !`);
      assert.ok(text.length > 0 && text.length <= 220, `${where}: achievement text length`);
      assertSafeMarkup(title, `${where} achievement`);
      assertSafeMarkup(text, `${where} achievement`);
      for ( const p of placeholdersOf(title + text) ) assert.ok(["name", "user"].includes(p), `${where}: placeholder {${p}}`);
      assert.ok(!titles.has(title), `${where}: duplicate achievement ${title}`);
      titles.add(title);
    }
    // Reward box
    if ( e.box !== undefined ) {
      assert.ok(["Bronze", "Silver", "Gold", "Platinum", "Legendary"].includes(e.box.tier), `${where}: box tier ${e.box.tier}`);
      assert.ok(e.box.contents.length > 0 && e.box.contents.length <= 160, `${where}: box contents length`);
      assertSafeMarkup(e.box.contents, `${where} box`);
      for ( const p of placeholdersOf(e.box.contents) ) assert.ok(["name", "user"].includes(p), `${where}: placeholder {${p}}`);
    }
    if ( e.extra !== undefined ) assert.equal(typeof e.extra, "function", `${where}: extra is not a function`);
  }
  const achievements = SURGES.filter(e => e.achievement).length;
  const boxes = SURGES.filter(e => e.box).length;
  assert.ok(achievements >= 15 && achievements <= 35, `about half should have achievements (${achievements})`);
  assert.ok(boxes >= 10 && boxes <= 25, `about a third should have boxes (${boxes})`);
  for ( const tone of C.TONES ) assert.ok(SURGES.some(e => e.tone === tone), `no ${tone} entries`);
});

test("SURGES: every required sub-roll has an extra", () => {
  const required = ["11-12", "35-36", "37-38", "39-40", "53-54", "65-66", "73-74", "83-84", "87-88", "91-92"];
  for ( const key of required ) {
    const entry = SURGES.find(e => SD.rangeKey(e.range) === key);
    assert.equal(typeof entry?.extra, "function", `${key} has no extra`);
  }
});

test("findSurgeByTotal / findSurgeByRange", () => {
  for ( let t = 1; t <= 100; t++ ) {
    const e = SD.findSurgeByTotal(t);
    assert.ok(e && t >= e.range[0] && t <= e.range[1], `total ${t}`);
  }
  for ( const bad of [0, 101, -5, NaN, undefined, null, "abc"] ) assert.equal(SD.findSurgeByTotal(bad), null, `total ${bad}`);
  assert.equal(SD.findSurgeByTotal(7).label, "FIREBALL (ON YOU)");
  assert.equal(SD.findSurgeByTotal(100), SD.findSurgeByRange([99, 100]));
  assert.equal(SD.findSurgeByRange([7, 8]).label, "FIREBALL (ON YOU)");
  assert.equal(SD.findSurgeByRange([7, 9]), null);
  assert.equal(SD.findSurgeByRange("7-8"), null);
  assert.equal(SD.findSurgeByRange(null), null);
});

test("formatRange / formatD100 / rangeKey", () => {
  assert.equal(SD.formatRange([7, 8], {d100: true}), "07-08");
  assert.equal(SD.formatRange([99, 100], {d100: true}), "99-00");
  assert.equal(SD.formatRange([100, 100], {d100: true}), "00");
  assert.equal(SD.formatRange([1, 2], {d100: true}), "01-02");
  assert.equal(SD.formatRange([3, 4]), "3-4");
  assert.equal(SD.formatRange([5, 5]), "5");
  assert.equal(SD.formatRange([99, 100]), "99-100");
  assert.equal(SD.formatD100(100), "00");
  assert.equal(SD.formatD100(7), "07");
  assert.equal(SD.formatD100(42), "42");
  assert.equal(SD.rangeKey([99, 100]), "99-100");
});

/* ---------------- quips.js ---------------- */

const QUIP_POOLS = {
  titles: {min: 6, allowed: []},
  intro: {min: 15, allowed: ["name", "user"]},
  spinning: {min: 25, allowed: ["name", "user"]},
  slowing: {min: 12, allowed: ["name", "user"]},
  fakeOutCreep: {min: 8, allowed: ["name", "user"]},
  fakeOutRollback: {min: 8, allowed: ["name", "user"]},
  landed: {min: 12, allowed: ["label", "name", "user"], required: ["label"]},
  repeat: {min: 8, allowed: ["label", "count", "name", "user"]},
  streak: {min: 8, allowed: ["count", "name", "user"], required: ["count"]},
  blind: {min: 6, allowed: ["name", "user"]},
  checkFlavor: {min: 8, allowed: ["name"], required: ["name"]},
  checkPass: {min: 12, allowed: ["name", "total"], required: ["total"]},
  checkFail: {min: 8, allowed: ["name"]},
  generic: {min: 12, allowed: ["result", "name", "user"], required: ["result"]},
  sponsors: {min: 15, allowed: ["name", "user"]},
  closeLabels: {min: 10, allowed: [], maxLen: 22},
  tableCreated: {min: 4, allowed: ["name"]},
  noTable: {min: 4, allowed: []},
  skipWheel: {min: 4, allowed: []}
};

test("QUIPS: every pool exists, meets its minimum and uses only its placeholders", () => {
  for ( const [key, rule] of Object.entries(QUIP_POOLS) ) {
    const pool = Q.QUIPS[key];
    assert.ok(Array.isArray(pool), `QUIPS.${key} missing`);
    assert.ok(pool.length >= rule.min, `QUIPS.${key} has ${pool.length} < ${rule.min}`);
    for ( const line of pool ) {
      assert.equal(typeof line, "string");
      assert.ok(line.trim().length > 0, `QUIPS.${key} has an empty line`);
      assertSafeMarkup(line, `QUIPS.${key}`);
      for ( const p of placeholdersOf(line) ) assert.ok(rule.allowed.includes(p), `QUIPS.${key}: {${p}} in "${line}"`);
      for ( const p of rule.required ?? [] ) assert.ok(line.includes(`{${p}}`), `QUIPS.${key}: missing {${p}} in "${line}"`);
      if ( rule.maxLen ) assert.ok(line.length <= rule.maxLen, `QUIPS.${key}: too long "${line}"`);
    }
  }
  // At least one repeat line mentions the count and the label
  assert.ok(Q.QUIPS.repeat.some(l => l.includes("{count}")));
  assert.ok(Q.QUIPS.repeat.some(l => l.includes("{label}")));
});

test("QUIPS: reactions per tone are short and plentiful", () => {
  for ( const tone of C.TONES ) {
    const pool = Q.QUIPS.reactions?.[tone];
    assert.ok(Array.isArray(pool) && pool.length >= 10, `reactions.${tone}`);
    for ( const r of pool ) {
      assert.ok([...r].length <= 24, `reaction too long: ${r}`);
      assert.ok(!/[<>{}]/.test(r), `reaction not plain: ${r}`);
    }
  }
});

test("escapeHTML", () => {
  assert.equal(Q.escapeHTML(`<b>Bob & "Al"'s</b>`), "&lt;b&gt;Bob &amp; &quot;Al&quot;&#39;s&lt;/b&gt;");
  assert.equal(Q.escapeHTML(null), "");
  assert.equal(Q.escapeHTML(undefined), "");
  assert.equal(Q.escapeHTML(0), "0");
  assert.equal(Q.escapeHTML(false), "false");
});

test("fill escapes values, leaves unknown placeholders and does a single pass", () => {
  assert.equal(Q.fill("Hi <strong>{name}</strong>!", {name: "<Zed & Co>"}), "Hi <strong>&lt;Zed &amp; Co&gt;</strong>!");
  assert.equal(Q.fill("{name} {mystery}", {name: "A"}), "A {mystery}");
  assert.equal(Q.fill("{a}{b}", {a: "{b}", b: "x"}), "{b}x");
  assert.equal(Q.fill("{n}", {n: 0}), "0");
  assert.equal(Q.fill("{n}", {n: null}), "");
  assert.equal(Q.fill("{toString}", {}), "{toString}");
  assert.equal(Q.fill("{v}", {v: "$& $1"}), "$&amp; $1");
  assert.equal(Q.fill(null, {}), "");
  assert.equal(Q.fill("{name}"), "{name}");
});

test("pick / pickSome", () => {
  assert.equal(Q.pick([]), undefined);
  assert.equal(Q.pick(null), undefined);
  assert.equal(Q.pick(["only"]), "only");
  for ( const r of [0, 0.5, 0.9999, 1, -1, NaN] ) assert.ok(["a", "b", "c"].includes(Q.pick(["a", "b", "c"], () => r)), `rng ${r}`);
  const rngA = mulberry32(7);
  const rngB = mulberry32(7);
  for ( let i = 0; i < 20; i++ ) assert.equal(Q.pick(Q.QUIPS.spinning, rngA), Q.pick(Q.QUIPS.spinning, rngB));

  const list = Object.freeze(["a", "b", "c", "d", "e"]);
  const rng = mulberry32(11);
  for ( let i = 0; i < 500; i++ ) {
    const some = Q.pickSome(list, 3, rng);
    assert.equal(some.length, 3);
    assert.equal(new Set(some).size, 3);
    for ( const v of some ) assert.ok(list.includes(v));
  }
  assert.deepEqual(Q.pickSome(list, 0), []);
  assert.deepEqual(Q.pickSome(list, -2), []);
  assert.deepEqual(Q.pickSome([], 3), []);
  assert.deepEqual(Q.pickSome(null, 3), []);
  assert.equal(Q.pickSome(list, 99).length, 5);
  assert.deepEqual(Q.pickSome(["x", "x", "y"], 5).sort(), ["x", "y"]);
  const input = ["a", "b", "c"];
  Q.pickSome(input, 2);
  assert.deepEqual(input, ["a", "b", "c"], "pickSome must not mutate its input");
});

test("viewerCounts: integers, start in [150k, 4M), end 5-60% higher", () => {
  const rng = mulberry32(3);
  for ( let i = 0; i < 5000; i++ ) {
    const {start, end} = Q.viewerCounts(rng);
    assert.ok(Number.isInteger(start) && Number.isInteger(end));
    assert.ok(start >= 150000 && start < 4000000, `start ${start}`);
    assert.ok(end > start, `end ${end} <= start ${start}`);
    assert.ok(end >= Math.ceil(start * 1.05) - 1 && end <= Math.floor(start * 1.6) + 1, `ratio ${end / start}`);
  }
  for ( const r of [0, 1, -1, NaN, 0.5] ) {
    const {start, end} = Q.viewerCounts(() => r);
    assert.ok(Number.isInteger(start) && end > start, `rng ${r}`);
  }
});

/* ---------------- wheel-math.js ---------------- */

const surgeEntries = () => SURGES.map(e => ({id: SD.rangeKey(e.range), lo: e.range[0], hi: e.range[1], label: e.label, tone: e.tone}));

function randomEntries(rng) {
  const n = 2 + Math.floor(rng() * 39);
  const out = [];
  let lo = 1;
  for ( let i = 0; i < n; i++ ) {
    const w = 1 + Math.floor(rng() * 10);
    out.push({id: `r${i}`, lo, hi: lo + w - 1, label: `R${i}`, tone: C.TONES[i % 4]});
    lo += w;
  }
  return out.sort(() => rng() - 0.5);
}

test("buildSegments: contiguous, proportional, sorted, neighbour colours differ", () => {
  const segs = WM.buildSegments(surgeEntries().reverse());
  assert.equal(segs.length, 50);
  assert.equal(segs[0].start, 0);
  assert.equal(segs.at(-1).end, 360);
  for ( let i = 0; i < segs.length; i++ ) {
    const s = segs[i];
    if ( i ) {
      assert.equal(s.start, segs[i - 1].end, "contiguous");
      assert.ok(s.lo > segs[i - 1].lo, "sorted by lo");
    }
    assert.ok(Math.abs((s.end - s.start) - 7.2) < 1e-9, "two faces of a d100 is 7.2 degrees");
    assert.ok(Math.abs(s.mid - ((s.start + s.end) / 2)) < 1e-9);
    for ( const k of ["id", "lo", "hi", "label", "tone", "colorIndex"] ) assert.ok(k in s, `segment.${k}`);
  }
  const uneven = WM.buildSegments([{id: "a", lo: 1, hi: 1}, {id: "b", lo: 2, hi: 4}]);
  assert.ok(Math.abs((uneven[1].end - uneven[1].start) - 270) < 1e-9);
  for ( let n = 2; n <= 70; n++ ) {
    const s = WM.buildSegments(Array.from({length: n}, (_, i) => ({id: `s${i}`, lo: i + 1, hi: i + 1})));
    for ( let i = 0; i < n; i++ ) assert.notEqual(s[i].colorIndex, s[(i + 1) % n].colorIndex, `n=${n} i=${i}`);
  }
  assert.deepEqual(WM.buildSegments([]), []);
});

test("segmentIndexAt: the slice under the pointer", () => {
  const segs = WM.buildSegments(surgeEntries());
  segs.forEach((s, i) => {
    assert.equal(WM.segmentIndexAt(segs, -s.mid), i);
    assert.equal(WM.segmentIndexAt(segs, 360 * 7 - s.mid), i);
    assert.equal(WM.segmentIndexAt(segs, -360 * 3 - s.mid), i);
  });
  assert.equal(WM.segmentIndexAt(segs, 0), 0);
  assert.equal(WM.segmentIndexAt([], 10), -1);
});

test("EASINGS map 0 -> 0 and 1 -> 1", () => {
  for ( const [name, fn] of Object.entries(WM.EASINGS) ) {
    assert.ok(Math.abs(fn(0)) < 1e-9, `${name}(0)`);
    assert.ok(Math.abs(fn(1) - 1) < 1e-9, `${name}(1)`);
  }
});

test("planSpin: thousands of seeded plans land on target with valid choreography", () => {
  const rng = mulberry32(20261005);
  const surgeSegs = WM.buildSegments(surgeEntries());
  let fakeOuts = 0;
  let allowed = 0;
  const N = 4000;
  for ( let i = 0; i < N; i++ ) {
    const segs = (i % 2) ? surgeSegs : WM.buildSegments(randomEntries(rng));
    const n = segs.length;
    const targetIndex = Math.floor(rng() * n);
    const durationMs = 4000 + Math.floor(rng() * 11000);
    const fakeOut = (i % 5) !== 0;
    const seed = Math.floor(rng() * 2 ** 31);
    const plan = WM.planSpin({segments: segs, targetIndex, durationMs, fakeOut, rng: mulberry32(seed)});
    const ctx = `plan ${i} (n=${n}, target=${targetIndex}, fakeOut=${plan.fakeOut})`;

    // Lands on the target, exactly at the ends
    assert.equal(WM.segmentIndexAt(segs, plan.finalRotation), targetIndex, ctx);
    assert.equal(WM.rotationAt(plan, 0), plan.startRotation, ctx);
    assert.equal(WM.rotationAt(plan, plan.totalMs), plan.finalRotation, ctx);
    assert.equal(WM.rotationAt(plan, -50), plan.startRotation, ctx);
    assert.equal(WM.rotationAt(plan, plan.totalMs + 5000), plan.finalRotation, ctx);

    // Phases are contiguous in time and rotation
    const {phases, events} = plan;
    assert.equal(phases[0].t0, 0, ctx);
    assert.equal(phases.at(-1).t1, plan.totalMs, ctx);
    for ( let p = 0; p < phases.length; p++ ) {
      assert.ok(phases[p].ease in WM.EASINGS, `${ctx}: ease ${phases[p].ease}`);
      assert.ok(phases[p].t1 >= phases[p].t0, ctx);
      if ( p ) {
        assert.equal(phases[p].t0, phases[p - 1].t1, `${ctx}: time gap`);
        assert.ok(Math.abs(phases[p].from - phases[p - 1].to) < 1e-9, `${ctx}: rotation jump`);
      }
    }
    assert.ok(Math.abs(phases[0].from - plan.startRotation) < 1e-9, ctx);
    assert.ok(Math.abs(phases.at(-1).to - plan.finalRotation) < 1e-9, ctx);

    // Events
    const types = events.map(e => e.type);
    assert.equal(types[0], "start", ctx);
    assert.equal(types.at(-1), "land", ctx);
    assert.equal(events.at(-1).t, plan.totalMs, ctx);
    assert.ok(types.includes("slowing"), ctx);
    for ( let e = 1; e < events.length; e++ ) assert.ok(events[e].t >= events[e - 1].t, `${ctx}: events out of order`);
    for ( const t of types ) assert.ok(["start", "slowing", "fakeout", "land"].includes(t), ctx);
    assert.equal(types.includes("fakeout"), !!plan.fakeOut, ctx);

    // Main spin: 5-8 turns plus an offset, never backwards
    const main = phases.find(ph => ph.ease === "spinOut");
    assert.ok(main, ctx);
    const turns = (main.to - plan.startRotation) / 360;
    assert.ok(turns >= 5 && turns < 9, `${ctx}: ${turns} turns`);
    let last = -Infinity;
    for ( let s = 0; s <= 40; s++ ) {
      const r = WM.rotationAt(plan, main.t0 + ((main.t1 - main.t0) * s) / 40);
      assert.ok(r >= last - 1e-9, `${ctx}: main spin ran backwards`);
      last = r;
    }

    if ( fakeOut ) allowed++;
    if ( !plan.fakeOut ) {
      assert.equal(plan.totalMs, Math.max(1500, durationMs), ctx);
      const seg = segs[targetIndex];
      const a = WM.pointerAngle(plan.finalRotation);
      const w = seg.end - seg.start;
      assert.ok(a >= seg.start + 0.15 * w - 1e-3 && a <= seg.start + 0.85 * w + 1e-3, `${ctx}: lands outside the inner 70%`);
      continue;
    }
    assert.ok(fakeOut, `${ctx}: fake-out although disabled`);
    fakeOuts++;
    const extra = plan.totalMs - durationMs;
    assert.ok(extra >= 1500 && extra <= 2500, `${ctx}: fake-out adds ${extra}ms`);
    const stopIndex = WM.segmentIndexAt(segs, main.to);
    if ( plan.fakeOut === "creep" ) {
      // The pointer passes slices in decreasing index order, so "just short" is the slice after the target
      assert.equal(stopIndex, (targetIndex + 1) % n, `${ctx}: creep stopped in the wrong slice`);
      assert.ok(plan.finalRotation > main.to, `${ctx}: creep must move forward`);
    }
    else {
      assert.equal(plan.fakeOut, "rollback", ctx);
      assert.equal(stopIndex, (targetIndex - 1 + n) % n, `${ctx}: rollback stopped in the wrong slice`);
      assert.ok(plan.finalRotation < main.to, `${ctx}: rollback must move backwards`);
    }
    assert.ok(Math.abs(plan.finalRotation - main.to) < 360, ctx);
  }
  const rate = fakeOuts / allowed;
  assert.ok(rate > 0.28 && rate < 0.42, `fake-out rate ${rate}`);
});

test("planSpin: deterministic for a seed, plain JSON, robust to bad input", () => {
  const segs = WM.buildSegments(surgeEntries());
  const a = WM.planSpin({segments: segs, targetIndex: 3, rng: mulberry32(99)});
  const b = WM.planSpin({segments: segs, targetIndex: 3, rng: mulberry32(99)});
  assert.deepEqual(a, b);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), a);
  const empty = WM.planSpin({segments: [], targetIndex: 0});
  assert.equal(WM.rotationAt(empty, empty.totalMs), empty.finalRotation);
  const clamped = WM.planSpin({segments: segs, targetIndex: 999, fakeOut: false, rng: mulberry32(1)});
  assert.equal(WM.segmentIndexAt(segs, clamped.finalRotation), segs.length - 1);
  const never = Array.from({length: 300}, (_, i) => WM.planSpin({segments: segs, targetIndex: i % 50, fakeOut: false, rng: mulberry32(i)}));
  assert.ok(never.every(p => p.fakeOut === null));
});

/* ---------------- extras (sub-rolls) ---------------- */

const ROLL_HTML = total => `<a class="inline-roll inline-result" data-tooltip="x"><i class="fas fa-dice-d20"></i>${total}</a>`;

/** An ExtraContext as core builds it, with controllable totals and tokens. */
function mockExtraContext({total = "mid", token = "named", name = "Zed &amp; Co"} = {}) {
  const calls = [];
  return {
    calls,
    name,
    escape: Q.escapeHTML,
    roll: async (formula, opts = {}) => {
      calls.push({formula, opts});
      const m = /^(\d*)d(\d+)$/.exec(String(formula).replace(/\s/g, ""));
      assert.ok(m, `extra rolled an unexpected formula ${formula}`);
      const n = Number(m[1] || 1);
      const f = Number(m[2]);
      const pick = {min: n, max: n * f, mid: Math.round((n + (n * f)) / 2), minPlus: n + 1, maxMinus: (n * f) - 1};
      const t = (typeof total === "number") ? total : (typeof total === "function" ? total(n, f) : pick[total]);
      return {total: t, html: ROLL_HTML(t)};
    },
    randomNearbyToken: token === "missing" ? undefined : ((feet, opts = {}) => {
      if ( token === "named" ) return {name: "Gob &lt;the&gt; Goblin"};
      if ( token === "self" ) return {name};
      return null;
    })
  };
}

const extraEntries = () => SURGES.filter(e => typeof e.extra === "function");

test("extras: every resolver returns a small safe HTML snippet for valid totals and any token", async () => {
  assert.ok(extraEntries().length >= 10);
  for ( const entry of extraEntries() ) {
    const key = SD.rangeKey(entry.range);
    for ( const total of ["min", "minPlus", "mid", "maxMinus", "max"] ) {
      for ( const token of ["named", "null", "missing", "self"] ) {
        for ( const name of ["Zed &amp; Co", ""] ) {
          const ctx = mockExtraContext({total, token, name});
          const out = await entry.extra(ctx);
          const where = `${key} total=${total} token=${token} name=${JSON.stringify(name)}`;
          assert.equal(typeof out, "string", where);
          assert.ok(out.trim().length > 0 && out.length <= 600, `${where}: length ${out.length}`);
          assert.ok(!/\b(undefined|null|NaN)\b/.test(out), `${where}: ${out}`);
          assert.ok(ctx.calls.length <= 2, `${where}: ${ctx.calls.length} rolls`);
          if ( ctx.calls.length ) assert.ok(out.includes("inline-roll"), `${where}: roll anchor missing`);
          const stripped = out.replace(/<a [^>]*>.*?<\/a>/g, "");
          for ( const tag of stripped.match(/<[^>]+>/g) ?? [] ) assert.match(tag, /^<\/?(strong|em)>$/, `${where}: tag ${tag}`);
        }
      }
    }
  }
});

test("extras: odd totals never throw", async () => {
  for ( const entry of extraEntries() ) {
    for ( const total of [0, -3, 1000, NaN, 2.5] ) {
      for ( const token of ["named", "null", "missing"] ) {
        const out = await entry.extra(mockExtraContext({total, token}));
        assert.ok(out === null || typeof out === "string", `${SD.rangeKey(entry.range)} total=${total}`);
      }
    }
  }
});

const extraFor = key => SURGES.find(e => SD.rangeKey(e.range) === key).extra;

test("extras: height, age, flumphs, healing", async () => {
  const h = extraFor("11-12");
  assert.match(await h(mockExtraContext({total: 3})), /shrinks 3 inches/);
  assert.match(await h(mockExtraContext({total: 4})), /grows 4 inches/);
  assert.match(await h(mockExtraContext({total: 1})), /shrinks 1 inch\b/);
  assert.equal((await (async () => { const c = mockExtraContext({total: 5}); await h(c); return c.calls[0].formula; })()), "1d10");
  const age = extraFor("35-36");
  assert.match(await age(mockExtraContext({total: 7})), /7 years younger/);
  assert.match(await age(mockExtraContext({total: 7})), /never under 1 year/);
  assert.match(await age(mockExtraContext({total: 2})), /2 years older/);
  const flumphs = mockExtraContext({total: 4});
  assert.match(await extraFor("37-38")(flumphs), /4/);
  assert.equal(flumphs.calls[0].formula, "1d6");
  const heal = mockExtraContext({total: 11});
  assert.match(await extraFor("39-40")(heal), /hit points/);
  assert.equal(heal.calls[0].formula, "2d10");
});

test("extras: days, lightning, necrotic formulas", async () => {
  for ( const [key, formula] of [["53-54", "5d6"], ["65-66", "4d10"], ["83-84", "1d10"], ["7-8", "8d6"]] ) {
    const ctx = mockExtraContext({total: "mid"});
    await extraFor(key)(ctx);
    assert.equal(ctx.calls[0].formula, formula, key);
  }
  assert.match(await extraFor("83-84")(mockExtraContext({total: 5})), /Zed &amp; Co heals/);
});

test("extras: random targets with and without a token", async () => {
  const poison = extraFor("73-74");
  assert.match(await poison(mockExtraContext({token: "named"})), /<strong>Gob &lt;the&gt; Goblin<\/strong>/);
  assert.match(await poison(mockExtraContext({token: "null"})), /a random creature of the DM's choosing/);
  assert.match(await poison(mockExtraContext({token: "missing"})), /a random creature of the DM's choosing/);
  assert.match(await poison(mockExtraContext({total: 1})), /<\/a> hour\b/);
  assert.match(await poison(mockExtraContext({total: 3})), /<\/a> hours\b/);
  const fly = extraFor("87-88");
  let asked = null;
  const ctx = mockExtraContext({token: "named"});
  const inner = ctx.randomNearbyToken;
  ctx.randomNearbyToken = (feet, opts) => { asked = {feet, opts}; return inner(feet, opts); };
  assert.match(await fly(ctx), /Gob &lt;the&gt; Goblin/);
  assert.deepEqual(asked, {feet: 60, opts: {includeSelf: true}});
  assert.match(await fly(mockExtraContext({token: "null"})), /DM's choosing/);
  assert.match(await fly(mockExtraContext({token: "self", name: "Zed"})), /<strong>Zed<\/strong>/);
});

test("extras: Reincarnate race table boundaries", async () => {
  const reincarnate = extraFor("91-92");
  const table = [
    [1, "Dragonborn"], [4, "Dragonborn"], [5, "Hill dwarf"], [13, "Hill dwarf"], [14, "Mountain dwarf"], [21, "Mountain dwarf"],
    [22, "Dark elf"], [25, "Dark elf"], [26, "High elf"], [34, "High elf"], [35, "Wood elf"], [42, "Wood elf"],
    [43, "Forest gnome"], [46, "Forest gnome"], [47, "Rock gnome"], [52, "Rock gnome"], [53, "Half-elf"], [56, "Half-elf"],
    [57, "Half-orc"], [60, "Half-orc"], [61, "Lightfoot halfling"], [68, "Lightfoot halfling"], [69, "Stout halfling"],
    [76, "Stout halfling"], [77, "Human"], [96, "Human"], [97, "Tiefling"], [100, "Tiefling"]
  ];
  for ( const [total, race] of table ) {
    const ctx = mockExtraContext({total});
    const out = await reincarnate(ctx);
    assert.ok(out.includes(`<strong>${race}</strong>`), `${total} -> ${race}: ${out}`);
    assert.equal(ctx.calls[0].formula, "1d100");
  }
});

/* ---------------- Foundry mocks ---------------- */

const log = {notifications: [], created: [], emitted: [], updates: [], drawCore: [], shown: [], templates: [], tablesCreated: []};
const resetLog = () => { for ( const k of Object.keys(log) ) log[k] = []; };

class MockCollection extends Map {
  constructor(entries = []) { super(entries.map(e => [e.id, e])); }
  find(fn) { for ( const v of this.values() ) if ( fn(v) ) return v; return undefined; }
  filter(fn) { return [...this.values()].filter(fn); }
  some(fn) { return [...this.values()].some(fn); }
  map(fn) { return [...this.values()].map(fn); }
  getName(n) { return this.find(v => v.name === n); }
  get contents() { return [...this.values()]; }
  [Symbol.iterator]() { return this.values(); }
}

let idCounter = 0;
const randomID = () => `mock${String(++idCounter).padStart(12, "0")}`;

function makeHooks() {
  const events = {};
  const run = (name, args, stopOnFalse) => {
    for ( const h of [...(events[name] ?? [])] ) {
      if ( h.once ) events[name].splice(events[name].indexOf(h), 1);
      if ( (h.fn(...args) === false) && stopOnFalse ) return false;
    }
    return true;
  };
  return {
    events,
    on(name, fn) { (events[name] ??= []).push({fn, once: false}); return fn; },
    once(name, fn) { (events[name] ??= []).push({fn, once: true}); return fn; },
    off() {},
    call: (name, ...args) => run(name, args, true),
    callAll: (name, ...args) => run(name, args, false)
  };
}

class Roll {
  static nextTotals = [];
  static failAnchor = false;
  constructor(formula = "1d20", data = {}) { this._formula = String(formula); this.data = data; this._evaluated = false; }
  get formula() { return this._formula; }
  static create(formula, data) { return new Roll(formula, data); }
  async evaluate({async} = {}) {
    if ( async !== true ) throw new Error("v11 Roll#evaluate needs {async: true}");
    if ( this._evaluated ) throw new Error("This Roll has already been evaluated");
    this._evaluated = true;
    if ( Roll.nextTotals.length ) this.total = Roll.nextTotals.shift();
    else {
      const m = /^(\d*)d(\d+)$/.exec(this._formula.replace(/\s/g, ""));
      const n = m ? Number(m[1] || 1) : 1;
      const f = m ? Number(m[2]) : 20;
      let t = 0;
      for ( let i = 0; i < n; i++ ) t += 1 + Math.floor(Math.random() * f);
      this.total = t;
    }
    return this;
  }
  async reroll() { return new Roll(this._formula).evaluate({async: true}); }
  toAnchor({label} = {}) {
    if ( Roll.failAnchor ) throw new Error("toAnchor failed (test)");
    return {outerHTML: `<a class="inline-roll inline-result">${label ? `${label}: ` : ""}${this.total}</a>`};
  }
  async toMessage(data = {}, {rollMode} = {}) {
    if ( !this._evaluated ) await this.evaluate({async: true});
    return ChatMessage.create({...data, type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [this]}, {rollMode});
  }
  toJSON() { return {class: "Roll", formula: this._formula, total: this.total, evaluated: this._evaluated}; }
  static fromData(d) { const r = new Roll(d.formula); r.total = d.total; r._evaluated = true; return r; }
  static fromJSON(j) { return Roll.fromData(JSON.parse(j)); }
}

class TableResult {
  constructor(data, parent) {
    Object.assign(this, {type: 0, drawn: false, flags: {}, img: null, text: ""}, foundry.utils.deepClone(data));
    this.id = data._id ?? data.id ?? randomID();
    this._id = this.id;
    this.parent = parent;
  }
  getChatText() {
    if ( this.type === 1 ) return `@${this.documentCollection}[${this.documentId}]{${this.text}}`;
    return this.text;
  }
}

class RollTable {
  constructor(data = {}) {
    const {results = [], ...rest} = data;
    Object.assign(this, {formula: "1d100", replacement: true, displayRoll: true, flags: {}, pack: null}, foundry.utils.deepClone(rest));
    this.id = data._id ?? data.id ?? randomID();
    this.documentName = "RollTable";
    this.results = new MockCollection(results.map(r => new TableResult(r, this)));
  }
  get uuid() { return `RollTable.${this.id}`; }
  static get implementation() { return RollTable; }
  static async create(data) {
    const t = new RollTable(data);
    log.tablesCreated.push(data);
    game.tables.set(t.id, t);
    return t;
  }
  static async updateDocuments(updates) { log.updates.push({nested: updates}); return []; }
  async roll({roll} = {}) {
    roll = roll instanceof Roll ? roll : Roll.create(this.formula);
    let results = [];
    for ( let i = 0; !results.length && (i < 1000); i++ ) {
      roll = await roll.reroll();
      results = this.getResultsForRoll(roll.total);
    }
    return {roll, results};
  }
  getResultsForRoll(value) { return this.results.filter(r => !r.drawn && (value >= r.range[0]) && (value <= r.range[1])); }
  async updateEmbeddedDocuments(type, updates) {
    if ( this.failUpdates ) throw new Error("You lack permission to update this table (test)");
    log.updates.push({table: this.id, type, updates});
    for ( const u of updates ) Object.assign(this.results.get(u._id) ?? {}, u);
    return updates;
  }
  /** Core RollTable#draw stand-in: records that the wheel was bypassed. */
  async draw(options = {}) {
    log.drawCore.push({table: this.id, options});
    return {roll: null, results: [], core: true};
  }
  async toMessage(results, opts) {
    return ChatMessage.create({content: "core table card", flavor: `Draws a result from the ${this.name} table.`}, opts?.messageOptions);
  }
  async setFlag(scope, key, value) { (this.flags[scope] ??= {})[key] = value; return this; }
  getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  testUserPermission() { return true; }
}

class ChatMessage {
  static failCreate = 0;
  constructor(data = {}) {
    Object.assign(this, {whisper: [], blind: false, rolls: [], flags: {}}, foundry.utils.deepClone(data));
    if ( data.rolls ) this.rolls = data.rolls;
    this.id = randomID();
  }
  get isContentVisible() { return true; }
  getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  static get implementation() { return ChatMessage; }
  static getSpeaker({actor, token, alias} = {}) {
    if ( token ) return {scene: "scene1", token: token.id, actor: token.actorId ?? null, alias: alias ?? token.name};
    if ( actor ) return {scene: "scene1", actor: actor.id, token: null, alias: alias ?? actor.name};
    return {scene: "scene1", actor: null, token: null, alias: alias ?? game.user.name};
  }
  static getSpeakerActor(speaker) { return speaker?.actor ? (game.actors.get(speaker.actor) ?? null) : null; }
  static getWhisperRecipients() { return game.users.filter(u => u.isGM); }
  /** Copied in spirit from v11 ChatMessage.applyRollMode. */
  static applyRollMode(chatData, rollMode) {
    const modes = CONST.DICE_ROLL_MODES;
    if ( rollMode === "roll" ) rollMode = game.settings.get("core", "rollMode");
    if ( [modes.PRIVATE, modes.BLIND].includes(rollMode) ) chatData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
    else if ( rollMode === modes.SELF ) chatData.whisper = [game.user.id];
    else if ( rollMode === modes.PUBLIC ) chatData.whisper = [];
    chatData.blind = rollMode === modes.BLIND;
    return chatData;
  }
  static async create(data, options = {}) {
    if ( ChatMessage.failCreate > 0 ) {
      ChatMessage.failCreate--;
      throw new Error("ChatMessage.create failed (test)");
    }
    const msg = new ChatMessage(data);
    // Like the client backend: the preCreate hook may cancel creation
    if ( Hooks.call("preCreateChatMessage", msg, foundry.utils.deepClone(data), options, game.user.id) === false ) return undefined;
    log.created.push({data, options, msg});
    game.messages.set(msg.id, msg);
    return msg;
  }
}

let appCounter = 0;
class Application {
  static RENDER_STATES = Object.freeze({CLOSING: -2, CLOSED: -1, NONE: 0, RENDERING: 1, RENDERED: 2, ERROR: 3});
  static get defaultOptions() {
    return {classes: [], template: null, width: null, height: null, popOut: true, minimizable: true, resizable: false, title: ""};
  }
  constructor(options = {}) {
    this.options = foundry.utils.mergeObject(this.constructor.defaultOptions, options);
    this.appId = ++appCounter;
    this._state = Application.RENDER_STATES.NONE;
  }
  render() { return this; }
  async close() { this._state = Application.RENDER_STATES.CLOSED; }
  _getHeaderButtons() { return [{label: "Close", class: "close", icon: "fa-solid fa-xmark", onclick: () => this.close()}]; }
  activateListeners() {}
}
class FormApplication extends Application {
  constructor(object = {}, options = {}) { super(options); this.object = object; }
}

/** en.json, flattened, so the i18n mock returns real strings and records keys that don't exist. */
const LANG = JSON.parse(fs.readFileSync(rel("lang/en.json"), "utf8"));
const flatten = (obj, prefix = "") => Object.entries(obj).reduce((acc, [k, v]) => (
  (v && typeof v === "object") ? Object.assign(acc, flatten(v, `${prefix}${k}.`)) : Object.assign(acc, {[`${prefix}${k}`]: v})
), {});
const LANG_FLAT = flatten(LANG);
const missingI18n = new Set();

const settingsStore = {};
const registeredSettings = new Map();
const registeredMenus = new Map();

function installGlobals() {
  const g = globalThis;
  g.Hooks = makeHooks();
  g.CONST = {
    CHAT_MESSAGE_TYPES: {OTHER: 0, OOC: 1, IC: 2, EMOTE: 3, WHISPER: 4, ROLL: 5},
    DICE_ROLL_MODES: {PUBLIC: "publicroll", PRIVATE: "gmroll", BLIND: "blindroll", SELF: "selfroll"},
    DOCUMENT_OWNERSHIP_LEVELS: {INHERIT: -1, NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3},
    TABLE_RESULT_TYPES: {TEXT: 0, DOCUMENT: 1, COMPENDIUM: 2}
  };
  g.CONFIG = {RollTable: {resultTemplate: "templates/dice/table-result.html"}, Dice: {sound: "sounds/dice.wav"}, debug: {}};
  g.foundry = {utils: {
    randomID,
    deepClone: v => (v === undefined ? v : JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Roll ? x.toJSON() : x)))),
    mergeObject: (a, b) => ({...a, ...b}),
    getProperty: (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj)
  }};
  Object.assign(g, {Roll, RollTable, TableResult, ChatMessage, Application, FormApplication});
  g.HTMLElement = class HTMLElement {};
  g.Dialog = {confirm: async () => true};
  g.fromUuid = async uuid => game.tables.get(String(uuid).split(".").pop()) ?? null;
  g.TextEditor = {
    fail: false,
    async enrichHTML(content, {async} = {}) {
      if ( async !== true ) throw new Error("v11 enrichHTML needs {async: true}");
      if ( g.TextEditor.fail ) throw new Error("enrichHTML failed (test)");
      return `<p>${content}</p>`;
    }
  };
  g.renderTemplate = async (p, ctx) => {
    if ( g.renderTemplate.fail ) throw new Error("template missing (test)");
    log.templates.push({path: p, ctx});
    return `<div class="magic-wheel-card" data-template="${p}">rendered</div>`;
  };
  g.loadTemplates = async paths => { g.loadTemplates.last = paths; return []; };
  g.ui = {notifications: {
    info: m => log.notifications.push(["info", m]),
    warn: m => log.notifications.push(["warn", m]),
    error: m => log.notifications.push(["error", m])
  }};
  g.canvas = {ready: false};
  const users = new MockCollection([
    {id: "gm1", name: "Dungeon Master", isGM: true, active: true, character: null},
    {id: "p1", name: "Sam & <Friends>", isGM: false, active: true, character: null},
    {id: "p2", name: "Offline Olly", isGM: false, active: false, character: null}
  ]);
  Object.defineProperty(users, "activeGM", {get() { return this.filter(u => u.active && u.isGM)[0] ?? null; }});
  g.game = {
    user: users.get("gm1"),
    users,
    system: {id: "dnd5e"},
    modules: new Map([["magic-wheel", {id: "magic-wheel", active: true}]]),
    tables: new MockCollection(),
    messages: new MockCollection(),
    actors: new MockCollection(),
    i18n: {
      localize: k => {
        if ( !(k in LANG_FLAT) ) missingI18n.add(k);
        return LANG_FLAT[k] ?? k;
      },
      format: (k, data = {}) => {
        if ( !(k in LANG_FLAT) ) missingI18n.add(k);
        return String(LANG_FLAT[k] ?? k).replace(/\{(\w+)\}/g, (m, p) => (p in data ? String(data[p]) : m));
      }
    },
    socket: {
      handlers: {},
      failEmit: false,
      on(name, fn) { this.handlers[name] = fn; },
      emit(name, data) {
        if ( this.failEmit ) throw new Error("socket down (test)");
        log.emitted.push({name, data: JSON.parse(JSON.stringify(data))});
      }
    },
    settings: {
      register(ns, key, data) {
        if ( data.type && !(data.type instanceof Function) ) throw new Error(`bad setting type for ${key}`);
        if ( !["world", "client"].includes(data.scope) ) throw new Error(`bad scope for ${key}`);
        registeredSettings.set(`${ns}.${key}`, {...data, namespace: ns, key});
      },
      registerMenu(ns, key, data) {
        if ( !data.type || !(data.type.prototype instanceof FormApplication) ) {
          throw new Error("You must provide a menu type that is a FormApplication instance or subclass");
        }
        registeredMenus.set(`${ns}.${key}`, data);
      },
      get(ns, key) {
        const k = `${ns}.${key}`;
        if ( k === "core.rollMode" ) return settingsStore[k] ?? "publicroll";
        if ( k === "core.globalInterfaceVolume" ) return 0.5;
        if ( !registeredSettings.has(k) ) throw new Error(`This is not a registered game setting: ${k}`);
        return (k in settingsStore) ? settingsStore[k] : registeredSettings.get(k).default;
      },
      async set(ns, key, value) {
        const k = `${ns}.${key}`;
        if ( (k !== "core.rollMode") && !registeredSettings.has(k) ) throw new Error(`This is not a registered game setting: ${k}`);
        settingsStore[k] = JSON.parse(JSON.stringify(value));
        return value;
      }
    }
  };
}

/** Timers in the module (reveal wait, extra timeout, Wild Magic Surge 5e grace) run near-instantly in tests. */
const realSetTimeout = globalThis.setTimeout;
function useFastTimers() {
  globalThis.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, Math.min(Number(ms) || 0, 2), ...args);
}

const M = {};
const setSetting = (key, value) => { settingsStore[`magic-wheel.${key}`] = value; };
const setUser = id => { game.user = game.users.get(id); };

function resetWorld({user = "gm1"} = {}) {
  resetLog();
  for ( const k of Object.keys(settingsStore) ) delete settingsStore[k];
  game.tables.clear();
  game.messages.clear();
  game.actors.clear();
  game.socket.failEmit = false;
  setUser(user);
  Roll.nextTotals = [];
  Roll.failAnchor = false;
  ChatMessage.failCreate = 0;
  TextEditor.fail = false;
  renderTemplate.fail = false;
  canvas = {ready: false};
}

/** Real Wild Magic Surge table, built from the module's own creation data. */
async function makeWildTable(overrides = {}) {
  const table = await RollTable.create({...M.tableSetup.wildMagicTableData(), ...overrides});
  log.tablesCreated = [];
  return table;
}

const spinFlag = msg => msg?.flags?.["magic-wheel"]?.spin;
const rollTableFlag = msg => msg?.flags?.core?.RollTable ?? msg?.flags?.["core.RollTable"];

/* ---------------- import smoke test ---------------- */

test("import smoke: every script loads under a minimal Foundry mock, and init/ready run", async () => {
  installGlobals();
  useFastTimers();
  RollTable.prototype.draw.isCoreMock = true;
  const files = [
    ...fs.readdirSync(rel("scripts")).filter(f => f.endsWith(".js")).map(f => `scripts/${f}`),
    ...fs.readdirSync(rel("scripts/data")).filter(f => f.endsWith(".js")).map(f => `scripts/data/${f}`)
  ];
  assert.equal(files.length, 18, `found ${files.length} scripts`);
  for ( const f of files ) {
    try {
      M[path.basename(f, ".js")] = await importProject(f);
    } catch(err) {
      throw new Error(`${f} failed to import: ${err.message}`);
    }
  }
  M.tableSetup = M["table-setup"];
  M.wheelApp = M["wheel-app"];

  // Stub the window: record what would be shown
  M.wheelApp.WheelApp.show = (presentation, options = {}) => {
    if ( M.wheelApp.WheelApp.failShow ) throw new Error("WheelApp exploded (test)");
    log.shown.push({presentation, options});
    return {landed: Promise.resolve()};
  };

  Hooks.callAll("init");
  assert.ok(registeredSettings.size >= 15, `${registeredSettings.size} settings registered`);
  assert.ok(registeredMenus.has("magic-wheel.createTable"));
  assert.deepEqual(loadTemplates.last, Object.values(C.TEMPLATES));
  assert.notEqual(RollTable.prototype.draw.isCoreMock, true, "RollTable#draw was not wrapped");
  assert.equal(typeof globalThis.MagicWheel?.spin, "function");
  for ( const hook of ["renderChatMessage", "preCreateChatMessage", "getRollTableConfigHeaderButtons", "dnd5e.useItem"] ) {
    assert.ok(Hooks.events[hook]?.length, `no ${hook} hook`);
  }

  // ready: the socket listens and the active GM creates the table once
  Hooks.callAll("ready");
  await new Promise(r => realSetTimeout(r, 20));
  assert.equal(typeof game.socket.handlers[C.SOCKET_NAME], "function");
  assert.equal(log.tablesCreated.length, 1, "the table should be auto-created on first ready");
  const created = log.tablesCreated[0];
  assert.equal(created.results.length, 50);
  assert.equal(created.results.reduce((s, r) => s + r.weight, 0), 100);
  assert.equal(created.flags["magic-wheel"].kind, C.WILD_MAGIC_KIND);
  assert.equal(game.settings.get("magic-wheel", "tableCreated"), true);
  assert.equal(game.modules.get("magic-wheel").api, globalThis.MagicWheel);
});

/* ---------------- settings, i18n and files ---------------- */

test("every setting key read in code is registered with the right scope", () => {
  const worldKeys = ["tableNames", "audience", "spinSeconds", "fakeOuts", "commentary", "autoCreateTable", "tableCreated",
    "surgeCheck", "surgeFeatureName", "wmsIntegration"];
  const clientKeys = ["sound", "volume", "autoCloseSeconds", "skipWheel", "history"];
  for ( const k of worldKeys ) assert.equal(registeredSettings.get(`magic-wheel.${k}`)?.scope, "world", k);
  for ( const k of clientKeys ) assert.equal(registeredSettings.get(`magic-wheel.${k}`)?.scope, "client", k);
  for ( const key of Object.values(C.SETTINGS) ) assert.ok(registeredSettings.has(`magic-wheel.${key}`), key);
  // Every SETTINGS.x referenced in the scripts is a defined key
  for ( const f of fs.readdirSync(rel("scripts")).filter(x => x.endsWith(".js")) ) {
    const src = fs.readFileSync(rel(`scripts/${f}`), "utf8");
    for ( const m of src.matchAll(/SETTINGS\.(\w+)/g) ) assert.ok(m[1] in C.SETTINGS, `${f}: SETTINGS.${m[1]}`);
  }
  const s = k => registeredSettings.get(`magic-wheel.${k}`);
  assert.equal(s("tableNames").default, "Wild Magic Surge");
  assert.deepEqual(Object.keys(s("audience").choices), ["everyone", "roller"]);
  assert.deepEqual(s("spinSeconds").range, {min: 4, max: 15, step: 1});
  assert.equal(s("tableCreated").config, false);
  assert.equal(s("history").config, false);
  assert.deepEqual(s("history").default, []);
  assert.equal(s("volume").default, 0.6);
});

test("en.json has every i18n key the code and settings use", () => {
  for ( const [k, data] of [...registeredSettings, ...registeredMenus] ) {
    for ( const field of ["name", "hint", "label"] ) {
      if ( data[field] ) assert.ok(data[field] in LANG_FLAT, `${k}.${field}: ${data[field]}`);
    }
    for ( const label of Object.values(data.choices ?? {}) ) assert.ok(label in LANG_FLAT, `${k} choice ${label}`);
  }
  for ( const f of fs.readdirSync(rel("scripts")).filter(x => x.endsWith(".js")) ) {
    const src = fs.readFileSync(rel(`scripts/${f}`), "utf8");
    for ( const m of src.matchAll(/["'`](MAGICWHEEL\.[A-Za-z0-9_.]+)["'`]/g) ) assert.ok(m[1] in LANG_FLAT, `${f}: ${m[1]}`);
  }
  for ( const v of Object.values(LANG_FLAT) ) assert.ok(typeof v === "string" && v.trim(), "empty translation");
});

test("module.json, templates and assets point at real files", () => {
  const manifest = JSON.parse(fs.readFileSync(rel("module.json"), "utf8"));
  assert.equal(manifest.id, C.MODULE_ID);
  assert.equal(manifest.socket, true);
  assert.equal(C.SOCKET_NAME, `module.${manifest.id}`);
  for ( const p of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)] ) {
    assert.ok(fs.existsSync(rel(p)), `missing ${p}`);
  }
  const prefix = `modules/${C.MODULE_ID}/`;
  for ( const p of [...Object.values(C.TEMPLATES), C.TABLE_IMG] ) {
    assert.ok(p.startsWith(prefix), p);
    assert.ok(fs.existsSync(rel(p.slice(prefix.length))), `missing ${p}`);
  }
  const pkg = JSON.parse(fs.readFileSync(rel("package.json"), "utf8"));
  assert.equal(pkg.scripts.test, "node tests/run-tests.mjs");
});

test("Font Awesome icons exist in Foundry's bundled CSS (when Foundry is installed)", () => {
  const css = [
    "C:/Program Files/Foundry10/Foundry Virtual Tabletop/resources/app/public/fonts/fontawesome/css/all.min.css",
    process.env.FOUNDRY_FA_CSS
  ].filter(Boolean).find(p => fs.existsSync(p));
  if ( !css ) {
    process.stdout.write("     (skipped: Foundry's all.min.css not found)\n");
    return;
  }
  const src = fs.readFileSync(css, "utf8");
  const files = ["scripts", "scripts/data", "templates"].flatMap(d => fs.readdirSync(rel(d))
    .filter(f => /\.(js|hbs)$/.test(f)).map(f => fs.readFileSync(rel(`${d}/${f}`), "utf8")));
  const names = new Set(files.flatMap(s => [...s.matchAll(/fa-(?:solid|regular) fa-([a-z0-9-]+)/g)].map(m => m[1])));
  assert.ok(names.size > 40);
  for ( const n of names ) assert.ok(src.includes(`.fa-${n}:`), `fa-${n} is not in Foundry's Font Awesome`);
});

/* ---------------- surge.js pure helpers ---------------- */

test("computeAudience for every roll mode and audience setting", () => {
  const {computeAudience} = M.surge;
  const base = {rollerId: "p1", gmIds: ["gm1", "gm2"]};
  assert.equal(computeAudience({...base, rollMode: "publicroll"}), null);
  assert.equal(computeAudience({...base, rollMode: "publicroll", audienceSetting: "everyone"}), null);
  assert.deepEqual(computeAudience({...base, rollMode: "publicroll", audienceSetting: "roller"}), ["p1", "gm1", "gm2"]);
  assert.deepEqual(computeAudience({...base, rollMode: "gmroll"}), ["p1", "gm1", "gm2"]);
  assert.deepEqual(computeAudience({...base, rollMode: "gmroll", audienceSetting: "roller"}), ["p1", "gm1", "gm2"]);
  assert.deepEqual(computeAudience({...base, rollMode: "blindroll"}), ["gm1", "gm2"]);
  assert.deepEqual(computeAudience({...base, rollMode: "blindroll", audienceSetting: "roller"}), ["gm1", "gm2"]);
  assert.deepEqual(computeAudience({...base, rollMode: "selfroll"}), ["p1"]);
  assert.deepEqual(computeAudience({...base, rollMode: "selfroll", audienceSetting: "roller"}), ["p1"]);
  // A GM roller is not listed twice
  assert.deepEqual(computeAudience({rollMode: "gmroll", rollerId: "gm1", gmIds: ["gm1", "gm2"]}), ["gm1", "gm2"]);
  assert.deepEqual(computeAudience({rollMode: "blindroll", rollerId: "gm1", gmIds: ["gm1"]}), ["gm1"]);
  assert.deepEqual(computeAudience({rollMode: "selfroll", rollerId: "p1"}), ["p1"]);
});

const mockTable = (data = {}) => new RollTable({name: "Some Table", results: [], ...data});

test("isWheelTable: flags beat names, names are trimmed and case-insensitive", () => {
  resetWorld();
  const {isWheelTable} = M.surge;
  assert.equal(isWheelTable(null), false);
  assert.equal(isWheelTable(mockTable({name: "Loot"})), false);
  assert.equal(isWheelTable(mockTable({name: "Wild Magic Surge"})), true);
  assert.equal(isWheelTable(mockTable({name: "  wild MAGIC surge "})), true);
  assert.equal(isWheelTable(mockTable({name: "Wild Magic Surge", flags: {"magic-wheel": {wheel: false}}})), false);
  assert.equal(isWheelTable(mockTable({name: "Loot", flags: {"magic-wheel": {wheel: true}}})), true);
  assert.equal(isWheelTable(mockTable({name: "Loot", flags: {"magic-wheel": {kind: "wild-magic"}}})), true);
  assert.equal(isWheelTable(mockTable({name: "Loot", flags: {"magic-wheel": {kind: "wild-magic", wheel: false}}})), false);
  setSetting("tableNames", "Loot,  Mimic Mayhem ,");
  assert.equal(isWheelTable(mockTable({name: "mimic mayhem"})), true);
  assert.equal(isWheelTable(mockTable({name: "LOOT"})), true);
  assert.equal(isWheelTable(mockTable({name: "Wild Magic Surge"})), false);
  assert.equal(isWheelTable(mockTable({name: ""})), false);
});

test("tableKind: flag, name, or at least 40 matching surge ranges", () => {
  resetWorld();
  const {tableKind} = M.surge;
  const surgeResults = count => SURGES.slice(0, count).map(e => ({range: [...e.range], text: e.text}));
  assert.equal(tableKind(null), "generic");
  assert.equal(tableKind(mockTable({name: "Loot", flags: {"magic-wheel": {kind: "wild-magic"}}})), "wild-magic");
  assert.equal(tableKind(mockTable({name: "My WildMagic Surge table"})), "wild-magic");
  assert.equal(tableKind(mockTable({name: "Chaos d100", results: surgeResults(50)})), "wild-magic");
  assert.equal(tableKind(mockTable({name: "Chaos d100", results: surgeResults(40)})), "wild-magic");
  assert.equal(tableKind(mockTable({name: "Chaos d100", results: surgeResults(39)})), "generic");
  assert.equal(tableKind(mockTable({name: "Loot", results: [{range: [1, 3], text: "x"}]})), "generic");
});

test("findWildMagicTable: flagged table first, then names from the setting", async () => {
  resetWorld();
  const {findWildMagicTable} = M.surge;
  assert.equal(findWildMagicTable(), null);
  const named = await RollTable.create({name: "Wild Magic Surge"});
  assert.equal(findWildMagicTable(), named);
  const flagged = await RollTable.create({name: "Sorcery", flags: {"magic-wheel": {kind: "wild-magic"}}});
  assert.equal(findWildMagicTable(), flagged);
});

test("makeRandomNearbyToken: distance, visibility, self, scene and escaping", () => {
  resetWorld();
  const tok = (id, name, x, extra = {}) => ({id, name, center: {x, y: 0}, document: {hidden: false, name}, visible: true, actor: {id: `a-${id}`}, ...extra});
  const self = tok("t0", "Zed", 0);
  const near = tok("t1", "Gob <1>", 30);
  const far = tok("t2", "Far", 100);
  const hidden = tok("t3", "Hidden", 10, {document: {hidden: true}});
  const invisible = tok("t4", "Invisible", 10, {visible: false});
  canvas = {
    ready: true,
    scene: {id: "scene1"},
    tokens: {placeables: [self, near, far, hidden, invisible]},
    grid: {measureDistance: (a, b) => Math.abs(a.x - b.x)}
  };
  const pick = M.surge.makeRandomNearbyToken({scene: "scene1", token: "t0", actor: "a-t0"});
  for ( let i = 0; i < 30; i++ ) assert.deepEqual(pick(60), {name: "Gob &lt;1&gt;"});
  const withSelf = new Set(Array.from({length: 200}, () => pick(60, {includeSelf: true}).name));
  assert.deepEqual([...withSelf].sort(), ["Gob &lt;1&gt;", "Zed"]);
  assert.equal(pick(5), null);
  assert.equal(M.surge.makeRandomNearbyToken({scene: "elsewhere", token: "t0"})(60), null);
  assert.equal(M.surge.makeRandomNearbyToken({scene: "scene1", actor: "a-t0"})(60)?.name, "Gob &lt;1&gt;");
  assert.equal(M.surge.makeRandomNearbyToken({scene: "scene1", token: "nope"})(60), null);
  canvas = {ready: false};
  assert.equal(pick(60), null);
});

test("stripText / truncateLabel", () => {
  const {stripText, truncateLabel} = M.surge;
  assert.equal(stripText("<p>You gain @UUID[Item.abc]{a Potion} &amp; [[/r 1d4]] coins</p>"), "You gain a Potion & 1d4 coins");
  assert.equal(stripText(null), "");
  assert.equal(truncateLabel("SHORT"), "SHORT");
  const long = truncateLabel("A VERY LONG RESULT LABEL INDEED");
  assert.ok(long.length <= 18 && long.endsWith("…"));
});

/* ---------------- end to end: draw -> wheel -> socket -> chat card ---------------- */

test("e2e: a public wild magic draw spins for everyone and posts one card", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [7];
  const out = await table.draw({roll: true, displayChat: true});
  assert.deepEqual(out.results.map(r => r.range), [[7, 8]]);
  assert.equal(out.roll.total, 7);

  // One broadcast, to everyone
  assert.equal(log.emitted.length, 1);
  const {name, data} = log.emitted[0];
  assert.equal(name, C.SOCKET_NAME);
  assert.equal(data.action, "spin");
  assert.equal(data.audience, null);

  // Shown here, on a copy
  assert.equal(log.shown.length, 1);
  assert.equal(log.shown[0].options.replay ?? false, false);

  // One chat card, with the spin and the core table flag, no rolls and no sound
  assert.equal(log.created.length, 1);
  const msg = log.created[0].msg;
  assert.equal(log.created[0].data.type, CONST.CHAT_MESSAGE_TYPES.OTHER);
  assert.equal(log.created[0].data.rolls, undefined);
  assert.equal(log.created[0].data.sound, null);
  assert.deepEqual(log.created[0].data.whisper, []);
  assert.equal(rollTableFlag(msg), table.id);
  const p = spinFlag(msg);
  assert.ok(p, "no flags.magic-wheel.spin");
  assert.equal(p.spinId, data.presentation.spinId);
  assert.deepEqual(log.shown[0].presentation, p);
  assert.notEqual(log.shown[0].presentation, p, "the UI must get its own copy");

  // The presentation itself
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p, "presentation must be plain JSON");
  assert.equal(p.version, C.PRESENTATION_VERSION);
  assert.equal(p.kind, "wild-magic");
  assert.equal(p.total, 7);
  assert.equal(p.tableId, table.id);
  assert.equal(p.userId, "gm1");
  assert.equal(p.segments.length, 50);
  assert.equal(p.segments[p.targetIndex].id, out.results[0].id);
  assert.equal(WM.segmentIndexAt(p.segments, p.plan.finalRotation), p.targetIndex);
  assert.equal(p.result.rangeLabel, "07-08");
  assert.equal(p.result.label, "FIREBALL (ON YOU)");
  assert.equal(p.result.tone, SD.findSurgeByRange([7, 8]).tone);
  assert.match(p.result.effectHtml, /Fireball/);
  assert.match(p.result.extraHtml, /inline-roll/);
  assert.ok(SD.findSurgeByRange([7, 8]).lines.length && typeof p.result.line === "string");
  assert.match(p.result.landed, /FIREBALL \(ON YOU\)/);
  for ( const k of ["title", "intro", "slowing", "sponsor", "closeLabel"] ) assert.equal(typeof p.chatter[k], "string", `chatter.${k}`);
  assert.equal(p.chatter.spinning.length, 3);
  assert.ok(p.chatter.reactions.length >= 4 && p.chatter.reactions.length <= 6);
  assert.ok(p.chatter.viewers.end > p.chatter.viewers.start);
  assert.equal(p.chatter.fakeOut === null, p.plan.fakeOut === null, "fakeOut line iff the plan fakes out");
  assert.equal(p.replay, false);
  if ( p.result.box ) assert.equal(p.result.box.tierClass, p.result.box.tier.toLowerCase());

  // Replacement table: nothing marked drawn. History updated after the card.
  assert.equal(log.updates.length, 0);
  assert.equal(game.settings.get("magic-wheel", "history")[0].key, "wild-magic:7-8");
});

test("e2e: drawn flags are updated only when replacement is off", async () => {
  resetWorld();
  const table = await makeWildTable({replacement: false});
  Roll.nextTotals = [42];
  const {results} = await table.draw({roll: true});
  assert.equal(log.updates.length, 1);
  assert.deepEqual(log.updates[0].updates, [{_id: results[0].id, drawn: true}]);
  assert.equal(results[0].drawn, true);
  assert.equal(log.created.length, 1);

  // A player who can't update the table still gets the wheel and the card
  resetWorld({user: "p1"});
  const locked = await makeWildTable({replacement: false});
  locked.failUpdates = true;
  Roll.nextTotals = [42];
  await locked.draw({roll: true});
  assert.equal(log.created.length, 1);
  assert.ok(log.notifications.some(([type, m]) => type === "warn" && /Could not mark/.test(m)));
});

test("e2e: the wheel is bypassed for displayChat false, magicWheel false and non-wheel tables", async () => {
  resetWorld();
  const table = await makeWildTable();
  await table.draw({displayChat: false});
  await table.draw({magicWheel: false});
  const loot = await RollTable.create({name: "Loot", results: [{range: [1, 100], text: "A spoon"}]});
  await loot.draw({roll: true});
  const off = await makeWildTable({flags: {"magic-wheel": {wheel: false, kind: "wild-magic"}}});
  await off.draw();
  assert.equal(log.drawCore.length, 4);
  assert.equal(log.emitted.length, 0);
  assert.equal(log.created.length, 0);
  assert.equal(log.shown.length, 0);
});

test("e2e: the sheet's Roll button (already decided roll and results) is honoured", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [99];
  const tableRoll = await table.roll();
  const out = await table.draw(tableRoll);
  assert.equal(out.roll, tableRoll.roll);
  assert.equal(spinFlag(log.created[0].msg).result.rangeLabel, "99-00");
});

test("e2e: player roll modes set the audience, whisper and blind handling", async () => {
  // gmroll
  resetWorld({user: "p1"});
  let table = await makeWildTable();
  Roll.nextTotals = [21];
  await table.draw({rollMode: "gmroll"});
  assert.deepEqual(log.emitted[0].data.audience, ["p1", "gm1"]);
  assert.equal(log.shown.length, 1);
  assert.deepEqual(log.created[0].data.whisper, ["gm1"]);
  assert.equal(log.created[0].data.type, CONST.CHAT_MESSAGE_TYPES.OTHER);
  assert.equal(spinFlag(log.created[0].msg).speakerName, "Sam & <Friends>", "presentation speaker is plain text");
  assert.ok(log.templates[0].ctx.speakerName.includes("&lt;Friends&gt;"), "chat card speaker is escaped");

  // blindroll: the roller doesn't see the wheel or the result
  resetWorld({user: "p1"});
  table = await makeWildTable();
  Roll.nextTotals = [21];
  await table.draw({rollMode: "blindroll"});
  assert.deepEqual(log.emitted[0].data.audience, ["gm1"]);
  assert.equal(log.shown.length, 0);
  assert.ok(log.notifications.some(([type, m]) => type === "info" && Q.QUIPS.blind.includes(m)), "blind quip expected");
  const blind = log.created[0].data;
  assert.equal(blind.type, CONST.CHAT_MESSAGE_TYPES.ROLL);
  assert.deepEqual(blind.rolls, []);
  assert.equal(blind.blind, true);
  assert.deepEqual(blind.whisper, ["gm1"]);

  // selfroll
  resetWorld({user: "p1"});
  table = await makeWildTable();
  Roll.nextTotals = [21];
  await table.draw({rollMode: "selfroll"});
  assert.deepEqual(log.emitted[0].data.audience, ["p1"]);
  assert.deepEqual(log.created[0].data.whisper, ["p1"]);

  // public roll with the "roller and GMs" audience setting
  resetWorld({user: "p1"});
  setSetting("audience", "roller");
  table = await makeWildTable();
  Roll.nextTotals = [21];
  await table.draw();
  assert.deepEqual(log.emitted[0].data.audience, ["p1", "gm1"]);
  assert.deepEqual(log.created[0].data.whisper, []);

  // The user's chat roll mode is used when none is given
  resetWorld({user: "p1"});
  settingsStore["core.rollMode"] = "gmroll";
  table = await makeWildTable();
  Roll.nextTotals = [21];
  await table.draw({roll: true});
  assert.deepEqual(log.emitted[0].data.audience, ["p1", "gm1"]);
});

test("e2e: skipWheel shows nothing locally but still broadcasts and posts", async () => {
  resetWorld({user: "p1"});
  setSetting("skipWheel", true);
  const table = await makeWildTable();
  Roll.nextTotals = [50];
  await table.draw();
  assert.equal(log.shown.length, 0);
  assert.equal(log.emitted.length, 1);
  assert.equal(log.created.length, 1);
  assert.ok(log.notifications.some(([, m]) => Q.QUIPS.skipWheel.includes(m)));
});

test("e2e: a throwing or rejecting extra still yields a chat card", async () => {
  const entry = SD.findSurgeByRange([11, 12]);
  const original = entry.extra;
  try {
    for ( const broken of [() => { throw new Error("extra exploded (test)"); }, async () => { throw new Error("async extra (test)"); }, async () => 42] ) {
      resetWorld();
      entry.extra = broken;
      const table = await makeWildTable();
      Roll.nextTotals = [11];
      await table.draw();
      assert.equal(log.created.length, 1);
      const p = spinFlag(log.created[0].msg);
      assert.ok(p, "the wheel data should survive a broken extra");
      assert.equal(p.result.extraHtml, null);
      assert.equal(log.emitted.length, 1);
    }
  } finally {
    entry.extra = original;
  }
  // toAnchor failing falls back to a bold total
  resetWorld();
  Roll.failAnchor = true;
  const table = await makeWildTable();
  Roll.nextTotals = [11, 4];
  await table.draw();
  assert.match(spinFlag(log.created[0].msg).result.extraHtml, /<strong>4<\/strong>/);
});

test("e2e: enrichment, template, socket, window and create failures still yield a chat card", async () => {
  // enrichHTML throws: escaped plain text instead
  resetWorld();
  TextEditor.fail = true;
  let table = await makeWildTable();
  Roll.nextTotals = [7];
  await table.draw();
  assert.equal(log.created.length, 1);
  assert.match(spinFlag(log.created[0].msg).result.effectHtml, /Fireball/);

  // The chat-card template is missing: fallback card
  resetWorld();
  renderTemplate.fail = true;
  table = await makeWildTable();
  Roll.nextTotals = [7];
  await table.draw();
  assert.equal(log.created.length, 1);
  assert.match(log.created[0].data.content, /magic-wheel-fallback/);
  assert.ok(spinFlag(log.created[0].msg));

  // Socket and window failures
  resetWorld();
  game.socket.failEmit = true;
  M.wheelApp.WheelApp.failShow = true;
  try {
    table = await makeWildTable();
    Roll.nextTotals = [7];
    await table.draw();
  } finally {
    M.wheelApp.WheelApp.failShow = false;
  }
  assert.equal(log.created.length, 1);

  // ChatMessage.create fails once: retried without the wheel data
  resetWorld();
  ChatMessage.failCreate = 1;
  table = await makeWildTable();
  Roll.nextTotals = [7];
  await table.draw();
  assert.equal(log.created.length, 1);
  assert.equal(spinFlag(log.created[0].msg), undefined);

  // A table whose results can't go on a wheel (no ranges) still posts its result, without a spin
  resetWorld();
  table = await RollTable.create({name: "Odd", flags: {"magic-wheel": {wheel: true}}, results: [{text: "Fine"}]});
  const [only] = table.results.values();
  const message = await M.surge.presentSurge(table, await new Roll("1d100").evaluate({async: true}), [only]);
  assert.equal(log.created.length, 1);
  assert.equal(message, log.created[0].msg);
  assert.equal(log.emitted.length, 0);
  assert.match(log.created[0].data.content, /magic-wheel-fallback/);
  assert.match(log.created[0].data.content, /Fine/);
});

test("e2e: generic tables get stripped labels, generic ranges and drawn flags", async () => {
  resetWorld();
  const table = await RollTable.create({
    name: "Mimic Loot", formula: "1d6", replacement: false, flags: {"magic-wheel": {wheel: true}},
    results: [
      {range: [1, 2], text: "<p>A <strong>surprisingly</strong> loyal mimic that follows you home</p>"},
      {range: [3, 4], text: "Gold", flags: {"magic-wheel": {label: "GOLD!", tone: "good", icon: "fa-solid fa-coins"}}},
      {range: [5, 6], text: "@UUID[Item.abc]{Sword}", type: 1, documentCollection: "Item", documentId: "abc"}
    ]
  });
  Roll.nextTotals = [2];
  await table.draw();
  let p = spinFlag(log.created[0].msg);
  assert.equal(p.kind, "generic");
  assert.equal(p.result.rangeLabel, "1-2");
  assert.ok(p.result.label.length <= 18 && p.result.label.startsWith("A SURPRISINGLY"));
  assert.equal(p.result.tone, "weird");
  assert.equal(p.chatter.title, "Mimic Loot");
  assert.equal(log.updates.length, 1);
  assert.equal(p.segments.length, 3);
  assert.ok(Math.abs((p.segments[0].end - p.segments[0].start) - 120) < 1e-9);

  resetWorld();
  game.tables.set(table.id, table);
  for ( const r of table.results.values() ) r.drawn = false;
  Roll.nextTotals = [3];
  await table.draw();
  p = spinFlag(log.created[0].msg);
  assert.equal(p.result.label, "GOLD!");
  assert.equal(p.result.tone, "good");
  assert.equal(p.result.icon, "fa-solid fa-coins");
  assert.equal(p.result.achievement, null);
  assert.equal(p.result.extraHtml, null);
  assert.equal(typeof p.result.line, "string", "generic tables get generic commentary");
});

test("e2e: commentary off keeps the wheel, the title, the close label and the sub-roll", async () => {
  resetWorld();
  setSetting("commentary", false);
  const table = await makeWildTable();
  Roll.nextTotals = [37];
  await table.draw();
  const p = spinFlag(log.created[0].msg);
  for ( const k of ["line", "landed", "achievement", "box", "repeatLine", "streakLine"] ) assert.equal(p.result[k], null, `result.${k}`);
  for ( const k of ["intro", "slowing", "fakeOut", "sponsor"] ) assert.equal(p.chatter[k], null, `chatter.${k}`);
  assert.deepEqual(p.chatter.spinning, []);
  assert.deepEqual(p.chatter.reactions, []);
  assert.ok(p.chatter.title && p.chatter.closeLabel);
  assert.match(p.result.extraHtml, /inline-roll/);
});

test("e2e: repeat and streak asides come from this device's history", async () => {
  resetWorld();
  const table = await makeWildTable();
  for ( const total of [61, 61, 61] ) {
    Roll.nextTotals = [total];
    await table.draw();
  }
  const [first, second, third] = log.created.map(c => spinFlag(c.msg));
  assert.equal(first.result.repeatLine, null);
  assert.equal(typeof second.result.repeatLine, "string");
  assert.equal(second.result.streakLine, null);
  assert.equal(typeof third.result.streakLine, "string");
  assert.equal(game.settings.get("magic-wheel", "history").length, 3);
});

test("e2e: back-to-back presentations run one at a time, in order", async () => {
  resetWorld();
  const table = await makeWildTable();
  const r1 = await new Roll("1d100").evaluate({async: true});
  r1.total = 3;
  const r2 = await new Roll("1d100").evaluate({async: true});
  r2.total = 97;
  await Promise.all([
    M.surge.presentSurge(table, r1, table.getResultsForRoll(3)),
    M.surge.presentSurge(table, r2, table.getResultsForRoll(97))
  ]);
  assert.deepEqual(log.created.map(c => spinFlag(c.msg).result.rangeLabel), ["03-04", "97-98"]);
});

test("chat card context matches every field chat-card.hbs uses", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [1];
  await table.draw();
  const {ctx, path: p} = log.templates[0];
  assert.equal(p, C.TEMPLATES.chatCard);
  const expected = ["spinId", "kind", "tone", "icon", "label", "rangeLabel", "total", "formula", "tableName", "speakerName",
    "headline", "effectHtml", "extraHtml", "line", "landed", "repeatLine", "streakLine", "achievement", "box"];
  assert.deepEqual(Object.keys(ctx).sort(), [...expected].sort());
  assert.ok(ctx.achievement && ctx.box, "01-02 has an achievement and a box");
  const src = fs.readFileSync(rel("templates/chat-card.hbs"), "utf8");
  assertTemplateFields(src, ctx, "chat-card.hbs");
  assert.match(src, /<div class="magic-wheel-card tone-\{\{tone\}\}[^"]*" data-spin-id="\{\{spinId\}\}">/);
  assert.match(src, /<button type="button" data-action="mw-replay">/);
  assert.equal(ctx.headline, "WILD MAGIC SURGE");
  assert.equal(ctx.box.tier, "Legendary");
  assert.equal(ctx.box.tierClass, "legendary");
});

test("WheelApp#getData provides every field wheel.hbs uses", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [1];
  await table.draw();
  const presentation = spinFlag(log.created[0].msg);
  const app = new M.wheelApp.WheelApp(foundry.utils.deepClone(presentation));
  const data = app.getData();
  assert.ok(data.result.box && data.result.achievement, "01-02 has a box and an achievement");
  assert.equal(data.result.box.tier, "Legendary");
  assertTemplateFields(fs.readFileSync(rel("templates/wheel.hbs"), "utf8"), data, "wheel.hbs");
  assert.equal(app.title, presentation.chatter.title);
  assert.equal(M.wheelApp.WheelApp.defaultOptions.template, C.TEMPLATES.wheel);
  assert.ok(M.wheelApp.WheelApp.defaultOptions.classes.includes("magic-wheel-app"));
  await app.close();
});

/** Every {{path}} a template reads must exist in the render context (stopping at null branches). */
function assertTemplateFields(src, ctx, where) {
  const paths = new Set();
  for ( const m of src.matchAll(/\{\{\{?([^{}]+?)\}?\}\}/g) ) {
    let expr = m[1].trim();
    if ( expr.startsWith("/") || (expr === "else") || expr.startsWith("!") ) continue;
    expr = expr.replace(/^#(if|unless|with|each)\s+/, "");
    const id = expr.split(/\s+/)[0];
    if ( /^[A-Za-z_][\w.]*$/.test(id) && !["this", "localize", "else"].includes(id) ) paths.add(id);
  }
  assert.ok(paths.size > 5, `${where}: no fields found`);
  for ( const p of paths ) {
    let obj = ctx;
    for ( const key of p.split(".") ) {
      assert.ok(obj && (typeof obj === "object") && (key in obj), `${where} uses {{${p}}} but the context has no ${key}`);
      obj = obj[key];
      if ( obj === null || obj === undefined ) break;
    }
  }
}

/* ---------------- socket, replay, API, surge check, integrations ---------------- */

test("socket receiver: audience, own echo, junk and skipWheel", async () => {
  resetWorld({user: "p1"});
  const handler = game.socket.handlers[C.SOCKET_NAME];
  const presentation = {userId: "gm1", plan: {phases: []}, segments: [], result: {}};
  handler({action: "spin", presentation, audience: null}, "gm1");
  handler({action: "spin", presentation, audience: ["p1", "gm1"]}, "gm1");
  assert.equal(log.shown.length, 2);
  handler({action: "spin", presentation, audience: ["gm1"]}, "gm1");
  handler({action: "spin", presentation: {...presentation, userId: "p1"}, audience: null}, "p1");
  handler({action: "nope", presentation}, "gm1");
  handler(null, "gm1");
  handler({action: "spin", presentation: {userId: "gm1"}}, "gm1");
  assert.equal(log.shown.length, 2);
  setSetting("skipWheel", true);
  handler({action: "spin", presentation, audience: null}, "gm1");
  assert.equal(log.shown.length, 2);
  assert.equal(M.socket.isSpinForUser({action: "spin", presentation, audience: ["p1"]}, "p1"), true);
});

test("chat Replay button replays only messages that carry a wheel", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [5];
  await table.draw();
  const msg = log.created[0].msg;
  log.shown = [];
  const makeButton = () => ({
    listeners: {},
    removed: false,
    addEventListener(type, fn) { this.listeners[type] = fn; },
    remove() { this.removed = true; }
  });
  const button = makeButton();
  Hooks.callAll("renderChatMessage", msg, [{querySelectorAll: () => [button]}], {});
  button.listeners.click({preventDefault() {}, stopPropagation() {}});
  assert.equal(log.shown.length, 1);
  assert.equal(log.shown[0].options.replay, true);
  assert.equal(log.shown[0].presentation.replay, true);
  assert.equal(spinFlag(msg).replay, false, "replaying must not change the stored message");

  // skipWheel does not apply to replays
  setSetting("skipWheel", true);
  globalThis.MagicWheel.replay(msg.id);
  assert.equal(log.shown.length, 2);

  const plainMsg = new ChatMessage({content: "hi"});
  const orphan = makeButton();
  Hooks.callAll("renderChatMessage", plainMsg, [{querySelectorAll: () => [orphan]}], {});
  assert.equal(orphan.removed, true);
  assert.equal(globalThis.MagicWheel.replay("missing"), null);
});

test("API: spin by name, id, UUID or document; missing tables notify", async () => {
  resetWorld();
  const api = globalThis.MagicWheel;
  assert.equal(await api.spin(), null);
  assert.ok(log.notifications.some(([type, m]) => type === "warn" && Q.QUIPS.noTable.includes(m)));
  assert.equal(await api.spin("Nope"), null);
  assert.ok(log.notifications.some(([, m]) => /No roll table matches Nope/.test(m)));

  const table = await makeWildTable();
  const loot = await RollTable.create({name: "Loot", results: [{range: [1, 100], text: "A spoon"}]});
  for ( const ref of [undefined, "wild magic surge", table.id, table.uuid, table] ) {
    const out = await api.spin(ref);
    assert.ok(out?.results?.length, `spin(${ref?.id ?? ref})`);
  }
  // spin() always uses the wheel, even for tables that normally don't
  await api.spin("Loot", {rollMode: "selfroll"});
  assert.equal(spinFlag(log.created.at(-1).msg).tableId, loot.id);
  assert.deepEqual(log.created.at(-1).data.whisper, ["gm1"]);
  assert.equal(api.isWheelTable(loot), false);
  assert.equal(api.findWildMagicTable(), table);

  setUser("p1");
  assert.equal(await api.createTable(), null);
  setUser("gm1");
  assert.ok(await api.createTable());
});

test("surge check: a 1 spins the wheel, anything else just posts the d20", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [12];
  let out = await globalThis.MagicWheel.surgeCheck({});
  assert.equal(out.surged, false);
  assert.equal(log.created.length, 1);
  assert.equal(log.created[0].data.type, CONST.CHAT_MESSAGE_TYPES.ROLL);
  assert.match(log.created[0].data.flavor, /12/);

  resetWorld();
  game.tables.set(table.id, table);
  Roll.nextTotals = [1, 33];
  out = await globalThis.MagicWheel.surgeCheck({});
  assert.equal(out.surged, true);
  assert.equal(log.created.length, 2);
  assert.equal(spinFlag(log.created[1].msg).result.rangeLabel, "33-34");
  assert.ok(log.notifications.some(([type]) => type === "warn"));
});

test("dnd5e: only levelled spells from a creature with the feature trigger the check", () => {
  const {triggersSurgeCheck} = M.integrations;
  const actor = {items: [{type: "feat", name: " wild magic SURGE "}]};
  const spell = (level, a = actor) => ({type: "spell", system: {level}, actor: a});
  assert.equal(triggersSurgeCheck(spell(1), "Wild Magic Surge"), true);
  assert.equal(triggersSurgeCheck(spell(0), "Wild Magic Surge"), false);
  assert.equal(triggersSurgeCheck({type: "weapon", system: {level: 3}, actor}, "Wild Magic Surge"), false);
  assert.equal(triggersSurgeCheck(spell(3, {items: [{type: "feat", name: "Tides of Chaos"}]}), "Wild Magic Surge"), false);
  assert.equal(triggersSurgeCheck(spell(3, null), "Wild Magic Surge"), false);
  assert.equal(triggersSurgeCheck(spell(3), ""), false);
});

test("Wild Magic Surge 5e: its table card is replaced by the wheel in intercept mode", async () => {
  resetWorld();
  game.modules.set("wild-magic-surge-5e", {id: "wild-magic-surge-5e", active: true});
  try {
    const table = await makeWildTable();
    const [result] = table.getResultsForRoll(45);
    const roll = await new Roll("1d100").evaluate({async: true});
    roll.total = 45;
    const card = await ChatMessage.create({
      flavor: "Draws a result from the <WILD MAGIC SURGE> table.",
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: [roll],
      content: `<div class="table-draw" data-table-id="${table.id}"><li data-result-id="${result.id}"></li></div>`
    });
    assert.equal(card, undefined, "the original card should be cancelled");
    for ( let i = 0; (i < 200) && !log.created.length; i++ ) await new Promise(r => realSetTimeout(r, 5));
    assert.equal(log.created.length, 1);
    assert.equal(spinFlag(log.created[0].msg).result.rangeLabel, "45-46");

    // Other messages pass straight through
    resetWorld();
    const other = await ChatMessage.create({flavor: "Wild Magic Surge check", content: "d20"});
    assert.ok(other);
  } finally {
    game.modules.delete("wild-magic-surge-5e");
  }
});

test("the GM's Wheel header button toggles the table flag", async () => {
  resetWorld();
  const table = await RollTable.create({name: "Loot"});
  const buttons = [];
  Hooks.callAll("getRollTableConfigHeaderButtons", {document: table}, buttons);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].label, "MAGICWHEEL.HeaderButton.Off");
  assert.equal(await M.integrations.toggleWheel(table), true);
  assert.equal(table.flags["magic-wheel"].wheel, true);
  assert.equal(await M.integrations.toggleWheel(table), false);
  setUser("p1");
  const none = [];
  Hooks.callAll("getRollTableConfigHeaderButtons", {document: table}, none);
  assert.equal(none.length, 0);
});

/* ---------------- regressions: review fixes ---------------- */

const WMS_ID = "wild-magic-surge-5e";
const tick = (ms = 15) => new Promise(r => realSetTimeout(r, ms));

/** Wait (in real time) until `cond()` holds. */
async function waitFor(cond, what = "condition", ms = 2000) {
  const t0 = performance.now();
  while ( !cond() ) {
    if ( (performance.now() - t0) > ms ) throw new Error(`timed out waiting for ${what}`);
    await tick(5);
  }
}

/** A clock the tests can move forward (never back, or remembered timestamps would look fresh again). */
const realDateNow = Date.now;
let clockSkew = 0;
Date.now = () => realDateNow() + clockSkew;
const advanceClock = ms => { clockSkew += ms; };

/** Every string inside a value, with its path. */
function* stringsIn(value, where = "") {
  if ( typeof value === "string" ) yield [where, value];
  else if ( value && (typeof value === "object") ) {
    for ( const [k, v] of Object.entries(value) ) yield* stringsIn(v, `${where}.${k}`);
  }
}

/** No tag that could run anything, and no event-handler or javascript: attribute inside any tag. */
function assertNoActiveMarkup(value, what) {
  for ( const [where, s] of stringsIn(value) ) {
    assert.ok(!/<\s*\/?\s*(script|img|svg|iframe|object|embed|style|math|form|input|button)\b/i.test(s), `${what}${where}: ${s}`);
    assert.ok(!/<[^>]*\son[a-z]+\s*=/i.test(s), `${what}${where} has an event handler: ${s}`);
    assert.ok(!/<[^>]*(href|src)\s*=\s*["']?\s*javascript:/i.test(s), `${what}${where} has a javascript: URL: ${s}`);
  }
}

/** A hostile SpinPresentation, as another client or an edited chat message flag could send it. */
const evilPresentation = (overrides = {}) => ({
  version: 1, spinId: "evil", userId: "gm1", userName: "Totally The GM", speakerName: "Zed", tableId: "t1",
  tableName: "Loot", kind: "wild-magic", total: 7, formula: "1d100", targetIndex: 0,
  segments: [{id: "a", lo: 1, hi: 2, label: "A", tone: "good", start: 0, end: 360, mid: 180, colorIndex: 0}, "junk"],
  plan: {
    startRotation: 0, finalRotation: 720, totalMs: 4000, fakeOut: "sideways",
    phases: [{t0: 0, t1: 4000, from: 0, to: 720, ease: "constructor"}],
    events: [{t: 0, type: "start"}, {t: 1, type: "<script>"}, {t: 4000, type: "land"}]
  },
  result: {
    rangeLabel: "01-02", label: "BOOM <img src=x onerror=alert(1)>", tone: "evil",
    icon: "fa-solid fa-fire\" onmouseover=\"alert(1)",
    effectHtml: "<img src=x onerror=\"alert(1)\"><strong>Fireball</strong>",
    line: "<script>alert(1)</script>Nice",
    landed: "<a href=\"javascript:alert(1)\">click</a>",
    achievement: {title: "<iframe src=\"javascript:alert(1)\"></iframe>Champ", text: "<b onclick=\"x()\">t</b>"},
    box: {tier: "Gold<script>", tierClass: "gold\" onclick=\"x", contents: "<svg onload=alert(1)></svg>prize"},
    extraHtml: "<style>*{display:none}</style>extra", repeatLine: "<form><input></form>again", streakLine: null
  },
  chatter: {
    title: "<b>Title</b>", intro: "<img src=x onerror=alert(1)>hi", spinning: ["<script>1</script>", 7, null, "<em>ok</em>"],
    slowing: "<object data=x></object>slow", fakeOut: null, sponsor: "<a href=\"jav&#x09;ascript:alert(1)\">s</a>",
    reactions: Array.from({length: 100}, () => "<b>lol</b>"), viewers: {start: "1000", end: -5},
    closeLabel: "<script>x</script>Close"
  },
  replay: true,
  hacked: "yes",
  ...overrides
});

/** Optional: parse5 (the HTML parser Foundry's server ships) as a DOMParser, to run the sanitizer's real path. */
async function loadParse5() {
  try {
    return await import("parse5");
  } catch(err) { /* not installed in the project */ }
  const candidates = [
    process.env.PARSE5_PATH,
    "C:/Program Files/Foundry10/Foundry Virtual Tabletop/resources/app/node_modules/parse5/dist/index.js"
  ].filter(Boolean);
  for ( const p of candidates ) {
    if ( !fs.existsSync(p) ) continue;
    try {
      return await import(pathToFileURL(p).href);
    } catch(err) { /* try the next one */ }
  }
  return null;
}

/** Just enough of the DOM for sanitize.js, on top of parse5's default tree. */
function parse5DOMParser(parse5) {
  const wrappers = new WeakMap();
  const wrap = n => {
    let w = wrappers.get(n);
    if ( !w ) wrappers.set(n, w = new ShimNode(n));
    return w;
  };
  const attrName = a => (a.prefix ? `${a.prefix}:${a.name}` : a.name);
  class ShimNode {
    constructor(n) { this.n = n; }
    get nodeType() {
      return ({"#text": 3, "#comment": 8, "#document": 9, "#documentType": 10, "#document-fragment": 11})[this.n.nodeName] ?? 1;
    }
    get localName() { return this.n.tagName; }
    get namespaceURI() { return this.n.namespaceURI ?? null; }
    get childNodes() { return (this.n.childNodes ?? []).map(wrap); }
    get attributes() { return (this.n.attrs ?? []).map(a => ({name: attrName(a), value: a.value})); }
    getAttribute(name) { return this.n.attrs.find(a => attrName(a) === name)?.value ?? null; }
    hasAttribute(name) { return this.n.attrs.some(a => attrName(a) === name); }
    setAttribute(name, value) {
      const a = this.n.attrs.find(x => attrName(x) === name);
      if ( a ) a.value = String(value);
      else this.n.attrs.push({name, value: String(value)});
    }
    removeAttribute(name) { this.n.attrs = this.n.attrs.filter(a => attrName(a) !== name); }
    remove() {
      const p = this.n.parentNode;
      if ( p ) p.childNodes.splice(p.childNodes.indexOf(this.n), 1);
      this.n.parentNode = null;
    }
    replaceWith(...nodes) {
      const p = this.n.parentNode;
      const raw = nodes.map(x => x.n);
      for ( const r of raw ) {
        if ( r.parentNode ) r.parentNode.childNodes.splice(r.parentNode.childNodes.indexOf(r), 1);
        r.parentNode = p;
      }
      p.childNodes.splice(p.childNodes.indexOf(this.n), 1, ...raw);
      this.n.parentNode = null;
    }
    get innerHTML() { return parse5.serialize(this.n); }
  }
  return class DOMParser {
    parseFromString(source) {
      const html = parse5.parse(String(source)).childNodes.find(c => c.tagName === "html");
      return {body: wrap(html.childNodes.find(c => c.tagName === "body"))};
    }
  };
}

const PARSE5 = await loadParse5();

test("sanitizer (DOM): keeps the module's markup, drops anything that can run", async () => {
  if ( !PARSE5 ) {
    process.stdout.write("     (skipped: parse5 not found; set PARSE5_PATH or install it to run the DOM cases)\n");
    return;
  }
  const {sanitizeHTML, sanitizePresentation} = M.sanitize;
  globalThis.DOMParser = parse5DOMParser(PARSE5);
  /** What a browser would make of the HTML anyway (entities decoded, tags closed). */
  const normal = html => PARSE5.serialize(PARSE5.parse(html).childNodes.find(c => c.tagName === "html")
    .childNodes.find(c => c.tagName === "body"));
  try {
    // Kept exactly: emphasis, Font Awesome icons, inline rolls (data-roll, data-tooltip), content links, tables
    const keep = [
      "<strong>Bob</strong> spins <em>it</em> &amp; wins",
      "<i class=\"fa-solid fa-dice\"></i> rolled",
      "<a class=\"inline-roll inline-result\" data-tooltip=\"1d4 + 2\" data-roll=\"%7B%22class%22%3A%22Roll%22%7D\"><i class=\"fas fa-dice-d20\"></i>5</a>",
      "<a class=\"inline-roll roll\" data-mode=\"roll\" data-flavor=\"\" data-formula=\"1d20\"><i class=\"fas fa-dice-d20\"></i>1d20</a>",
      "<a class=\"content-link\" draggable=\"true\" data-uuid=\"Item.abc\" data-id=\"abc\" data-type=\"Item\" data-tooltip=\"Item\"><i class=\"fas fa-suitcase\"></i>Potion</a>",
      "<p>One</p><hr><ul><li>a</li></ul><ol start=\"3\"><li>b</li></ol><blockquote>q</blockquote>",
      "<table><tbody><tr><th colspan=\"2\">h</th></tr><tr><td rowspan=\"2\">c</td></tr></tbody></table>",
      "<div class=\"a\" aria-label=\"l\" data-x=\"1\" title=\"t\" lang=\"en\" dir=\"ltr\">d</div>",
      "<a href=\"https://example.com/x\">web</a><a href=\"/relative\">r</a><a href=\"#frag\">f</a>"
    ];
    for ( const html of keep ) assert.equal(sanitizeHTML(html), normal(html), html);

    // Removed with their content
    const dropped = [
      "<script>alert(1)</script>", "<style>*{}</style>", "<iframe srcdoc=\"<script>alert(1)</script>\"></iframe>",
      "<object data=\"x\"></object>", "<embed src=\"x\">", "<img src=x onerror=alert(1)>",
      "<svg onload=alert(1)><circle/></svg>", "<math><mi>x</mi></math>", "<form><input name=a><button>Go</button></form>",
      "<template><img src=x onerror=alert(1)></template>", "<xmp><img src=x onerror=alert(1)></xmp>",
      "<noembed><img src=x onerror=alert(1)></noembed>", "<video src=x></video>", "<!-- comment -->"
    ];
    for ( const html of dropped ) assert.equal(sanitizeHTML(`${html}after`), "after", html);
    // Known mutation-XSS shapes (namespace confusion) leave nothing behind
    assert.equal(sanitizeHTML("<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>"), "");
    assert.equal(sanitizeHTML("<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>"), "");

    // Unknown elements are unwrapped; event handlers, styles and ids go
    assert.equal(sanitizeHTML("<custom-el foo=\"bar\"><b>kept</b></custom-el><section><p>para</p></section>"), "<b>kept</b><p>para</p>");
    assert.equal(sanitizeHTML("<details open ontoggle=alert(1)><summary>s</summary>x</details>"), "sx");
    assert.equal(sanitizeHTML("<b onclick=\"x()\" onmouseover=\"y()\" style=\"color:red\" id=\"game\" name=\"n\">t</b>"), "<b>t</b>");
    assert.equal(sanitizeHTML("<td onmouseover=x>c</td>"), "c");

    // Links: no script URLs however they are spelled; target only as a new tab, without an opener
    for ( const href of ["javascript:alert(1)", "  java\tscript:alert(1)", "JaVaScRiPt&colon;alert(1)", "&#106;avascript:alert(1)",
      "jav&#x09;ascript:alert(1)", "vbscript:x", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd"] ) {
      assert.equal(sanitizeHTML(`<a href="${href}">x</a>`), "<a>x</a>", href);
    }
    assert.equal(sanitizeHTML("<a href=\"https://x.test/\" target=\"_top\">x</a>"), "<a href=\"https://x.test/\">x</a>");
    assert.equal(sanitizeHTML("<a href=\"https://x.test/\" rel=\"opener\" target=\"_blank\">x</a>"),
      "<a href=\"https://x.test/\" rel=\"noopener noreferrer\" target=\"_blank\">x</a>");

    // Tooltips are shown with innerHTML: they become plain text, escaped once more
    const tip = PARSE5.parseFragment(sanitizeHTML("<span data-tooltip=\"a &amp; b <img src=x onerror=alert(1)><i>c</i>\">t</span>"));
    assert.equal(tip.childNodes[0].attrs.find(a => a.name === "data-tooltip").value, "a &amp; b c");

    // The window's own mw- classes can't be borrowed
    assert.equal(sanitizeHTML("<span class=\"mw-close foo\">x</span><b class=\"mw-x\">y</b>"), "<span class=\"foo\">x</span><b>y</b>");

    // Size cap
    assert.ok(sanitizeHTML("<b>x</b>".repeat(10000)).length <= 50010);

    // A hostile presentation: only safe markup survives, the content does too
    const p = sanitizePresentation(evilPresentation());
    assertNoActiveMarkup(p, "presentation");
    assert.equal(p.result.effectHtml, "<strong>Fireball</strong>");
    assert.equal(p.result.line, "Nice");
    assert.equal(p.result.landed, "<a>click</a>");
    assert.equal(p.result.achievement.title, "Champ");
    assert.equal(p.result.achievement.text, "<b>t</b>");
    assert.equal(p.result.box.contents, "prize");
    assert.equal(p.result.extraHtml, "extra");
    assert.equal(p.result.repeatLine, "again");
    assert.equal(p.chatter.intro, "hi");
    assert.deepEqual(p.chatter.spinning, ["7", "<em>ok</em>"]);
    assert.equal(p.chatter.slowing, "slow");
    assert.equal(p.chatter.sponsor, "<a>s</a>");

    // A real presentation keeps every field the module wrote, markup included
    const htmlField = /^\.(result\.(effectHtml|extraHtml|line|landed|repeatLine|streakLine|achievement\.(title|text)|box\.contents)|chatter\.(intro|slowing|fakeOut|sponsor|(spinning|reactions)\.\d+))$/;
    for ( const total of [1, 7, 11, 37, 61] ) {
      resetWorld();
      const table = await makeWildTable();
      Roll.nextTotals = [total];
      await table.draw();
      const real = spinFlag(log.created[0].msg);
      const clean = sanitizePresentation(real);
      let html = 0;
      for ( const [where, s] of stringsIn(real) ) {
        const got = where.split(".").slice(1).reduce((o, k) => o?.[k], clean);
        if ( htmlField.test(where) ) html++;
        if ( htmlField.test(where) ) assert.equal(normal(got), normal(s), `${total}: presentation${where}`);
        else assert.equal(got, s, `${total}: presentation${where}`);
      }
      assert.ok(html >= 5, `${total}: only ${html} HTML fields checked`);
    }
  } finally {
    delete globalThis.DOMParser;
  }
});

test("sanitizer: without a DOM it escapes, and a presentation is rebuilt field by field", async () => {
  const {sanitizeHTML, sanitizePresentation} = M.sanitize;
  assert.equal(typeof globalThis.DOMParser, "undefined");
  assert.equal(sanitizeHTML("<b>x</b> & y"), "&lt;b&gt;x&lt;/b&gt; &amp; y");
  assert.equal(sanitizeHTML("plain text"), "plain text");
  assert.equal(sanitizeHTML(null), "");
  for ( const junk of [null, undefined, "str", 42, [], [evilPresentation()]] ) assert.equal(sanitizePresentation(junk), null);

  const p = sanitizePresentation(evilPresentation());
  assertNoActiveMarkup(p, "presentation");
  // Only the presentation's own fields, as plain data
  assert.deepEqual(Object.keys(p).sort(), ["chatter", "formula", "kind", "plan", "replay", "result", "segments", "speakerName",
    "spinId", "tableId", "tableName", "tableUuid", "targetIndex", "total", "userId", "userName", "version"]);
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
  assert.equal(p.replay, true);
  assert.equal(sanitizePresentation(evilPresentation({replay: "yes"})).replay, false, "only a real true is a replay");
  assert.equal(p.result.icon, "fa-solid fa-dharmachakra");
  assert.equal(p.result.tone, "weird");
  assert.equal(p.result.label, "BOOM img src=x onerror=alert(1)");
  assert.equal(p.result.box.tier, "Goldscript");
  assert.match(p.result.box.tierClass, /^[a-z0-9-]*$/);
  assert.equal(p.chatter.title, "bTitle/b");
  assert.equal(p.chatter.closeLabel, "scriptx/scriptClose");
  assert.equal(p.chatter.reactions.length, 24);
  assert.deepEqual(p.chatter.viewers, {start: 1000, end: 0});
  assert.equal(p.segments.length, 1);
  assert.equal(p.plan.fakeOut, null);
  assert.equal(p.plan.phases[0].ease, "linear", "only real easing names, not inherited properties");
  assert.deepEqual(p.plan.events.map(e => e.type), ["start", "land"]);

  // A real presentation keeps its shape and every plain field
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [1];
  await table.draw();
  const real = spinFlag(log.created[0].msg);
  const clean = sanitizePresentation(real);
  assert.deepEqual(Object.keys(clean).sort(), Object.keys(real).sort());
  assert.deepEqual(Object.keys(clean.result).sort(), Object.keys(real.result).sort());
  assert.deepEqual(Object.keys(clean.chatter).sort(), Object.keys(real.chatter).sort());
  for ( const k of ["version", "spinId", "userId", "userName", "speakerName", "tableId", "tableUuid", "tableName", "kind",
    "total", "formula", "segments", "targetIndex", "plan", "replay"] ) assert.deepEqual(clean[k], real[k], k);
  for ( const k of ["rangeLabel", "label", "tone", "icon"] ) assert.equal(clean.result[k], real.result[k], `result.${k}`);
  assert.deepEqual([clean.result.box.tier, clean.result.box.tierClass], [real.result.box.tier, real.result.box.tierClass]);
  for ( const k of ["title", "closeLabel"] ) assert.equal(clean.chatter[k], real.chatter[k], `chatter.${k}`);
  assert.deepEqual(clean.chatter.viewers, real.chatter.viewers);
  assert.equal(clean.chatter.spinning.length, real.chatter.spinning.length);
  assert.equal(clean.chatter.reactions.length, real.chatter.reactions.length);
});

test("socket receiver: only the sender's own spins play, rebuilt and cleaned", async () => {
  resetWorld({user: "p1"});
  const handler = game.socket.handlers[C.SOCKET_NAME];
  const msg = presentation => ({action: "spin", audience: null, presentation});
  handler(msg(evilPresentation()));
  handler(msg(evilPresentation()), "ghost");
  handler(msg(evilPresentation()), "p2");
  handler(msg(evilPresentation({userId: "p2"})), "gm1");
  assert.equal(log.shown.length, 0, "missing, unknown or mismatched senders are ignored");

  handler(msg(evilPresentation()), "gm1");
  assert.equal(log.shown.length, 1);
  const {presentation: p, options} = log.shown[0];
  assertNoActiveMarkup(p, "shown");
  assert.equal(p.userName, "Dungeon Master", "the name comes from the sender, not the payload");
  assert.equal(p.replay, false);
  assert.equal(options.replay ?? false, false);
  assert.ok(!("hacked" in p));
  assert.equal(p.result.icon, "fa-solid fa-dharmachakra");
  assert.match(p.result.effectHtml, /Fireball/);

  // A player can send their own spin
  handler(msg(evilPresentation({userId: "p2"})), "p2");
  assert.equal(log.shown.length, 2);
});

test("Instant Replay rebuilds the stored wheel and cleans its HTML, leaving the message alone", async () => {
  resetWorld();
  const stored = evilPresentation({replay: false});
  const message = new ChatMessage({flags: {"magic-wheel": {spin: stored}}});
  game.messages.set(message.id, message);
  assert.ok(globalThis.MagicWheel.replay(message.id));
  assert.equal(log.shown.length, 1);
  const {presentation: p, options} = log.shown[0];
  assertNoActiveMarkup(p, "replay");
  assert.equal(p.replay, true);
  assert.equal(options.replay, true);
  assert.ok(!("hacked" in p));
  assert.deepEqual(message.flags["magic-wheel"].spin, stored, "the flag is not modified");

  const junk = new ChatMessage({flags: {"magic-wheel": {spin: "<img src=x onerror=alert(1)>"}}});
  game.messages.set(junk.id, junk);
  assert.equal(globalThis.MagicWheel.replay(junk.id), null);
  assert.equal(log.shown.length, 1);
  assert.ok(log.notifications.some(([type, m]) => (type === "warn") && (m === LANG_FLAT["MAGICWHEEL.Notifications.NoReplay"])));
});

test("socket receiver: live spins wait their turn behind the wheel on screen", async () => {
  resetWorld({user: "p1"});
  const WA = M.wheelApp.WheelApp;
  const realShow = WA.show;
  const RS = Application.RENDER_STATES;
  class FakeWheel {
    static RENDER_STATES = RS;
    constructor(presentation, options) {
      Object.assign(this, {presentation, options, _state: RS.RENDERING});
      this.landed = new Promise(resolve => { this._resolveLanded = resolve; });
    }
    get rendered() { return this._state === RS.RENDERED; }
    finishRender() { if ( this._state === RS.RENDERING ) this._state = RS.RENDERED; }
    land() { this._resolveLanded(); }
    close() { this._state = RS.CLOSED; this._resolveLanded(); }
  }
  const apps = [];
  WA.show = (presentation, options = {}) => {
    for ( const a of apps ) if ( a._state > RS.NONE ) a.close();
    const app = new FakeWheel(presentation, options);
    apps.push(app);
    log.shown.push({presentation, options});
    return app;
  };
  // In Foundry, Application is a global binding but not a property of globalThis
  const appDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Application");
  delete globalThis.Application;
  const handler = game.socket.handlers[C.SOCKET_NAME];
  const spin = id => ({action: "spin", audience: null,
    presentation: {userId: "gm1", spinId: id, plan: {phases: [], totalMs: 4000}, segments: [], result: {}}});
  const ids = () => log.shown.map(s => s.presentation.spinId);
  const current = () => apps.at(-1);
  try {
    handler(spin("A"), "gm1");
    handler(spin("B"), "gm1");
    handler(spin("C"), "gm1");
    assert.deepEqual(ids(), ["A"], "B and C wait while A is still opening");
    apps[0].finishRender();
    await tick();
    assert.deepEqual(ids(), ["A"], "... and while it spins");
    apps[0].land();
    await tick();
    advanceClock(C.READ_WINDOW_MS - 500);
    await tick();
    assert.deepEqual(ids(), ["A"], "the landed result stays up to be read");
    advanceClock(600);
    await waitFor(() => log.shown.length >= 2, "B");
    await tick();
    assert.deepEqual(ids(), ["A", "B"], "C waits for B, which is still opening");
    current().finishRender();
    current().close();
    await waitFor(() => log.shown.length >= 3, "C after closing B");
    assert.deepEqual(ids(), ["A", "B", "C"]);
    assert.ok(log.shown.every(s => !s.options.replay));

    // At most five wait; the oldest is dropped
    for ( const id of ["D", "E", "F", "G", "H", "I"] ) handler(spin(id), "gm1");
    await tick();
    assert.equal(log.shown.length, 3);
    for ( const id of ["E", "F", "G", "H", "I"] ) {
      current().close();
      await waitFor(() => ids().at(-1) === id, id);
    }
    assert.ok(!ids().includes("D"));

    // A replay takes over at once and does not hold back the next live spin
    M.socket.showSpin({...spin("R").presentation, replay: true}, {replay: true});
    assert.equal(log.shown.at(-1).options.replay, true);
    handler(spin("J"), "gm1");
    assert.equal(ids().at(-1), "J", "a live spin replaces a replay");

    // Coward Mode: no queue, just the notification
    setSetting("skipWheel", true);
    const before = log.shown.length;
    handler(spin("K"), "gm1");
    assert.equal(log.shown.length, before);
    assert.ok(log.notifications.some(([, m]) => Q.QUIPS.skipWheel.includes(m)));
    setSetting("skipWheel", false);

    // A wheel that never lands holds the queue for 30 seconds at most
    handler(spin("L"), "gm1");
    await tick();
    assert.equal(ids().at(-1), "J");
    advanceClock(30001);
    await waitFor(() => ids().at(-1) === "L", "L after the hold limit");
  } finally {
    for ( const a of apps ) a.close();
    WA.show = realShow;
    Object.defineProperty(globalThis, "Application", appDescriptor);
    await tick();
  }
});

test("presentSurge settles the roll mode and speaker when the draw is made, not when its turn comes", async () => {
  resetWorld({user: "p1"});
  const table = await makeWildTable();
  const rollOf = async total => Object.assign(await new Roll("1d100").evaluate({async: true}), {total});
  const r1 = await rollOf(3);
  const r2 = await rollOf(97);
  const realGetSpeaker = ChatMessage.getSpeaker;
  let alias = "First Pick";
  ChatMessage.getSpeaker = (options = {}) => ({...realGetSpeaker(options), alias: options.alias ?? alias});
  try {
    settingsStore["core.rollMode"] = "publicroll";
    const first = M.surge.presentSurge(table, r1, table.getResultsForRoll(3));
    settingsStore["core.rollMode"] = "blindroll";
    alias = "Second Pick";
    const second = M.surge.presentSurge(table, r2, table.getResultsForRoll(97));
    settingsStore["core.rollMode"] = "gmroll";
    alias = "Too Late";
    await Promise.all([first, second]);
  } finally {
    ChatMessage.getSpeaker = realGetSpeaker;
  }
  assert.deepEqual(log.created.map(c => spinFlag(c.msg)?.result.rangeLabel), ["03-04", "97-98"]);
  assert.deepEqual(log.created.map(c => c.data.blind), [false, true]);
  assert.deepEqual(log.created[0].data.whisper, []);
  assert.deepEqual(log.emitted.map(e => e.data.audience), [null, ["gm1"]]);
  assert.deepEqual(log.created.map(c => c.data.speaker.alias), ["First Pick", "Second Pick"]);
  assert.deepEqual(log.created.map(c => spinFlag(c.msg).speakerName), ["First Pick", "Second Pick"]);
});

test("presentSurge keeps a landed result up for READ_WINDOW_MS only when another one is waiting", async () => {
  resetWorld();
  const table = await makeWildTable();
  const rollOf = async total => Object.assign(await new Roll("1d100").evaluate({async: true}), {total});
  await tick(); // let earlier presentations finish leaving the queue
  const fastTimeout = globalThis.setTimeout;
  const delays = [];
  globalThis.setTimeout = (fn, ms, ...args) => {
    delays.push(ms);
    return fastTimeout(fn, ms, ...args);
  };
  try {
    await M.surge.presentSurge(table, await rollOf(3), table.getResultsForRoll(3));
    await tick();
    assert.equal(delays.filter(ms => ms === C.READ_WINDOW_MS).length, 0, "nothing waiting: no pause");
    await Promise.all([
      M.surge.presentSurge(table, await rollOf(5), table.getResultsForRoll(5)),
      M.surge.presentSurge(table, await rollOf(7), table.getResultsForRoll(7))
    ]);
    await tick();
  } finally {
    globalThis.setTimeout = fastTimeout;
  }
  assert.equal(delays.filter(ms => ms === C.READ_WINDOW_MS).length, 1, "one pause between the two");
  assert.deepEqual(log.created.map(c => spinFlag(c.msg).result.rangeLabel), ["03-04", "05-06", "07-08"]);
});

test("constants: the card waits 2s after landing and a landed wheel stays up 3s for the next", () => {
  assert.ok(C.REVEAL_PAD_MS >= 2000, `REVEAL_PAD_MS ${C.REVEAL_PAD_MS}`);
  assert.ok(C.READ_WINDOW_MS >= 3000, `READ_WINDOW_MS ${C.READ_WINDOW_MS}`);
});

test("history: results this device was not shown don't feed the repeat and streak lines", async () => {
  resetWorld({user: "p1"});
  let table = await makeWildTable();
  Roll.nextTotals = [61];
  await table.draw({rollMode: "blindroll"});
  assert.equal(log.shown.length, 0);
  assert.deepEqual(game.settings.get("magic-wheel", "history"), [], "a player's blind roll is not remembered");
  Roll.nextTotals = [61];
  await table.draw({rollMode: "publicroll"});
  assert.equal(spinFlag(log.created[1].msg).result.repeatLine, null, "no repeat line gives the blind result away");
  assert.equal(game.settings.get("magic-wheel", "history").length, 1);

  // A GM sees their own blind roll, so it counts
  resetWorld({user: "gm1"});
  table = await makeWildTable();
  Roll.nextTotals = [61];
  await table.draw({rollMode: "blindroll"});
  Roll.nextTotals = [61];
  await table.draw({rollMode: "publicroll"});
  assert.equal(typeof spinFlag(log.created[1].msg).result.repeatLine, "string");
  assert.equal(game.settings.get("magic-wheel", "history").length, 2);
});

test("tableKind: 'wild magic surge' in the name, and never Wild Magic Surge 5e's Path of Wild Magic table", async () => {
  resetWorld();
  const {tableKind, isPathOfWildMagicTable} = M.surge;
  const named = name => mockTable({name});
  assert.equal(tableKind(named("Path of Wild Magic Table")), "generic");
  assert.equal(tableKind(named("Wild Magic Table")), "generic");
  assert.equal(tableKind(named("wild  magic   SURGE (homebrew)")), "wild-magic");
  assert.equal(isPathOfWildMagicTable(named("Path of Wild Magic Table")), false, "Wild Magic Surge 5e is not active");

  game.modules.set(WMS_ID, {id: WMS_ID, active: true});
  registeredSettings.set(`${WMS_ID}.powmRollTableName`, {scope: "world", default: "Path of Wild Magic Table"});
  try {
    assert.equal(isPathOfWildMagicTable(named("Path of Wild Magic Table")), true);
    assert.equal(isPathOfWildMagicTable(named("Wild Magic Surge")), false);
    settingsStore[`${WMS_ID}.powmRollTableName`] = "Wild Magic Surge (Barbarian)";
    assert.equal(tableKind(named("Wild Magic Surge (Barbarian)")), "generic", "the barbarian's table, whatever its name");
    assert.equal(tableKind(named("Wild Magic Surge")), "wild-magic");
    assert.equal(tableKind(mockTable({name: "Wild Magic Surge (Barbarian)", flags: {"magic-wheel": {kind: "wild-magic"}}})),
      "wild-magic", "the kind flag still wins");
    settingsStore[`${WMS_ID}.powmRollTableName`] = "  ";
    assert.equal(isPathOfWildMagicTable(named("Wild Magic Surge (Barbarian)")), false);
  } finally {
    game.modules.delete(WMS_ID);
    registeredSettings.delete(`${WMS_ID}.powmRollTableName`);
    delete settingsStore[`${WMS_ID}.powmRollTableName`];
  }
  assert.equal(tableKind(named("Wild Magic Surge (Barbarian)")), "wild-magic");
});

/** Post a Wild Magic Surge 5e table card (as the GM's client does) and wait for the wheel's card that replaces it. */
async function wmsCard(table, total, {whisper = [], blind = false} = {}) {
  const [result] = table.getResultsForRoll(total);
  const roll = Object.assign(await new Roll("1d100").evaluate({async: true}), {total});
  const before = log.created.length;
  const card = await ChatMessage.create({
    flavor: "Draws a result from the <WILD MAGIC SURGE> table.", type: CONST.CHAT_MESSAGE_TYPES.ROLL, rolls: [roll],
    whisper, blind,
    content: `<div class="table-draw" data-table-id="${table.id}"><li data-result-id="${result.id}"></li></div>`
  });
  assert.equal(card, undefined, "the original card should be cancelled");
  await waitFor(() => log.created.length > before, "the wheel's card");
  return log.created.at(-1);
}

test("rollerForActor: an active player whose character it is, else an active owner, never a GM", () => {
  resetWorld();
  const {rollerForActor} = M.integrations;
  const actor = (id, owners) => ({id, testUserPermission: (u, level) => (level === "OWNER") && owners.includes(u.id)});
  const p1 = game.users.get("p1");
  const p2 = game.users.get("p2");
  assert.equal(rollerForActor(null), null);
  assert.equal(rollerForActor(actor("a1", ["p1"])), "p1");
  assert.equal(rollerForActor(actor("a1", ["gm1"])), null);
  assert.equal(rollerForActor(actor("a1", ["p2"])), null, "p2 is not logged in");
  assert.equal(rollerForActor({id: "x", testUserPermission() { throw new Error("boom (test)"); }}), null);
  try {
    p2.active = true;
    p2.character = {id: "a1"};
    assert.equal(rollerForActor(actor("a1", ["p1", "p2"])), "p2", "the character's player beats another owner");
  } finally {
    p2.active = false;
    p2.character = null;
  }
  assert.equal(p1.character, null);
});

test("Wild Magic Surge 5e: the surging player is the roller of public rolls; private ones stay with the GM", async () => {
  resetWorld();
  advanceClock(10000); // forget surges and item uses remembered by earlier tests
  game.modules.set(WMS_ID, {id: WMS_ID, active: true});
  setSetting("audience", "roller");
  game.actors.set("a1", {id: "a1", name: "Sorc", testUserPermission: (u, level) => u.id === "p1", getRollData: () => ({})});
  try {
    const table = await makeWildTable();
    const surge = () => Hooks.callAll(`${WMS_ID}.IsWildMagicSurge`, {surge: true, actorId: "a1", tokenId: null, result: 1});

    // Intercept: the card was public, so the player sees their own surge (and the GM, whose client runs it)
    surge();
    let created = await wmsCard(table, 45);
    let p = spinFlag(created.msg);
    assert.equal(p.userId, "gm1");
    assert.equal(p.speakerName, "Sorc");
    assert.deepEqual(log.emitted.at(-1).data.audience, ["p1", "gm1"]);
    assert.equal(M.socket.isSpinForUser(log.emitted.at(-1).data, "p1"), true);
    assert.equal(log.shown.length, 1, "the GM watches too");
    assert.equal(game.settings.get("magic-wheel", "history")[0].key, "wild-magic:45-46", "history stays on the GM's device");

    // Private and blind cards keep the wheel with the GMs, like the card
    surge();
    await wmsCard(table, 45, {whisper: ["gm1"]});
    assert.deepEqual(log.emitted.at(-1).data.audience, ["gm1"]);
    surge();
    created = await wmsCard(table, 45, {whisper: ["gm1"], blind: true});
    assert.deepEqual(log.emitted.at(-1).data.audience, ["gm1"]);
    assert.equal(created.data.blind, true);

    // Everyone watches public rolls when the setting says so
    setSetting("audience", "everyone");
    surge();
    await wmsCard(table, 45);
    assert.equal(log.emitted.at(-1).data.audience, null);

    // Hook mode: same roller, the GM's chat roll mode
    setSetting("audience", "roller");
    setSetting("wmsIntegration", "hook");
    let before = log.created.length;
    Roll.nextTotals = [45];
    surge();
    await waitFor(() => log.created.length > before, "the hook draw");
    p = spinFlag(log.created.at(-1).msg);
    assert.equal(p.speakerName, "Sorc");
    assert.deepEqual(log.emitted.at(-1).data.audience, ["p1", "gm1"]);
    settingsStore["core.rollMode"] = "blindroll";
    before = log.created.length;
    Roll.nextTotals = [45];
    surge();
    await waitFor(() => log.created.length > before, "the blind hook draw");
    assert.deepEqual(log.emitted.at(-1).data.audience, ["gm1"]);
  } finally {
    game.modules.delete(WMS_ID);
  }
});

test("Wild Magic Surge 5e: Path of Wild Magic is an ordinary table credited to the barbarian whose use was checked", async () => {
  resetWorld();
  advanceClock(10000);
  game.modules.set(WMS_ID, {id: WMS_ID, active: true});
  registeredSettings.set(`${WMS_ID}.powmRollTableName`, {scope: "world", default: "Path of Wild Magic Table"});
  const barb = {id: "b1", name: "Barb", testUserPermission: (u, level) => u.id === "p1", getRollData: () => ({})};
  game.actors.set("b1", barb);
  game.actors.set("s1", {id: "s1", name: "Sorc", testUserPermission: () => false, getRollData: () => ({})});
  const wmsSocket = `module.${WMS_ID}`;
  try {
    // The GM listens to that module's socket; players and inactive modules don't
    delete game.socket.handlers[wmsSocket];
    setUser("p1");
    M.integrations.registerIntegrationSockets();
    assert.equal(game.socket.handlers[wmsSocket], undefined);
    setUser("gm1");
    M.integrations.registerIntegrationSockets();
    assert.equal(typeof game.socket.handlers[wmsSocket], "function");

    const powm = await RollTable.create({name: "Path of Wild Magic Table", formula: "1d8",
      results: Array.from({length: 8}, (_, i) => ({range: [i + 1, i + 1], text: `Effect ${i + 1}`}))});
    const wild = await makeWildTable();

    // A sorcerer's surge just happened, then a player's barbarian rages (the item use reaches the GM by socket)
    Hooks.callAll(`${WMS_ID}.IsWildMagicSurge`, {surge: true, actorId: "s1"});
    game.socket.handlers[wmsSocket]({event: "SurgeCheck", data: {actorId: "b1", tokenId: null, item: {}}}, "p1");
    let p = spinFlag((await wmsCard(powm, 3)).msg);
    assert.equal(p.kind, "generic");
    assert.equal(p.tableName, "Path of Wild Magic Table");
    assert.equal(p.chatter.title, "Path of Wild Magic Table");
    assert.equal(p.speakerName, "Barb", "the barbarian, not the sorcerer who surged a moment ago");
    assert.equal(game.settings.get("magic-wheel", "history")[0].key, `${powm.id}:3-3`, "not a sorcerer streak");

    // A GM's own item use is remembered from dnd5e.useItem
    advanceClock(5000);
    Hooks.callAll("dnd5e.useItem", {actor: barb, type: "feat"});
    p = spinFlag((await wmsCard(powm, 5)).msg);
    assert.equal(p.speakerName, "Barb");

    // Surge checks that didn't surge are not remembered as the speaker of a later card
    advanceClock(5000);
    Hooks.callAll(`${WMS_ID}.IsWildMagicSurge`, {surge: false, actorId: "s1"});
    p = spinFlag((await wmsCard(wild, 45)).msg);
    assert.equal(p.kind, "wild-magic");
    assert.equal(p.speakerName, "Dungeon Master");

    // A real surge is, but only for a few seconds
    Hooks.callAll(`${WMS_ID}.IsWildMagicSurge`, {surge: true, actorId: "s1"});
    p = spinFlag((await wmsCard(wild, 45)).msg);
    assert.equal(p.speakerName, "Sorc");
    Hooks.callAll(`${WMS_ID}.IsWildMagicSurge`, {surge: true, actorId: "s1"});
    advanceClock(4100);
    p = spinFlag((await wmsCard(wild, 45)).msg);
    assert.equal(p.speakerName, "Dungeon Master");
  } finally {
    game.modules.delete(WMS_ID);
    registeredSettings.delete(`${WMS_ID}.powmRollTableName`);
    delete game.socket.handlers[wmsSocket];
  }
});

test("the RollTable sheet skips core's roulette for wheel tables only", async () => {
  resetWorld();
  const {animateRollWrapper} = M.integrations;
  const wild = await makeWildTable();
  const loot = await RollTable.create({name: "Loot", results: [{range: [1, 6], text: "A spoon"}]});
  const off = await makeWildTable({flags: {"magic-wheel": {kind: "wild-magic", wheel: false}}});
  const calls = [];
  const core = (...args) => {
    calls.push(args);
    return Promise.resolve("roulette");
  };
  assert.equal(await animateRollWrapper.call({document: wild}, core, ["r1"]), undefined);
  assert.equal(await animateRollWrapper.call({object: wild}, core, ["r1"]), undefined);
  assert.equal(calls.length, 0, "the wheel replaces the roulette");
  assert.equal(await animateRollWrapper.call({document: loot}, core, ["r2"]), "roulette");
  assert.equal(await animateRollWrapper.call({document: off}, core, ["r3"]), "roulette");
  assert.deepEqual(calls, [[["r2"]], [["r3"]]]);

  // Registered with the draw wrapper: patched once on the sheet class, or through libWrapper when it is active
  const seen = [];
  class RollTableConfig {
    constructor(document) { this.document = document; }
    async _animateRoll(results) {
      seen.push([this.document.name, results]);
      return "core";
    }
  }
  const original = RollTableConfig.prototype._animateRoll;
  const fresh = tag => import(`${pathToFileURL(rel("scripts/integrations.js")).href}?${tag}`);
  globalThis.RollTableConfig = RollTableConfig;
  try {
    assert.equal((await fresh("animate-1")).registerDrawWrapper(), true);
    const patched = RollTableConfig.prototype._animateRoll;
    assert.notEqual(patched, original);
    assert.equal((await fresh("animate-2")).registerDrawWrapper(), true);
    assert.equal(RollTableConfig.prototype._animateRoll, patched, "patched only once");
    assert.equal(await new RollTableConfig(wild)._animateRoll(["x"]), undefined);
    assert.equal(await new RollTableConfig(loot)._animateRoll(["y"]), "core");
    assert.deepEqual(seen, [["Loot", ["y"]]]);

    RollTableConfig.prototype._animateRoll = original;
    const registered = [];
    game.modules.set("lib-wrapper", {id: "lib-wrapper", active: true});
    globalThis.libWrapper = {register: (...args) => registered.push(args)};
    const viaLib = await fresh("animate-3");
    assert.equal(viaLib.registerDrawWrapper(), true);
    assert.equal(RollTableConfig.prototype._animateRoll, original, "libWrapper does the wrapping");
    assert.deepEqual(registered.map(([id, target, , type]) => `${id} ${target} ${type}`).sort(), [
      "magic-wheel RollTable.prototype.draw MIXED",
      "magic-wheel RollTableConfig.prototype._animateRoll MIXED"
    ]);
    assert.equal(registered.find(r => r[1].endsWith("_animateRoll"))[2], viaLib.animateRollWrapper);
  } finally {
    delete globalThis.RollTableConfig;
    delete globalThis.libWrapper;
    game.modules.delete("lib-wrapper");
  }
});

/** Bare-bones stand-ins for the elements WheelApp drives. */
const fakeElement = () => ({
  classList: {add() {}, remove() {}, toggle() {}, contains: () => false},
  style: {setProperty() {}},
  textContent: ""
});

test("WheelApp: one animation-frame chain at a time, and the landing ratings spike sticks", async () => {
  resetWorld();
  const table = await makeWildTable();
  Roll.nextTotals = [7];
  await table.draw();
  const presentation = foundry.utils.deepClone(spinFlag(log.created[0].msg));
  const frames = new Map();
  let nextId = 0;
  globalThis.requestAnimationFrame = fn => {
    frames.set(++nextId, fn);
    return nextId;
  };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const app = new M.wheelApp.WheelApp(presentation);
  try {
    app._dom = {root: fakeElement(), canvas: fakeElement(), pointer: fakeElement(), viewers: fakeElement(), spotlight: fakeElement()};
    app._typewriter = null;
    app._begin();
    assert.equal(frames.size, 1);
    // Like a browser: every queued callback runs once per frame. 150ms frames update the viewer count every frame.
    let now = performance.now();
    let count = 0;
    let landedAt = -1;
    while ( frames.size && (count < 1000) ) {
      now += 150;
      count++;
      const due = [...frames.values()];
      frames.clear();
      for ( const fn of due ) fn(now);
      assert.ok(frames.size <= 1, `frame ${count} left ${frames.size} frames queued`);
      if ( (landedAt < 0) && (app._phase !== "spinning") ) {
        landedAt = count;
        assert.equal(app._viewers.current, app._viewers.end, "the spike is the final count");
        assert.equal(app._dom.viewers.textContent, Math.round(app._viewers.end).toLocaleString());
      }
    }
    assert.ok(landedAt > 0, "the wheel landed");
    assert.equal(frames.size, 0, "the loop stops when idle");
  } finally {
    await app.close();
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  }
});

test("WheelApp: the mute button's icon and tooltip follow the mute state, from the lang file", async () => {
  resetWorld();
  const app = new M.wheelApp.WheelApp({});
  try {
    const mute = app._getHeaderButtons().find(b => b.class === "mw-mute");
    assert.equal(mute.tooltip, LANG_FLAT["MAGICWHEEL.Wheel.Mute"]);
    assert.equal(mute.icon, "fa-solid fa-volume-high");
    const icon = {className: mute.icon};
    const button = {dataset: {tooltip: mute.tooltip}, querySelector: () => icon};
    let shownAgain = null;
    game.tooltip = {element: button, activate: el => { shownAgain = el; }};
    app._onToggleMute({currentTarget: button});
    assert.equal(icon.className, "fa-solid fa-volume-xmark");
    assert.equal(button.dataset.tooltip, LANG_FLAT["MAGICWHEEL.Wheel.Unmute"]);
    assert.equal(shownAgain, button, "an open tooltip shows the new text");
    assert.equal(app._getHeaderButtons().find(b => b.class === "mw-mute").tooltip, LANG_FLAT["MAGICWHEEL.Wheel.Unmute"]);
    game.tooltip.element = null;
    app._onToggleMute({currentTarget: button});
    assert.equal(icon.className, "fa-solid fa-volume-high");
    assert.equal(button.dataset.tooltip, LANG_FLAT["MAGICWHEEL.Wheel.Mute"]);
    setSetting("sound", false);
    assert.equal(app._getHeaderButtons().find(b => b.class === "mw-mute"), undefined);
  } finally {
    delete game.tooltip;
    await app.close();
  }
});

test("WheelApp: the toast clearance is measured once a minimised window is laid out again", async () => {
  resetWorld();
  const app = new M.wheelApp.WheelApp({});
  const props = {};
  const classes = new Set();
  const stage = {offsetTop: 40, offsetHeight: 0};
  app._dom = {
    root: {classList: {contains: c => classes.has(c)}, style: {setProperty: (k, v) => { props[k] = v; }}},
    stage,
    toast: {offsetTop: 300}
  };
  try {
    app._fitToast();
    assert.equal(props["--mw-toast-clear"], undefined, "nothing to measure while minimised");
    await tick();
    stage.offsetHeight = 276;
    await waitFor(() => props["--mw-toast-clear"] !== undefined, "the toast clearance");
    assert.equal(props["--mw-toast-clear"], "16px");
    // Once the toast has gone, a minimised window stops measuring
    delete props["--mw-toast-clear"];
    stage.offsetHeight = 0;
    classes.add("hide-toast");
    app._fitToast();
    assert.equal(app._timers.size, 0);
  } finally {
    await app.close();
  }
});

test("templates only localize keys that exist in en.json", () => {
  const used = [];
  for ( const f of fs.readdirSync(rel("templates")).filter(x => x.endsWith(".hbs")) ) {
    const src = fs.readFileSync(rel(`templates/${f}`), "utf8");
    for ( const m of src.matchAll(/\{\{\s*localize\s+["']([^"']+)["']/g) ) {
      used.push(m[1]);
      assert.ok(m[1] in LANG_FLAT, `${f}: ${m[1]}`);
    }
  }
  for ( const key of ["MAGICWHEEL.Card.Replay", "MAGICWHEEL.Wheel.DismissToast"] ) assert.ok(used.includes(key), key);
});

test("no missing i18n keys were requested during the run", () => {
  assert.deepEqual([...missingI18n], []);
});

/* ---------------- run ---------------- */

// The module logs expected errors (that is what the failure tests provoke); keep them out of the output
// unless the test fails.
const realConsole = {log: console.log, warn: console.warn, error: console.error};
let captured = [];
for ( const level of ["log", "warn", "error"] ) {
  console[level] = (...args) => captured.push(`${level}: ${args.map(a => (a instanceof Error ? a.message : String(a))).join(" ")}`);
}

let failed = 0;
for ( const {name, fn} of tests ) {
  captured = [];
  try {
    await fn();
    realConsole.log(`ok   ${name}`);
  }
  catch(err) {
    failed++;
    realConsole.log(`FAIL ${name}\n     ${String(err.stack || err).split("\n").slice(0, 8).join("\n     ")}`);
    for ( const line of captured.slice(-10) ) realConsole.log(`     | ${line}`);
  }
}
Object.assign(console, realConsole);
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exitCode = failed ? 1 : 0;
setTimeout = realSetTimeout;
