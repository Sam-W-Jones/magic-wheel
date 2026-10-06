// Public API: game.modules.get("magic-wheel").api and globalThis.MagicWheel.

import { MODULE_ID } from "./constants.js";
import { drawWithWheel, findWildMagicTable, isWheelTable, surgeCheck, notifyNoTable } from "./surge.js";
import { createWildMagicTable } from "./table-setup.js";
import { replayMessage } from "./chat.js";
import { escapeHTML } from "./quips.js";

/**
 * Resolve a RollTable from a document, id, UUID or name (case-insensitive).
 * @param {RollTable|string} [tableOrNameOrUuid]   Omit for the Wild Magic Surge table.
 * @returns {Promise<RollTable|null>}
 */
export async function resolveTable(tableOrNameOrUuid) {
  const ref = tableOrNameOrUuid;
  if ( (ref === undefined) || (ref === null) || (ref === "") ) return findWildMagicTable();
  if ( (typeof ref === "object") && (ref.documentName === "RollTable") ) return ref;
  if ( typeof ref !== "string" ) return null;
  const byId = game.tables?.get(ref);
  if ( byId ) return byId;
  if ( ref.includes(".") ) {
    try {
      const doc = await fromUuid(ref);
      if ( doc?.documentName === "RollTable" ) return doc;
    } catch(err) { /* not a UUID */ }
  }
  const lower = ref.trim().toLowerCase();
  return game.tables?.find(t => t.name === ref) ?? game.tables?.find(t => t.name?.trim().toLowerCase() === lower) ?? null;
}

/**
 * Spin the wheel for a table (always, whether or not the table normally uses the wheel).
 * @param {RollTable|string} [tableOrNameOrUuid]   Omit for the Wild Magic Surge table.
 * @param {object} [options]
 * @param {string} [options.rollMode]
 * @param {object} [options.speaker]
 * @returns {Promise<{roll: Roll, results: TableResult[]}|null>}
 */
async function spin(tableOrNameOrUuid, {rollMode, speaker}={}) {
  const table = await resolveTable(tableOrNameOrUuid);
  if ( !table ) {
    if ( (tableOrNameOrUuid === undefined) || (tableOrNameOrUuid === null) || (tableOrNameOrUuid === "") ) {
      notifyNoTable();
    } else {
      ui.notifications?.warn(game.i18n.format("MAGICWHEEL.Notifications.TableNotFound",
        {name: escapeHTML(String(tableOrNameOrUuid?.name ?? tableOrNameOrUuid))}));
    }
    return null;
  }
  return drawWithWheel(table, {rollMode, speaker});
}

/**
 * Create a new Wild Magic Surge table (GM only).
 * @returns {Promise<RollTable|null>}
 */
async function createTable() {
  if ( !game.user?.isGM ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.GMOnly"));
    return null;
  }
  return createWildMagicTable();
}

/**
 * Replay the wheel stored on a chat message.
 * @param {string} messageId
 * @returns {Application|null}
 */
function replay(messageId) {
  const message = game.messages?.get(messageId);
  if ( !message ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.NoReplay"));
    return null;
  }
  return replayMessage(message);
}

/**
 * Expose the API on the module and as `globalThis.MagicWheel`.
 * @returns {object}
 */
export function registerApi() {
  const api = {
    spin,
    surgeCheck: (options={}) => surgeCheck(options),
    createTable,
    findWildMagicTable,
    isWheelTable,
    replay
  };
  const module = game.modules?.get(MODULE_ID);
  if ( module ) module.api = api;
  globalThis.MagicWheel = api;
  return api;
}
