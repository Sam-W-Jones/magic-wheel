// Wild Magic Surge entries 01-02 to 49-50: wheel labels, tones, icons and the System AI's commentary.
/** @type {SurgeEntry[]} */
export const SURGES_LOW = [
  {
    range: [1, 2],
    label: "SURGE SEASON PASS",
    tone: "chaos",
    icon: "fa-solid fa-arrows-rotate",
    lines: [
      "Congratulations, Crawler {name}! You have been renewed for <strong>ten more episodes</strong>. The network is thrilled. The network's insurance department has stopped answering its phone.",
      "Most people get one wild magic surge. You got a <em>subscription</em>. It renews every six seconds, and the cancel button is just a drawing of a cancel button.",
      "The Wheel will see you at the start of each of your turns for the next minute. It has cleared its schedule. It has never cleared its schedule for <em>anyone</em>.",
      "The only rule standing between you and an infinite loop is 'ignore this result on later rolls'. The System has filed a formal complaint against that rule.",
      "If {name} lands Fireball on turn three and Fireball again on turn seven, that is not a bug. That is a two-part finale.",
      "{user}, please keep the d100 handy. And your character sheet. And a pencil. And an eraser. Mostly the eraser."
    ],
    achievement: {
      title: "Renewed Against Medical Advice",
      text: "Turned one bad decision into a recurring segment. The network has picked {name} up for a full minute, which in sorcerer years is a long and distinguished career."
    },
    box: {
      tier: "Legendary",
      contents: "Up to ten (10) more wild magic surges, one per turn, pre-wrapped in anxiety. Non-refundable. Non-transferable. Non-negotiable."
    }
  },
  {
    range: [3, 4],
    label: "SEE INVISIBLE",
    tone: "good",
    icon: "fa-solid fa-glasses",
    lines: [
      "For the next minute, you can see invisible creatures. Most of them are fine. One of them has been standing very close to you for three sessions and would like to explain.",
      "The invisible thing in the corner has just realised you can see it. It is now waving, as if it was always waving. Wave back. Let it keep its dignity. One of you should.",
      "Invisible rogues within line of sight, please report to {name} for public embarrassment. You know who you are. Now so does everyone.",
      "Invisible creatures have no idea you can see them. You could use this wisely. Or you could point and scream. Pointing and screaming tests <em>extremely</em> well with our audience.",
      "HOUSE RULE REMINDER: The System's cameras are also invisible. Please stop staring directly into them. It's unprofessional and it's ruining the shot.",
      "Line of sight is still required, so whatever is invisible behind that wall gets to stay a mystery. The System prefers it that way. The System knows what's back there."
    ],
    box: {
      tier: "Bronze",
      contents: "One (1) invisible prize. You can see it for the next minute. After that, you'll have to take the System's word for it."
    }
  },
  {
    range: [5, 6],
    label: "SURPRISE MODRON",
    tone: "weird",
    icon: "fa-solid fa-cube",
    lines: [
      "A creature of perfect order has been summoned by pure chaos. It is already filling out an incident report. The incident is {name}.",
      "The modron would like to know which form you used to summon it. There is no form. The modron has begun drafting the form.",
      "Please welcome our guest from the plane of absolute law! It has been here six seconds and has already inventoried the party. The rogue's pockets have been emptied onto the floor and labelled 'S, for Stolen'.",
      "Modrons march across the planes once every 289 years. This one got a one-minute side gig instead and has filed a grievance with its supervisor, who is a slightly bigger shape.",
      "The modron is controlled by the DM. The DM is smiling. The System suggests you take one polite step to the left, for no particular reason.",
      "{user}, if the modron starts counting, do not interrupt it. It started counting before your table was built and it is very close to the end."
    ],
    achievement: {
      title: "Filed Under Miscellaneous",
      text: "Became the first entry in a modron's 'Miscellaneous' folder in eleven thousand years. It had to invent the folder for {name}. It will never forgive you."
    }
  },
  {
    range: [7, 8],
    label: "FIREBALL (ON YOU)",
    tone: "chaos",
    icon: "fa-solid fa-fire-flame-curved",
    lines: [
      "This fireball is brought to you by <strong>Ember and Ash Mutual</strong>: <em>We cover acts of gods, not acts of sorcerers.</em> Crawler {name}, your claim has already been denied.",
      "Usually the sorcerer is the one who gets to shout 'everybody duck'. Today, {name} is the thing everybody is ducking <em>from</em>.",
      "Dexterity save for half. The System would like to point out that half a fireball is still, legally, a fireball.",
      "SYSTEM NOTICE: Anyone within 20 feet of {name} has been reclassified from 'ally' to 'kindling'. Please update your character sheets.",
      "Good news: Fireball doesn't ignite things that are being worn, so the outfit survives. {name}'s eyebrows were not part of that negotiation.",
      "{user}, you rolled one die and set your own character on fire. The System isn't judging. The System is rewinding it in slow motion."
    ],
    achievement: {
      title: "Self-Starter",
      text: "Lit yourself on fire with no outside help whatsoever. Management loves initiative. Management is watching from a safe distance."
    },
    box: {
      tier: "Bronze",
      contents: "One (1) soothing aloe vera plant. It was within 20 feet of you. Please enjoy its ashes."
    },
    extra: async ctx => {
      const r = await ctx.roll("8d6", {label: "Fireball (fire damage)"});
      if ( !Number.isFinite(Number(r?.total)) ) return "The System dropped its d6s. All eight of them. Roll 8d6 fire damage yourself, Dexterity save for half.";
      const shown = r.html || String(r.total);
      return `To save time at the funeral, the System pre-rolled the fire damage: ${shown}. Dexterity save for half, and yes, that includes ${ctx.name || "you"}.`;
    }
  },
  {
    range: [9, 10],
    label: "7 MAGIC MISSILES",
    tone: "good",
    icon: "fa-solid fa-wand-sparkles",
    lines: [
      "Seven glowing darts that cannot miss. The System reviewed {name}'s attack history, and these are now officially the most reliable thing in {name}'s life.",
      "Magic Missile at 5th level: seven darts, no attack roll. Finally, a way to contribute to combat without anyone watching you roll a d20 off the table.",
      "Seven darts at 1d4 + 1 each: fourteen to thirty-five force damage, guaranteed. The System has never seen the word 'guaranteed' this close to {name}'s name before. It looks wrong.",
      "Split the darts however you like. One each for seven enemies is like handing out party favours, if the party favours were violence.",
      "PSA: Magic Missile cannot miss. It is not a challenge. Stop aiming. Stop squinting. Put the tongue back in.",
      "The only thing that stops this is the Shield spell, and the System has personally sent a memo to every wizard in the dungeon letting them know you're coming."
    ]
  },
  {
    range: [11, 12],
    label: "GROWTH SPURT?",
    tone: "weird",
    icon: "fa-solid fa-ruler-vertical",
    lines: [
      "A height adjustment, live on air, with no warning and no undo. The System's tape measure has been enchanted for the occasion. It rounds against you.",
      "Odd numbers shrink, even numbers grow. Finally, a use for the math you skipped at wizard school. Oh, wait. You're a sorcerer. You skipped school entirely.",
      "There is no duration listed. The System checked. This isn't a surge. This is just who you are now.",
      "Armor fit is no longer guaranteed. Doorframes have been notified. Your tailor has been sent a fruit basket and an apology.",
      "Ten inches is the difference between 'heroic stature' and 'needs a step stool'. The Wheel just decided which side of that line {name} stands on. Literally stands.",
      "Condolences to whoever used to be the tall one in this party. Or the short one. Identities are fragile. The System loves that for you."
    ],
    box: {
      tier: "Silver",
      contents: "One (1) pair of stilts and one (1) shovel. The System didn't know which way this would go, so it packed both and charged you for both."
    },
    extra: async ctx => {
      const r = await ctx.roll("1d10", {label: "Height change (inches)"});
      if ( !Number.isFinite(Number(r?.total)) ) return "The System's d10 rolled under the couch. Roll 1d10 yourself: odd, you shrink; even, you grow.";
      const n = Math.abs(Math.round(Number(r?.total))) || 0;
      const shown = r?.html || String(n);
      const inches = n === 1 ? "1 inch" : `${n} inches`;
      const who = ctx.name || "the crawler";
      if ( n % 2 ) {
        const quip = n === 1 ? "Nobody will notice. The System noticed." : (n >= 7 ? "Your boots are now roomy sleeping bags." : "Please lower your expectations to match.");
        return `The System rolled ${shown}. Odd: ${who} <strong>shrinks ${inches}</strong>. ${quip}`;
      }
      const quip = n >= 8 ? "Mind the chandeliers. And the ceiling. And the sky." : "Mind the chandeliers.";
      return `The System rolled ${shown}. Even: ${who} <strong>grows ${inches}</strong>. ${quip}`;
    }
  },
  {
    range: [13, 14],
    label: "SELF-CONFUSION",
    tone: "chaos",
    icon: "fa-solid fa-face-dizzy",
    lines: [
      "Confusion, centered on {name}. Everyone within 10 feet makes a Wisdom saving throw, including {name}, who the System suspects has been failing this particular save since birth.",
      "Each turn, the confused roll a d10 to decide what they do. It's a tiny random table inside your random table. The System adores a sequel.",
      "Confusion requires concentration, so {name} is now concentrating very, very hard on being confused. Method acting at its finest.",
      "TERMS AND CONDITIONS: Friendly fire caused by confused crawlers is covered by the waiver you signed. You don't remember signing it. That tracks.",
      "The party would like a word with {name}. Unfortunately, on a 7 or 8 that word might be a sword.",
      "Viewers at home, play along! Take a sip of water every time someone in the blast zone spends their whole turn doing absolutely nothing. Stay hydrated. This could take a while."
    ],
    achievement: {
      title: "Ground Zero for Bad Ideas",
      text: "Emitted a 10-foot cloud of bad decisions and stood dead in the middle of it. The System has rarely seen leadership like this."
    }
  },
  {
    range: [15, 16],
    label: "TROLL LITE",
    tone: "good",
    icon: "fa-solid fa-heart-pulse",
    lines: [
      "Five hit points at the start of every turn for a minute. That's up to fifty free hit points. The System ran the numbers and is deeply disappointed in them.",
      "A troll regenerates 10 hit points a turn. You get 5. Same great taste, half the troll. And no special weakness to fire. Well. No <em>new</em> one.",
      "MEMO TO ALL MONSTERS: Crawler {name} is temporarily inconvenient to kill. Please adjust your expectations and your number of attacks.",
      "A healing result? On <em>this</em> show? Somebody in production is getting fired, and the System is looking directly at the Wheel.",
      "This regeneration is sponsored by <strong>Troll-Grade Skincare</strong>: <em>Grows back what you lose.</em> Side effects include smelling faintly of moss and a sudden fear of torches.",
      "Regeneration only shows off if you're taking damage. So go on. Get hit a little. For the content.",
      "A moment of silence for the cleric, whose entire job has been automated for a full minute. It's a tough economy out there."
    ],
    box: {
      tier: "Silver",
      contents: "A coupon for one (1) free hit point at any participating temple. Expires at the start of your next turn."
    }
  },
  {
    range: [17, 18],
    label: "FEATHER BEARD",
    tone: "weird",
    icon: "fa-solid fa-feather",
    lines: [
      "{name} now sports a long, luxurious beard made entirely of feathers. It stays until you sneeze. The System has ordered three tons of pepper. For unrelated reasons.",
      "WARNING: This beard is a <em>pressurized</em> cosmetic. Do not sneeze near open flames, small children, or the dwarf, who is already furious about this.",
      "Rate your beard! Tap once for 'majestic', twice for 'molting'. If you're allergic to feathers, do not tap at all. Just brace.",
      "The druid wants to know if birds will nest in it. The System also wants to know. Please stand very still in a forest for the next hour.",
      "The betting pool on what finally sets it off is open: dust, pollen, pepper, or the wizard's cat. The cat has been briefed. The cat is walking over.",
      "When the sneeze happens, and it will happen, the System expects a full report. Sound effects. Trajectory. Casualties."
    ],
    achievement: {
      title: "Ticking Time Beard",
      text: "Your face is now a feather-based explosive with a sneeze trigger. The System has notified the cleaning staff and every cat in the dungeon."
    },
    box: {
      tier: "Gold",
      contents: "One (1) pillow, stuffed with your own beard. Pre-order only. Ships the moment you sneeze."
    }
  },
  {
    range: [19, 20],
    label: "GREASE TRAP",
    tone: "bad",
    icon: "fa-solid fa-oil-can",
    lines: [
      "Grease, centered on {name}. Dexterity saving throw. The System has seen {name}'s Dexterity score and has already cued the sound effect.",
      "The 10-foot square around {name} is now difficult terrain. {name} has always been difficult company, so this is mostly a formality.",
      "For the next minute: walking in requires a save, ending your turn there requires a save, and keeping your dignity requires a miracle.",
      "Have you been greased by your own spell? <strong>Pratfall and Partners, Attorneys at Law</strong> want to hear from you! You may be entitled to nothing.",
      "By the rules, grease isn't flammable, and the System is contractually forbidden from suggesting otherwise. The System is only pointing out that the fire mage looks <em>very</em> interested.",
      "{user}, describe exactly how {name} falls over. Be specific. The audience was promised a cartwheel."
    ],
    achievement: {
      title: "Self-Basting",
      text: "You coated yourself in grease in front of a live audience. The System is not saying you look like a holiday ham. The audience is saying it. Loudly."
    }
  },
  {
    range: [21, 22],
    label: "RIGGED SAVES",
    tone: "good",
    icon: "fa-solid fa-scale-unbalanced",
    lines: [
      "For the next minute, the next spell you cast that calls for a saving throw gets to cheat. Officially. In triplicate. The System notarized it personally.",
      "Disadvantage on the save means whoever you target rolls two dice and keeps the worse one, which is how {name} has been living all along. Now somebody else gets a turn.",
      "Spend it on the dragon and the dragon just burns a Legendary Resistance and succeeds anyway. Spend it on a goblin and you've wasted it on a goblin. The System loves a no-win scenario.",
      "FINE PRINT: It triggers on the very next spell with a saving throw, cantrips included. Cast Poison Spray by accident and the System will put it in the blooper reel.",
      "Our betting markets have shifted. The odds on '{name} actually lands a Hold Person' have improved from 'tragic' to merely 'terrible'.",
      "Somewhere a monster is about to roll a natural 20 on its save, and then a 2, and the System is going to replay the face it makes forever."
    ],
    box: {
      tier: "Platinum",
      contents: "One (1) set of loaded dice. They're loaded against you, but it's the thought that counts."
    }
  },
  {
    range: [23, 24],
    label: "FEELING BLUE",
    tone: "weird",
    icon: "fa-solid fa-fill-drip",
    lines: [
      "{name}'s skin is now a vibrant shade of blue. Our color consultants call it 'Startled Lagoon'. Our color consultants are no longer allowed to name things.",
      "Only Remove Curse fixes this, so legally speaking you are now cursed with fashion. The System has seen worse curses. The System has <em>handed out</em> worse curses.",
      "Blue is a cool color. That's a nice change for {name}, because nobody has ever accused {name} of being cool before.",
      "Somewhere in this dungeon, a blue dragon has heard about the new look and would like to know if {name} is seeing anyone.",
      "Cleric, before you cast Remove Curse, please consider the content. Blueberry {name} is content. The viewers want at least three more episodes of blueberry.",
      "The merch department is thrilled. Blue {name} action figures ship next week. Regular {name} figures have been quietly melted down."
    ],
    achievement: {
      title: "Out of the Blue",
      text: "Your skin stays blue until somebody spends a 3rd-level spell slot on your vanity. The System has seen your party's spell slots. Get comfortable, {name}."
    }
  },
  {
    range: [25, 26],
    label: "FOREHEAD EYE",
    tone: "good",
    icon: "fa-solid fa-eye",
    lines: [
      "A third eye has opened on {name}'s forehead. It sees everything. It has already seen too much. Welcome to the show, little guy.",
      "Advantage on Perception checks that rely on sight. The System suggests pointing it at your own life choices. Advantage might help.",
      "DRESS CODE UPDATE: Hats now count as blindfolds. Please remove all hats, helmets and dramatic hoods for the next minute.",
      "The new eye is blinking out of sync with the other two. Viewers find it deeply unsettling. Engagement is through the roof. Keep doing that.",
      "A word from <strong>Beholder Optical</strong>: <em>Why stop at three?</em> Ask about our ten-eyestalk family plan.",
      "Somebody describe the forehead eye for the viewers. Color. Lashes. Whether it judges people. The System's eye judges people. They could be friends."
    ],
    achievement: {
      title: "Eye Contact Overachiever",
      text: "{name} can now make eye contact with three people at once. Nobody asked for this. Everybody noticed."
    }
  },
  {
    range: [27, 28],
    label: "EXPRESS CASTING",
    tone: "good",
    icon: "fa-solid fa-forward-fast",
    lines: [
      "For the next minute, all your one-action spells are bonus actions. The System has flagged this as a balance issue and will be nerfing you in the next patch.",
      "RULES LAWYER CORNER: Cast a spell as a bonus action and the only other spell you can cast that turn is a one-action cantrip. The System didn't write that rule. The System wishes it had.",
      "Spellcasting speed has been increased. Spellcasting accuracy remains at standard {name} levels.",
      "Drive-thru casting! Spells in under six seconds or your next one's free. Please pull forward to the next initiative slot.",
      "A bonus-action Fireball is still a Fireball, and the party is still standing next to you. The System mentions this for no reason. Please continue.",
      "{user}, you have one minute of double-speed casting. Please do not spend it reading spell descriptions out loud."
    ],
    achievement: {
      title: "Speedrun Strats",
      text: "Found a bonus-action exploit in the laws of magic. The System has logged the bug and will patch it in exactly one minute."
    }
  },
  {
    range: [29, 30],
    label: "POOF! (60 FT)",
    tone: "good",
    icon: "fa-solid fa-person-to-portal",
    lines: [
      "You may teleport up to 60 feet to any unoccupied space you can see. The System recommends 'away'. The System always recommends 'away'.",
      "A free 60-foot teleport, and you get to pick where? The System has checked this for traps three times. It's clean. The System is upset about it.",
      "Per your contract, 'unoccupied' means unoccupied. Teleporting into a wall, a monster, or another crawler's personal space is a breach, and the System will be keeping the deposit.",
      "Crawlers who teleport into the middle of the enemy and then ask 'why is everyone here' get their own segment. It's called <em>Why Is Everyone Here</em>. It's our most popular segment.",
      "The vanishing part was lovely. Seven out of ten. Next time, try leaving behind a puff of smoke and a lingering sense of menace.",
      "{user}, the whole table is watching you pick a square. Pick it like you've ever made a good decision before."
    ]
  },
  {
    range: [31, 32],
    label: "ASTRAL VACATION",
    tone: "weird",
    icon: "fa-solid fa-user-astronaut",
    lines: [
      "{name} has been shipped to the Astral Plane until the end of their next turn. It's a vast silver void where nobody ages and nothing happens. Basically the System's waiting room.",
      "While Crawler {name} is away, the party will be graded on how much they miss them. Early results are... inconclusive.",
      "Please enjoy your complimentary astral getaway. Do not feed the githyanki. Do not make eye contact with the githyanki. Do not mention that you know any githzerai.",
      "Out there you move three feet per point of Intelligence. The System has dispatched a rescue barge for {name}. It should arrive in about a week.",
      "{user}, you get a turn off. Stretch. Grab a snack. Your character is floating in an infinite void and honestly has never looked more relaxed.",
      "You'll return to the same spot, or the nearest free one if somebody took it. That's right: the party has under twelve seconds to replace you. The System believes in them."
    ],
    achievement: {
      title: "Out-of-Body, Out-of-Office",
      text: "Auto-reply: {name} is currently on the Astral Plane and will respond to your attacks at the end of their next turn."
    }
  },
  {
    range: [33, 34],
    label: "MAXIMUM DAMAGE",
    tone: "good",
    icon: "fa-solid fa-gauge-high",
    lines: [
      "The next damaging spell you cast this minute deals <strong>maximum damage</strong>. No dice. Just numbers. The kind of numbers that make DMs go very quiet.",
      "Every die gets to land on its highest face. Your dice have never felt this. Please let them enjoy it. They've had a hard life.",
      "Before anyone asks: healing spells don't count. Someone always asks. Usually the cleric. Usually with a hopeful little face.",
      "It's the next <em>damaging</em> spell, not the next good one. If that turns out to be a cantrip, the System will max out your Fire Bolt with all the solemn dignity it deserves.",
      "{user}, do not save this for the perfect moment. The perfect moment is now. It was always now. It's slipping away. It's gone. Kidding, you still have 54 seconds.",
      "The monsters are demanding a re-spin. Denied. The System never sides with the monsters. Out loud."
    ]
  },
  {
    range: [35, 36],
    label: "AGE ROULETTE",
    tone: "weird",
    icon: "fa-solid fa-hourglass-half",
    lines: [
      "Up to ten years, in either direction, with no paperwork. Somewhere, a birthday cake is quietly adjusting its candles.",
      "Odd, younger. Even, older. Either way, your birthday is now a legal grey area.",
      "Yes, there's a minimum age of one year old. That rule exists because somebody needed it. The System still has the footage. Adorable. Worst combat round ever filmed.",
      "For the elves watching at home, this is a rounding error. For the humans, it's a midlife crisis delivered by express courier.",
      "{user}, please update the age on {name}'s character sheet. You know, the number you made up in four seconds during session zero. It's a different made-up number now.",
      "A whole decade of character development, skipped or rewound in an instant. The writers' room is furious. The writers' room is one goblin. The goblin is furious."
    ],
    achievement: {
      title: "Unreliable Birth Certificate",
      text: "Every official document {name} owns is now a lie. Please report to your nearest bureaucrat for re-processing. Bring snacks. Bring a will."
    },
    extra: async ctx => {
      const r = await ctx.roll("1d10", {label: "Age change (years)"});
      if ( !Number.isFinite(Number(r?.total)) ) return "The System's d10 has wandered off to find itself. Roll 1d10 yourself: odd is younger, even is older.";
      const n = Math.abs(Math.round(Number(r?.total))) || 0;
      const shown = r?.html || String(n);
      const years = n === 1 ? "1 year" : `${n} years`;
      const who = ctx.name || "the crawler";
      if ( n % 2 ) return `The System rolled ${shown}. Odd: ${who} is <strong>${years} younger</strong> (but never under 1 year old). Please hand back any wisdom you picked up in that time.`;
      return `The System rolled ${shown}. Even: ${who} is <strong>${years} older</strong>. The System got you a cane. Happy birthdays.`;
    }
  },
  {
    range: [37, 38],
    label: "SCARED FLUMPHS",
    tone: "weird",
    icon: "fa-solid fa-squid",
    lines: [
      "Flumphs have arrived! Gentle little jellyfish things from the Underdark. They're frightened of {name}. They've sensed what's in {name}'s head, so honestly, fair.",
      "Please do not flip the flumphs. A flumph knocked prone can land upside down and get stuck there. Do not do it. The System will make it the season trailer if you do.",
      "These are some of the most harmless creatures in the multiverse, and they are terrified of you. Sit with that, {name}. Sit with it for a long time.",
      "Reminder: flumphs come with a Stench Spray. Terrifying the stinky pancakes was, in hindsight, a choice.",
      "Flumphs speak telepathically, so the System has subtitled them for viewers at home. Translation: 'please no', 'please no', 'is that a sorcerer', 'please no'.",
      "They're controlled by the DM, so they'll do whatever is funniest. They're frightened, so whatever is funniest will happen <em>away</em> from you. Probably."
    ],
    achievement: {
      title: "Scourge of the Harmless",
      text: "You are the monster that good-natured psychic jellyfish tell their children about. The System is so, so proud of you, {name}."
    },
    extra: async ctx => {
      const r = await ctx.roll("1d6", {label: "Flumphs"});
      if ( !Number.isFinite(Number(r?.total)) ) return "The System lost count of the flumphs. They won't hold still. Roll 1d6 yourself.";
      const n = Math.max(0, Math.round(Number(r?.total)) || 0);
      const shown = r?.html || String(n);
      const who = ctx.name || "you";
      if ( n <= 1 ) return `Flumph count: ${shown}. Just one, very nervous flumph, and it will be having nightmares about ${who} for years.`;
      if ( n >= 6 ) return `Flumph count: ${shown}. That's a full flumph choir, and it is humming in terror at ${who}.`;
      return `Flumph count: ${shown}. That's ${n} trembling flumphs who will be having nightmares about ${who} for years.`;
    }
  },
  {
    range: [39, 40],
    label: "FREE HIT POINTS",
    tone: "good",
    icon: "fa-solid fa-kit-medical",
    lines: [
      "You regain 2d10 hit points, somewhere between 'a nice tip' and 'an actual paycheck'. The Wheel is generous today. The Wheel will be collecting interest.",
      "Hit points can't go over your maximum, so if {name} was already topped up, the overflow has been donated to the System's retirement fund. Thank you for your service.",
      "Not a potion, not a prayer, just the Wheel deciding {name} could use a hug. Do not get used to hugs.",
      "Brought to you by <strong>Second Wind Spring Water</strong>: <em>It's just water, but a fighter breathed on it.</em>",
      "Half the audience bet on {name} going down this round. They are demanding refunds. The System has issued them in full, out of {name}'s purse.",
      "The System rolled the healing for you. If you'd rather roll it yourself, the System is offended but understands. Trust issues are very common among contestants."
    ],
    extra: async ctx => {
      const r = await ctx.roll("2d10", {label: "Hit points regained"});
      if ( !Number.isFinite(Number(r?.total)) ) return "The System's healing dice are on their union-mandated break. Roll 2d10 yourself and try not to enjoy it.";
      const n = Math.round(Number(r?.total)) || 0;
      const shown = r?.html || String(n);
      let quip = "Not bad, not good. Extremely average, like most of your decisions.";
      if ( n <= 5 ) quip = "The Wheel calls this a tip. The audience calls it an insult.";
      else if ( n >= 16 ) quip = "The System is contacting the Wheel's manager about this.";
      return `The System pre-rolled your healing: ${shown} hit point${n === 1 ? "" : "s"}. ${quip}`;
    }
  },
  {
    range: [41, 42],
    label: "POTTED PLANT",
    tone: "bad",
    icon: "fa-solid fa-seedling",
    lines: [
      "Crawler {name} is now a potted plant. The System has placed you on a lovely sunny windowsill. Just kidding. You're in the middle of combat.",
      "While potted, you're incapacitated and vulnerable to all damage, so every hit counts double. The horticulture team describes the prognosis as 'decorative, but brief'.",
      "CARE INSTRUCTIONS: Water as needed. Do not water with acid. Do not let the barbarian 'water' you. Rotate weekly for even sunlight.",
      "Drop to 0 hit points and the pot breaks, and {name} comes tumbling out covered in soil in front of everyone. The System has asked the camera crew to get it from a low angle.",
      "The audience has voted on what kind of plant {name} is. Results: 61% fern, 30% sad cactus, 9% 'the one in every waiting room'.",
      "Talk to your plant, it helps them grow. {name} can't answer, which makes this the best conversation the party has had all session.",
      "{user}, plants don't take actions. Plants photosynthesize. Please describe your photosynthesis for the viewers, in as much detail as you can bear."
    ],
    achievement: {
      title: "Ficus Pocus",
      text: "{name} spent a round as a houseplant and contributed exactly as much as usual. The System calls that consistency."
    },
    box: {
      tier: "Gold",
      contents: "One (1) premium watering can. Plants cannot hold watering cans. The System knew that when it packed this box."
    }
  },
  {
    range: [43, 44],
    label: "BONUS BLINKS",
    tone: "good",
    icon: "fa-solid fa-person-walking-dashed-line-arrow-right",
    lines: [
      "For the next minute, you can teleport 20 feet as a bonus action. Teleporting doesn't provoke opportunity attacks, which the System knows because the monsters keep yelling about it.",
      "Crawler {name} now flickers around the battlefield like a badly buffering stream. The cameras can't keep up. Please slow down. No, don't.",
      "Twenty feet, every turn, no strings. The enemy has called it 'cheap' and 'unfair'. The System has bottled their tears and is selling them in the gift shop.",
      "The fighter has to walk around things. The rogue has to roll to hide. {name} just <em>stops being there</em>. The rest of the party has filed a joint complaint.",
      "It's a bonus action. The System knows you forget bonus actions exist. Everyone forgets bonus actions exist. For one minute, they exist.",
      "Personal space, redefined: {name} is now wherever they want to be and nowhere they're supposed to be. The tank would like to discuss formation."
    ]
  },
  {
    range: [45, 46],
    label: "HUMAN BALLOON",
    tone: "weird",
    icon: "fa-solid fa-balloon",
    lines: [
      "{name} is levitating. Straight up. Not sideways, not forward, just <em>up</em>, like a sad helium balloon at a birthday party nobody came to.",
      "Levitate only does up and down. To move sideways, push or pull against something fixed: a wall, a ceiling, or the last frayed threads of your dignity.",
      "Levitate is a concentration spell. Check with the DM about whatever you were concentrating on before. The System already knows. The System is giggling.",
      "Every archer in the room just got a target that bobs gently at a fixed height, like a carnival game. The prize is {name}.",
      "You'll rise up to 20 feet. The System did not measure the ceiling first. The System never measures the ceiling first. It's more fun that way.",
      "Somebody get a wind machine on {name}. Just a light breeze. It would be devastating, and the System would like to see it."
    ],
    box: {
      tier: "Bronze",
      contents: "One (1) ten-foot pole, for pushing off walls and ceilings. It is nine feet long. Returns are not accepted."
    }
  },
  {
    range: [47, 48],
    label: "RENTAL UNICORN",
    tone: "good",
    icon: "fa-solid fa-unicorn",
    lines: [
      "A unicorn has appeared beside {name}! It's controlled by the DM, so it's less 'your majestic steed' and more 'your majestic coworker who reports directly to management'.",
      "The unicorn is a rental. Please return it in the condition you found it. The System has already photographed every scratch on the horn.",
      "Unicorns are celestial guardians of all that is pure and good. This one is standing next to you out of contractual obligation.",
      "No, {name} cannot ride it. Unicorns don't do that for just anybody, and the System has made sure this one knows exactly who {name} is.",
      "The audience has gone feral. Unicorn ratings are through the roof. {name}'s ratings are holding steady at 'also there'.",
      "Feel free to ask the DM what the unicorn does. The System recommends groveling. Unicorns respond well to groveling. So do DMs."
    ],
    achievement: {
      title: "Upstaged by a Horse",
      text: "A legendary creature showed up and the camera immediately stopped pointing at {name}. Welcome to the supporting cast."
    }
  },
  {
    range: [49, 50],
    label: "BUBBLE MOUTH",
    tone: "bad",
    icon: "fa-solid fa-soap",
    lines: [
      "{name} cannot speak for the next minute. Pink bubbles come out instead. The party is calling it 'the best minute of the campaign'.",
      "No speech means no verbal components. Sorcerers with Subtle Spell, this is your moment. Everyone else, this is your mime career.",
      "The System has spent three seasons looking for a mute button for {name}. The Wheel found one in a single spin. The Wheel is getting a raise.",
      "Popping a bubble does not reveal what {name} tried to say. The bubbles are empty, much like {name}'s threats.",
      "The audience requests an inspiring speech. Go on, {name}. Rally the troops. In pink.",
      "{user}, the System cannot technically stop you from talking out of character. It can only glare. It is glaring. Bubbles only, please."
    ],
    achievement: {
      title: "Bubbly Personality",
      text: "For one glorious minute, {name} said nothing but pink bubbles, which the System has officially ranked as {name}'s best dialogue of the season."
    }
  }
];
