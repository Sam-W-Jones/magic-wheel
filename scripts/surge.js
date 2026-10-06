// The core flow: decide which tables use the wheel, draw from them, build the SpinPresentation, broadcast it,
// wait for the reveal and post the result card.

import {
  MODULE_ID, SETTINGS, FLAGS, TONES, WILD_MAGIC_KIND, DEFAULT_TABLE_NAME, PRESENTATION_VERSION, REVEAL_PAD_MS,
  READ_WINDOW_MS, WMS_MODULE_ID
} from "./constants.js";
import { findSurgeByRange, formatRange, rangeKey } from "./surge-data.js";
import { QUIPS, fill, pick, pickSome, viewerCounts, escapeHTML } from "./quips.js";
import { buildSegments, planSpin } from "./wheel-math.js";
import { getSetting, parseTableNames, readHistory, pushHistory } from "./settings.js";
import { emitSpin, showSpin } from "./socket.js";
import { renderChatCard, fallbackCardHTML, plain, safeTone, safeIcon } from "./chat.js";

const LABEL_MAX = 18;
const DEFAULT_ICON = "fa-solid fa-dharmachakra";
const EXTRA_TIMEOUT_MS = 4000;
const STREAK_WINDOW_MS = 60 * 60 * 1000;
const STREAK_MIN = 3;
/** Minimum number of exact Wild Magic Surge ranges for a table to count as the sorcerer's table. */
const WILD_MAGIC_RANGE_MATCHES = 40;

/* -------------------------------------------- */
/*  Table classification                        */
/* -------------------------------------------- */

const moduleFlags = doc => doc?.flags?.[MODULE_ID] ?? {};
const resultsOf = table => Array.from(table?.results ?? []);

/**
 * Should draws from this table spin the wheel?
 * @param {RollTable} table
 * @returns {boolean}
 */
export function isWheelTable(table) {
  if ( !table ) return false;
  const flags = moduleFlags(table);
  if ( flags[FLAGS.wheel] === false ) return false;
  if ( flags[FLAGS.wheel] === true ) return true;
  if ( flags[FLAGS.kind] === WILD_MAGIC_KIND ) return true;
  const name = String(table.name ?? "").trim().toLowerCase();
  return !!name && parseTableNames().includes(name);
}

/**
 * Is this the sorcerer's Wild Magic Surge table, or some other table that happens to use the wheel?
 * @param {RollTable} table
 * @returns {"wild-magic"|"generic"}
 */
export function tableKind(table) {
  if ( !table ) return "generic";
  if ( moduleFlags(table)[FLAGS.kind] === WILD_MAGIC_KIND ) return WILD_MAGIC_KIND;
  if ( isPathOfWildMagicTable(table) ) return "generic";
  if ( /wild\s*magic\s*surge/i.test(String(table.name ?? "")) ) return WILD_MAGIC_KIND;
  const matches = resultsOf(table).filter(r => findSurgeByRange(r?.range)).length;
  return matches >= WILD_MAGIC_RANGE_MATCHES ? WILD_MAGIC_KIND : "generic";
}

/**
 * Is this the table Wild Magic Surge 5e rolls for a Path of Wild Magic barbarian (its powmRollTableName setting)?
 * That is a barbarian's Wild Surge, not the sorcerer's table, whatever it is called.
 * @param {RollTable} table
 * @returns {boolean}
 */
export function isPathOfWildMagicTable(table) {
  if ( !table || !game.modules?.get(WMS_MODULE_ID)?.active ) return false;
  let name;
  try {
    name = game.settings.get(WMS_MODULE_ID, "powmRollTableName");
  } catch(err) {
    return false;
  }
  return (typeof name === "string") && !!name.trim() && (String(table.name ?? "").trim() === name.trim());
}

/**
 * Find the world's Wild Magic Surge table: one flagged as the wild magic kind, else one named in the
 * `tableNames` setting (in order), else one named like the default. Tables this user can observe win ties.
 * @returns {RollTable|null}
 */
export function findWildMagicTable() {
  const tables = Array.from(game.tables ?? []);
  if ( !tables.length ) return null;
  const preferVisible = list => list.find(canObserve) ?? list[0] ?? null;
  const flagged = tables.filter(t => moduleFlags(t)[FLAGS.kind] === WILD_MAGIC_KIND);
  if ( flagged.length ) return preferVisible(flagged);
  const names = [...parseTableNames(), DEFAULT_TABLE_NAME.toLowerCase()];
  for ( const name of names ) {
    const named = tables.filter(t => String(t.name ?? "").trim().toLowerCase() === name);
    if ( named.length ) return preferVisible(named);
  }
  return null;
}

function canObserve(table) {
  try {
    return table.testUserPermission(game.user, "OBSERVER");
  } catch(err) {
    return true;
  }
}

/* -------------------------------------------- */
/*  Audience                                    */
/* -------------------------------------------- */

/**
 * Who may see the wheel for a roll. Pure.
 * @param {object} options
 * @param {string} options.rollMode          publicroll | gmroll | blindroll | selfroll
 * @param {string} options.rollerId
 * @param {string[]} [options.gmIds=[]]
 * @param {string} [options.audienceSetting="everyone"]   everyone | roller
 * @returns {string[]|null}   User ids, or null for everyone.
 */
export function computeAudience({rollMode, rollerId, gmIds=[], audienceSetting="everyone"}={}) {
  const unique = list => [...new Set(list.filter(Boolean))];
  const gms = Array.isArray(gmIds) ? gmIds : [];
  switch ( rollMode ) {
    case "gmroll": return unique([rollerId, ...gms]);
    case "blindroll": return unique([...gms]);
    case "selfroll": return unique([rollerId]);
    default:
      return audienceSetting === "roller" ? unique([rollerId, ...gms]) : null;
  }
}

/**
 * Normalise a roll mode: undefined or "roll" means the user's current chat roll mode.
 * @param {string} [rollMode]
 * @returns {string}
 */
export function resolveRollMode(rollMode) {
  const modes = CONST.DICE_ROLL_MODES;
  let mode = rollMode;
  if ( !mode || (mode === "roll") ) {
    try {
      mode = game.settings.get("core", "rollMode");
    } catch(err) {
      mode = modes.PUBLIC;
    }
  }
  return Object.values(modes).includes(mode) ? mode : modes.PUBLIC;
}

/* -------------------------------------------- */
/*  Drawing                                     */
/* -------------------------------------------- */

/**
 * Draw from a table like RollTable#draw does, but present the result with the wheel.
 * @param {RollTable} table
 * @param {object} [options]
 * @param {Roll|boolean} [options.roll]           A Roll to use (or anything else to roll the table formula).
 * @param {boolean} [options.recursive=true]      Roll inner tables.
 * @param {TableResult[]} [options.results=[]]    Results already drawn; honoured as-is.
 * @param {boolean} [options.displayChat=true]    Present and post the result.
 * @param {string} [options.rollMode]             Chat roll mode (defaults to the user's current mode).
 * @param {object} [options.speaker]              ChatMessage speaker data.
 * @param {string} [options.rollerId]             The user the roll is made for, when this client rolls on a
 *                                                player's behalf (see presentSurge).
 * @returns {Promise<{roll: Roll, results: TableResult[]}>}
 */
export async function drawWithWheel(table, {roll, recursive=true, results=[], displayChat=true, rollMode, speaker,
  rollerId}={}) {
  if ( !table ) throw new Error(`${MODULE_ID} | drawWithWheel needs a RollTable`);
  results = Array.isArray(results) ? results.filter(Boolean) : [];

  if ( !results.length ) {
    const r = await table.roll({roll, recursive});
    roll = r.roll;
    results = r.results ?? [];
  }
  if ( !results.length ) return {roll, results};

  // Mark results as drawn, if replacement is not used, and we are not in a Compendium pack
  if ( !table.replacement && !table.pack && roll ) {
    const draws = table.getResultsForRoll(roll.total);
    try {
      await table.updateEmbeddedDocuments("TableResult", draws.map(r => ({_id: r.id, drawn: true})));
    } catch(err) {
      warnDrawnFailed(table, err);
    }
  }

  // Mark any nested table results as drawn too
  const nested = results.reduce((obj, r) => {
    const parent = r.parent;
    if ( !parent || (parent === table) || parent.replacement || parent.pack ) return obj;
    (obj[parent.id] ??= []).push({_id: r.id, drawn: true});
    return obj;
  }, {});
  if ( Object.keys(nested).length ) {
    try {
      const updates = Object.entries(nested).map(([_id, rs]) => ({_id, results: rs}));
      await table.constructor.updateDocuments(updates);
    } catch(err) {
      warnDrawnFailed(table, err);
    }
  }

  if ( displayChat ) await presentSurge(table, roll, results, {rollMode, speaker, rollerId});
  return {roll, results};
}

function warnDrawnFailed(table, err) {
  console.warn(`${MODULE_ID} | Could not mark results of "${table?.name}" as drawn`, err);
  ui.notifications?.warn(game.i18n.format("MAGICWHEEL.Notifications.DrawnUpdateFailed", {name: escapeHTML(table?.name)}));
}

/* -------------------------------------------- */
/*  Presentation                                */
/* -------------------------------------------- */

let presentQueue = Promise.resolve();
let queuedPresentations = 0;

/**
 * Spin the wheel for an already-decided draw and post the chat card. Presentations on one client run one at a
 * time; when another one is waiting, the landed result stays up a few seconds before it is replaced. Whatever goes
 * wrong with the show, a chat card is always posted.
 * @param {RollTable} table
 * @param {Roll} roll
 * @param {TableResult[]} results
 * @param {object} [options]
 * @param {string} [options.rollMode]
 * @param {object} [options.speaker]
 * @param {string} [options.rollerId]   The user this roll is made for when it is not the current user (Wild Magic
 *                                      Surge 5e rolls player surges on the GM's client). It only widens the audience
 *                                      of public rolls; private ones stay with the GMs, like their chat card.
 * @returns {Promise<ChatMessage|null>}
 */
export function presentSurge(table, roll, results, {rollMode, speaker, rollerId}={}) {
  // Settle the roll mode and speaker now, as core does when it draws, not when a queued show gets its turn
  const options = {rollMode: resolveRollMode(rollMode), speaker: resolveSpeaker(speaker), rollerId};
  queuedPresentations++;
  const job = presentQueue.then(() => runPresentation(table, roll, results, options));
  presentQueue = job.catch(() => null).then(() => {
    queuedPresentations--;
    return (queuedPresentations > 0) ? sleep(READ_WINDOW_MS) : null;
  });
  return job;
}

async function runPresentation(table, roll, results, options) {
  results = (Array.isArray(results) ? results : [results]).filter(Boolean);
  const rollMode = resolveRollMode(options.rollMode);
  const speaker = resolveSpeaker(options.speaker);
  const kind = guard(() => tableKind(table), "generic");
  const effectHtml = await buildEffectHtml(results, speaker);

  let built = null;
  try {
    built = await buildPresentation({table, roll, results, speaker, kind, effectHtml});
  } catch(err) {
    console.error(`${MODULE_ID} | Could not build the wheel presentation`, err);
  }

  let inAudience = false;
  if ( built ) {
    try {
      inAudience = await stagePresentation(built.presentation, rollMode, options.rollerId);
    } catch(err) {
      console.error(`${MODULE_ID} | The wheel show failed`, err);
    }
  }

  const message = await postResultCard({table, roll, results, speaker, rollMode, kind, effectHtml,
    presentation: built?.presentation ?? null});

  // Only results this user may see count towards repeats and streaks, or a later aside would give a blind roll away
  if ( built?.historyKey && inAudience ) {
    try {
      await pushHistory(built.historyKey);
    } catch(err) {
      console.warn(`${MODULE_ID} | Could not update the surge history`, err);
    }
  }
  return message;
}

/**
 * Broadcast the spin, show it here if this user is in the audience, then wait for the reveal.
 * @param {object} presentation
 * @param {string} rollMode
 * @param {string} [rollerId]   The user the roll is made for, if not this one (public rolls only).
 * @returns {Promise<boolean>}   Whether this user is in the audience.
 */
async function stagePresentation(presentation, rollMode, rollerId) {
  const me = game.user.id;
  const gmIds = game.users.filter(u => u.isGM).map(u => u.id);
  // A public roll made on a player's behalf is theirs to watch. A private one stays as private as its chat card,
  // which this client whispers as its own roll: the wheel never shows a player what the card hides from them.
  const forOther = !!rollerId && (rollerId !== me) && (rollMode === CONST.DICE_ROLL_MODES.PUBLIC);
  let audience = computeAudience({rollMode, rollerId: forOther ? rollerId : me, gmIds,
    audienceSetting: getSetting(SETTINGS.audience, "everyone")});
  if ( forOther && Array.isArray(audience) && !audience.includes(me) ) audience = [...audience, me];
  const inAudience = (audience === null) || audience.includes(me);

  try {
    emitSpin(presentation, audience);
  } catch(err) {
    console.error(`${MODULE_ID} | Could not broadcast the spin`, err);
  }

  let watchingHere = false;
  // The UI gets its own copy so nothing it does can leak into the chat message flags
  if ( inAudience ) watchingHere = !!showSpin(foundry.utils.deepClone(presentation));
  else {
    const line = pick(QUIPS.blind);
    if ( line ) ui.notifications?.info(fill(line, {name: presentation.speakerName, user: game.user.name}));
  }

  const othersWatching = game.users.some(u => u.active && (u.id !== me) && ((audience === null) || audience.includes(u.id)));
  if ( watchingHere || othersWatching ) {
    const totalMs = Number(presentation.plan?.totalMs);
    await sleep((Number.isFinite(totalMs) ? Math.max(0, totalMs) : 8000) + REVEAL_PAD_MS);
  }
  return inAudience;
}

/**
 * Build the SpinPresentation for a draw.
 * @returns {Promise<{presentation: object, historyKey: string}>}
 */
async function buildPresentation({table, roll, results, speaker, kind, effectHtml}) {
  const isWild = kind === WILD_MAGIC_KIND;
  const commentary = getSetting(SETTINGS.commentary, true) !== false;
  const speakerName = speakerNameOf(speaker);
  const useD100 = isWild && isD100Table(table);

  // Wheel slices: every result of the table, sorted by range
  const tableResults = resultsOf(table)
    .filter(r => Array.isArray(r?.range))
    .sort((a, b) => (a.range[0] - b.range[0]) || (a.range[1] - b.range[1]));
  const entries = tableResults.map(r => {
    const info = describeResult(r, isWild);
    return {id: r.id, lo: r.range[0], hi: r.range[1], label: info.label, tone: info.tone};
  });
  if ( !entries.length ) throw new Error("The table has no results to put on the wheel");
  const segments = buildSegments(entries);

  // The landing slice: the drawn result, else (inner-table draws) the slice containing the roll total
  const first = results[0];
  const total = Number.isFinite(roll?.total) ? roll.total : (first?.range?.[0] ?? 0);
  let targetIndex = segments.findIndex(s => s.id === first?.id);
  if ( targetIndex < 0 ) targetIndex = segments.findIndex(s => (total >= s.lo) && (total <= s.hi));
  if ( targetIndex < 0 ) targetIndex = 0;
  const target = segments[targetIndex];
  const targetResult = tableResults.find(r => r.id === target.id) ?? first;

  // What landed (the drawn result itself when it is from this table)
  const shown = (first && (first.parent === table || tableResults.includes(first))) ? first : targetResult;
  const range = Array.isArray(shown?.range) ? shown.range : [target.lo, target.hi];
  const info = describeResult(shown, isWild);
  const entry = isWild ? findSurgeByRange(range) : null;
  const tone = safeTone(info.tone);

  const plan = planSpin({
    segments,
    targetIndex,
    durationMs: clampNumber(getSetting(SETTINGS.spinSeconds, 8), 4, 15, 8) * 1000,
    fakeOut: getSetting(SETTINGS.fakeOuts, true) !== false
  });

  const playerName = playerNameFor(speaker);
  const vars = {name: speakerName, user: playerName};
  const say = (fn, fallback=null) => (commentary ? guard(fn, fallback) : fallback);

  // History: repeat and streak asides
  const historyKey = isWild ? `${WILD_MAGIC_KIND}:${rangeKey(range)}` : `${table.id}:${rangeKey(range)}`;
  const history = readHistory();
  const repeatLine = say(() => {
    if ( history[0]?.key !== historyKey ) return null;
    const count = history.filter(h => h.key === historyKey).length + 1;
    return fillPick(QUIPS.repeat, {...vars, label: info.label, count});
  });
  const streakLine = say(() => {
    if ( !isWild ) return null;
    const now = Date.now();
    const recent = history.filter(h => h.key.startsWith(`${WILD_MAGIC_KIND}:`) && ((now - h.t) <= STREAK_WINDOW_MS));
    const count = recent.length + 1;
    return count >= STREAK_MIN ? fillPick(QUIPS.streak, {...vars, count}) : null;
  });

  const extraHtml = await runExtra(entry, buildExtraContext(speaker, speakerName));

  const fakeOutPool = plan?.fakeOut === "creep" ? QUIPS.fakeOutCreep
    : plan?.fakeOut === "rollback" ? QUIPS.fakeOutRollback : null;
  const reactionCount = 4 + Math.floor(Math.random() * 3);

  const presentation = {
    version: PRESENTATION_VERSION,
    spinId: foundry.utils.randomID(),
    userId: game.user.id,
    userName: game.user.name,
    speakerName,
    tableId: table.id,
    tableUuid: table.uuid,
    tableName: table.name,
    kind: isWild ? WILD_MAGIC_KIND : "generic",
    total,
    formula: roll?.formula ?? table.formula ?? "",
    segments,
    targetIndex,
    plan,
    result: {
      rangeLabel: formatRange(range, {d100: useD100}),
      label: info.label,
      tone,
      icon: safeIcon(info.icon),
      effectHtml,
      line: say(() => (entry?.lines?.length
        ? fillPick(entry.lines, vars)
        : fillPick(QUIPS.generic, {...vars, result: info.label}))),
      landed: say(() => fillPick(QUIPS.landed, {...vars, label: info.label})),
      achievement: say(() => (entry?.achievement?.title ? {
        title: fill(entry.achievement.title, vars),
        text: fill(entry.achievement.text ?? "", vars)
      } : null)),
      box: say(() => (entry?.box?.tier ? {
        tier: plain(entry.box.tier),
        tierClass: String(entry.box.tier).toLowerCase().replace(/[^a-z0-9-]/g, ""),
        contents: fill(entry.box.contents ?? "", vars)
      } : null)),
      extraHtml,
      repeatLine,
      streakLine
    },
    chatter: {
      title: plain(isWild ? (pick(QUIPS.titles) ?? game.i18n.localize("MAGICWHEEL.Card.Headline")) : table.name),
      intro: say(() => fillPick(QUIPS.intro, vars)),
      spinning: say(() => pickSome(QUIPS.spinning, 3).map(l => fill(l, vars)), []) ?? [],
      slowing: say(() => fillPick(QUIPS.slowing, vars)),
      fakeOut: fakeOutPool ? say(() => fillPick(fakeOutPool, vars)) : null,
      sponsor: say(() => fillPick(QUIPS.sponsors, vars)),
      reactions: say(() => pickSome(QUIPS.reactions?.[tone] ?? [], reactionCount).map(l => fill(l, vars)), []) ?? [],
      viewers: guard(() => viewerCounts(), null) ?? {start: 250000, end: 300000},
      closeLabel: plain(commentary ? (pick(QUIPS.closeLabels) ?? closeFallback()) : closeFallback())
    },
    replay: false
  };
  return {presentation, historyKey};
}

/**
 * Post the result chat card. Falls back to a minimal card, then to a bare message, so a draw is never lost.
 * @returns {Promise<ChatMessage|null>}
 */
async function postResultCard({table, roll, results, speaker, rollMode, kind, effectHtml, presentation}) {
  let content = null;
  if ( presentation ) {
    try {
      content = await renderChatCard(presentation);
    } catch(err) {
      console.error(`${MODULE_ID} | Could not render the chat card`, err);
    }
  }
  if ( !content ) {
    const first = results[0];
    const info = guard(() => describeResult(first, kind === WILD_MAGIC_KIND), {});
    content = fallbackCardHTML({
      headline: kind === WILD_MAGIC_KIND ? game.i18n.localize("MAGICWHEEL.Card.Headline") : table?.name,
      label: info.label,
      rangeLabel: Array.isArray(first?.range) ? formatRange(first.range, {d100: kind === WILD_MAGIC_KIND}) : "",
      effectHtml,
      tone: info.tone
    });
  }

  const flags = {core: {RollTable: table?.id ?? null}};
  if ( presentation ) flags[MODULE_ID] = {[FLAGS.spin]: presentation};
  const data = {
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    user: game.user.id,
    speaker,
    content,
    sound: null,
    flags
  };
  ChatMessage.applyRollMode(data, rollMode);

  // An OTHER message is always visible to its author, which would spoil a blind roll for the roller.
  // A ROLL message without rolls gets core's "rolled privately" treatment instead (and no 3D dice).
  if ( rollMode === CONST.DICE_ROLL_MODES.BLIND ) {
    data.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    data.rolls = [];
  }

  const cls = ChatMessage.implementation ?? ChatMessage;
  try {
    return await cls.create(data, {rollMode});
  } catch(err) {
    console.error(`${MODULE_ID} | Could not post the chat card, retrying without the wheel data`, err);
  }
  try {
    delete data.flags[MODULE_ID];
    data.content = fallbackCardHTML({headline: table?.name, label: "", rangeLabel: String(roll?.total ?? ""), effectHtml});
    return await cls.create(data, {rollMode});
  } catch(err) {
    console.error(`${MODULE_ID} | Could not post the result at all`, err);
    return null;
  }
}

/* -------------------------------------------- */
/*  Result text, labels and helpers             */
/* -------------------------------------------- */

/**
 * The enriched effect text of the drawn results. Never throws.
 * @param {TableResult[]} results
 * @param {object} speaker
 * @returns {Promise<string>}
 */
async function buildEffectHtml(results, speaker) {
  let rollData = {};
  try {
    rollData = ChatMessage.getSpeakerActor(speaker)?.getRollData?.() ?? {};
  } catch(err) {
    rollData = {};
  }
  const parts = [];
  for ( const result of results ) {
    let text = "";
    try {
      text = (typeof result.getChatText === "function") ? result.getChatText() : (result.text ?? "");
    } catch(err) {
      text = result?.text ?? "";
    }
    try {
      parts.push(await TextEditor.enrichHTML(String(text ?? ""), {async: true, rollData}));
    } catch(err) {
      console.warn(`${MODULE_ID} | Could not enrich the result text`, err);
      parts.push(escapeHTML(stripText(text)));
    }
  }
  return parts.filter(Boolean).join("<hr>");
}

/**
 * Label, tone and icon for a TableResult.
 * @param {TableResult} result
 * @param {boolean} isWild
 * @returns {{label: string, tone: string, icon: string}}
 */
function describeResult(result, isWild) {
  const flags = moduleFlags(result);
  const entry = isWild ? findSurgeByRange(result?.range) : null;
  let label = entry?.label ?? (typeof flags[FLAGS.label] === "string" ? flags[FLAGS.label] : "");
  if ( !String(label).trim() ) label = truncateLabel(stripText(result?.text).toUpperCase());
  if ( !String(label).trim() && Array.isArray(result?.range) ) label = formatRange(result.range);
  const tone = entry?.tone ?? (TONES.includes(flags.tone) ? flags.tone : "weird");
  const icon = entry?.icon ?? (typeof flags.icon === "string" ? flags.icon : DEFAULT_ICON);
  return {label: plain(String(label).trim()), tone, icon};
}

/**
 * Plain text from result text: content links become their labels, tags go away, whitespace collapses.
 * @param {string} text
 * @returns {string}
 */
export function stripText(text) {
  return String(text ?? "")
    .replace(/@\w+\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@\w+\[([^\]]*)\]/g, "$1")
    .replace(/\[\[(?:\/\w+\s+)?([^\]]*)\]\]/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Shorten a label to fit a wheel slice.
 * @param {string} label
 * @param {number} [max=18]
 * @returns {string}
 */
export function truncateLabel(label, max=LABEL_MAX) {
  const s = String(label ?? "").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function isD100Table(table) {
  const formula = String(table?.formula ?? "").replace(/\s+/g, "").toLowerCase();
  return !formula || /^1?d(100|%)$/.test(formula);
}

function resolveSpeaker(speaker) {
  if ( speaker && (typeof speaker === "object") ) return speaker;
  try {
    return ChatMessage.getSpeaker();
  } catch(err) {
    return {scene: null, actor: null, token: null, alias: game.user?.name};
  }
}

function speakerNameOf(speaker) {
  if ( speaker?.alias ) return String(speaker.alias);
  try {
    const actor = ChatMessage.getSpeakerActor(speaker);
    if ( actor?.name ) return actor.name;
  } catch(err) { /* fall through */ }
  return game.user?.name ?? "";
}

/** The player behind the speaking actor (for {user}), else the current user. */
function playerNameFor(speaker) {
  try {
    const actor = ChatMessage.getSpeakerActor(speaker);
    if ( actor && game.user.isGM ) {
      const players = game.users.filter(u => !u.isGM);
      const owner = players.find(u => u.character?.id === actor.id)
        ?? players.find(u => actor.testUserPermission(u, "OWNER"));
      if ( owner ) return owner.name;
    }
  } catch(err) { /* fall through */ }
  return game.user?.name ?? "";
}

function closeFallback() {
  return game.i18n.localize("MAGICWHEEL.Wheel.Close");
}

function fillPick(list, vars) {
  const line = pick(list);
  return line === undefined ? null : fill(line, vars);
}

function guard(fn, fallback=null) {
  try {
    const value = fn();
    return value === undefined ? fallback : value;
  } catch(err) {
    console.warn(`${MODULE_ID} |`, err);
    return fallback;
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if ( !Number.isFinite(n) ) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------------------------------- */
/*  Extras                                      */
/* -------------------------------------------- */

async function runExtra(entry, ctx) {
  if ( typeof entry?.extra !== "function" ) return null;
  let timer;
  try {
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => resolve(null), EXTRA_TIMEOUT_MS);
    });
    const out = await Promise.race([Promise.resolve().then(() => entry.extra(ctx)), timeout]);
    return (typeof out === "string") && out.trim() ? out : null;
  } catch(err) {
    console.warn(`${MODULE_ID} | Surge extra for ${entry.range?.join("-")} failed`, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The ExtraContext handed to a surge entry's `extra`.
 * @param {object} speaker
 * @param {string} speakerName
 * @returns {object}
 */
function buildExtraContext(speaker, speakerName) {
  return {
    name: escapeHTML(speakerName),
    escape: escapeHTML,
    roll: async (formula, {label}={}) => {
      const r = await new Roll(String(formula)).evaluate({async: true});
      let html;
      try {
        html = r.toAnchor({label: label ? escapeHTML(label) : undefined}).outerHTML;
      } catch(err) {
        html = `<strong>${escapeHTML(r.total)}</strong>`;
      }
      return {total: r.total, html};
    },
    randomNearbyToken: makeRandomNearbyToken(speaker)
  };
}

/**
 * Build `randomNearbyToken(feet, {includeSelf})` for a speaker: a random visible token on the viewed scene within
 * `feet` of the speaker's token (centre to centre), or null.
 * @param {object} speaker
 * @returns {(feet: number, options?: {includeSelf?: boolean}) => ({name: string}|null)}
 */
export function makeRandomNearbyToken(speaker) {
  return (feet, {includeSelf=false}={}) => {
    try {
      if ( !canvas?.ready || !canvas.scene || !canvas.tokens ) return null;
      if ( speaker?.scene && (speaker.scene !== canvas.scene.id) ) return null;
      const placeables = canvas.tokens.placeables ?? [];
      let self = speaker?.token ? placeables.find(t => t.id === speaker.token) : null;
      if ( !self && speaker?.actor ) self = placeables.find(t => t.actor?.id === speaker.actor) ?? null;
      if ( !self ) return null;
      const limit = Number(feet);
      const candidates = placeables.filter(t => {
        if ( !t?.document || t.document.hidden || (t.visible === false) ) return false;
        if ( t === self ) return !!includeSelf;
        const d = canvas.grid.measureDistance(self.center, t.center, {gridSpaces: true});
        return Number.isFinite(d) && (d <= limit);
      });
      const chosen = pick(candidates);
      return chosen ? {name: escapeHTML(chosen.name ?? chosen.document?.name ?? "")} : null;
    } catch(err) {
      console.warn(`${MODULE_ID} | randomNearbyToken failed`, err);
      return null;
    }
  };
}

/* -------------------------------------------- */
/*  Surge check                                 */
/* -------------------------------------------- */

/**
 * Roll the sorcerer's d20 surge check in public; on a 1, spin the Wild Magic Surge table.
 * @param {object} [options]
 * @param {Actor} [options.actor]
 * @param {Token|TokenDocument} [options.token]
 * @param {object} [options.speaker]
 * @returns {Promise<{roll: Roll, surged: boolean}>}
 */
export async function surgeCheck({actor, token, speaker}={}) {
  if ( !speaker ) {
    try {
      // A Token placeable's parent is a canvas container, so hand getSpeaker the TokenDocument
      speaker = ChatMessage.getSpeaker({actor, token: token?.document ?? token});
    } catch(err) {
      speaker = resolveSpeaker();
    }
  }
  const name = speaker?.alias || actor?.name || speakerNameOf(speaker);
  const commentary = getSetting(SETTINGS.commentary, true) !== false;

  const roll = await new Roll("1d20").evaluate({async: true});
  const surged = roll.total === 1;

  let flavor = (commentary && fillPick(QUIPS.checkFlavor, {name}))
    || escapeHTML(game.i18n.localize("MAGICWHEEL.Check.Flavor"));
  if ( !surged ) {
    const pass = (commentary && fillPick(QUIPS.checkPass, {name, total: roll.total}))
      || escapeHTML(game.i18n.format("MAGICWHEEL.Check.Pass", {total: roll.total}));
    flavor += `<br><em>${pass}</em>`;
  }

  try {
    const message = await roll.toMessage({speaker, flavor}, {rollMode: CONST.DICE_ROLL_MODES.PUBLIC});
    if ( message?.id && game.dice3d?.waitFor3DAnimationByMessageID ) {
      await game.dice3d.waitFor3DAnimationByMessageID(message.id);
    }
  } catch(err) {
    console.error(`${MODULE_ID} | Could not post the surge check`, err);
  }

  if ( !surged ) return {roll, surged};

  ui.notifications?.warn((commentary && fillPick(QUIPS.checkFail, {name}))
    || escapeHTML(game.i18n.localize("MAGICWHEEL.Check.Fail")));
  const table = findWildMagicTable();
  if ( !table ) {
    notifyNoTable();
    return {roll, surged};
  }
  try {
    await drawWithWheel(table, {speaker});
  } catch(err) {
    console.error(`${MODULE_ID} | The surge draw failed`, err);
  }
  return {roll, surged};
}

/**
 * Tell the user there is no Wild Magic Surge table.
 */
export function notifyNoTable() {
  ui.notifications?.warn(fillPick(QUIPS.noTable, {}) ?? game.i18n.localize("MAGICWHEEL.Notifications.NoTable"));
}
