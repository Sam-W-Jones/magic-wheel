// Shared identifiers for the Wheel of Wild Magic module.

export const MODULE_ID = "magic-wheel";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const TEMPLATES = {
  wheel: `modules/${MODULE_ID}/templates/wheel.hbs`,
  chatCard: `modules/${MODULE_ID}/templates/chat-card.hbs`
};

/** Table "kind" flag value for the sorcerer's Wild Magic Surge table. */
export const WILD_MAGIC_KIND = "wild-magic";
export const DEFAULT_TABLE_NAME = "Wild Magic Surge";
export const TABLE_IMG = `modules/${MODULE_ID}/assets/wheel.svg`;

/** How a result "feels". Drives the landing sound, colours and audience reactions. */
export const TONES = ["good", "bad", "weird", "chaos"];

/** Setting keys. */
export const SETTINGS = {
  tableNames: "tableNames",
  audience: "audience",
  spinSeconds: "spinSeconds",
  fakeOuts: "fakeOuts",
  commentary: "commentary",
  autoCreateTable: "autoCreateTable",
  tableCreated: "tableCreated",
  surgeCheck: "surgeCheck",
  surgeFeatureName: "surgeFeatureName",
  wmsIntegration: "wmsIntegration",
  sound: "sound",
  volume: "volume",
  autoClose: "autoCloseSeconds",
  skipWheel: "skipWheel",
  history: "history"
};

/** Flag keys, all stored under flags["magic-wheel"]. */
export const FLAGS = {
  wheel: "wheel",   // RollTable: true forces the wheel on, false forces it off
  kind: "kind",     // RollTable: "wild-magic" for the sorcerer's table
  label: "label",   // TableResult: short label drawn on the wheel
  spin: "spin"      // ChatMessage: the SpinPresentation, used by the Replay button
};

/** The other wild magic module this one can cooperate with. */
export const WMS_MODULE_ID = "wild-magic-surge-5e";

export const PRESENTATION_VERSION = 1;

/**
 * Extra time after the wheel lands before the chat card is posted, so chat doesn't spoil the reveal. The window
 * reveals the result 750ms after landing; the rest covers socket latency and render time on other clients.
 */
export const REVEAL_PAD_MS = 2000;

/** How long a landed wheel stays up to be read before a queued spin replaces it. */
export const READ_WINDOW_MS = 3000;
