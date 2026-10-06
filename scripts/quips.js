// The System AI's generic commentary (window titles, ticker chatter, audience reactions, notifications)
// plus the small helpers used to fill and pick lines. Per-surge lines live in data/surges-*.js.
// Pure module: no Foundry globals, so it can be unit tested under plain Node.
//
// Placeholders are filled by `fill`, which HTML-escapes the inserted values:
//   intro {name} {user} · landed {label} · repeat {label} {count} · streak {count} {name}
//   checkFlavor {name} · checkPass {name} {total} · checkFail {name} · generic {result} {name}
// Every other pool has no placeholders.
// Markup: HTML pools may use <strong> and <em> only. The PLAIN TEXT pools (titles, blind, checkPass, checkFail,
// reactions, closeLabels, tableCreated, noTable, skipWheel) end up in window titles, buttons and notifications,
// so they contain no markup and none of the characters & < > ".

/** Window titles. PLAIN TEXT. */
const titles = [
  "WILD MAGIC SURGE — THE WHEEL OF QUESTIONABLE DECISIONS",
  "THE SURGE IS RIGHT! — LIVE FROM YOUR SPELL SLOT",
  "WHO WANTS TO BE A POTTED PLANT?",
  "WHEEL OF MISFORTUNE — SEASON 9, EPISODE YOU",
  "SPIN TO LOSE: THE WILD MAGIC HOUR",
  "THE WHEEL OF CONSEQUENCES — LIVE AND UNSUPERVISED",
  "WHEEL OF WILD MAGIC — NOW IN SURGE-O-VISION",
  "CHAOS OR NO CHAOS (IT IS CHAOS)",
  "THE D100 DEATH SPIRAL — PRIME TIME EDITION",
  "TONIGHT'S SURGE — TERMS AND CONDITIONS APPLY",
  "THE WHEEL — CONTESTANT WAIVER ON FILE",
  "LIVE: ONE CASTER, ONE WHEEL, ZERO REFUNDS",
  "ARCANE ROULETTE — THE HOUSE IS ALSO ON FIRE",
  "SPELL SLOT SWEEPSTAKES — ENTRY IS MANDATORY",
  "SPIN CITY: A SORCERER'S DESCENT"
];

/** The spin begins. {name} {user} */
const intro = [
  "Ladies, gentlemen and gelatinous cubes: Crawler <strong>{name}</strong> has surged. Spin that wheel!",
  "<strong>{user}</strong> rolled the dice. <strong>{name}</strong> gets the consequences. That's the beauty of the format.",
  "Oh, this is my favourite part. <strong>{name}</strong> touched the Weave and the Weave touched back.",
  "SYSTEM NOTICE: Arcane containment failure detected on <strong>{name}</strong>. Wheel deployed.",
  "Welcome back to the only show where the magic fights back! Tonight's contestant: <strong>{name}</strong>!",
  "Crawler <strong>{name}</strong>, you have been selected for a complimentary surge. Please remain seated.",
  "Hold on to your spell slots, viewers: <strong>{name}</strong> just got wheeled.",
  "<strong>{user}</strong>, your character is about to become content. Smile for the scrying orbs!",
  "Raw, unregulated magic is leaking out of <strong>{name}</strong>. Let's monetise it.",
  "Breaking: <strong>{name}</strong> cast a spell without reading the warning label. Live coverage begins now.",
  "Ratings were down. Then <strong>{name}</strong> surged. Thank you, <strong>{name}</strong>.",
  "Spin request approved for Crawler <strong>{name}</strong>. Waiver signed by <strong>{user}</strong>. Mostly.",
  "The wheel hungers. <strong>{name}</strong>, kindly step into the splash zone.",
  "It's surge o'clock, <strong>{name}</strong>! Our legal team has already left the building.",
  "Alright, <strong>{user}</strong>, hands off the dice. The professionals will take it from here.",
  "Everybody say hello to <strong>{name}</strong>, who is about to have a <em>very</em> interesting six seconds.",
  "<strong>{name}</strong> has rolled on the table of regret. Producers, cue the lights!",
  "A sorcerer surges, the wheel spins, and an insurance adjuster quietly weeps. Go, <strong>{name}</strong>!",
  "Attention: <strong>{name}</strong> is now legally a game show contestant. No take-backs.",
  "Viewers at home, place your bets. <strong>{name}</strong>, place your affairs in order.",
  "Is it a fireball? Is it a sheep? Is it a houseplant? Ask the wheel, <strong>{name}</strong>!",
  "Uh-oh. The magic inside <strong>{name}</strong> just hiccupped. Let's see what it coughs up.",
  "<strong>{user}</strong>, please confirm you are emotionally prepared. Too late! Spinning for <strong>{name}</strong>!",
  "Crawler <strong>{name}</strong>, your sorcery has filed for independence. The wheel will mediate.",
  "Cameras on <strong>{name}</strong>, please. No, the <em>good</em> side. Oh. Never mind. Spin!",
  "Previously on this show: <strong>{name}</strong> cast a spell. Tonight: the consequences.",
  "Good evening and welcome to the show. Tonight's contestant did not apply. Tonight's contestant is <strong>{name}</strong>.",
  "Attention, everyone within 30 feet of <strong>{name}</strong>: you did not sign a waiver. That's fine. The System checked, and it isn't needed."
];

/** Mid-spin ticker chatter (core picks 3). <= 110 characters. */
const spinning = [
  "Round and round it goes. Where it stops, the DM probably already knows.",
  "Our viewers are placing bets. Current favourite: 'something involving sheep'.",
  "Reminder: the wheel is fair. Fairness was never promised to <em>you</em>.",
  "This wheel was hand-carved from a retired mimic. Please do not touch the wheel.",
  "Legal reminder: any resemblance to a fair outcome is purely coincidental.",
  "Fun fact: the wheel has never once been reached for comment.",
  "The chat is going wild. Mostly bets. Some prayers. One recipe for sheep stew.",
  "The audience is chanting. I can't tell if it's encouragement or a summoning ritual.",
  "Our technicians assure me the wheel is NOT sentient. They seemed nervous.",
  "Somewhere, a wizard with a nice tidy spellbook is feeling very smug right now.",
  "Scrying orbs at maximum. This one is going straight to the highlight reel.",
  "Please keep arms, legs and familiars inside the spell radius at all times.",
  "The wheel accepts no bribes. I, on the other hand, take platinum.",
  "If you hear ticking, that's the wheel. If you smell smoke, that's also the wheel.",
  "Every click is a tiny door into a slightly worse universe.",
  "Did anyone check if this sorcerer has insurance? No? Great. Keep spinning.",
  "Sorcerers, remember: Tides of Chaos was a loan, not a gift. Here comes the interest.",
  "The DM is pretending to be neutral. Look at that face. That's a smirk.",
  "Ratings are climbing. Nothing pleases a crowd like magic going wrong in somebody else's face.",
  "I once saw this wheel turn a paladin into a plant. Twice. Same paladin.",
  "Fun fact: 'wild magic' is just regular magic that skipped therapy.",
  "SYSTEM NOTICE: Spin velocity within acceptable chaos tolerances.",
  "The party wizard has quietly stepped behind the fighter. Smart wizard.",
  "This wheel has a 100% success rate at producing results. Any results.",
  "The flapper on this wheel is a retired kobold. Union rates. Do not tip it.",
  "The odds are being calculated. The odds are laughing.",
  "Note to the front row: you are inside the splash zone. Possibly the blast radius.",
  "We can't stop the wheel now. We tried once. That's why the old host is a ficus.",
  "Psst. Nobody tell the wheel it's on live television.",
  "Breaking: wheel still spinning. More after these messages.",
  "Producers want the energy up! Everybody gasp on three. One, two…",
  "I'm contractually obliged to say this wheel is safe. There. I said it.",
  "And remember, a natural 1 brought you here. Statistically, that's on you.",
  "The betting pool favours 'turns blue'. Forty-nine to one. They love a long shot.",
  "Click. Click. Click. That's the sound of consequences arriving.",
  "No spell slots were harmed in the making of this spin. Several are traumatised.",
  "This wheel is certified by the Guild of Arcane Gambling. We are the Guild.",
  "Viewers ask: is this rigged? The answer is a firm 'define rigged'.",
  "That's a lot of momentum for something with no feelings. Allegedly.",
  "If you're just tuning in: someone's magic broke, and now we're all watching.",
  "Every outcome is equally likely. Every outcome is also your fault.",
  "Oh, the suspense. I could watch this all day. Contractually, I must.",
  "Cleric on standby. Bard on standby. Fire extinguisher on standby.",
  "The magic is deciding. Please do not perceive the magic while it decides.",
  "Somewhere, a Dexterity saving throw is getting very nervous.",
  "Our insurance company has stopped returning my sendings.",
  "Maintenance note: this wheel is lubricated with Grease cast by previous contestants.",
  "The audience at home is hiding behind their couches. Couches won't help.",
  "Reminder: the System does not control the wheel. The System merely profits from it.",
  "Our sponsors have requested a sheep. The System has forwarded that request to the wheel.",
  "Some of these slices are good for you. The System is not going to say which.",
  "Spoiler: the dice already decided all this. The wheel is purely for the audience. And for the System."
];

/** The wheel is slowing. <= 110 characters. */
const slowing = [
  "It's slowing down… the tension… the <em>ratings</em>…",
  "Here we go. Everybody hold your breath. Not you, sorcerer. You might explode.",
  "Decelerating! This is where dreams go to become sheep.",
  "Easy… easy… the wheel is savouring this.",
  "And now the wheel gets indecisive. Just like the party at a fork in the corridor.",
  "Our cameras are zooming in. Our lawyers are zooming out.",
  "Any second now. The audience is chewing on their own gauntlets.",
  "It's crawling now. Like a rogue tiptoeing past a sleeping dragon.",
  "Slower… slower… someone fetch the cleric, just in case.",
  "SYSTEM NOTICE: Fate is loading. Please do not close the window.",
  "Oof, look at it tease. This wheel knows <em>exactly</em> what it's doing.",
  "Almost there. Last chance to pretend you meant to do this.",
  "Tick… tick… tick… the slowest seconds in the dungeon.",
  "Brace for impact. Or for a houseplant. Brace generally.",
  "The flapper is sweating. I didn't know it could sweat.",
  "It's going to land on something. My sources are confident of that much.",
  "Final approach. Please return your seat to the upright position.",
  "Slowing to a crawl… like the party's progress through this dungeon.",
  "Every click now is worth a thousand viewers. Click, you beautiful thing.",
  "The momentum is leaving it the way hope leaves a level 1 wizard.",
  "Drumroll, please. No, a real drumroll. Who hired this bard?",
  "Quiet in the studio. The wheel is choosing violence. Or a sheep.",
  "It's thinking. It's deliberating. It's milking it. I love it.",
  "Stay with me, viewers. This is the part they put in the trailer.",
  "The wheel is slowing, much like the sorcerer's heart rate. Wait, is that bad?"
];

/** The wheel stopped… then creeps forward one slice. */
const fakeOutCreep = [
  "It stopped. It's over. It's — wait. WAIT. It's moving!",
  "Hold on, it's creeping forward! The wheel heard the crowd and wants an encore.",
  "One more click! ONE MORE CLICK! Oh, the producers are going to love this.",
  "Nope! It had one more in it. Never trust a wheel that says it's done.",
  "Ooh, a late nudge! Someone check the wheel for invisible imps.",
  "It's inching! It's INCHING! Audience, I need you to scream.",
  "Fake stop! The wheel is a performer, and it knows where the camera is.",
  "Look at it crawl over the line. Pure showmanship. I taught it that.",
  "Just when you thought it was safe to stop praying… one more slice!",
  "SYSTEM NOTICE: Previous result revoked. The wheel would like a do-over.",
  "And it… keeps… going. Somebody check if it's Hasted.",
  "Did a breeze just push it? There are no windows in here. Spooky.",
  "Oh, it creeps! Sorry, sorcerer — the wheel had second thoughts.",
  "A sneaky extra tick! That wheel has proficiency in Stealth."
];

/** The wheel stopped (overshot)… then rolls back one slice. */
const fakeOutRollback = [
  "It went past! It's — it's rolling BACK! Gravity has opinions tonight.",
  "Too far! The wheel is reversing like a goblin cart on a steep hill.",
  "Overshot it! And now it's sliding back. Somebody is tilting the stage.",
  "Rollback! The wheel saw where it was going and said 'absolutely not'.",
  "Wait, it's backing up! Even the wheel needed a second look at that one.",
  "A retreat! Very tactical. Very rogue. Disengage as a bonus action.",
  "It's going backwards! Who cast Reverse Gravity? Was it you? Be honest.",
  "Whoa, it un-spun! Is that allowed? Legal says 'technically'.",
  "And it slips back a notch! The universe just hit undo.",
  "Oh no, it's settling back… like a mimic pretending it was always a chest.",
  "SYSTEM NOTICE: Result recalled for quality control. Please hold.",
  "It had the right idea and then thought better of it. Relatable.",
  "Backpedalling! This wheel has more regrets than our contestant.",
  "Look at it wobble back. Someone's been feeding the wheel cheap ale.",
  "It overshot, panicked and reversed. Like a bard who opened the wrong door."
];

/** Announcement after landing. {label} */
const landed = [
  "THE WHEEL HAS SPOKEN: <strong>{label}</strong>.",
  "And the winner is… <strong>{label}</strong>! Using the word 'winner' loosely.",
  "Ding ding ding! <strong>{label}</strong>! Reminder: 'ding' is not the same as 'good'.",
  "SYSTEM NOTICE: Outcome confirmed. <strong>{label}</strong>. No appeals.",
  "Lock it in! <strong>{label}</strong>! The audience goes feral!",
  "It's <strong>{label}</strong>! Somebody tell the DM. Actually, look at them. They know.",
  "Fate has dealt you <strong>{label}</strong>. Fate does not take returns.",
  "Behold: <strong>{label}</strong>. You did this. Well, the wheel did. But you started it.",
  "Landed! <strong>{label}</strong>! I'd say congratulations, but I'm not sure that's appropriate.",
  "Ladies and gentlemen, <strong>{label}</strong>! Clip it! Clip it!",
  "<strong>{label}</strong>! Oh, I could not have scripted this better. And I tried.",
  "And it's… <strong>{label}</strong>. Please hold for applause, screaming, or both.",
  "The magic has chosen <strong>{label}</strong>. The magic has no taste.",
  "Result locked: <strong>{label}</strong>. Our ratings thank you for your sacrifice.",
  "STOP THE PRESSES: <strong>{label}</strong>!",
  "Drumroll over. It's <strong>{label}</strong>. You may now react.",
  "The wheel says <strong>{label}</strong>, and the wheel is never wrong. Just mean.",
  "Final answer: <strong>{label}</strong>. Not yours. Ours.",
  "We have a result! <strong>{label}</strong>! Somebody fetch a mop. Or a cleric.",
  "<strong>{label}</strong>! That's going straight in the season trailer.",
  "Tonight's special: <strong>{label}</strong>. Tomorrow's therapy topic: also that.",
  "The pointer has pointed. It's <strong>{label}</strong>.",
  "<strong>{label}</strong>! I'm told that's a good one. I'm told a lot of things."
];

/** Same result as last time. {label} {count} */
const repeat = [
  "<strong>{label}</strong> AGAIN? The wheel has a favourite, and it's your suffering.",
  "Déjà vu! <strong>{label}</strong> again. That's {count} times. The wheel is stuck on you.",
  "Back by popular demand: <strong>{label}</strong>! Appearance count: {count}.",
  "SYSTEM NOTICE: Duplicate result detected. <strong>{label}</strong> ×{count}. Not a bug. A feature.",
  "Are we in a time loop? <strong>{label}</strong>, {count} times now. Someone check for a Wish spell.",
  "<strong>{label}</strong> again. It's not random any more, it's a running gag. Count: {count}.",
  "Oh, <strong>{label}</strong> again. Tally: {count}. We're going to need a bigger achievement.",
  "Same slice, {count} times. Our statisticians have filed a formal complaint.",
  "<strong>{label}</strong>, the sequel! Entry number {count} in the franchise. Critics are divided.",
  "Again with the <strong>{label}</strong>. At {count} times, it's officially your brand.",
  "The wheel remembers you, and it chose <strong>{label}</strong> again. That makes {count}.",
  "You know what they say: {count} times is a pattern. <strong>{label}</strong> is now canon.",
  "We just did this! <strong>{label}</strong> lands again ({count} so far). The writers are getting lazy.",
  "Rerun alert! <strong>{label}</strong>, {count} times. Viewers are asking for their gold back.",
  "<strong>{label}</strong> once more. {count} times. At this point it's less a surge than a lifestyle."
];

/** The Nth surge on this device recently. {count} {name} */
const streak = [
  "Surge number {count} recently! <strong>{name}</strong> is single-handedly funding this season.",
  "{count} surges and counting. Somebody get <strong>{name}</strong> a sponsorship deal.",
  "SYSTEM NOTICE: Surge frequency exceeds the recommended dosage. Current count: {count}.",
  "This is surge {count}, folks. <strong>{name}</strong>'s magic is basically a leaky tap.",
  "Surge {count}? At this point the wheel belongs on <strong>{name}</strong>'s character sheet.",
  "We've spun {count} times lately. The wheel is getting dizzy. <strong>{name}</strong> is not allowed to be.",
  "Achievement progress: Frequent Flyer of Chaos ({count}/∞). Keep surging, <strong>{name}</strong>.",
  "Another one! That's {count}. Our crew is unionising over <strong>{name}</strong>'s overtime.",
  "{count} surges. <strong>{name}</strong>, have you considered a career in something less explosive? Like bard?",
  "Streak alert! {count} spins recently. Viewers have started naming the slices after <strong>{name}</strong>.",
  "Surge number {count}. At this rate <strong>{name}</strong> is getting a recurring segment.",
  "The wheel has spun {count} times lately. It has started asking for <strong>{name}</strong> by name.",
  "Surge count: {count}. The party now stands at least thirty feet from <strong>{name}</strong> at all times.",
  "{count} surges? <strong>{name}</strong>, the Weave is considering a restraining order.",
  "That's {count} in a short span. <strong>{name}</strong>, our sponsors want to put their logo on you."
];

/** Notification for a roller who made a blind roll: they don't get to see. PLAIN TEXT. */
const blind = [
  "Blind roll! The wheel is spinning, but you don't get to watch. The DM gets the good seats.",
  "Something happened to you. Something magical. You'll find out when the DM stops giggling.",
  "SYSTEM NOTICE: This surge is classified. Clearance level: Dungeon Master.",
  "You rolled blind, so the result is behind the DM's screen, where secrets go to grin.",
  "The wheel has spun. You are not cleared to see it. Please continue as if nothing is wrong.",
  "Surge sealed for DM eyes only. Feel free to start worrying now.",
  "A blind surge! How mysterious. How suspenseful. How hilarious for the DM.",
  "Your magic did something. The DM knows. You don't. Enjoy that feeling.",
  "Result hidden. Watch the DM's face closely for clues. Is that a smile? That's a smile.",
  "Blind roll acknowledged. The wheel spins in the dark, like a goblin with a secret.",
  "Exclusive broadcast for the DM only. You get the free version, which is this sentence.",
  "Something about you has changed. Possibly everything. Possibly just your hair. Ask the DM.",
  "The surge happened off camera. The DM watched it alone, laughing in a way we found unsettling."
];

/** Flavor on the d20 surge-check roll card. {name} */
const checkFlavor = [
  "Wild Magic check for <strong>{name}</strong>: roll a 1 and the wheel comes out.",
  "<strong>{name}</strong> cast a spell. The Weave is deciding whether to take it personally. (1 = surge)",
  "Surge check! <strong>{name}</strong> needs anything but a 1. No pressure. Lots of pressure.",
  "SYSTEM NOTICE: Arcane instability scan for <strong>{name}</strong>. A natural 1 summons the wheel.",
  "Wild Magic Surge check: <strong>{name}</strong> vs. the d20. The d20 is undefeated.",
  "The dice decide whether <strong>{name}</strong> becomes tonight's entertainment. (1 = surge)",
  "Rolling for chaos on behalf of <strong>{name}</strong>. The audience is hoping for a 1.",
  "Did that spell feel a little wobbly, <strong>{name}</strong>? Let's check. (Surges on a 1.)",
  "Magic leak test for <strong>{name}</strong>: nineteen ways to be boring, one way to be famous.",
  "<strong>{name}</strong> spent a spell slot. The house would like to roll for change. (1 = surge)",
  "Surge check for <strong>{name}</strong>. The wheel is warming up, just in case.",
  "A d20 for <strong>{name}</strong>'s dignity. Natural 1 and it's wheel time.",
  "Wild Magic: <strong>{name}</strong> rolls a d20. Five percent chance of becoming content.",
  "Ratings check for <strong>{name}</strong>. I mean surge check. Same thing. (1 = surge)",
  "Containment check on <strong>{name}</strong>'s sorcery. Anything but a 1 and we all go home bored."
];

/** The d20 surge check was not a 1. {name} {total}. PLAIN TEXT. */
const checkPass = [
  "Rolled {total}. {name}'s magic behaves itself. The audience boos.",
  "{total}! No surge. {name} remains tragically uninteresting for one more spell.",
  "The d20 shows {total}. The wheel goes back in its box. It's sulking.",
  "SYSTEM NOTICE: {total} detected. Surge denied. Ratings flat.",
  "{name} rolls {total} and keeps both eyebrows. This time.",
  "{total} on the die. No surge. Producers, cut to commercial.",
  "{total}. The Weave lets {name} off with a warning.",
  "{total}? Safe, responsible and boring. Do better, {name}.",
  "Surge check passed ({total}). The wheel will remember this, {name}.",
  "Result: {total}. No chaos today. I've told the viewers to stay tuned anyway.",
  "{name} dodges the wheel with {total} on the d20. The betting pool is furious.",
  "Surge check: {total}. The magic stays put. For now. Keep casting, {name}. Keep casting.",
  "{total}! Nothing happens. Thrilling television. Truly.",
  "The d20 says {total}. {name} gets to keep their current species.",
  "No surge ({total}). We'll get you next spell, {name}. We always do.",
  "Roll: {total}. The wheel has been told to stand down. It is not happy about it.",
  "{name} rolled {total}. Not a 1. I checked twice. I was hoping.",
  "Surge averted, {total} on the d20. Somewhere, a sheep breathes a sigh of relief.",
  "{total}. Magic contained. Sponsors disappointed. {name} insufferably smug.",
  "Phew, {total}. And by 'phew' I mean 'ugh'.",
  "{total}. The wild magic stays in its cage. For now, {name}. For now.",
  "{total} and no surge? {name}, the audience paid good gold to watch you explode.",
  "Rolled {total}, no surge. Please enjoy this complimentary sense of anticlimax."
];

/** The d20 surge check was a 1: surge incoming. {name}. PLAIN TEXT. */
const checkFail = [
  "NATURAL 1! {name}'s magic slips its leash. Fire up the wheel!",
  "A 1! Oh, a beautiful, beautiful 1. Spin it for {name}!",
  "SYSTEM NOTICE: Containment breach on {name}. Wheel activated.",
  "It's a 1, folks! {name} is about to become our lead story.",
  "One. The smallest number on the die and the biggest number in our ratings. Surge incoming for {name}!",
  "{name} rolled a 1. The audience rose to its feet. The wheel rose to the occasion.",
  "Surge confirmed! {name}, please step up to the big wheel. Mind the scorch marks.",
  "And there it is: a natural 1. {name}'s magic has entered its chaotic era.",
  "The d20 has betrayed {name}! Ratings: up. Safety: down. Wheel: GO.",
  "A 1! I want to thank {name} personally for this content.",
  "Wild Magic Surge triggered by {name}. Please evacuate the immediate area. Or don't. Better footage.",
  "Oh no. Oh yes. {name} rolled a 1. SPIN THE WHEEL!",
  "Five percent chance, one hundred percent drama. {name} surges!",
  "A 1. The Weave would like a word with {name}. Several words. Spinning now.",
  "{name} rolled the one number we were all hoping for. Cue the wheel!"
];

/** Commentary for non-wild-magic tables using the wheel. {result} {name} */
const generic = [
  "<strong>{result}</strong>. Not a surge, but I'll take any excuse to spin the wheel.",
  "The wheel has chosen <strong>{result}</strong> for <strong>{name}</strong>. The wheel does not explain itself.",
  "<strong>{result}</strong>! A perfectly normal table result, presented with abnormal enthusiasm.",
  "SYSTEM NOTICE: Non-surge content detected. Applying dramatic lighting anyway. Result: <strong>{result}</strong>.",
  "Crawler <strong>{name}</strong> gets <strong>{result}</strong>. Viewers have rated it 'a table result'.",
  "We rolled a whole wheel for <strong>{result}</strong>. Worth it? The ratings say yes.",
  "<strong>{result}</strong>. Look, not every spin can be a fireball. Some of them are just this.",
  "Congratulations, <strong>{name}</strong>: <strong>{result}</strong>. Collect it from the DM, who is not a vending machine.",
  "The table has spoken, and it said <strong>{result}</strong>. Loudly, because I gave it a microphone.",
  "Plot twist: <strong>{result}</strong>! Well, I'm calling it a plot twist. Legal says I can.",
  "<strong>{name}</strong> spun for glory and got <strong>{result}</strong>. Glory was on a different table.",
  "<strong>{result}</strong>! I don't know what that means either, but the crowd is chanting it.",
  "And for <strong>{name}</strong>: <strong>{result}</strong>. Let's all pretend that was the plan.",
  "<strong>{result}</strong>. A bold choice from the wheel. The wheel is always bold. It has nothing to lose.",
  "Oh, <strong>{result}</strong>. Very nice. Very… tabular. Next!",
  "Wheel says <strong>{result}</strong>. Wheel says you're welcome, <strong>{name}</strong>.",
  "<strong>{result}</strong>, delivered with a confetti budget we definitely didn't have.",
  "Spin complete. <strong>{name}</strong> receives <strong>{result}</strong>, plus the warm glow of public attention.",
  "<strong>{result}</strong>! Someone write that down. The DM won't, and we'll all argue about it later.",
  "Random table, random result, completely non-random entertainment. <strong>{result}</strong>!",
  "The DM made a table, and the table made a choice: <strong>{result}</strong>. Blame flows uphill.",
  "<strong>{result}</strong>. Honestly? Could be worse. Could be a wild magic surge.",
  "<strong>{name}</strong>, your prize is <strong>{result}</strong>. No, you can't trade it for what's behind door number two."
];

/** Footer sponsor lines: fictional, D&D-flavoured. */
const sponsors = [
  "This surge is brought to you by <strong>Mimic-Free Chests™</strong>: guaranteed ninety percent not alive.",
  "Today's spin is sponsored by <strong>Owlbear-Away</strong> repellent. Smells like a bard's boots. Works on bards, too.",
  "Brought to you by <strong>Bag of Holding Self-Storage</strong>. Do not store bags of holding inside us. We mean it.",
  "This surge is sponsored by <strong>Rust Monster Rescue</strong>: adopt today, lose your armour tomorrow.",
  "Brought to you by <strong>Flumph Gardens</strong> telepathic spa. Relax while a friendly jellyfish reads your thoughts.",
  "This surge is brought to you by <strong>Potion of Healing (Store Brand)</strong>. Heals 2d4 + 2. Tastes like 2d4 regrets.",
  "This surge is brought to you by <strong>Tarrasque Chow</strong>, for the apocalyptic pet in your life.",
  "Sponsored by <strong>Grease-B-Gone</strong>, for when you cast Grease on yourself. Again.",
  "This surge is brought to you by <strong>Modron Temps</strong>: precise, punctual, and gone in one minute.",
  "This surge is brought to you by <strong>Kobold Kustom Traps</strong>: if you can see it, it's the decoy.",
  "This surge is brought to you by <strong>Revivify Express</strong>: one minute window, 300 gp in diamonds, no refunds.",
  "This spin is sponsored by <strong>Tavern Brawl Insurance</strong>. Covers chairs. Does not cover the bard.",
  "This surge is brought to you by <strong>Basilisk Mirrors</strong>: see yourself as others see you. Briefly.",
  "Tonight's broadcast is brought to you by <strong>Lich Life Insurance</strong>. Phylactery sold separately.",
  "This surge is brought to you by <strong>Otyugh Waste Management</strong>. We eat what you won't.",
  "Brought to you by <strong>Arcane Core Fitness</strong>: strengthen your core. Your magical core. It's leaking.",
  "This surge is brought to you by <strong>Sending Stone Mobile</strong>: twenty-five words or fewer, no roaming charges.",
  "This surge is brought to you by <strong>Bulette-Proof Vests</strong>. Not proof against bulettes.",
  "Sponsored by <strong>Troll-B-Q</strong>: bring your own fire or acid, or dinner gets back up.",
  "This surge is brought to you by <strong>Dimension Door Deliveries</strong>: up to 500 feet, rarely inside a wall.",
  "This surge is brought to you by <strong>Unseen Servant Staffing</strong>: they work so hard. You'll never prove it.",
  "Brought to you by <strong>Ten-Foot Pole Supply</strong>: poking suspicious things since the very first dungeon.",
  "This broadcast is sponsored by <strong>Gelatinous Cube Waterbeds</strong>. Sleep in one. Once.",
  "This surge is brought to you by <strong>Healer's Kit Express</strong>: ten uses, no Medicine check, no questions asked.",
  "This surge is brought to you by <strong>Mage Hand Massage</strong>: firm, gentle, spectral, and up to thirty feet away.",
  "Brought to you by <strong>Counterspell Dating</strong>: we stop bad decisions before they're cast.",
  "This surge is sponsored by <strong>Cloud of Daggers Cutlery</strong>. Dinner is served. Aggressively.",
  "This surge is brought to you by <strong>Feather Beard Wax</strong>, for the face that's one sneeze from disaster.",
  "This spin is sponsored by <strong>Wand of Wonder Warranty Services</strong>. We have never paid out. Not once.",
  "This surge is brought to you by <strong>Portable Hole Plumbing</strong>: we go deep. Ten feet deep, to be exact.",
  "Brought to you by <strong>Prestidigitation Dry Cleaning</strong>: one cubic foot at a time, six seconds per stain."
];

/** Ultra-short audience reactions per tone (<= 24 characters). PLAIN TEXT. */
const reactions = {
  good: [
    "LET'S GOOO 🎉",
    "clip it clip it",
    "rigged (in a good way)",
    "the wheel loves you 💖",
    "my bet paid out!! 💰",
    "main character energy ✨",
    "sorcerer diff",
    "FINALLY a good one",
    "wait it's actually good",
    "🔥🔥🔥",
    "happy tears 😭",
    "subscribed 🔔",
    "blessed RNG 🙏",
    "the Weave said yes",
    "they're SO back",
    "chat we're winning",
    "10/10 no notes",
    "booooo (jk nice)",
    "take my gold 💸",
    "lucky lucky lucky",
    "W",
    "sponsors are SWEATING",
    "never doubted you"
  ],
  bad: [
    "F",
    "F in the chat",
    "oof 💀",
    "RIP 🪦",
    "called it 📉",
    "LMAOOO",
    "not like this 😭",
    "CLERIC!!! CLERIC!!!",
    "this is the content 🍿",
    "skill issue",
    "🍿🍿🍿",
    "my condolences (lol)",
    "it's so over 💀",
    "refund? 😂",
    "oh no. oh no no no",
    "worth it for the views",
    "sad trombone noises",
    "thoughts and prayers 🙏",
    "they'll be fine. maybe",
    "wheel said NO",
    "my bet lost 😤",
    "rough. very rough."
  ],
  weird: [
    "what",
    "WHAT 😂",
    "I have so many questions",
    "???",
    "is that allowed",
    "lore drop?? 👀",
    "the DM is typing…",
    "this is canon now",
    "bro what 🐑",
    "this show is unhinged",
    "I don't get it 🤨",
    "cursed content",
    "my brain hurts 🌀",
    "uh… huh",
    "chat is this real",
    "peak cinema 🎬",
    "10/10 nonsense",
    "🐑❓",
    "explain. now.",
    "nobody tell the bard",
    "it's art, actually",
    "I'd watch a spinoff"
  ],
  chaos: [
    "RUN 🏃",
    "EVERYBODY DOWN",
    "CHAOS CHAOS CHAOS",
    "🔥🌀💥",
    "the splash zone!!",
    "my ears 😱",
    "this is fine 🔥",
    "I'M IN THE BLAST RADIUS",
    "HIDE THE WIZARD",
    "🚨🚨🚨",
    "absolute cinema",
    "ratings go brrr 📈",
    "MAYHEM MODE",
    "we're all gonna die 🤣",
    "best episode ever",
    "somebody stop it",
    "aaaaaaaaaaa",
    "the party is NOT ready",
    "pure chaos 🎲",
    "I spilled my mead 🍺",
    "SPIN IT AGAIN",
    "roll initiative!!"
  ]
};

/** Close-button labels (<= 22 characters). PLAIN TEXT. */
const closeLabels = [
  "Accept My Fate",
  "I Regret Nothing",
  "Live With It",
  "Fine. FINE.",
  "Thank You, Wheel",
  "Roll Credits",
  "It Is What It Is",
  "Walk It Off",
  "Noted. Regretted.",
  "Back to the Dungeon",
  "Close and Cope",
  "I'll Allow It",
  "Proceed to Suffer",
  "Cool Cool Cool",
  "Sign the Waiver",
  "Make It Stop",
  "Pretend I Saw Nothing",
  "Embrace the Chaos",
  "Next Contestant",
  "Exit Stage Left",
  "Back Away Slowly",
  "Deal With It",
  "No Further Questions",
  "Blame the Dice"
];

/** GM notification when the module creates the table. PLAIN TEXT. */
const tableCreated = [
  "SYSTEM NOTICE: A Wild Magic Surge table has been installed in your Rollable Tables. Fifty fresh ways to ruin a sorcerer.",
  "I made you a Wild Magic Surge table. It's in the Rollable Tables tab. You're welcome. The sorcerer is not.",
  "Wild Magic Surge table created. The wheel has been polished, calibrated and fed. Please keep fingers clear of the spokes.",
  "New Rollable Table: Wild Magic Surge. Your sorcerer's insurance premiums have been adjusted accordingly.",
  "The Wild Magic Surge table is ready, and so is the wheel. The sorcerer is the only one who isn't.",
  "SYSTEM NOTICE: Wild Magic Surge table deployed. The wheel is warm. The audience is seated. The sorcerer has not been told.",
  "Installed: one Wild Magic Surge table, fifty results, zero refunds. Find it under Rollable Tables.",
  "Good news, DM: the Wild Magic Surge table now exists. Bad news, sorcerer: the Wild Magic Surge table now exists."
];

/** Notification when no wild magic table can be found. PLAIN TEXT. */
const noTable = [
  "No Wild Magic Surge table found. The wheel spun in an empty room. It was very sad.",
  "SYSTEM NOTICE: I can't find a Wild Magic Surge table. A GM can create one from the module settings.",
  "Where's the table? This world has no Wild Magic Surge table, and a wheel without one is just a fancy plate.",
  "No wild magic table, no wheel. A GM can make one in the Wheel of Wild Magic module settings.",
  "The wheel is ready, the audience is seated, and there is no Wild Magic Surge table. Awkward.",
  "Table not found. Either nobody made a Wild Magic Surge table or it's hiding. Check the table names in the module settings.",
  "No Wild Magic Surge table here. The show must go on, but apparently not today. Ask your GM to create one.",
  "SYSTEM ERROR: Chaos source missing. Create a Wild Magic Surge table (module settings) and try again."
];

/** Shown to someone whose skip-the-wheel setting is on. PLAIN TEXT. */
const skipWheel = [
  "You skipped the wheel. The result will be in chat shortly. The audience is booing.",
  "Skipping the wheel? Fine. Read about it in chat like some kind of scholar.",
  "Wheel skipped. Coward Mode engaged. I'm not angry, just disappointed. And a bit angry.",
  "You're missing the spin. It's beautiful. There are tears. The result will turn up in chat.",
  "SYSTEM NOTICE: Viewer has opted out of the wheel. Viewer has been noted. Viewer has been judged.",
  "Spin hidden, as requested. The chat card will tell you what happened, minus all the drama.",
  "No wheel for you. You chose this. The chat card is on its way.",
  "Skipping the wheel again? Our ratings team would like a word. Check chat in a moment.",
  "The wheel is spinning without you. It didn't even notice you weren't there. (It noticed.)",
  "Fine. Have your result without the spectacle. It's coming to chat. Joyless, but in chat."
];

/** Recursively freeze plain objects and arrays. */
function deepFreeze(value) {
  if ( value && (typeof value === "object") ) {
    for ( const child of Object.values(value) ) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/**
 * The System AI's generic commentary pools. Pick with `pick`/`pickSome`, then `fill` the placeholders.
 * Frozen: copy before mutating.
 */
export const QUIPS = deepFreeze({
  titles,
  intro,
  spinning,
  slowing,
  fakeOutCreep,
  fakeOutRollback,
  landed,
  repeat,
  streak,
  blind,
  checkFlavor,
  checkPass,
  checkFail,
  generic,
  sponsors,
  reactions,
  closeLabels,
  tableCreated,
  noTable,
  skipWheel
});

const HTML_ESCAPES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"};

/**
 * Escape a value for safe insertion into HTML.
 * @param {*} value     Anything; null and undefined become "", everything else goes through String().
 * @returns {string}
 */
export function escapeHTML(value) {
  if ( (value === null) || (value === undefined) ) return "";
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Replace `{key}` placeholders with HTML-escaped values. The template itself is trusted and left as-is,
 * placeholders whose key is not an own property of `vars` are left untouched, and replacement is single-pass
 * (inserted values are never re-scanned). A null/undefined value inserts "".
 * @param {string} template                  e.g. "Spin it for <strong>{name}</strong>!"
 * @param {Record<string, *>} [vars={}]       e.g. {name: "Bob"}
 * @returns {string}
 */
export function fill(template, vars = {}) {
  if ( (template === null) || (template === undefined) ) return "";
  const values = vars ?? {};
  return String(template).replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(values, key) ? escapeHTML(values[key]) : match;
  });
}

/**
 * A random index in [0, length), robust to an rng that returns 1, a negative or a non-number.
 * @param {number} length
 * @param {() => number} rng
 * @returns {number}
 */
function randomIndex(length, rng) {
  return Math.min(length - 1, Math.floor(unit(rng) * length));
}

/** One rng draw clamped to [0, 1). */
function unit(rng) {
  const r = Number(rng());
  if ( !Number.isFinite(r) || (r < 0) ) return 0;
  return Math.min(r, 1 - Number.EPSILON);
}

/**
 * A random element of a list.
 * @template T
 * @param {T[]} list
 * @param {() => number} [rng=Math.random]   Returns a number in [0, 1).
 * @returns {T|undefined}                     undefined for an empty (or non-array) list.
 */
export function pick(list, rng = Math.random) {
  if ( !Array.isArray(list) || !list.length ) return undefined;
  return list[randomIndex(list.length, rng)];
}

/**
 * Up to `n` distinct elements of a list, in random order (partial Fisher-Yates on a de-duplicated copy).
 * @template T
 * @param {T[]} list
 * @param {number} n                          How many to take; clamped to [0, number of distinct elements].
 * @param {() => number} [rng=Math.random]    Returns a number in [0, 1).
 * @returns {T[]}                              A new array; [] for an empty list, a non-array or n <= 0.
 */
export function pickSome(list, n, rng = Math.random) {
  if ( !Array.isArray(list) ) return [];
  const pool = [...new Set(list)];
  const count = Math.min(pool.length, Math.max(0, Math.floor(Number(n)) || 0));
  for ( let i = 0; i < count; i++ ) {
    const j = i + randomIndex(pool.length - i, rng);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const VIEWERS_MIN = 150000;
const VIEWERS_MAX = 4000000;
const GROWTH_MIN = 1.05;
const GROWTH_MAX = 1.6;

/**
 * Fake live viewer counts for the "LIVE" badge: the counter animates from `start` to `end`.
 * `start` is log-uniform in [150 000, 4 000 000), so most shows draw "only" hundreds of thousands;
 * `end` is 5-60% higher than `start`.
 * @param {() => number} [rng=Math.random]   Returns a number in [0, 1).
 * @returns {{start: number, end: number}}   Integers, end > start.
 */
export function viewerCounts(rng = Math.random) {
  const start = Math.min(VIEWERS_MAX - 1,
    Math.floor(VIEWERS_MIN * Math.pow(VIEWERS_MAX / VIEWERS_MIN, unit(rng))));
  const growth = GROWTH_MIN + ((GROWTH_MAX - GROWTH_MIN) * unit(rng));
  const end = Math.min(Math.floor(start * GROWTH_MAX),
    Math.max(Math.ceil(start * GROWTH_MIN), Math.round(start * growth)));
  return {start, end};
}
