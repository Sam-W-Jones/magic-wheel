// Hooks into Foundry and other packages: the RollTable#draw wrapper, Wild Magic Surge 5e, the dnd5e surge
// check and the RollTable sheet header button.

import { MODULE_ID, SETTINGS, FLAGS, WMS_MODULE_ID } from "./constants.js";
import { fill, pick } from "./quips.js";
import { getSetting } from "./settings.js";
import {
  isWheelTable, drawWithWheel, presentSurge, findWildMagicTable, surgeCheck, notifyNoTable, isPathOfWildMagicTable
} from "./surge.js";

const LIB_WRAPPER_ID = "lib-wrapper";
const DRAW_TARGET = "RollTable.prototype.draw";
const ANIMATE_TARGET = "RollTableConfig.prototype._animateRoll";
const PATCH_MARK = Symbol.for(`${MODULE_ID}.drawPatched`);
/**
 * How long an IsWildMagicSurge payload, or the item use Wild Magic Surge 5e is checking, is used to identify the
 * speaker of the table card that follows it.
 */
const SURGE_MEMORY_MS = 4000;
const SURGE_HOOK_GRACE_MS = 200;

const TOGGLE_LINES = {
  on: [
    "The wheel is installed on {table}. Every roll is now prime-time television.",
    "SYSTEM NOTICE: {table} has been upgraded to a game show. Contestants have not been consulted.",
    "{table} now spins. Our lawyers have been told to expect calls.",
    "Wheel attached to {table}. The audience is already cheering. They don't know why yet."
  ],
  off: [
    "The wheel has been removed from {table}. Results will now arrive with all the drama of a tax form.",
    "{table} is off the air. The viewers are rioting. Politely.",
    "SYSTEM NOTICE: {table} has been cancelled due to low ratings. Yours, specifically.",
    "Fine. {table} goes back to boring old dice. The wheel will remember this."
  ]
};

/* -------------------------------------------- */
/*  RollTable#draw                              */
/* -------------------------------------------- */

let drawWrapperRegistered = false;

/**
 * Should a draw skip the wheel and run core RollTable#draw unchanged?
 * @param {RollTable} table
 * @param {object} [options]   The draw options.
 * @returns {boolean}
 */
export function shouldBypassWheel(table, options) {
  const opts = (options && (typeof options === "object")) ? options : {};
  if ( opts.magicWheel === false ) return true;
  if ( opts.displayChat === false ) return true;
  try {
    return !isWheelTable(table);
  } catch(err) {
    return true;
  }
}

/**
 * The RollTable#draw wrapper (libWrapper MIXED signature: `this` is the table).
 * @param {Function} wrapped   The next draw in the chain.
 * @param {...*} args          The original draw arguments.
 * @returns {Promise<{roll: Roll, results: TableResult[]}>}
 */
export function drawWrapper(wrapped, ...args) {
  const options = args[0] ?? {};
  if ( shouldBypassWheel(this, options) ) return wrapped(...args);
  return drawWithWheel(this, options);
}

/**
 * The RollTableConfig#_animateRoll wrapper (libWrapper MIXED signature: `this` is the sheet). The sheet's Roll
 * button plays core's roulette before it draws; a wheel table's draw spins the wheel instead, so skip the roulette.
 * @param {Function} wrapped   The next _animateRoll in the chain.
 * @param {...*} args          The original arguments.
 * @returns {Promise}
 */
export function animateRollWrapper(wrapped, ...args) {
  if ( !shouldBypassWheel(this?.document ?? this?.object) ) return Promise.resolve();
  return wrapped(...args);
}

/**
 * Wrap RollTable#draw (and the sheet's roll animation, RollTableConfig#_animateRoll): libWrapper when it is active,
 * otherwise a plain patch that keeps the original.
 * libWrapper is usable from `init` (it initialises inside Game#initialize, before the init hook); if it is active
 * but not loaded yet, registration is retried in `setup`.
 * @param {object} [options]
 * @param {boolean} [options.defer=true]   Allow retrying in `setup` when libWrapper is not ready.
 * @returns {boolean}   Whether the wrapper is now in place.
 */
export function registerDrawWrapper({defer=true}={}) {
  if ( drawWrapperRegistered ) return true;
  const libWrapperActive = !!game.modules?.get(LIB_WRAPPER_ID)?.active;
  const lib = globalThis.libWrapper;
  if ( libWrapperActive && (typeof lib?.register !== "function") && defer ) {
    Hooks.once("setup", () => registerDrawWrapper({defer: false}));
    return false;
  }
  const useLib = libWrapperActive && (typeof lib?.register === "function");
  registerAnimateWrapper(useLib ? lib : null);
  if ( useLib ) {
    try {
      lib.register(MODULE_ID, DRAW_TARGET, drawWrapper, "MIXED");
      drawWrapperRegistered = true;
      return true;
    } catch(err) {
      console.error(`${MODULE_ID} | libWrapper registration failed, patching RollTable#draw directly`, err);
    }
  }
  const proto = RollTable.prototype;
  if ( !proto.draw[PATCH_MARK] ) {
    const original = proto.draw;
    const patched = function(...args) {
      return drawWrapper.call(this, original.bind(this), ...args);
    };
    patched[PATCH_MARK] = true;
    proto.draw = patched;
  }
  drawWrapperRegistered = true;
  return true;
}

/**
 * Wrap RollTableConfig#_animateRoll the same way as the draw (no-op where the sheet class does not exist).
 * @param {object|null} lib   libWrapper, or null to patch the prototype.
 */
function registerAnimateWrapper(lib) {
  if ( typeof RollTableConfig === "undefined" ) return;
  if ( lib ) {
    try {
      lib.register(MODULE_ID, ANIMATE_TARGET, animateRollWrapper, "MIXED");
      return;
    } catch(err) {
      console.error(`${MODULE_ID} | libWrapper registration failed, patching RollTableConfig#_animateRoll directly`, err);
    }
  }
  const proto = RollTableConfig.prototype;
  if ( (typeof proto._animateRoll !== "function") || proto._animateRoll[PATCH_MARK] ) return;
  const original = proto._animateRoll;
  const patched = function(...args) {
    return animateRollWrapper.call(this, original.bind(this), ...args);
  };
  patched[PATCH_MARK] = true;
  proto._animateRoll = patched;
}

/* -------------------------------------------- */
/*  Hooks                                       */
/* -------------------------------------------- */

/**
 * Register the integration hooks. Call during `init`.
 */
export function registerIntegrationHooks() {
  Hooks.on(`${WMS_MODULE_ID}.IsWildMagicSurge`, onWmsSurge);
  Hooks.on("preCreateChatMessage", onPreCreateChatMessage);
  if ( game.system?.id === "dnd5e" ) Hooks.on("dnd5e.useItem", onUseItem);
  Hooks.on("getRollTableConfigHeaderButtons", onGetHeaderButtons);
}

const isWmsActive = () => !!game.modules?.get(WMS_MODULE_ID)?.active;
const wmsMode = () => getSetting(SETTINGS.wmsIntegration, "intercept");

/* -------------------------------------------- */
/*  Wild Magic Surge 5e                         */
/* -------------------------------------------- */

/** The last IsWildMagicSurge payload that was a surge: {payload, t}. */
let lastSurge = null;
/** The last item use Wild Magic Surge 5e checks on this (GM) client: {payload: {actorId, tokenId}, t}. */
let lastUse = null;

const recent = memory => ((memory && ((Date.now() - memory.t) <= SURGE_MEMORY_MS)) ? memory.payload : null);
const recentSurge = () => recent(lastSurge);
const recentUse = () => recent(lastUse);

function rememberUse(actorId, tokenId) {
  if ( !actorId || (typeof actorId !== "string") ) return;
  lastUse = {payload: {actorId, tokenId: (typeof tokenId === "string") ? tokenId : null}, t: Date.now()};
}

/**
 * Listen to Wild Magic Surge 5e's own socket: a player's item use reaches the GM there (as "SurgeCheck") and the GM's
 * client runs the whole check, so that is where the surging actor of a Path of Wild Magic card is known.
 * Call in `ready`.
 */
export function registerIntegrationSockets() {
  if ( !game.user?.isGM || !isWmsActive() || !game.socket ) return;
  game.socket.on(`module.${WMS_MODULE_ID}`, payload => {
    if ( payload?.event === "SurgeCheck" ) rememberUse(payload.data?.actorId, payload.data?.tokenId);
  });
}

/**
 * The player a surge is rolled for: the active non-GM user whose character the actor is, else one who owns it.
 * @param {Actor|null} actor
 * @returns {string|null}   A user id, or null when no player is behind the actor.
 */
export function rollerForActor(actor) {
  try {
    if ( !actor ) return null;
    const players = game.users.filter(u => u.active && !u.isGM);
    const owner = players.find(u => u.character?.id === actor.id)
      ?? players.find(u => actor.testUserPermission(u, "OWNER"));
    return owner?.id ?? null;
  } catch(err) {
    return null;
  }
}

function rollerForSpeaker(speaker) {
  try {
    return rollerForActor(ChatMessage.getSpeakerActor(speaker));
  } catch(err) {
    return null;
  }
}

/**
 * Speaker data from a remembered IsWildMagicSurge payload `{surge, result, tokenId, actorId}` (or item use).
 * @param {object|null} payload
 * @returns {object}
 */
export function speakerFromSurge(payload) {
  try {
    const token = payload?.tokenId ? canvas?.tokens?.get?.(payload.tokenId) : null;
    if ( token?.document ) return ChatMessage.getSpeaker({token: token.document});
    const actor = payload?.actorId ? game.actors?.get(payload.actorId) : null;
    if ( actor ) return ChatMessage.getSpeaker({actor});
  } catch(err) {
    console.warn(`${MODULE_ID} | Could not resolve the surging speaker`, err);
  }
  return ChatMessage.getSpeaker();
}

/** The table Wild Magic Surge 5e is configured to roll, else this module's table. */
function findWmsTable() {
  let name = null;
  try {
    name = game.settings.get(WMS_MODULE_ID, "rollTableName");
  } catch(err) {
    name = null;
  }
  const named = name ? game.tables?.find(t => t.name === name) : null;
  return named ?? findWildMagicTable();
}

function onWmsSurge(payload) {
  if ( payload?.surge === true ) lastSurge = {payload, t: Date.now()};
  try {
    if ( !isWmsActive() || (wmsMode() !== "hook") || (payload?.surge !== true) ) return;
    const table = findWmsTable();
    if ( !table ) return notifyNoTable();
    // Wild Magic Surge 5e runs a player's surge on the GM's client: the player is the roller, not the GM
    const speaker = speakerFromSurge(payload);
    drawWithWheel(table, {speaker, rollerId: rollerForSpeaker(speaker)})
      .catch(err => console.error(`${MODULE_ID} | Wild Magic Surge 5e draw failed`, err));
  } catch(err) {
    console.error(`${MODULE_ID} | Wild Magic Surge 5e hook failed`, err);
  }
}

/**
 * Does a chat message being created look like Wild Magic Surge 5e's table-result card?
 * That card has flavor "Draws a result from the <WILD MAGIC SURGE> table." and a roll.
 * @param {string} flavor
 * @returns {boolean}
 */
export function isWmsTableFlavor(flavor) {
  const text = String(flavor ?? "").trim();
  return text.startsWith("Draws") && /WILD MAGIC SURGE/.test(text);
}

/**
 * The chat roll mode a message was created with (from its whisper list and blind flag).
 * @param {ChatMessage} message
 * @returns {string}
 */
export function rollModeOfMessage(message) {
  const modes = CONST.DICE_ROLL_MODES;
  const whisper = Array.from(message?.whisper ?? []);
  if ( !whisper.length ) return modes.PUBLIC;
  if ( message.blind ) return modes.BLIND;
  if ( (whisper.length === 1) && (whisper[0] === game.user.id) ) return modes.SELF;
  return modes.PRIVATE;
}

/** The first Roll on a message being created. */
function rollOfMessage(message, data) {
  const fromDoc = message?.rolls?.[0];
  if ( fromDoc instanceof Roll ) return fromDoc;
  const raw = data?.rolls?.[0];
  if ( raw instanceof Roll ) return raw;
  try {
    if ( typeof raw === "string" ) return Roll.fromJSON(raw);
    if ( raw && (typeof raw === "object") ) return Roll.fromData(raw);
  } catch(err) { /* not a roll */ }
  return null;
}

/** Find the drawn table and results from the rendered table-result content. */
function tableFromContent(content) {
  const html = String(content ?? "");
  const tableId = html.match(/data-table-id="([^"]+)"/)?.[1];
  const table = tableId ? game.tables?.get(tableId) : null;
  const resultIds = [...html.matchAll(/data-result-id="([^"]+)"/g)].map(m => m[1]);
  return {table, resultIds};
}

function onPreCreateChatMessage(message, data, options, userId) {
  try {
    if ( userId && (userId !== game.user?.id) ) return;
    if ( options?.magicWheel === false ) return;
    if ( !isWmsActive() || (wmsMode() !== "intercept") ) return;
    if ( !isWmsTableFlavor(data?.flavor ?? message?.flavor) ) return;
    const roll = rollOfMessage(message, data);
    if ( !roll || !Number.isFinite(roll.total) ) return;

    const parsed = tableFromContent(data?.content ?? message?.content);
    const table = parsed.table ?? findWmsTable();
    if ( !table || (table.flags?.[MODULE_ID]?.[FLAGS.wheel] === false) ) return;
    let results = parsed.resultIds.map(id => table.results?.get(id)).filter(Boolean);
    if ( !results.length ) results = table.getResultsForRoll(roll.total);
    if ( !results.length ) return;

    interceptPresent(table, roll, results, rollModeOfMessage(message));
    return false;
  } catch(err) {
    console.error(`${MODULE_ID} | Wild Magic Surge 5e intercept failed; letting its card through`, err);
  }
}

async function interceptPresent(table, roll, results, rollMode) {
  try {
    // A sorcerer's surge fires IsWildMagicSurge right after its table roll; give it a moment so we know who surged.
    // Path of Wild Magic never fires it, so the barbarian is whoever's item use the module just checked.
    const powm = isPathOfWildMagicTable(table);
    if ( !powm && !recentSurge() ) await new Promise(resolve => setTimeout(resolve, SURGE_HOOK_GRACE_MS));
    const speaker = speakerFromSurge((powm ? null : recentSurge()) ?? recentUse());
    // The card is created on the GM's client even for a player's surge: the player is the roller, not the GM
    const message = await presentSurge(table, roll, results, {rollMode, speaker, rollerId: rollerForSpeaker(speaker)});
    if ( message ) return;
  } catch(err) {
    console.error(`${MODULE_ID} | Wheel presentation of a Wild Magic Surge 5e roll failed`, err);
  }
  // Last resort: the original card was cancelled, so post core's table card rather than lose the result
  try {
    await table.toMessage(results, {roll, messageOptions: {rollMode, magicWheel: false}});
  } catch(err) {
    console.error(`${MODULE_ID} | Could not post the Wild Magic Surge result`, err);
  }
}

/* -------------------------------------------- */
/*  dnd5e surge check                           */
/* -------------------------------------------- */

/**
 * Should a used item trigger the d20 surge check?
 * @param {Item} item
 * @param {string} featureName
 * @returns {boolean}
 */
export function triggersSurgeCheck(item, featureName) {
  if ( item?.type !== "spell" ) return false;
  if ( !(Number(item.system?.level) > 0) ) return false;
  const actor = item.actor;
  if ( !actor ) return false;
  const wanted = String(featureName ?? "").trim().toLowerCase();
  if ( !wanted ) return false;
  return Array.from(actor.items ?? []).some(i => (i.type === "feat") && (String(i.name ?? "").trim().toLowerCase() === wanted));
}

function onUseItem(item) {
  try {
    if ( isWmsActive() ) {
      // A GM's own item use is checked by Wild Magic Surge 5e right here; remember who it was (as that module does)
      const actorId = item?.actor?.id;
      if ( game.user?.isGM && actorId ) {
        rememberUse(actorId, canvas?.tokens?.placeables?.find(t => t.actor?.id === actorId)?.id);
      }
      return;
    }
    if ( getSetting(SETTINGS.surgeCheck, "off") !== "auto" ) return;
    if ( !triggersSurgeCheck(item, getSetting(SETTINGS.surgeFeatureName, "Wild Magic Surge")) ) return;
    const actor = item.actor;
    const speaker = ChatMessage.getSpeaker({actor});
    const token = actor.isToken ? actor.token : null;
    surgeCheck({actor, token, speaker}).catch(err => console.error(`${MODULE_ID} | Surge check failed`, err));
  } catch(err) {
    console.error(`${MODULE_ID} | Surge check failed`, err);
  }
}

/* -------------------------------------------- */
/*  RollTable sheet header button               */
/* -------------------------------------------- */

const headerLabel = on => (on ? "MAGICWHEEL.HeaderButton.On" : "MAGICWHEEL.HeaderButton.Off");

function onGetHeaderButtons(app, buttons) {
  if ( !game.user?.isGM ) return;
  const table = app?.document ?? app?.object;
  if ( table?.documentName !== "RollTable" ) return;
  buttons.unshift({
    label: headerLabel(isWheelTable(table)),
    class: "magic-wheel-toggle",
    icon: "fa-solid fa-dharmachakra",
    onclick: event => toggleWheel(table, event?.currentTarget)
  });
}

/**
 * Flip a table's wheel flag and refresh the header button.
 * @param {RollTable} table
 * @param {HTMLElement} [button]
 * @returns {Promise<boolean>}   The new state.
 */
export async function toggleWheel(table, button) {
  const next = !isWheelTable(table);
  try {
    await table.setFlag(MODULE_ID, FLAGS.wheel, next);
  } catch(err) {
    console.error(`${MODULE_ID} | Could not toggle the wheel`, err);
    ui.notifications?.error(game.i18n.localize("MAGICWHEEL.Notifications.ToggleFailed"));
    return !next;
  }
  if ( button ) {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-dharmachakra";
    button.replaceChildren(icon, document.createTextNode(game.i18n.localize(headerLabel(next))));
  }
  const line = pick(next ? TOGGLE_LINES.on : TOGGLE_LINES.off);
  if ( line ) ui.notifications?.info(fill(line, {table: table.name}));
  return next;
}
