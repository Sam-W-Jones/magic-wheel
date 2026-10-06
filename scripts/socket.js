// Socket relay: the rolling client builds the SpinPresentation and broadcasts it; everyone in the audience
// shows the wheel locally. Nobody but the roller ever writes documents.

import { MODULE_ID, SOCKET_NAME, SETTINGS, READ_WINDOW_MS } from "./constants.js";
import { QUIPS, fill, pick } from "./quips.js";
import { WheelApp } from "./wheel-app.js";
import { getSetting } from "./settings.js";
import { sanitizePresentation } from "./sanitize.js";

/** How often a waiting spin checks whether the wheel on screen is done. */
const QUEUE_POLL_MS = 250;
/** Longest a waiting spin holds back for one wheel, whatever state it is in. */
const QUEUE_MAX_HOLD_MS = 30000;
/** Spins kept waiting at most; older ones are dropped (their chat cards still arrive). */
const QUEUE_MAX = 5;

let registered = false;

/**
 * Start listening for spins from other clients. Call in `ready`.
 */
export function registerSocket() {
  if ( registered || !game.socket ) return;
  game.socket.on(SOCKET_NAME, onSocketMessage);
  registered = true;
}

/**
 * Broadcast a spin to the other clients. The emitter never receives its own emit, so the caller shows it locally.
 * @param {object} presentation       The SpinPresentation.
 * @param {string[]|null} audience    User ids allowed to see the wheel, or null for everyone.
 */
export function emitSpin(presentation, audience) {
  if ( !game.socket ) return;
  game.socket.emit(SOCKET_NAME, {action: "spin", presentation, audience: Array.isArray(audience) ? audience : null});
}

/**
 * Show a presentation on this client, honouring the "skip the wheel" setting (replays always show).
 * @param {object} presentation
 * @param {object} [options]
 * @param {boolean} [options.replay=false]
 * @returns {Application|null}   The WheelApp, or null when skipped or it failed to open.
 */
export function showSpin(presentation, {replay=false}={}) {
  if ( !replay && getSetting(SETTINGS.skipWheel, false) ) {
    const line = pick(QUIPS.skipWheel);
    if ( line ) ui.notifications?.info(fill(line, {}));
    return null;
  }
  try {
    const app = WheelApp.show(presentation, {replay}) ?? null;
    if ( app && !replay ) trackOnScreen(app);
    return app;
  } catch(err) {
    console.error(`${MODULE_ID} | Failed to show the wheel`, err);
    return null;
  }
}

/**
 * Is a socket payload a well-formed spin for this user?
 * @param {*} data
 * @param {string} userId
 * @returns {boolean}
 */
export function isSpinForUser(data, userId) {
  if ( !data || (data.action !== "spin") ) return false;
  const p = data.presentation;
  if ( !p || (typeof p !== "object") || !p.plan || !Array.isArray(p.segments) || !p.result ) return false;
  if ( p.userId === userId ) return false;
  const audience = data.audience;
  if ( audience === null || audience === undefined ) return true;
  return Array.isArray(audience) && audience.includes(userId);
}

/**
 * A module socket message. The server appends the id of the user who sent it, which a client cannot forge.
 * @param {*} data
 * @param {string} senderId
 */
function onSocketMessage(data, senderId) {
  try {
    const sender = senderId ? game.users?.get(senderId) : null;
    if ( !sender || (data?.presentation?.userId !== senderId) ) return;
    if ( !isSpinForUser(data, game.user?.id) ) return;
    const presentation = sanitizePresentation(data.presentation);
    if ( !presentation ) return;
    presentation.userName = sender.name ?? presentation.userName;
    presentation.replay = false;
    queueSpin(presentation);
  } catch(err) {
    console.error(`${MODULE_ID} | Bad socket message`, err);
  }
}

/* -------------------------------------------- */
/*  Receiving queue                             */
/* -------------------------------------------- */

/** The live (non-replay) wheel shown last: {app, shownAt, landedAt}. */
let onScreen = null;
const waiting = [];
let pumpTimer = null;

function trackOnScreen(app) {
  const entry = {app, shownAt: Date.now(), landedAt: null};
  onScreen = entry;
  const landed = () => {
    entry.landedAt ??= Date.now();
  };
  Promise.resolve(app.landed).then(landed, landed);
}

function isOpen(app) {
  // Foundry's Application is a global binding, not a property of globalThis: ask the app's own class
  const states = app?.constructor?.RENDER_STATES;
  return !!app && (!!app.rendered || (!!states && (app._state === states.RENDERING)));
}

/** How long a new spin should wait for the live wheel on screen: until it lands, plus time to read the result. */
function busyFor() {
  const entry = onScreen;
  if ( !entry || !isOpen(entry.app) || ((Date.now() - entry.shownAt) > QUEUE_MAX_HOLD_MS) ) {
    onScreen = null;
    return 0;
  }
  if ( entry.landedAt === null ) return QUEUE_POLL_MS;
  return Math.max(0, (entry.landedAt + READ_WINDOW_MS) - Date.now());
}

function pumpQueue() {
  pumpTimer = null;
  while ( waiting.length ) {
    const wait = busyFor();
    if ( wait > 0 ) {
      pumpTimer = setTimeout(pumpQueue, Math.min(wait, QUEUE_POLL_MS));
      return;
    }
    showSpin(waiting.shift());
  }
}

/**
 * Show a spin from another client. While a live wheel is still spinning (or its result was only just revealed) the
 * new spin waits its turn instead of replacing it; closing the wheel lets the next one play. Replays don't queue.
 * @param {object} presentation
 */
function queueSpin(presentation) {
  if ( getSetting(SETTINGS.skipWheel, false) ) {
    showSpin(presentation);
    return;
  }
  waiting.push(presentation);
  if ( waiting.length > QUEUE_MAX ) waiting.shift();
  if ( !pumpTimer ) pumpQueue();
}
