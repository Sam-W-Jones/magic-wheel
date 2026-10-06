// The result chat card: rendering and the Replay button.

import { MODULE_ID, TEMPLATES, FLAGS, TONES, WILD_MAGIC_KIND } from "./constants.js";
import { escapeHTML } from "./quips.js";
import { showSpin } from "./socket.js";
import { sanitizePresentation } from "./sanitize.js";

const DEFAULT_ICON = "fa-solid fa-dharmachakra";

/** Plain text that is safe whether a template double- or triple-stashes it. */
export function plain(value) {
  return String(value ?? "").replace(/[<>]/g, "");
}

/** A tone usable as a CSS class. */
export function safeTone(tone) {
  return TONES.includes(tone) ? tone : "weird";
}

/** A Font Awesome class string usable in a class attribute. */
export function safeIcon(icon) {
  return (typeof icon === "string") && /^[\w\s-]+$/.test(icon) && icon.trim() ? icon.trim() : DEFAULT_ICON;
}

/**
 * The render context for templates/chat-card.hbs.
 * @param {object} presentation   A SpinPresentation.
 * @returns {object}
 */
export function chatCardContext(presentation) {
  const p = presentation ?? {};
  const r = p.result ?? {};
  const isWild = p.kind === WILD_MAGIC_KIND;
  const headline = isWild ? game.i18n.localize("MAGICWHEEL.Card.Headline") : plain(p.tableName).toUpperCase();
  return {
    spinId: plain(p.spinId),
    kind: isWild ? WILD_MAGIC_KIND : "generic",
    tone: safeTone(r.tone),
    icon: safeIcon(r.icon),
    label: plain(r.label),
    rangeLabel: plain(r.rangeLabel),
    total: Number.isFinite(p.total) ? p.total : "",
    formula: plain(p.formula),
    tableName: plain(p.tableName),
    speakerName: escapeHTML(p.speakerName),
    headline,
    effectHtml: r.effectHtml ?? "",
    extraHtml: r.extraHtml ?? null,
    line: r.line ?? null,
    landed: r.landed ?? null,
    repeatLine: r.repeatLine ?? null,
    streakLine: r.streakLine ?? null,
    achievement: r.achievement ?? null,
    box: r.box ?? null
  };
}

/**
 * Render the chat card HTML for a presentation.
 * @param {object} presentation   A SpinPresentation.
 * @returns {Promise<string>}
 */
export async function renderChatCard(presentation) {
  return renderTemplate(TEMPLATES.chatCard, chatCardContext(presentation));
}

/**
 * Minimal card used when the presentation or the template could not be built. Never throws.
 * @param {object} data
 * @param {string} data.headline
 * @param {string} data.label
 * @param {string} data.rangeLabel
 * @param {string} data.effectHtml     Safe HTML.
 * @param {string} [data.tone]
 * @returns {string}
 */
export function fallbackCardHTML({headline, label, rangeLabel, effectHtml, tone}={}) {
  const title = [rangeLabel, label].filter(Boolean).map(escapeHTML).join(" · ");
  return `<div class="magic-wheel-card magic-wheel-fallback tone-${safeTone(tone)}">`
    + `<h3>${escapeHTML(headline)}</h3>`
    + (title ? `<p><strong>${title}</strong></p>` : "")
    + `<div class="mw-effect">${effectHtml ?? ""}</div></div>`;
}

/**
 * Wire the Replay button on rendered chat cards.
 */
export function registerChatHooks() {
  Hooks.on("renderChatMessage", onRenderChatMessage);
}

/**
 * Replay the wheel stored on a chat message.
 * @param {ChatMessage} message
 * @returns {Application|null}
 */
export function replayMessage(message) {
  const spin = message?.flags?.[MODULE_ID]?.[FLAGS.spin];
  if ( !spin ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.NoReplay"));
    return null;
  }
  if ( message.isContentVisible === false ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.ReplayHidden"));
    return null;
  }
  // Message flags are not cleaned by the server and the author can edit them: rebuild the presentation safely
  const presentation = sanitizePresentation(spin);
  if ( !presentation ) {
    ui.notifications?.warn(game.i18n.localize("MAGICWHEEL.Notifications.NoReplay"));
    return null;
  }
  presentation.replay = true;
  return showSpin(presentation, {replay: true});
}

function onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if ( !root ) return;
  const buttons = root.querySelectorAll('[data-action="mw-replay"]');
  if ( !buttons.length ) return;
  const spin = message?.flags?.[MODULE_ID]?.[FLAGS.spin];
  for ( const button of buttons ) {
    if ( !spin ) {
      button.remove();
      continue;
    }
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      replayMessage(message);
    });
  }
}
