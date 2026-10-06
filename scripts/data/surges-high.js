// Wild Magic Surge entries 51-52 to 99-00: wheel labels, tones, icons and the System AI's commentary.

/** @type {SurgeEntry[]} */
export const SURGES_HIGH = [
  {
    range: [51, 52],
    label: "MISSILE PROOF",
    tone: "good",
    icon: "fa-solid fa-shield-halved",
    lines: [
      "Immunity to Magic Missile. The one spell in the multiverse that never misses has finally found something it can't hit, and that something is <em>you</em>. For sixty seconds. Savour it.",
      "Crawler {name} is now protected from the single most predictable thing a wizard can do. Next week: immunity to monologues.",
      "SYSTEM NOTICE: Every enemy wizard in range has been informed of your new immunity. Their backup plan is also Magic Missile. It is always Magic Missile.",
      "+2 AC. Somewhere out there, a skeleton archer just rolled exactly your old AC and missed, and he will never know why. That's the real magic: tiny, invisible spite.",
      "The shield is spectral, which means you can't sell it. We know. We already listed it. The buyer is very upset.",
      "Immunity applies to Magic Missile only. Not regular missiles. Not thrown furniture. Not the emotional damage of winning the most niche defensive buff on the table."
    ],
    achievement: {
      title: "Missile Intolerant",
      text: "Developed a sudden, total allergy to the most reliable spell ever written. Wizards have started a petition. It has eleven signatures and one of them is in crayon."
    }
  },
  {
    range: [53, 54],
    label: "STONE COLD SOBER",
    tone: "weird",
    icon: "fa-solid fa-wine-glass-empty",
    lines: [
      "Immune to intoxication for <em>days</em>. Not a minute. Not an hour. Days. This surge is going to outlive your next three tavern scenes and possibly a party member.",
      "Drink all you like, {name}. Nothing will happen. You are now a very expensive way to dispose of ale.",
      "A WORD FROM OUR SPONSOR: The Brewers' Guild would like {name} to know that their loyalty card has been suspended pending review.",
      "Congratulations, you are now the designated wagon driver for the foreseeable future. The party has already started ordering doubles.",
      "Would any dwarves in the audience please look away. The System is told this is how their scariest bedtime stories begin.",
      "Upside: you will remember every embarrassing thing your party does this week, in crisp, sober detail. Use it. Monetize it. We certainly will."
    ],
    box: {
      tier: "Bronze",
      contents: "One (1) glass of water, room temperature. The bartender who poured it is judging you, and so are we."
    },
    extra: async ctx => {
      const r = await ctx.roll("5d6", {label: "Days of sobriety"});
      const t = Number(r.total) || 0;
      const sting = t >= 24 ? "That's most of a month. The tavern is taking your portrait down."
        : (t <= 10 ? "Barely a week, and the dwarves are already planning a memorial."
          : "Plenty of time to find out what your party is like without the filter.");
      return `Sobriety sentence: ${r.html} days. ${sting}`;
    }
  },
  {
    range: [55, 56],
    label: "INSTANT BALD",
    tone: "bad",
    icon: "fa-solid fa-egg",
    lines: [
      "All of it. The table says 'your hair,' and the System has elected to read that broadly. Yes, the eyebrows. We're still deciding about the eyelashes.",
      "{name} is now four percent more aerodynamic. Your movement speed has been rebalanced accordingly. By zero.",
      "REPOSSESSION NOTICE: Your hair has been temporarily reclaimed. It will be returned within 24 hours, washed, folded, and with a note expressing our disappointment in your conditioner.",
      "Grows back in 24 hours. Do you know how many bald wizards would kill for that clause? The System does. It keeps a list. You're on it now, in the 'people to resent' column.",
      "Every torch in this corridor is now bouncing off {name}'s scalp. We have cancelled the lighting budget for the rest of the episode.",
      "A single forlorn hair is drifting down into a goblin's soup. He is going to complain to management. Management is the System. The System is siding with the goblin."
    ],
    achievement: {
      title: "Tactical Hairline Retreat",
      text: "Went from full head of hair to polished marble in under six seconds. The previous record was held by a wizard who read the wrong side of a scroll."
    }
  },
  {
    range: [57, 58],
    label: "MIDAS, BUT FIRE",
    tone: "chaos",
    icon: "fa-solid fa-fire-flame-curved",
    lines: [
      "Read the fine print with me: 'isn't being worn or carried by <em>another</em> creature.' Other people's trousers are safe. Your trousers are not. Your trousers are very much in play.",
      "Every door you open becomes a former door. Every rope you climb becomes a very short rope. Every spellbook you consult becomes a lesson in hubris.",
      "LEGAL: The System is not liable for arson committed during this minute. Arson committed outside this minute remains between you, your conscience, and the city watch.",
      "{name} has been granted the power of the gods' least responsible intern. Please keep your hands where the System can see them. Higher. Like that.",
      "The early favourite for 'first thing {name} sets on fire by accident' is their own component pouch, which is full of bat guano and sulfur. Those are Fireball components. Oh, this is going to be good.",
      "The camera crew has quietly moved back twenty feet. Not for any reason. Union rules."
    ],
    achievement: {
      title: "Hands-On Arsonist",
      text: "Set something on fire just by touching it, which the city watch insists still counts. Your fingerprints are now legally classified as a weapon."
    },
    box: {
      tier: "Gold",
      contents: "One (1) pair of oven mitts, which caught fire the moment you opened this box. Thank you for your participation."
    }
  },
  {
    range: [59, 60],
    label: "PARTIAL REFUND",
    tone: "good",
    icon: "fa-solid fa-receipt",
    lines: [
      "The System has refunded your <em>lowest</em> expended spell slot. Lowest. We are generous, {name}, not stupid.",
      "If you haven't spent any slots yet, you have won nothing. Absolutely nothing. A bold first for this program, and the audience loved it.",
      "So, to recap: you risked a Fireball to your own face for the chance to win back one Magic Missile. And it worked. Look at you. Living the dream.",
      "CUSTOMER SERVICE: Your return has been processed. Please allow zero to six seconds for delivery. We value your patronage, and by 'value' we mean 'monetize.'",
      "The magical equivalent of finding a copper piece in last winter's coat. The System has already charged you a silver finder's fee.",
      "Crawler {name}, the System has to ask: will you spend this slot wisely? No. No, you won't. We've seen your tape."
    ],
    achievement: {
      title: "Store Credit",
      text: "Received a full refund on the cheapest item in your cart. The Wheel thanks {name} for shopping with us and reminds them that all sales are final, except that one."
    }
  },
  {
    range: [61, 62],
    label: "INDOOR VOICE: OFF",
    tone: "weird",
    icon: "fa-solid fa-bullhorn",
    lines: [
      "{user}, the System cannot make <em>you</em> shout at the table for the next minute. The System can only make you feel like a coward if you don't.",
      "Verbal components just got a lot more verbal. Every monster on this floor now knows exactly which spell you're casting and how you feel about it.",
      "VOLUME SETTINGS UPDATED: {name}'s inner monologue has been disabled. Outer monologue has been set to MAXIMUM. Whispering has been deprecated.",
      "Great news for the party's rogue, who has always wanted a distraction this loud. Terrible news for the party's rogue, who was halfway through picking a lock.",
      "Now is the time to tell your party how you really feel. Loudly. Accurately. In front of the lich.",
      "THE SYSTEM ALWAYS TALKS LIKE THIS WHEN IT'S EXCITED, {name}. WELCOME TO THE CLUB. THE CLUB DOESN'T HAVE AN INDOOR VOICE EITHER."
    ]
  },
  {
    range: [63, 64],
    label: "FOG MACHINE",
    tone: "chaos",
    icon: "fa-solid fa-smog",
    lines: [
      "A twenty-foot-radius sphere of fog, centred on {name}. All the drama of a stage entrance with all the visibility of a closed coffin.",
      "Heavily obscured means everyone inside is effectively blinded, so advantage and disadvantage cancel out, so the DM is now looking it up. This is the most suspense we've had all episode.",
      "PRODUCER'S NOTE: The camera drones report zero visibility. We are now airing a three-minute montage of {name}'s worst decisions instead. If anything, we have too much footage.",
      "It's concentration, up to an hour. You could keep this fog going for a full hour. Nobody has ever concentrated on fog for an hour. Fog is the side salad of spells.",
      "Mood lighting achieved. Somebody cue the saxophone.",
      "Ah, the classic sorcerer escape plan: become impossible to see, and also unable to see. Half of a good idea, delivered with total confidence."
    ]
  },
  {
    range: [65, 66],
    label: "TRIPLE ZAP",
    tone: "good",
    icon: "fa-solid fa-bolt-lightning",
    lines: [
      "No save. No attack roll. Just 4d10 lightning, hand-delivered to up to three creatures of your choosing. Choose wisely. Or pettily. Pettily rates higher.",
      "{name} is now holding three lightning bolts and a list. The System would like to see the list. The System would like to <em>add to</em> the list.",
      "It says creatures <em>you choose</em>. It doesn't say enemies. The System isn't suggesting anything. The System is just reading the sentence very slowly while looking directly at the paladin.",
      "'Up to three.' You could choose fewer. You won't. We have never once seen a sorcerer choose fewer, and we have a very large archive.",
      "Thirty feet, three targets, zero paperwork. This is the most efficient feedback {name} has ever given anyone.",
      "HR NOTICE: Lightning damage dealt to party members will be logged as a 'creative disagreement.' Please do not contact HR. The System is HR."
    ],
    achievement: {
      title: "Lightning Struck Thrice",
      text: "Proved the old saying wrong three times in one turn, on purpose, with a smile. Meteorologists are furious."
    },
    extra: async ctx => {
      const r = await ctx.roll("4d10", {label: "Lightning damage"});
      const t = Number(r.total) || 0;
      const sting = t >= 30 ? "That's going to leave marks in the shape of your face."
        : (t <= 12 ? "That's not lightning, that's static cling. Pick targets who bruise easily."
          : "Respectable voltage. Pick your targets like it's a buffet.");
      return `The System pre-charged the bolts: ${r.html} lightning damage for each lucky winner. ${sting}`;
    }
  },
  {
    range: [67, 68],
    label: "SCAREDY-CAST",
    tone: "bad",
    icon: "fa-solid fa-face-grimace",
    lines: [
      "Not the scariest creature. The <em>nearest</em>. If that's the halfling, congratulations, you are now terrified of the halfling. He has never been feared before. He is savouring every second.",
      "Frightened: disadvantage on attack rolls and ability checks while you can see it, and you can't willingly move any closer. Which, the System notes, is how {name} already handles commitment.",
      "{user}, please act out the terror. Full commitment. The audience would like to see {name} hide behind somebody shorter than {name}.",
      "Your fear is valid, Crawler {name}. Your fear is also aimed at someone who was minding their own business, eating a sandwich.",
      "Only until the end of your next turn. A short, intense phobia. Like a summer fling, but you're hiding behind a barrel.",
      "If the nearest creature is the monster, this is a perfectly reasonable reaction. If it's your familiar, we will be replaying it in the season finale."
    ],
    box: {
      tier: "Bronze",
      contents: "One (1) night-light, lovingly sculpted in the exact likeness of the creature you're frightened of. It glows. It watches."
    }
  },
  {
    range: [69, 70],
    label: "EVERYONE VANISHES",
    tone: "chaos",
    icon: "fa-solid fa-eye-slash",
    lines: [
      "Everyone within thirty feet is now invisible. The enemies. Your friends. You. The director has just thrown his headset across the room.",
      "This is the most expensive minute of television we have ever produced, and there is nothing on screen.",
      "Viewers at home are now watching an empty room full of sound effects. Engagement has never been higher. The System no longer understands its audience and has stopped trying.",
      "Here's the trick: it ends when a creature attacks or casts a spell. So the first person to do anything useful becomes the only visible thing in the room. Game theory, baby.",
      "The rogue in your party just quietly whispered 'finally.'",
      "{user}, please describe to the table what {name} does next. Be specific. Nobody can check."
    ],
    achievement: {
      title: "Radio Drama",
      text: "Turned an entire combat into an audio play. The sound effects department has never worked harder, and they would like {name} to know they hate it."
    }
  },
  {
    range: [71, 72],
    label: "RESIST EVERYTHING",
    tone: "good",
    icon: "fa-solid fa-user-shield",
    lines: [
      "Resistance to all damage. Everything hurts half as much for a minute. Emotionally, you're still on your own.",
      "Fire, cold, psychic, force, radiant, the DM's personal vendetta: all halved, rounded down. The rounding down is the System's favourite part. Pure spite, in your favour, for once.",
      "This is the good one, {name}. Do not waste it hiding behind the fighter. Go stand in front of something stupid.",
      "RATINGS UPDATE: Damage to {name} has been halved. Viewer interest in {name} has also been halved. The System needs you to understand what you are costing us.",
      "The DM just looked at the monster's damage, halved it, and made a little noise. The System recorded the noise. It's a ringtone now.",
      "One minute of being hard to kill. Your Constitution score is weeping with gratitude. It's been carrying you for years."
    ]
  },
  {
    range: [73, 74],
    label: "POISON RAFFLE",
    tone: "chaos",
    icon: "fa-solid fa-skull-crossbones",
    lines: [
      "Somebody within sixty feet is now poisoned. It's random. Statistically, it's your friend. It is always your friend.",
      "The System does not pick the victim. The System merely watches, with a bucket of popcorn, while fate does its job.",
      "Note the duration: <em>hours</em>. Plenty of time for the victim to sit quietly and think about who did this to them.",
      "Poisoned means disadvantage on attack rolls and ability checks. If it lands on the enemy, you're a genius. If it lands on the fighter, enjoy explaining why every swing he takes for the next few hours is your fault.",
      "The raffle is completely random. The System wants to stress that. The System did not rig it. If the System had rigged it, it would be <em>funnier</em>.",
      "{name} has just poisoned a stranger at random, which our legal team has asked us to describe as 'an unscheduled wellness event.'"
    ],
    box: {
      tier: "Silver",
      contents: "One (1) vial of antitoxin. Expiration date: last Tuesday. Smells faintly of a dare."
    },
    extra: async ctx => {
      const target = ctx.randomNearbyToken?.(60) ?? null;
      const who = target?.name ? `<strong>${target.name}</strong>` : "a random creature of the DM's choosing";
      const r = await ctx.roll("1d4", {label: "Hours poisoned"});
      const unit = Number(r.total) === 1 ? "hour" : "hours";
      return `The poison raffle has drawn ${who}, who is now poisoned for ${r.html} ${unit}. A round of applause, everyone. Not you. You did this.`;
    }
  },
  {
    range: [75, 76],
    label: "LIGHTHOUSE",
    tone: "chaos",
    icon: "fa-solid fa-sun",
    lines: [
      "{name} is now visible from the floor below. Hello to all our viewers on the floor below. Please stop waving.",
      "Any creature that ends its turn within five feet of you is blinded. That includes the cleric trying to heal you. <em>Especially</em> the cleric trying to heal you. He will have opinions.",
      "INTERNAL MEMO: The lighting department would like it on the record that this is the first time a contestant has been better lit than the host. Disciplinary action is pending.",
      "Melee enemies hate this one weird trick. Mostly because it blinds them.",
      "Thirty feet of bright light. Every moth within two miles just felt something stir deep in its heart.",
      "Stealth was always going to be difficult for you, Crawler {name}. Now you are a navigational landmark."
    ],
    box: {
      tier: "Silver",
      contents: "Three (3) pairs of sunglasses for your party. Count your party. Now count again. Somebody's going without. Call it team building."
    }
  },
  {
    range: [77, 78],
    label: "MAYBE SHEEP",
    tone: "bad",
    icon: "fa-solid fa-sheep",
    lines: [
      "Wool futures are up forty percent on the news. Analysts are calling it 'the {name} effect.'",
      "Wisdom save, Crawler {name}. Pass, and you're a sorcerer who nearly became a sheep, which is somehow less dignified. Fail, and you're the most powerful sheep in the dungeon. Low bar. Still a bar.",
      "OFFICIAL NOTICE: If {name} becomes a sheep, they will be referred to as 'the sheep' in all System communications for the remainder of the season. The badges have already been printed.",
      "Your party now has a sheep. Someone will say 'we could shear it,' someone else will say 'that's {name}!', and then everyone will think about it for slightly too long.",
      "Polymorph is concentration. <em>Your</em> concentration. You are now a sheep concentrating on remaining a sheep. Stay focused. Think sheepy thoughts.",
      "If the sheep drops to 0 hit points, {name} pops back out and the extra damage carries over. So the sheep is basically a fluffy bonus health bar. Treat it with respect. Shear it with respect."
    ],
    achievement: {
      title: "Ewe Played Yourself",
      text: "Cast Polymorph on yourself and lost the argument. {name}'s stat block now contains the word 'fleece,' and nothing can ever undo that."
    }
  },
  {
    range: [79, 80],
    label: "FLOWER POWER",
    tone: "weird",
    icon: "fa-solid fa-flower-tulip",
    lines: [
      "Mechanically, this does nothing. Aesthetically, it does everything. The System respects a contestant who commits to a look.",
      "There is a barbarian nearby trying very hard to look menacing while a butterfly sits on his axe. He has never been less frightening. He has never been more loved.",
      "DISCLAIMER: The butterflies are illusory. The petals are illusory. The audience's delight, however, is real, and has already been sold to advertisers.",
      "For one minute this combat is a wedding. Someone at the back is crying. It's the goblin. He has always wanted a nice day out.",
      "{user}, you spun a wheel of pure chaos and won <em>ambience</em>. Frame this moment. Mention the butterflies in every sentence. Make it everyone's problem.",
      "For one minute, {name} is the prettiest thing in the dungeon. The System has reviewed the competition: a gelatinous cube and a pile of bones. Still. A win is a win."
    ],
    box: {
      tier: "Platinum",
      contents: "One (1) illusory butterfly. It is beautiful. It is not real. Neither, frankly, is the Platinum."
    }
  },
  {
    range: [81, 82],
    label: "FIGHTER ENVY",
    tone: "good",
    icon: "fa-solid fa-forward-fast",
    lines: [
      "One additional action, immediately. Every fighter watching just felt their Action Surge become slightly less special.",
      "The key word is <em>immediately</em>. Not after you check your spell list. Not after you ask how far away the door is. The clock is ticking, and the clock is the DM's face.",
      "Two actions in a row. This is officially the most productive {name} has been all session.",
      "Let's be honest: you'll use this to cast another leveled spell, roll a 1 on the surge check, and come right back here. The System has kept the wheel warm for you.",
      "You could Dash. Nobody has ever been impressed by a Dash. But you could.",
      "PATCH NOTES: Action economy temporarily broken for {name}. Expected fix: end of this turn. Known issue: {user} is still deciding."
    ],
    achievement: {
      title: "Two Actions, Zero Ideas",
      text: "Received a free action and spent eleven real-world seconds deciding what to do with it. The audience timed it. {user} owes the table those seconds."
    }
  },
  {
    range: [83, 84],
    label: "PARTY LEECH",
    tone: "chaos",
    icon: "fa-solid fa-droplet",
    lines: [
      "Every creature within thirty feet. Friends, foes, the horse. You have just invoiced the entire neighbourhood in life force.",
      "TRANSACTION COMPLETE: Hit points have been moved from 'everyone near {name}' to '{name}.' A small handling fee has been deducted from your friendships.",
      "The more creatures you're standing near, the more you heal. Finally, Crawler {name}, a reason to be popular.",
      "The System would like to thank the party for their generous donation. They didn't mean to donate. That's what makes it special.",
      "In a crowd, this is a full heal. Standing alone, it's one sad little paper cut. The System would like {name} to reflect on which one it was, and why.",
      "Standing next to a sorcerer has never before qualified as a blood drive. History is being made, one victim at a time."
    ],
    achievement: {
      title: "Emotional Vampire (Literal)",
      text: "Drained the life out of everyone in the vicinity, which the party says is consistent with {name}'s personality and frankly overdue."
    },
    extra: async ctx => {
      const r = await ctx.roll("1d10", {label: "Necrotic damage"});
      const t = Number(r.total) || 0;
      const sting = t <= 1 ? "A love tap from beyond the grave."
        : (t >= 9 ? "Your friends are going to remember this one."
          : "Count heads, multiply, and try not to look smug.");
      return `Everyone within 30 feet takes ${r.html} necrotic damage, and ${ctx.name || "the sorcerer"} heals that much per victim. ${sting}`;
    }
  },
  {
    range: [85, 86],
    label: "MORE OF YOU",
    tone: "good",
    icon: "fa-solid fa-clone",
    lines: [
      "Three illusory duplicates of {name}. The party asked for less of you. The System heard 'more.'",
      "Fan forums are already arguing over which {name} is the real one. The fakes are polling significantly higher.",
      "Each duplicate has AC 10 plus your Dexterity modifier and pops when it's hit. Think of them as three unpaid interns: loyal, decorative, extremely expendable.",
      "Every attack against you now has a chance to hit a fake you. At last, your fake personality has a body.",
      "No concentration required. You can keep the clones and cast something else. The System is impressed and, honestly, a little worried.",
      "The duplicates copy your every move, including that little thing you do with your hands when you lie. The DM has noticed. The DM has always noticed."
    ],
    achievement: {
      title: "Group Project of One",
      text: "Became four people at once, none of whom did any of the work. A perfect simulation of every group project in history."
    }
  },
  {
    range: [87, 88],
    label: "WHO GETS WINGS?",
    tone: "chaos",
    icon: "fa-solid fa-feather-pointed",
    lines: [
      "Fly on a random creature within sixty feet. Could be you. Could be the ogre. The ogre has never flown before. Look at his little face.",
      "Flying speed of sixty feet, up to ten minutes, concentration. If the lucky winner is your enemy, you are now spending your concentration keeping your enemy airborne. Sit with that.",
      "Friendly reminder: if your concentration breaks, whatever's up there comes back down. Gravity has sponsored this program since episode one.",
      "If it lands on the wizard, he will be insufferable about it for weeks. If it lands on you, <em>you</em> will be insufferable about it for weeks. There is no outcome where the party wins.",
      "Nothing sells like a confused monster discovering altitude. Ratings are cautiously optimistic.",
      "If the winner is the party's slowest member, they are now its fastest. If the winner is the dwarf, the System regrets to inform you he is never coming down."
    ],
    extra: async ctx => {
      const target = ctx.randomNearbyToken?.(60, {includeSelf: true}) ?? null;
      if ( !target?.name ) return "The flight lottery has picked a random creature within 60 feet of the DM's choosing. Please keep all arms and legs inside the sky.";
      if ( target.name === ctx.name ) return `The flight lottery has picked... <strong>${ctx.name}</strong>. Wonderful. The System was rooting for the ogre.`;
      return `The flight lottery has picked <strong>${target.name}</strong>. Up, up and away, whether they like it or not.`;
    }
  },
  {
    range: [89, 90],
    label: "GHOSTED",
    tone: "good",
    icon: "fa-solid fa-user-secret",
    lines: [
      "Invisible <em>and</em> inaudible. You are now the ideal dinner guest.",
      "BROADCAST ALERT: {name} has left the broadcast. Accounting is frantically checking whether we still have to pay them.",
      "Nobody can see or hear {name} for a minute. The party was asked how that feels. The party asked whether it can be extended.",
      "It ends if you attack or cast a spell. So it ends on your next turn. We both know it ends on your next turn.",
      "The broadcast has switched to thermal imaging. Viewers are now watching a warm smudge make poor decisions.",
      "Crawler {name}, now is a great time to sneak somewhere. Or to scream your honest opinion of the DM. Nobody will hear it. Except the System. The System hears everything."
    ],
    achievement: {
      title: "Ghosted Your Own Show",
      text: "Vanished from your own broadcast. Your fans are heartbroken. Your fan is heartbroken. We recounted."
    }
  },
  {
    range: [91, 92],
    label: "RESPAWN INSURANCE",
    tone: "good",
    icon: "fa-solid fa-recycle",
    lines: [
      "If you die in the next minute, you come back in a brand-new body. The System would like to stress that the dying part is still mandatory.",
      "Reincarnate does not promise your original species. It does promise an extremely awkward conversation with a party who liked your old face.",
      "POLICY TERMS: Coverage includes death. Coverage does not include your face, your height, your ears, or the matching tattoo you got with the fighter.",
      "Crawler {name}, the producers would like you to go and stand next to the dragon. No reason. Just stand there. Wave a little.",
      "A free return policy on your entire life, valid for sixty seconds. Please don't make us watch you test it. ... Okay. Test it.",
      "Reincarnate always builds a fresh <em>adult</em> body, so whatever happens, nobody is coming back as a baby. The System checked. The System was disappointed."
    ],
    achievement: {
      title: "Death, but Make It Optional",
      text: "Took out a sixty-second life insurance policy on {name}. The payout is a new body. The new body is not your choice. Read the policy."
    },
    extra: async ctx => {
      const r = await ctx.roll("1d100", {label: "Reincarnate (just in case)"});
      const t = Math.min(100, Math.max(1, Math.round(Number(r.total) || 77)));
      const [, race, sting] = [
        [4, "Dragonborn", "Scales and a breath weapon. Honestly? Upgrade."],
        [13, "Hill dwarf", "Shorter, sturdier, and suddenly very opinionated about ale."],
        [21, "Mountain dwarf", "Comes with a beard and medium armour. Mostly the beard."],
        [25, "Dark elf", "Sunlight sensitivity, free of charge."],
        [34, "High elf", "A free cantrip and an unearned sense of superiority."],
        [42, "Wood elf", "Faster, sneakier, more trees."],
        [46, "Forest gnome", "You can talk to squirrels now. They won't listen."],
        [52, "Rock gnome", "You'll build a clockwork toy that's more popular than you."],
        [56, "Half-elf", "A little of everything, mostly Charisma. The sorcerer in you approves."],
        [60, "Half-orc", "Relentless Endurance, so next time you might not even need this policy."],
        [68, "Lightfoot halfling", "Small, lucky, and able to hide behind the fighter. Professionally."],
        [76, "Stout halfling", "Small, lucky, and poison-resistant. Hold on to that one."],
        [96, "Human", "Of all the lives available, the most beige."],
        [100, "Tiefling", "Horns included at no extra charge."]
      ].find(([max]) => t <= max);
      return `Just in case, the System has pre-rolled your next life: ${r.html} = <strong>${race}</strong>. ${sting} Please die responsibly.`;
    }
  },
  {
    range: [93, 94],
    label: "SUPERSIZED",
    tone: "good",
    icon: "fa-solid fa-up-right-and-down-left-from-center",
    lines: [
      "One size category bigger. Doors are now a negotiation.",
      "If you were Small, you're now Medium, and for the first time in your life you can look the bartender in the eye. He looks tired. He has always looked tired.",
      "For one minute, {name} is the biggest person in the room, which the System suspects has been the plan since character creation.",
      "Bigger body, same hit points. The System would like to be clear that this is a much larger target with exactly the same amount of crawler inside it.",
      "The System accepts no responsibility for your clothing, your armour straps, or the ceiling.",
      "Bigger also means easier to hit with a catapult. The System is just mentioning it. No reason. Nobody has a catapult. Please ignore the catapult."
    ],
    box: {
      tier: "Gold",
      contents: "One (1) pair of trousers in your new size. Valid for one minute. After that, they're a tent."
    }
  },
  {
    range: [95, 96],
    label: "PINCUSHION PARTY",
    tone: "chaos",
    icon: "fa-solid fa-thumbtack",
    lines: [
      "Vulnerability to piercing for everyone within thirty feet. Every archer in the room just felt a warm glow of purpose.",
      "Read it again: '<em>you</em> and all creatures within 30 feet.' You're the 'you' part, {name}. It's the very first word.",
      "MARKET UPDATE: The value of every arrow, spear, fang and pointy stick within thirty feet has doubled. Economists are calling it the Stab Bubble.",
      "The cleric with the mace is sulking. Bludgeoning wasn't invited.",
      "Somewhere at the back, a kobold with a spear has just been promoted from 'nuisance' to 'serious threat'. He is standing up straighter. He has never stood up straighter.",
      "The ranger has never looked at {name} like this before. Do not turn your back. Do <em>not</em> turn your back."
    ],
    box: {
      tier: "Bronze",
      contents: "One (1) thimble. Protects one finger. The rest of you is on your own."
    }
  },
  {
    range: [97, 98],
    label: "MOOD MUSIC",
    tone: "weird",
    icon: "fa-solid fa-music",
    lines: [
      "Faint, ethereal music. The System received your request for a theme song and has fulfilled it at the lowest possible volume.",
      "{user}, now would be the perfect moment to put some music on at the table. The System can't recommend a specific track. It's the one you're already thinking of.",
      "LICENSING NOTICE: This music has not been cleared. If {name} hums along, {name} owes royalties.",
      "It's faint. It's ethereal. It's entirely decorative. Like a wizard's Charisma score.",
      "Any bard within earshot now feels deeply, professionally threatened.",
      "Combat with a soundtrack. Every swing feels important now. Even the misses. <em>Especially</em> the misses."
    ]
  },
  {
    range: [99, 100],
    label: "SORCERY JACKPOT",
    tone: "good",
    icon: "fa-solid fa-gem",
    lines: [
      "All your sorcery points, back. The System has checked twice and cannot find the catch. The System is furious about this.",
      "The top of the table. The double zeroes. The grand prize. And it's... a refill. Like a drink, but it explodes.",
      "Congratulations, Crawler {name}. You have spun the Wheel of Wild Magic and won exactly what a long rest gives you for free.",
      "Our analysts predict these points will be spent on Quickened Spell within six seconds. Our analysts are never wrong. Our analysts are extremely bored.",
      "Somewhere, a warlock with two spell slots is crying into his patron's terms and conditions.",
      "{user} rolled a 99 or a 00, and the System is contractually obliged to act happy about it. Hooray. Look at us. Thrilled."
    ],
    achievement: {
      title: "Top of the Table",
      text: "Rolled the highest result on the wild magic table. Your prize is mostly confidence. Please don't spend it all on one Fireball."
    },
    box: {
      tier: "Legendary",
      contents: "Inside the Legendary box: a smaller box. Inside that: a note reading 'You already got your sorcery points. Greedy.'"
    }
  }
];
