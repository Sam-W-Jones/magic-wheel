// The Wild Magic Surge entries: the table text plus the wheel label, tone and the System AI's opinions.
// Pure data and helpers, no Foundry globals, so it can be unit tested.

import { SURGE_TEXT } from "./data/surge-text.js";
import { SURGES_LOW } from "./data/surges-low.js";
import { SURGES_HIGH } from "./data/surges-high.js";

/** Key used by SURGE_TEXT, e.g. rangeKey([99, 100]) === "99-100". */
export const rangeKey = ([lo, hi]) => `${lo}-${hi}`;

/** Two-digit d100 face, where 100 reads "00". */
export const formatD100 = n => (n === 100 ? "00" : String(n).padStart(2, "0"));

/**
 * Human label for a result range.
 * @param {[number, number]} range
 * @param {object} [options]
 * @param {boolean} [options.d100=false]  Use d100 two-digit faces ("07-08", "99-00").
 */
export function formatRange([lo, hi], {d100=false}={}) {
  const f = d100 ? formatD100 : String;
  return lo === hi ? f(lo) : `${f(lo)}-${f(hi)}`;
}

/** All 50 entries, sorted by range, each with its table `text` attached. */
export const SURGES = [...SURGES_LOW, ...SURGES_HIGH]
  .map(entry => ({...entry, text: SURGE_TEXT[rangeKey(entry.range)]}))
  .sort((a, b) => a.range[0] - b.range[0]);

/** The entry whose range exactly matches, or null. */
export function findSurgeByRange(range) {
  if ( !Array.isArray(range) ) return null;
  return SURGES.find(e => (e.range[0] === range[0]) && (e.range[1] === range[1])) ?? null;
}

/** The entry containing a d100 total (1-100), or null. */
export function findSurgeByTotal(total) {
  return SURGES.find(e => (total >= e.range[0]) && (total <= e.range[1])) ?? null;
}
