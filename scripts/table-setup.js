// Creating the world's Wild Magic Surge RollTable, automatically on first load and from a settings menu.

import { MODULE_ID, SETTINGS, FLAGS, WILD_MAGIC_KIND, DEFAULT_TABLE_NAME, TABLE_IMG } from "./constants.js";
import { SURGES } from "./surge-data.js";
import { QUIPS, fill, pick } from "./quips.js";
import { getSetting, setSetting } from "./settings.js";
import { findWildMagicTable } from "./surge.js";

const RESULT_IMG = "icons/svg/d20-black.svg";

const TABLE_DESCRIPTION = "<p>The sorcerer's Wild Magic Surge table, now broadcast live as a prize wheel. "
  + "By rolling this table you agree to be entertaining. Results are final, binding and occasionally sheep.</p>";

/**
 * The creation data for the Wild Magic Surge table.
 * @returns {object}
 */
export function wildMagicTableData() {
  return {
    name: DEFAULT_TABLE_NAME,
    img: TABLE_IMG,
    description: TABLE_DESCRIPTION,
    formula: "1d100",
    replacement: true,
    displayRoll: true,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER},
    flags: {[MODULE_ID]: {[FLAGS.wheel]: true, [FLAGS.kind]: WILD_MAGIC_KIND}},
    results: SURGES.map(entry => ({
      type: CONST.TABLE_RESULT_TYPES.TEXT,
      text: entry.text ?? "",
      img: RESULT_IMG,
      weight: entry.range[1] - entry.range[0] + 1,
      range: [entry.range[0], entry.range[1]],
      drawn: false,
      flags: {[MODULE_ID]: {[FLAGS.label]: entry.label}}
    }))
  };
}

/**
 * Create a fresh world Wild Magic Surge RollTable (GM only).
 * @returns {Promise<RollTable>}
 */
export async function createWildMagicTable() {
  const cls = RollTable.implementation ?? RollTable;
  return cls.create(wildMagicTableData());
}

/**
 * On ready: the active GM creates the table once, unless one already exists or the GM opted out.
 * @returns {Promise<RollTable|null>}
 */
export async function ensureWildMagicTable() {
  if ( !game.user?.isGM || (game.users.activeGM?.id !== game.user.id) ) return null;
  if ( !getSetting(SETTINGS.autoCreateTable, true) || getSetting(SETTINGS.tableCreated, false) ) return null;
  if ( findWildMagicTable() ) return null;
  const table = await createWildMagicTable();
  await setSetting(SETTINGS.tableCreated, true);
  notifyCreated(table);
  return table;
}

function notifyCreated(table) {
  const line = pick(QUIPS.tableCreated);
  ui.notifications?.info(line ? fill(line, {name: table?.name}) : game.i18n.localize("MAGICWHEEL.Notifications.TableCreated"));
}

/**
 * Ask the GM to confirm, then create a new Wild Magic Surge table.
 * @returns {Promise<RollTable|null>}
 */
export async function confirmCreateTable() {
  if ( !game.user?.isGM ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.GMOnly"));
    return null;
  }
  const confirmed = await Dialog.confirm({
    title: game.i18n.localize("MAGICWHEEL.Menu.CreateTable.ConfirmTitle"),
    content: `<p>${game.i18n.localize("MAGICWHEEL.Menu.CreateTable.ConfirmContent")}</p>`,
    defaultYes: true
  });
  if ( !confirmed ) return null;
  try {
    const table = await createWildMagicTable();
    await setSetting(SETTINGS.tableCreated, true);
    notifyCreated(table);
    table?.sheet?.render(true);
    return table;
  } catch(err) {
    console.error(`${MODULE_ID} | Could not create the table`, err);
    ui.notifications?.error(game.i18n.localize("MAGICWHEEL.Notifications.CreateFailed"));
    return null;
  }
}

/**
 * The settings-menu entry. Settings menus must be FormApplication subclasses; this one never renders a form,
 * it just shows a confirmation dialog.
 */
export class CreateWildMagicTableMenu extends FormApplication {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-create-table`,
      title: "MAGICWHEEL.Menu.CreateTable.Name"
    });
  }

  /** @override */
  render(force=false, options={}) {
    confirmCreateTable();
    return this;
  }

  /** @override */
  async _updateObject(event, formData) {}
}

/**
 * Register the "Create the Wild Magic Surge table" settings menu. Call during `init`.
 */
export function registerTableMenu() {
  game.settings.registerMenu(MODULE_ID, "createTable", {
    name: "MAGICWHEEL.Menu.CreateTable.Name",
    label: "MAGICWHEEL.Menu.CreateTable.Label",
    hint: "MAGICWHEEL.Menu.CreateTable.Hint",
    icon: "fa-solid fa-dharmachakra",
    type: CreateWildMagicTableMenu,
    restricted: true
  });
}
