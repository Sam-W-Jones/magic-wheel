// Module settings: registration plus small typed accessors.

import { MODULE_ID, SETTINGS, DEFAULT_TABLE_NAME } from "./constants.js";

/** Maximum number of entries kept in the per-device history. */
export const HISTORY_LIMIT = 20;

/**
 * Register every setting of the module. Call during `init`.
 */
export function registerSettings() {
  const register = (key, data) => game.settings.register(MODULE_ID, key, {
    name: `MAGICWHEEL.Settings.${key}.Name`,
    hint: `MAGICWHEEL.Settings.${key}.Hint`,
    ...data
  });
  const choices = (key, values) => Object.fromEntries(values.map(v => [v, `MAGICWHEEL.Settings.${key}.Choices.${v}`]));

  // World settings
  register(SETTINGS.tableNames, {scope: "world", config: true, type: String, default: DEFAULT_TABLE_NAME});
  register(SETTINGS.audience, {
    scope: "world", config: true, type: String, default: "everyone",
    choices: choices(SETTINGS.audience, ["everyone", "roller"])
  });
  register(SETTINGS.spinSeconds, {
    scope: "world", config: true, type: Number, default: 8,
    range: {min: 4, max: 15, step: 1}
  });
  register(SETTINGS.fakeOuts, {scope: "world", config: true, type: Boolean, default: true});
  register(SETTINGS.commentary, {scope: "world", config: true, type: Boolean, default: true});
  register(SETTINGS.autoCreateTable, {scope: "world", config: true, type: Boolean, default: true});
  register(SETTINGS.tableCreated, {scope: "world", config: false, type: Boolean, default: false});
  register(SETTINGS.surgeCheck, {
    scope: "world", config: true, type: String, default: "off",
    choices: choices(SETTINGS.surgeCheck, ["off", "auto"])
  });
  register(SETTINGS.surgeFeatureName, {scope: "world", config: true, type: String, default: "Wild Magic Surge"});
  register(SETTINGS.wmsIntegration, {
    scope: "world", config: true, type: String, default: "intercept",
    choices: choices(SETTINGS.wmsIntegration, ["intercept", "hook", "off"])
  });

  // Client settings
  register(SETTINGS.sound, {scope: "client", config: true, type: Boolean, default: true});
  register(SETTINGS.volume, {
    scope: "client", config: true, type: Number, default: 0.6,
    range: {min: 0, max: 1, step: 0.05}
  });
  register(SETTINGS.autoClose, {
    scope: "client", config: true, type: Number, default: 0,
    range: {min: 0, max: 60, step: 5}
  });
  register(SETTINGS.skipWheel, {scope: "client", config: true, type: Boolean, default: false});
  register(SETTINGS.history, {scope: "client", config: false, type: Array, default: []});
}

/**
 * Read one of this module's settings. Never throws: returns `fallback` when the setting is not registered yet.
 * @param {string} key
 * @param {*} [fallback]
 * @returns {*}
 */
export function getSetting(key, fallback=undefined) {
  try {
    const value = game.settings.get(MODULE_ID, key);
    return value === undefined ? fallback : value;
  } catch(err) {
    return fallback;
  }
}

/**
 * Write one of this module's settings.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<*>}
 */
export function setSetting(key, value) {
  return game.settings.set(MODULE_ID, key, value);
}

/**
 * Split the comma-separated `tableNames` setting into trimmed, lower-cased names.
 * @param {string} [value]   Defaults to the current setting value.
 * @returns {string[]}
 */
export function parseTableNames(value=getSetting(SETTINGS.tableNames, DEFAULT_TABLE_NAME)) {
  return String(value ?? "")
    .split(",")
    .map(n => n.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The per-device history of recent results, newest first. Always a fresh, well-formed array.
 * @returns {{key: string, t: number}[]}
 */
export function readHistory() {
  const raw = getSetting(SETTINGS.history, []);
  if ( !Array.isArray(raw) ) return [];
  return raw
    .filter(e => e && (typeof e.key === "string") && Number.isFinite(e.t))
    .map(e => ({key: e.key, t: e.t}))
    .slice(0, HISTORY_LIMIT);
}

/**
 * Prepend a result to the per-device history (client setting, so players can write it).
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function pushHistory(key) {
  const history = [{key, t: Date.now()}, ...readHistory()].slice(0, HISTORY_LIMIT);
  await setSetting(SETTINGS.history, history);
}
