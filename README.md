# Wheel of Wild Magic

[![Test and release](https://github.com/Sam-W-Jones/magic-wheel/actions/workflows/release.yml/badge.svg)](https://github.com/Sam-W-Jones/magic-wheel/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Sam-W-Jones/magic-wheel)](https://github.com/Sam-W-Jones/magic-wheel/releases/latest)
![Foundry v11](https://img.shields.io/badge/Foundry-v11-orange)

A Foundry VTT v11 module that turns the sorcerer's **Wild Magic Surge** table into a game show.

When anyone rolls on the table, a window pops up on everyone's screen with a big spinning prize wheel of all 50
surges. It ticks. It slows. Sometimes it stops, thinks about it, and creeps forward one more slice just to watch you
squirm. Then it lands on the real result, and the **System AI**, the delighted, condescending, ratings-obsessed host
of an interdimensional dungeon reality show, announces your fate to the viewers at home:

> **THE WHEEL HAS SPOKEN: FIREBALL (ON YOU).** Today's surge is brought to you by a fire insurance company.
> They would like to remind you that you are not covered.

You may also win a **New Achievement!** or a **reward box**. Neither will help. A matching chat card follows, with an
**Instant Replay** button for reliving the moment.

Underneath the glitter it is still an ordinary roll table draw: the same roll and the same result, and drawn results
behave as they do in core Foundry. Roll modes are honoured too (see [Who sees the wheel](#who-sees-the-wheel)). The
wheel is told the answer before it starts spinning. It cannot be bribed. Several players have checked.

## Install

In Foundry's setup screen, go to **Add-on Modules → Install Module**, paste this into **Manifest URL** and click
**Install**:

```
https://github.com/Sam-W-Jones/magic-wheel/releases/latest/download/module.json
```

Then, in your world, go to **Game Settings → Manage Modules** and enable **Wheel of Wild Magic**. Foundry offers
updates automatically when a new version is released.

[libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) is recommended but not required. With it, the module
shares `RollTable#draw` (and the table sheet's roll animation) politely with other modules. Without it, it patches
those methods directly, which is fine unless another module wants to change roll tables too.

## Quick start

1. **Log in as the GM.** The first time, the module creates a world roll table called **Wild Magic Surge** with all
   50 results, and players can roll it. You'll get a notification about it. The System AI is very proud.
2. **Roll it.** Any of these will spin the wheel:
   - Right-click the table in the **Roll Tables** sidebar and choose **Roll**.
   - Open the table and click **Roll**.
   - Drag the table onto the hotbar and click the macro.
   - Run `MagicWheel.spin()` in a script macro.
3. **Enjoy the show.** When the wheel lands, the effect is shown along with the System AI's opinion of it. About two
   seconds later the chat card is posted, so chat doesn't spoil the reveal. Results that need their own dice (how
   many inches you shrink, how many flumphs appear) are rolled for you as clickable inline rolls.

The System AI also keeps score. Land on the same surge twice in a row, or surge a suspicious number of times
lately, and it will have something to say about it. Each computer keeps its own score, and only results you were
allowed to watch count, so a later public roll can't give away a blind roll's result.

Rolling a wheel table from its own sheet skips Foundry's roulette highlight (the **Animate Roll Tables** core
setting) and goes straight to the wheel. Tables that don't use the wheel keep the roulette.

Deleted the table? The module won't keep making new ones behind your back. To get a fresh one, click **Create the
Wild Magic Surge table** in this module's settings, or run `MagicWheel.createTable()`.

### Who sees the wheel

The roll mode in the chat sidebar decides who sees the wheel and who gets the chat card:

| Roll mode | Wheel | Chat card |
|---|---|---|
| Public Roll | Everyone (or only the roller and the GMs, see *Who sees the wheel* in Settings) | Everyone |
| Private GM Roll | The roller and the GMs | The roller and the GMs. Other players get nothing at all, not even the "privately rolled" placeholder core would show them |
| Blind GM Roll | The GMs only. The roller gets a smug notification instead | The full card for the GMs. Everyone else, including the player who rolled, gets core's empty "privately rolled some dice" placeholder |
| Self Roll | The roller only | The roller only |

The roll mode and the speaker are fixed the moment the table is rolled. Changing your roll mode or selected token
while that spin is still waiting its turn makes no difference to it.

Surges from Wild Magic Surge 5e are rolled on the GM's computer, so the GM's roll mode applies to them. See
[Whose roll is it?](#whose-roll-is-it).

### One wheel at a time

Wheels don't cut each other off. If someone else's spin arrives while a wheel is still spinning on your screen, or
within 3 seconds of it landing, the new one waits its turn. Closing the wheel lets the next one start straight away.
Up to five spins can wait. Beyond that the oldest are skipped, but their chat cards still arrive. A wheel that had to
wait starts late, so its chat card can turn up before it lands on your screen.

Your own rolls also take turns. When another of your spins is waiting, each result stays up for 3 more seconds after
its chat card is posted before the next spin starts. A wheel you roll never waits behind someone else's: it replaces
whatever is showing on your screen.

### Instant Replay

Every chat card has an **Instant Replay** button. It plays that exact spin again on your screen only, with the same
landing, the same commentary and the same fake-out. There's no new roll and nothing is drawn, and nobody else is
bothered. It works with Coward Mode on, but only on cards whose contents you can see. A replay starts at once, and a
live spin that arrives replaces it. Perfect for players who were getting a snack at the time.

### Wheels from other computers

A spin that arrives from another player's computer is shown only if it really came from the player it names, and
its text is cleaned before it is displayed. Instant Replay and `MagicWheel.replay()` clean the stored spin the same
way. Formatting, Font Awesome icons, inline rolls and content links survive. Scripts, event handlers, inline styles,
embedded frames, SVG, images, audio and video, forms, and `javascript:` or `data:` links are removed, and tooltips
become plain text. So images or inline styles in a result's text show on the roller's own wheel and in the chat
card, but not on anyone else's wheel or in replays.

## Settings

**Game Settings → Configure Settings → Wheel of Wild Magic**.

### World settings (GM)

| Setting | Default | What it does |
|---|---|---|
| Wheel tables | `Wild Magic Surge` | Names of the tables that spin the wheel, separated by commas. Case doesn't matter. See [Other tables](#other-tables) for more ways to choose. |
| Who sees the wheel | Everyone | For public rolls: everyone, or only the roller and the GMs. Other roll modes follow the table above. For Wild Magic Surge 5e surges, see [Whose roll is it?](#whose-roll-is-it). |
| Spin length | 8 seconds | How long the main spin takes, from 4 to 15 seconds. A fake-out adds another 1.5 to 2.5 seconds. |
| Fake-outs | On | Roughly a third of spins stop just short and creep forward one slice, or overshoot and roll back. It's pure theatre: the result was decided before the wheel moved. |
| System AI commentary | On | The System AI's running commentary and its lines about the result (including the repeat and streak lines), achievements, reward boxes, sponsors, audience reactions and the jokes in the surge check. Off swaps these for plain wording or leaves them out, and the close button just says *Close*. The game-show look stays (the LIVE badge, the viewer count, the verdict plate and, for wild magic, a quip as the window title), and so do the System AI's notifications (Coward Mode, blind rolls, the **Wheel** button, missing or newly created tables). |
| Create the table automatically | On | Creates the Wild Magic Surge table when the GM logs in and none exists. It only does this once, so a table you delete stays deleted. |
| Surge check | Off | **dnd5e only.** *Auto* rolls the d20 for you when a wild magic sorcerer casts a spell. See [The dnd5e surge check](#the-dnd5e-surge-check). |
| Surge feature name | `Wild Magic Surge` | The feature an actor needs for the automatic surge check. |
| Wild Magic Surge 5e integration | Intercept | Only matters when the Wild Magic Surge 5e module is active: *Intercept*, *Hook* or *Off*. See [Wild Magic Surge 5e](#wild-magic-surge-5e). |

There is also a **Create the Wild Magic Surge table** button that makes a fresh copy of the table whenever you
like.

### Player settings (each player's own, saved on their computer)

| Setting | Default | What it does |
|---|---|---|
| Sound | On | Ticks, a whoosh, a drumroll and a landing sting that suits the result (a fanfare for good news, a sad trombone for bad). All synthesised in the browser, no sound files. While it's on, the wheel window has a mute button in its title bar for the show in progress. |
| Volume | `0.6` | 0 to 1. It is scaled by Foundry's own **Interface** volume. |
| Auto-close | `0` (never) | Closes the window this many seconds after the wheel lands, up to 60. |
| Coward Mode: skip the wheel | Off | No window for you when someone rolls. You still get the chat card, and the System AI still knows (it will tell you so). **Instant Replay** still opens the window, since you asked for it. |

## Other tables

The wheel works with any roll table, not just wild magic. A table spins the wheel if:

- it's the **Wild Magic Surge** table this module created (renaming it is fine), or
- its name is in the **Wheel tables** setting, or
- the GM has switched it on with the **Wheel** button in the title bar of the table's sheet.

The same **Wheel** button can also switch a table *off*, even if its name is in the setting, and even if it's this
module's own table.

A table counts as a wild magic table if this module created it (or it has the `kind` flag, see [Flags](#flags)), if
its name contains "Wild Magic Surge" (case and spacing don't matter), or if at least 40 of its result ranges match
the Player's Handbook table. Wild magic tables get the full treatment for every result whose range matches the
Player's Handbook: a short label on the wheel, custom commentary, achievements, reward boxes and sub-rolls. Any other
table, including Wild Magic Surge 5e's [Path of Wild Magic](#path-of-wild-magic) table, gets generic commentary, its
own name as the headline, and slices labelled with the start of each result's text. Slices are sized by each
result's range, so a result that covers half the table's range gets half the wheel.

## The dnd5e surge check

Not using Wild Magic Surge 5e? On dnd5e, set **Surge check** to **Auto**. Then, whenever a creature that has a
feature named **Wild Magic Surge** (or whatever **Surge feature name** says; case doesn't matter) casts a spell of
1st level or higher, from its sheet or a hotbar macro, the module rolls a d20 in chat. On a 1, the wheel spins. On
anything else nothing happens, much to the System AI's disappointment.

- Cantrips never trigger it. Any spell of 1st level or higher does, whichever class it came from.
- It waits for Dice So Nice to finish rolling the d20, if you use it.
- The Player's Handbook says the DM *can* have you roll after each spell. *Auto* means they always do, which is why
  it is off by default.
- Tides of Chaos and other DM-decides-you-surge moments aren't automated. For those there's `MagicWheel.spin()`, or
  `MagicWheel.surgeCheck({actor})` for the d20 version.
- When Wild Magic Surge 5e is active, this setting is ignored and that module does the checking.

## Wild Magic Surge 5e

[Wild Magic Surge 5e](https://github.com/johnnolan/wild-magic-surge-5e) has more surge-check options (Tides of
Chaos, incremental checks, spell filters and so on). If it is active, it does the checking and this module provides
the wheel. This module's own **Surge check** setting is ignored while it is active. Choose how the two work together
with the **Wild Magic Surge 5e integration** setting:

| Mode | Set Wild Magic Surge 5e's *Auto Roll Table* to | What happens |
|---|---|---|
| **Intercept** (default) | Auto Roll Table | Wild Magic Surge 5e rolls the table as usual. Just before its plain result card is posted, this module cancels the card and spins the wheel for the same result instead. |
| **Hook** | None | When Wild Magic Surge 5e reports a surge, this module rolls the table named in Wild Magic Surge 5e's *Roll Table Name* setting (if a world table has exactly that name), otherwise this module's Wild Magic Surge table, and spins the wheel. |
| **Off** | Whatever you like | The two modules ignore each other. Rolling a wheel table yourself still spins the wheel. |

Wild Magic Surge 5e's *Roll Table Name* setting defaults to `Wild Magic Surge 5e (PHB)`. Change it to
`Wild Magic Surge` to use the table this module made, or keep your own table. For **Intercept**, Wild Magic Surge 5e
must be able to find that table, and the wheel spins whichever table it rolled, unless you have switched that table
off with its **Wheel** button (then its plain card goes through). **Hook** mode always spins the wheel; set the
integration to **Off** to stop it.

### Whose roll is it?

Wild Magic Surge 5e runs its surge checks on the GM's computer: when a player casts a spell, their client hands the
check over to the GM's. So in both modes the wheel is started and the chat card posted from the GM's client, and
nothing happens unless a GM is logged in. That has a few consequences:

- **The roll mode is the GM's.** In Intercept mode the wheel follows the roll mode Wild Magic Surge 5e's card was
  created with: the GM's chat roll mode, or Blind GM Roll if its *Whisper Auto Roll Table result to GM* option is on.
  In Hook mode it is the GM's chat roll mode.
- **For a public roll, the surging player is the roller.** That's the logged-in player whose character is the
  surging creature or, failing that, a logged-in player who owns it. With *Who sees the wheel* set to *The roller
  and GMs*, they see their own surge alongside the GMs. If no such player is logged in, the GM is the roller.
- **Private GM, Blind GM and Self rolls stay with the GM.** The chat card is whispered as the GM's own roll, so the
  wheel stays on the GM's side too and the casting player sees neither. Keep the GM's roll mode on Public Roll if
  players should watch their own surges.
- **The card names the creature that surged:** the one Wild Magic Surge 5e just reported a surge for or, failing
  that, the one whose spell or feature it just checked. If neither is known, it falls back to the GM's selected
  token, or the GM.
- **The repeat and streak commentary** for these surges is kept on the GM's computer.

### Path of Wild Magic

Wild Magic Surge 5e also rolls a table for Path of Wild Magic barbarians. The table named in its *Path of Wild Magic
Roll Table Name* setting is a barbarian's Wild Surge, not the sorcerer's table, so whatever it's called it gets the
ordinary-table presentation: its own name as the headline, generic commentary, no sorcerer extras, and it doesn't
count towards the sorcerer's surge streak. When Intercept mode replaces its card, the wheel and card name the
barbarian whose feature Wild Magic Surge 5e just checked.

### Troubleshooting

- **Sorcerers never surge, and the GM's browser console shows `Cannot find gameType Default`.** On a fresh
  install, Wild Magic Surge 5e 4.6.0 starts its *Wild Magic Surge Roll Feature* setting (its surge type) on a value
  it doesn't recognise, so its surge check stops before rolling anything. In **Configure Settings → Wild Magic Surge
  5e**, check that setting shows the surge type you want (*Standard* is the usual d20 check) and click **Save
  Changes** once, even if you didn't change anything. Seen with dnd5e 3.0.4. This module's own **Surge check**
  doesn't step in meanwhile, because it is ignored while Wild Magic Surge 5e is active.

## Macros and API

The API is available as `MagicWheel` or `game.modules.get("magic-wheel").api`:

```js
await MagicWheel.spin();                                  // roll the Wild Magic Surge table, wheel and all
await MagicWheel.spin("Wild Magic Surge");                // a table by name…
await MagicWheel.spin("RollTable.a1b2c3d4e5f6g7h8");      // …or by UUID, or pass the RollTable itself
await MagicWheel.spin("Wild Magic Surge", {rollMode: "blindroll"});   // publicroll, gmroll, blindroll, selfroll
await MagicWheel.spin("Wild Magic Surge", {speaker: ChatMessage.getSpeaker({actor})});

await MagicWheel.surgeCheck({actor});    // roll the d20; on a 1, spin
await MagicWheel.createTable();          // make a fresh Wild Magic Surge table (GM)
MagicWheel.findWildMagicTable();         // the table spin() uses when you don't name one
MagicWheel.isWheelTable(table);          // would rolling this table spin the wheel?
MagicWheel.replay(messageId);            // replay a chat card's spin on your screen
```

`spin()` with no table uses the world's Wild Magic Surge table, and tells you (rudely) if there isn't one. Awaiting
it waits until the wheel has landed and the chat card has been posted, after any of your earlier spins that are
still taking their turn (see [One wheel at a time](#one-wheel-at-a-time)).

Ordinary `RollTable#draw` calls spin the wheel too, so other modules' macros get the show for free. To draw a
wheel table *without* the wheel, pass `magicWheel: false`:

```js
await table.draw({magicWheel: false});   // the plain core chat card
```

A draw with `displayChat: false` never spins the wheel either, since nobody would see the result.

### Flags

For the tinkerers, everything lives under `flags.magic-wheel`:

| Document | Flag | Meaning |
|---|---|---|
| RollTable | `wheel` | `true` forces the wheel on for this table, `false` forces it off. This is what the **Wheel** button sets. |
| RollTable | `kind` | `"wild-magic"` marks the sorcerer's table. |
| TableResult | `label` | The text on this result's slice. It is used wherever there isn't a built-in Wild Magic label. About 18 characters fit. |
| ChatMessage | `spin` | The recorded spin that the **Instant Replay** button plays back (cleaned first, see [Wheels from other computers](#wheels-from-other-computers)). |

For example, to give a result of your own loot table a snappier slice:

```js
const table = game.tables.getName("Mimic Loot");
const result = table.results.find(r => r.text.includes("pony"));
await result?.setFlag("magic-wheel", "label", "FREE PONY?");
```

## Compatibility

- Foundry VTT v11. Developed against 11.315.
- Any game system. The wheel works with any roll table. The automatic surge check needs dnd5e (developed against
  3.0.4).
- Wild Magic Surge 5e: developed against 4.6.0. On a fresh install it needs one settings save first, see
  [Troubleshooting](#troubleshooting).
- libWrapper: recommended, developed against 1.12.13.
- Dice So Nice: the wheel's chat card carries no dice, so 3D dice don't roll again after the wheel has already
  landed. The surge check's d20 does roll, and the module waits for it.

## Development

There's no build step. Foundry loads `scripts/`, `templates/`, `styles/`, `lang/` and `assets/` as they are.

| Path | What it holds |
|---|---|
| `scripts/data/` | The Wild Magic Surge table text, and each result's wheel label, tone, icon, commentary, achievements, reward boxes and sub-rolls. |
| `scripts/surge-data.js` | Merges the above into one list of 50 surges. |
| `scripts/quips.js` | Everything else the System AI says, plus small text helpers. |
| `scripts/wheel-math.js` | Slice layout and spin planning (including fake-outs). Pure functions with no Foundry calls. |
| `scripts/wheel-app.js`, `scripts/audio.js` | The game-show window and its synthesised sound. |
| `scripts/surge.js` | Drawing from a table, building the spin and posting the chat card. |
| `scripts/socket.js`, `scripts/chat.js` | Showing the wheel to other players (one at a time), and the chat card's Instant Replay button. |
| `scripts/sanitize.js` | Cleaning spins that come from other clients or chat cards before they are shown. |
| `scripts/integrations.js` | The `RollTable#draw` wrapper (and skipping the sheet's roulette), Wild Magic Surge 5e, the dnd5e surge check and the table sheet's Wheel button. |
| `scripts/table-setup.js`, `scripts/settings.js`, `scripts/api.js`, `scripts/main.js` | The table, settings, the `MagicWheel` API and start-up. |
| `tests/` | Unit tests, run with Node (no Foundry needed). |

Run the tests with Node 18 or newer:

```bash
npm test
```

`package.json`, `tests/` and `.github/` are development tooling only, and are left out of the release zip.

### Releasing

1. Update `CHANGELOG.md` and the `version` in `module.json` (for example to `1.0.1`), and commit.
2. Tag that commit with the same version, starting with `v`, and push both:

   ```bash
   git tag v1.0.1
   git push origin main v1.0.1
   ```

3. The **Test and release** workflow checks the JSON and scripts, runs the tests, points `module.json` at the new
   release, builds `module.zip` and publishes a GitHub release with both files. Foundry then offers the update to
   anyone using the manifest URL.

## Credits and licence

- The System AI is inspired by the reality-show host of *Dungeon Crawler Carl* by Matt Dinniman. This module is not
  affiliated with or endorsed by the author or publisher, and all of its commentary is original.
- The Wild Magic Surge table text is from the *Dungeons & Dragons 5th Edition Player's Handbook* by Wizards of the
  Coast, and is included for personal use at your own table. This module is not affiliated with Wizards of the Coast.
- The code is [MIT](LICENSE) licensed. The table text is not covered by that licence.

No sorcerers were permanently harmed in the making of this module. Several were turned into potted plants, but
only temporarily.
