# Changelog

## 1.0.0

First release. The System AI would like you to know it is very excited, and that its excitement is contractually obligated.

- The wheel: rolling the Wild Magic Surge table opens a game-show window with a spinning prize wheel of all 50 surges. It ticks, slows, sometimes fakes everyone out (creeping forward or rolling back a slice), and lands on the real result. A LIVE badge, a viewer counter, a commentary ticker, audience reactions, sponsor messages, achievements and reward boxes come as standard.
- It's still a real draw: the result is the table's own roll, made before the wheel moves. Drawn results and replacement work as they do in core Foundry.
- The table: the GM's first login creates a world **Wild Magic Surge** table with all 50 results, rollable by players. A settings menu button makes a fresh copy at any time.
- Chat card: about two seconds after the wheel lands, a styled card with the effect, the System AI's opinion, any achievement or reward box, and an **Instant Replay** button that plays the same spin again on your screen only.
- Roll modes decide who sees the wheel and the card: public (everyone, or just the roller and GMs), private GM, blind GM (the roller just gets mocked) and self. The roll mode and speaker are fixed when the table is rolled.
- One wheel at a time: spins that arrive while a wheel is still spinning, or has only just landed, wait their turn instead of cutting it off.
- Safety: a spin from another client is only shown if it really comes from the player named in it, and its HTML is cleaned before it is shown, as is a replay's.
- Sub-rolls for the results that need them (height change, age, flumphs, healing, lightning, necrotic damage, random nearby targets, and a pre-rolled Reincarnate result "just in case"), as clickable inline rolls.
- Synthesised sound effects (ticks, whoosh, drumroll and a landing sting per result tone), with per-player volume, a mute button on the window, auto-close and a "Coward Mode" that skips the wheel.
- Any other roll table can use the wheel: list its name in the settings, or use the GM's **Wheel** button on the table's sheet. Rolling a wheel table from its sheet skips core's roulette animation.
- dnd5e: an optional automatic surge check. When a creature with the Wild Magic Surge feature casts a spell of 1st level or higher, roll a d20; on a 1, spin.
- Wild Magic Surge 5e: either replace its result card with the wheel, or spin when it reports a surge. For public rolls, the player whose character surged counts as the roller. Its Path of Wild Magic table is presented as an ordinary table, credited to the barbarian.
- `MagicWheel.spin()`, `surgeCheck()`, `createTable()`, `findWildMagicTable()`, `isWheelTable()` and `replay()` for macros.
- Uses libWrapper when it is installed, and patches `RollTable#draw` directly when it isn't.
- Settings, buttons, tooltips and plain notifications are in `lang/en.json`, ready for translation. The System AI's commentary and the show's on-screen patter are English only.
