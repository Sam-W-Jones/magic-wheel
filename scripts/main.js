// Wheel of Wild Magic: entry point.

import { MODULE_ID, TEMPLATES } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerTableMenu, ensureWildMagicTable } from "./table-setup.js";
import { registerDrawWrapper, registerIntegrationHooks, registerIntegrationSockets } from "./integrations.js";
import { registerChatHooks } from "./chat.js";
import { registerSocket } from "./socket.js";
import { registerApi } from "./api.js";

Hooks.once("init", () => {
  registerSettings();
  registerTableMenu();
  loadTemplates(Object.values(TEMPLATES))
    .catch(err => console.error(`${MODULE_ID} | Could not preload templates`, err));
  registerDrawWrapper();
  registerIntegrationHooks();
  registerChatHooks();
  registerApi();
  console.log(`${MODULE_ID} | Wheel of Wild Magic loaded. Please keep your hands and spell slots inside the vehicle.`);
});

Hooks.once("ready", () => {
  registerSocket();
  registerIntegrationSockets();
  registerApi();
  ensureWildMagicTable()
    .catch(err => console.error(`${MODULE_ID} | Could not create the Wild Magic Surge table`, err));
});
