import { memo, useState } from 'react';
import { triggerHelicopterFlyby } from '../utils/winCelebration';
import { formatMoney } from '../utils/tokenEconomy';
import { sfx } from '../utils/soundEngine';
import { speakWithPersona } from '../utils/aiSpeech';
import { getSettings } from '../utils/settingsStore';
import './EightiesIconsStrip.css';

const EIGHTIES_ICON_CAST = [
  {
    id: 'ferris',
    name: "Joy",
    fullName: "Joy \"Joystick\" Park",
    movie: "Original 1986 arcade regular",
    role: "High-Score Hunter",
    voiceMode: 'valkyrie',
    quotes: [
      "I don't have a favourite cabinet. I have a favourite cabinet for every day of the week.",
      "My initials are on every high-score table in this building. Three letters. J-O-Y.",
      "Homework? I did it in the queue for the racing cabinet. Mostly.",
      "If the screen says INSERT COIN, I take that personally."
    ],
    priceTokens: 14,
    item80s: "Lucky Quarter on a Shoelace",
    bg: '#3f2c12',
    accent: '#facc15'
  },
  {
    id: 'knight',
    name: "Roxy",
    fullName: "Roxy Rinkwell",
    movie: "Original 1984 roller-rink DJ",
    role: "Rink DJ",
    voiceMode: 'valkyrie',
    quotes: [
      "Couples skate in five minutes. Singles, please clear the floor and the snack bar.",
      "I take requests, but only if they have at least three key changes.",
      "Every great night ends with a slow song and someone falling over.",
      "Turn it up? Honey, this mixer's volume knob fell off in 1982. It's on maximum forever."
    ],
    priceTokens: 28,
    item80s: "Glow-in-the-Dark Skate Laces",
    bg: '#18181b',
    accent: '#ef4444'
  },
  {
    id: 'madonna',
    name: 'Neon Diva',
    fullName: 'Neon Diva — Synth-Pop Era',
    movie: 'Original synth-pop star',
    role: 'Synth-Pop Star',
    voiceMode: 'valkyrie',
    quotes: [
      "Big hair, bigger synths, and a stack of gold tokens. Let's go!",
      "Hit that dance floor like you own the spotlight, then hit the high-score table too.",
      "Grab your fingerless lace gloves and turn that boombox dial past ten.",
      "Encore! One more round on the cabinet before the lights come up."
    ],
    priceTokens: 18,
    item80s: 'Neon Leg Warmers & Mixtape',
    bg: '#4a044e',
    accent: '#f472b6'
  },
  {
    id: 'terminator',
    name: "Unit 86",
    fullName: "Chrome Unit 86",
    movie: "Original 1986 arcade robot",
    role: "Token-Counting Robot",
    voiceMode: 'hal',
    quotes: [
      "GREETINGS, HUMAN. I HAVE COUNTED YOUR TOKENS. YOU HAVE FOUR. THIS IS FINE.",
      "MY PROGRAMMING SAYS THE CLAW MACHINE HAS FEELINGS. PLEASE BE GENTLE.",
      "ERROR 404: CHILL NOT FOUND. REBOOTING WITH EXTRA SYNTH.",
      "I DO NOT DANCE. I PERFORM SCHEDULED SERVO MAINTENANCE TO MUSIC."
    ],
    priceTokens: 40,
    item80s: "Spare Servo & Oil Can",
    bg: '#1f2937',
    accent: '#22d3ee'
  },
  {
    id: 'robocop',
    name: "Mo",
    fullName: "Maureen \"Mo\" Delgado",
    movie: "Original 1987 mall security",
    role: "Food Court Patrol",
    voiceMode: 'valkyrie',
    quotes: [
      "Ma'am, the fountain is for wishes, not for washing your nachos.",
      "I have patrolled this mall for six years. The escalator has never once been on time.",
      "No running in the food court. Speed-walking is fine. I'm not a monster.",
      "My walkie-talkie has two settings: static and my mum asking when I'm home."
    ],
    priceTokens: 32,
    item80s: "Mall Walkie-Talkie",
    bg: '#0f172a',
    accent: '#94a3b8'
  },
  {
    id: 'venkman',
    name: "Prof. Quark",
    fullName: "Professor Ida Quark",
    movie: "Original 1984 science-fair judge",
    role: "Lab Coat Legend",
    voiceMode: 'valkyrie',
    quotes: [
      "A potato clock? Bold. Ambitious. Four out of ten.",
      "Science is mostly writing things down and then saying 'huh'.",
      "Your volcano erupted early and took out the solar system table. Points for drama.",
      "I'm not saying the baking-soda rocket was dangerous, but my eyebrows are on holiday."
    ],
    priceTokens: 22,
    item80s: "Pocket Protector (Full)",
    bg: '#14532d',
    accent: '#4ade80'
  },
  {
    id: 'ripley',
    name: "Capt. Nova",
    fullName: "Captain Lena Nova",
    movie: "Original 1986 space-freighter captain",
    role: "Cargo Pilot",
    voiceMode: 'valkyrie',
    quotes: [
      "Cargo hold contains 40,000 arcade tokens and one very confused hamster.",
      "Hyperspace is easy. Parallel parking the freighter is the hard part.",
      "Mission log, day 212: the vending machine still only takes exact change.",
      "Strap in, rookie. Turbulence ahead, and the snack trolley is not secured."
    ],
    priceTokens: 26,
    item80s: "Zero-G Snack Tube",
    bg: '#1c1917',
    accent: '#facc15'
  },
  {
    id: 'marty',
    name: "Kip",
    fullName: "Kip Rader",
    movie: "Original 1985 skate kid",
    role: "Skate Park Ace",
    voiceMode: 'kitt',
    quotes: [
      "I've landed this trick in my head about four hundred times.",
      "Knee pads are for people who plan to fall. I just fall without a plan.",
      "Grandma says skating is a phase. It's been a phase for nine years.",
      "Rad. Gnarly. Tubular. I'm running out of words and the session's not over."
    ],
    priceTokens: 1,
    item80s: "Neon Grip-Tape Offcut",
    bg: '#431407',
    accent: '#fb923c'
  },
  {
    id: 'doc',
    name: "Gran Gizmo",
    fullName: "Grandma Gizmo",
    movie: "Original 1985 garage inventor",
    role: "Garage Inventor",
    voiceMode: 'valkyrie',
    quotes: [
      "I built a robot to do the dishes. Now it does the dishes and judges me.",
      "Safety goggles on, dear. This toaster has opinions.",
      "Every great invention starts with 'hold my tea' and a roll of tape.",
      "The microwave and the TV remote are now one device. You're welcome."
    ],
    priceTokens: 20,
    item80s: "Self-Stirring Teacup",
    bg: '#0f172a',
    accent: '#22d3ee'
  },
  {
    id: 'axel',
    name: "Jojo",
    fullName: "Jojo Bright",
    movie: "Original 1984 stand-up comic",
    role: "Open-Mic Comic",
    voiceMode: 'kitt',
    quotes: [
      "Is this mic on? It is? Oh no, then you heard all of that.",
      "I asked the arcade for a high five. It gave me a high score. Close enough.",
      "My shoulder pads have their own agent now.",
      "Tough crowd tonight. And by crowd I mean the guy fixing the claw machine."
    ],
    priceTokens: 19,
    item80s: "Glitter Bow Tie",
    bg: '#3b0764',
    accent: '#c084fc'
  },
  {
    id: 'gekko',
    name: "Penny",
    fullName: "Penny Ledger",
    movie: "Original 1987 shoulder-pad exec",
    role: "Boardroom Boss",
    voiceMode: 'valkyrie',
    quotes: [
      "I scheduled a meeting about the meetings. It went brilliantly.",
      "My brick phone weighs more than my briefcase, and my briefcase has a fax machine in it.",
      "Lunch is a power move. Second lunch is a merger.",
      "Shoulder pads this big don't fit through doors. Doors fit around me."
    ],
    priceTokens: 50,
    item80s: "Extra-Long Phone Antenna",
    bg: '#172554',
    accent: '#60a5fa'
  },
  {
    id: 'macgyver',
    name: "Sparks",
    fullName: "Felix \"Sparks\" Okoro",
    movie: "Original 1985 TV repair man",
    role: "Repair Wizard",
    voiceMode: 'kitt',
    quotes: [
      "Have you tried hitting it gently on the side? Gently. GENTLY.",
      "This TV just needed a new tube, a pep talk, and one crisp packet in the right place.",
      "I fixed the jukebox. It now plays only one song, but it plays it beautifully.",
      "Rule one of repair: if it buzzes, step back. If it hums, sing along."
    ],
    priceTokens: 12,
    item80s: "Lucky Screwdriver (Taped)",
    bg: '#064e3b',
    accent: '#34d399'
  },
  {
    id: 'max_headroom',
    name: "Glitch",
    fullName: "Glitch the Screen Host",
    movie: "Original 1987 computer TV host",
    role: "Pixel Presenter",
    voiceMode: 'hal',
    quotes: [
      "Good evening, viewers! I am drawn in sixteen colours and all of them are excited.",
      "Coming up after the break: a test card, and then another, slightly different test card.",
      "Please adjust your aerial. No, the other way. No, the first way.",
      "I am made of pixels, which means I never have a bad hair day. I have a bad pixel day."
    ],
    priceTokens: 24,
    item80s: "Pocket Test-Card Badge",
    bg: '#083344',
    accent: '#22d3ee'
  },
  {
    id: 'he_man',
    name: "Brawn",
    fullName: "Brawnhilda the Bold",
    movie: "Original 1983 cartoon warrior",
    role: "Saturday Morning Hero",
    voiceMode: 'valkyrie',
    quotes: [
      "Fear not, citizens! I shall defeat this boss level after a short snack.",
      "My sword is made of pure neon and runs on four double-A batteries.",
      "Remember, kids: share your cereal and always read the instructions.",
      "Today's lesson: teamwork, bravery, and not leaving your bike in the rain."
    ],
    priceTokens: 16,
    item80s: "Foam Sword & Cardboard Shield",
    bg: '#422006',
    accent: '#f59e0b'
  },
  {
    id: 'mrt',
    name: 'Sarge',
    fullName: 'Sergeant "Brick" Malone',
    movie: 'Original 1983 arcade mechanic',
    role: 'Cabinet Mechanic',
    voiceMode: 'kitt',
    quotes: [
      "Nobody skips breakfast before a high-score run. Not on my watch!",
      "I'll fix that cabinet with a wrench and a stare... and the Night Viper flying cover!",
      "Three lines on one bingo card? Now that's a plan, rookie!",
      "Touch my toolbox and you're sleepin' out on the loading dock."
    ],
    priceTokens: 16,
    item80s: '1983 Chrome Wrench Set',
    bg: '#27272a',
    accent: '#eab308'
  },
  {
    id: 'crockett',
    name: "Coco",
    fullName: "Coco Reyes",
    movie: "Original 1984 beach patrol",
    role: "Lifeguard Captain",
    voiceMode: 'valkyrie',
    quotes: [
      "Swim between the flags, wear your sun cream, and stop feeding the seagulls.",
      "That's not a shark, it's an inflatable flamingo. Back in the water.",
      "I've blown this whistle so much I can only speak in short bursts.",
      "Sunset shift, pastel sky, synth on the boombox. Best job in the world."
    ],
    priceTokens: 25,
    item80s: "Sun Visor & Whistle",
    bg: '#083344',
    accent: '#00f3ff'
  },
  {
    id: 'maverick',
    name: "Wingnut",
    fullName: "Lt. Ray \"Wingnut\" Ortiz",
    movie: "Original 1986 air-show stunt pilot",
    role: "Stunt Pilot",
    voiceMode: 'kitt',
    quotes: [
      "Loop-the-loop, barrel roll, and I still didn't spill my milkshake.",
      "The crowd wanted a flypast. I gave them a fly-very-close-past.",
      "My plane is held together with rivets, paint, and confidence.",
      "Ground control, requesting permission to show off. Over."
    ],
    priceTokens: 12,
    item80s: "Leather Flying Cap",
    bg: '#1a2e05',
    accent: '#a3e635'
  },
  {
    id: 'hawke',
    name: 'Ace',
    fullName: 'Captain "Ace" Vega',
    movie: 'Original 1984 chopper ace',
    role: 'Stealth Pilot',
    voiceMode: 'kitt',
    quotes: [
      "Turbos armed. Scramble the Night Viper or Sky Patrol on the double!",
      "Night Viper radar is tracking a hostile rival closing in on your high score.",
      "Silent running until we cross the valley... then Mach-1 afterburners!",
      "Arcade cabinet tuner by day, supersonic interceptor by night."
    ],
    priceTokens: 25,
    item80s: 'Neon Heliport Fuel Voucher',
    bg: '#020617',
    accent: '#38bdf8'
  },
  {
    id: 'bender',
    name: "Spike",
    fullName: "Spike Moreno",
    movie: "Original 1985 garage-punk drummer",
    role: "Garage Punk",
    voiceMode: 'kitt',
    quotes: [
      "We know three chords. We play all of them, very loudly, at once.",
      "Our band name changes every week. This week we're called Detention Pending.",
      "I'm not angry, I'm just drumming at a volume that looks angry.",
      "Saturday rehearsal in the garage. Mum is our biggest fan and our noise complaint."
    ],
    priceTokens: 5,
    item80s: "Snapped Drumstick (Signed)",
    bg: '#450a0a',
    accent: '#ef4444'
  },
  {
    id: 'claire',
    name: "Tasha",
    fullName: "Tasha Glitz",
    movie: "Original 1985 mall-fashion icon",
    role: "Mall Trendsetter",
    voiceMode: 'valkyrie',
    quotes: [
      "Crimped hair, neon earrings, and a scrunchie on each wrist. Minimum.",
      "The mall is basically my office, and the food court is my board room.",
      "I don't follow trends. Trends follow me, slightly out of breath.",
      "This jacket has more zips than pockets and zero of the pockets are real."
    ],
    priceTokens: 15,
    item80s: "Clip-On Neon Hoops",
    bg: '#500724',
    accent: '#ec4899'
  },
  {
    id: 'allison',
    name: "Raven",
    fullName: "Raven Black",
    movie: "Original 1985 goth sketch artist",
    role: "Sketchbook Goth",
    voiceMode: 'valkyrie',
    quotes: [
      "I drew you while you weren't looking. You look like a very nice ghost.",
      "My favourite colour is black, and my second favourite is darker black.",
      "I don't do small talk. I do tiny, mysterious talk.",
      "The moon and I have an understanding."
    ],
    priceTokens: 2,
    item80s: "Charcoal Pencil Stub",
    bg: '#1e1b4b',
    accent: '#a855f7'
  },
  {
    id: 'brian',
    name: "Newt",
    fullName: "Newton Fish",
    movie: "Original 1985 computer-club president",
    role: "Computer Club Whiz",
    voiceMode: 'kitt',
    quotes: [
      "I wrote a program that says HELLO. It took three weeks and it's perfect.",
      "Loading from tape takes eleven minutes. I use that time to think about loading.",
      "My calculator watch can do sums AND tell the time. I am unstoppable.",
      "The statistics say practice improves your high score. I have the graph to prove it."
    ],
    priceTokens: 3,
    item80s: "Floppy Disk Keyring",
    bg: '#052e16',
    accent: '#4ade80'
  },
  {
    id: 'andrew',
    name: "Champ",
    fullName: "Dee \"Champ\" Okafor",
    movie: "Original 1985 school track star",
    role: "Track Star",
    voiceMode: 'kitt',
    quotes: [
      "I ran here. I ran home. Then I ran back because I forgot my tokens.",
      "Warm up, stretch, drink water, and never trust a puddle on the track.",
      "My sweatband has seen things.",
      "Four lunches a day is not a lot when you run everywhere."
    ],
    priceTokens: 8,
    item80s: "Lucky Sweatband",
    bg: '#172554',
    accent: '#38bdf8'
  },
  {
    id: 'cameron',
    name: "Milo",
    fullName: "Milo Fretz",
    movie: "Original 1986 video-store clerk",
    role: "Rewind Clerk",
    voiceMode: 'kitt',
    quotes: [
      "Be kind, rewind. I will know. I always know.",
      "Late fees are not my fault. They are the universe's fault.",
      "I've seen every film in the horror aisle and I sleep with the lights on.",
      "Staff pick of the week: whatever's left on the shelf by Friday night."
    ],
    priceTokens: 10,
    item80s: "Rewinder Machine",
    bg: '#450a0a',
    accent: '#f87171'
  }
];

/* Crisp 16x16 digital CRT character portraits */
export function EightiesDigitalFaceSvg({ id, size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className="tm-80s-face-svg"
      aria-hidden="true"
    >
      <rect width="16" height="16" fill="#090d1a" />

      {id === 'knight' && (
        <>
          <rect x="2" y="1" width="12" height="6" fill="#9a3412" />
          <rect x="1" y="4" width="2" height="6" fill="#9a3412" />
          <rect x="13" y="4" width="2" height="6" fill="#9a3412" />
          <rect x="2" y="6" width="1" height="3" fill="#22d3ee" />
          <rect x="13" y="6" width="1" height="3" fill="#22d3ee" />
          <rect x="4" y="5" width="8" height="7" fill="#c68642" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#db2777" />
          <rect x="2" y="12" width="12" height="4" fill="#0f766e" />
          <rect x="5" y="12" width="6" height="1" fill="#f8fafc" />
        </>
      )}

      {id === 'madonna' && (
        <>
          <rect x="4" y="1" width="8" height="2" fill="#0f172a" />
          <rect x="3" y="3" width="10" height="4" fill="#c026d3" />
          <rect x="2" y="5" width="2" height="5" fill="#a21caf" />
          <rect x="12" y="5" width="2" height="5" fill="#a21caf" />
          <rect x="11" y="2" width="2" height="2" fill="#22d3ee" />
          <rect x="4" y="5" width="8" height="7" fill="#fde2cc" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="7" y="10" width="2" height="1" fill="#db2777" />
          <rect x="3" y="12" width="10" height="4" fill="#ec4899" />
          <rect x="5" y="12" width="6" height="1" fill="#f8fafc" />
        </>
      )}

      {id === 'terminator' && (
        <>
          <rect x="7" y="0" width="2" height="2" fill="#94a3b8" />
          <rect x="7" y="0" width="2" height="1" fill="#22d3ee" />
          <rect x="3" y="2" width="10" height="9" fill="#64748b" />
          <rect x="4" y="3" width="8" height="7" fill="#94a3b8" />
          <rect x="5" y="5" width="2" height="2" fill="#22d3ee" />
          <rect x="9" y="5" width="2" height="2" fill="#22d3ee" />
          <rect x="5" y="8" width="6" height="1" fill="#334155" />
          <rect x="6" y="8" width="1" height="1" fill="#cbd5e1" />
          <rect x="8" y="8" width="1" height="1" fill="#cbd5e1" />
          <rect x="2" y="12" width="12" height="4" fill="#475569" />
          <rect x="5" y="13" width="2" height="1" fill="#4ade80" />
          <rect x="9" y="13" width="2" height="1" fill="#f59e0b" />
        </>
      )}

      {id === 'robocop' && (
        <>
          <rect x="3" y="2" width="10" height="3" fill="#1e3a8a" />
          <rect x="2" y="4" width="12" height="1" fill="#172554" />
          <rect x="7" y="2" width="2" height="1" fill="#facc15" />
          <rect x="4" y="5" width="8" height="7" fill="#a0522d" />
          <rect x="3" y="5" width="1" height="4" fill="#3f2314" />
          <rect x="12" y="5" width="1" height="4" fill="#3f2314" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#7dd3fc" />
          <rect x="11" y="12" width="2" height="3" fill="#111827" />
          <rect x="4" y="13" width="2" height="1" fill="#facc15" />
        </>
      )}

      {id === 'venkman' && (
        <>
          <rect x="6" y="0" width="4" height="2" fill="#4b5563" />
          <rect x="4" y="2" width="8" height="3" fill="#374151" />
          <rect x="5" y="2" width="2" height="1" fill="#d1d5db" />
          <rect x="4" y="5" width="8" height="7" fill="#f1c27d" />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="5" y="7" width="1" height="1" fill="#e0f2fe" />
          <rect x="10" y="7" width="1" height="1" fill="#e0f2fe" />
          <rect x="7" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#f8fafc" />
          <rect x="6" y="12" width="4" height="4" fill="#7c3aed" />
        </>
      )}

      {id === 'ripley' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#cbd5e1" />
          <rect x="3" y="3" width="1" height="3" fill="#cbd5e1" />
          <rect x="12" y="3" width="1" height="3" fill="#cbd5e1" />
          <rect x="4" y="5" width="8" height="7" fill="#d4a383" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#ea580c" />
          <rect x="3" y="13" width="3" height="2" fill="#22d3ee" />
          <rect x="7" y="12" width="2" height="4" fill="#9a3412" />
        </>
      )}

      {id === 'axel' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#3f2a1d" />
          <rect x="3" y="3" width="1" height="2" fill="#3f2a1d" />
          <rect x="12" y="3" width="1" height="2" fill="#3f2a1d" />
          <rect x="4" y="5" width="8" height="7" fill="#6b3e26" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="5" y="10" width="6" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#ca8a04" />
          <rect x="6" y="12" width="4" height="2" fill="#7e22ce" />
          <rect x="13" y="9" width="2" height="4" fill="#94a3b8" />
        </>
      )}

      {id === 'gekko' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#3f2a1d" />
          <rect x="3" y="5" width="2" height="5" fill="#3f2a1d" />
          <rect x="11" y="5" width="2" height="5" fill="#3f2a1d" />
          <rect x="5" y="5" width="6" height="7" fill="#fde2cc" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="7" y="10" width="2" height="1" fill="#dc2626" />
          <rect x="0" y="12" width="16" height="4" fill="#be185d" />
          <rect x="6" y="12" width="4" height="4" fill="#f8fafc" />
        </>
      )}

      {id === 'macgyver' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#3f2a1d" />
          <rect x="4" y="5" width="8" height="7" fill="#5c3a21" />
          <rect x="4" y="7" width="3" height="2" fill="#e2e8f0" />
          <rect x="5" y="7" width="1" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#ea580c" />
          <rect x="11" y="12" width="1" height="4" fill="#facc15" />
          <rect x="11" y="12" width="1" height="1" fill="#ef4444" />
        </>
      )}

      {id === 'max_headroom' && (
        <>
          <rect x="2" y="1" width="12" height="11" fill="#475569" />
          <rect x="3" y="2" width="10" height="9" fill="#052e16" />
          <rect x="5" y="4" width="2" height="2" fill="#4ade80" />
          <rect x="9" y="4" width="2" height="2" fill="#4ade80" />
          <rect x="5" y="8" width="6" height="1" fill="#4ade80" />
          <rect x="3" y="3" width="10" height="1" fill="#14532d" />
          <rect x="3" y="6" width="10" height="1" fill="#14532d" />
          <rect x="3" y="9" width="10" height="1" fill="#14532d" />
          <rect x="6" y="12" width="4" height="2" fill="#334155" />
          <rect x="2" y="14" width="12" height="2" fill="#1e293b" />
          <rect x="12" y="11" width="1" height="1" fill="#ef4444" />
        </>
      )}

      {id === 'he_man' && (
        <>
          <rect x="4" y="1" width="8" height="3" fill="#cbd5e1" />
          <rect x="3" y="3" width="10" height="1" fill="#94a3b8" />
          <rect x="2" y="4" width="2" height="7" fill="#dc2626" />
          <rect x="12" y="4" width="2" height="7" fill="#dc2626" />
          <rect x="4" y="4" width="8" height="8" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#78350f" />
          <rect x="5" y="12" width="6" height="4" fill="#16a34a" />
          <rect x="7" y="13" width="2" height="1" fill="#facc15" />
        </>
      )}

      {id === 'bender' && (
        <>
          <rect x="4" y="0" width="1" height="3" fill="#22c55e" />
          <rect x="6" y="0" width="1" height="3" fill="#22c55e" />
          <rect x="8" y="0" width="1" height="3" fill="#22c55e" />
          <rect x="10" y="0" width="1" height="3" fill="#22c55e" />
          <rect x="4" y="2" width="8" height="3" fill="#16a34a" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#111827" />
          <rect x="3" y="12" width="1" height="1" fill="#cbd5e1" />
          <rect x="12" y="12" width="1" height="1" fill="#cbd5e1" />
          <rect x="13" y="9" width="1" height="5" fill="#d6a35c" />
        </>
      )}

      {id === 'claire' && (
        <>
          <rect x="2" y="1" width="12" height="5" fill="#c4b5fd" />
          <rect x="1" y="4" width="3" height="8" fill="#a78bfa" />
          <rect x="12" y="4" width="3" height="8" fill="#a78bfa" />
          <rect x="4" y="5" width="8" height="7" fill="#8d5524" />
          <rect x="3" y="9" width="1" height="2" fill="#22d3ee" />
          <rect x="12" y="9" width="1" height="2" fill="#22d3ee" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="7" y="10" width="2" height="1" fill="#ec4899" />
          <rect x="2" y="12" width="12" height="4" fill="#f472b6" />
          <rect x="4" y="13" width="8" height="1" fill="#facc15" />
        </>
      )}

      {id === 'allison' && (
        <>
          <rect x="3" y="1" width="10" height="5" fill="#1e1b4b" />
          <rect x="2" y="4" width="2" height="9" fill="#1e1b4b" />
          <rect x="12" y="4" width="2" height="9" fill="#1e1b4b" />
          <rect x="4" y="5" width="8" height="7" fill="#f5e6da" />
          <rect x="5" y="7" width="2" height="1" fill="#7c3aed" />
          <rect x="9" y="7" width="2" height="1" fill="#7c3aed" />
          <rect x="5" y="8" width="2" height="1" fill="#111827" />
          <rect x="9" y="8" width="2" height="1" fill="#111827" />
          <rect x="7" y="10" width="2" height="1" fill="#6b21a8" />
          <rect x="2" y="12" width="12" height="4" fill="#18181b" />
          <rect x="7" y="13" width="2" height="2" fill="#e5e7eb" />
        </>
      )}

      {id === 'brian' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#7c2d12" />
          <rect x="4" y="5" width="8" height="7" fill="#f1c27d" />
          <rect x="4" y="6" width="3" height="3" fill="#1e293b" />
          <rect x="9" y="6" width="3" height="3" fill="#1e293b" />
          <rect x="5" y="7" width="1" height="1" fill="#bae6fd" />
          <rect x="10" y="7" width="1" height="1" fill="#bae6fd" />
          <rect x="7" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#f8fafc" />
          <rect x="4" y="12" width="8" height="4" fill="#15803d" />
          <rect x="7" y="13" width="2" height="2" fill="#111827" />
        </>
      )}

      {id === 'andrew' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#3f2a1d" />
          <rect x="3" y="4" width="10" height="1" fill="#ef4444" />
          <rect x="4" y="5" width="8" height="7" fill="#4a2c17" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#1d4ed8" />
          <rect x="5" y="12" width="6" height="1" fill="#f8fafc" />
          <rect x="7" y="13" width="2" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'ferris' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#3f2a1d" />
          <rect x="12" y="4" width="2" height="6" fill="#3f2a1d" />
          <rect x="3" y="4" width="10" height="1" fill="#f472b6" />
          <rect x="4" y="5" width="8" height="7" fill="#e8b48c" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#be123c" />
          <rect x="2" y="12" width="12" height="4" fill="#6d28d9" />
          <rect x="9" y="13" width="2" height="2" fill="#facc15" />
        </>
      )}

      {id === 'cameron' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#a16207" />
          <rect x="3" y="2" width="2" height="2" fill="#a16207" />
          <rect x="10" y="1" width="2" height="2" fill="#a16207" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#7f1d1d" />
          <rect x="2" y="12" width="12" height="4" fill="#dc2626" />
          <rect x="4" y="13" width="3" height="1" fill="#f8fafc" />
          <rect x="10" y="12" width="3" height="4" fill="#111827" />
        </>
      )}

      {id === 'marty' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#dc2626" />
          <rect x="2" y="4" width="3" height="1" fill="#b91c1c" />
          <rect x="4" y="5" width="8" height="7" fill="#8d5524" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#c026d3" />
          <rect x="4" y="12" width="3" height="2" fill="#22d3ee" />
          <rect x="9" y="13" width="3" height="2" fill="#facc15" />
        </>
      )}

      {id === 'doc' && (
        <>
          <rect x="6" y="0" width="4" height="2" fill="#d1d5db" />
          <rect x="4" y="2" width="8" height="3" fill="#9ca3af" />
          <rect x="4" y="4" width="8" height="1" fill="#f59e0b" />
          <rect x="5" y="4" width="2" height="1" fill="#fde68a" />
          <rect x="9" y="4" width="2" height="1" fill="#fde68a" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#be123c" />
          <rect x="2" y="12" width="12" height="4" fill="#2563eb" />
          <rect x="5" y="12" width="6" height="3" fill="#1d4ed8" />
          <rect x="7" y="13" width="2" height="1" fill="#facc15" />
        </>
      )}

      {id === 'crockett' && (
        <>
          <rect x="3" y="3" width="10" height="2" fill="#facc15" />
          <rect x="2" y="4" width="6" height="1" fill="#eab308" />
          <rect x="4" y="2" width="8" height="1" fill="#78350f" />
          <rect x="4" y="5" width="8" height="7" fill="#c68642" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#ef4444" />
          <rect x="7" y="12" width="1" height="2" fill="#f8fafc" />
          <rect x="7" y="14" width="1" height="1" fill="#facc15" />
        </>
      )}

      {id === 'mrt' && (
        <>
          {/* Original arcade mechanic: teal work cap, clean-shaven, coveralls with a chest pocket */}
          <rect x="4" y="2" width="8" height="3" fill="#0f766e" />
          <rect x="3" y="4" width="10" height="1" fill="#115e59" />
          <rect x="7" y="2" width="2" height="1" fill="#22d3ee" />
          <rect x="4" y="5" width="8" height="7" fill="#a16207" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#334155" />
          <rect x="7" y="12" width="2" height="4" fill="#1e293b" />
          <rect x="9" y="13" width="3" height="2" fill="#475569" />
          <rect x="9" y="13" width="3" height="1" fill="#22d3ee" />
        </>
      )}

      {id === 'maverick' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#78350f" />
          <rect x="2" y="4" width="2" height="5" fill="#78350f" />
          <rect x="12" y="4" width="2" height="5" fill="#78350f" />
          <rect x="4" y="4" width="3" height="2" fill="#22d3ee" />
          <rect x="9" y="4" width="3" height="2" fill="#22d3ee" />
          <rect x="4" y="6" width="8" height="6" fill="#e0ac69" />
          <rect x="5" y="8" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="8" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#713f12" />
          <rect x="4" y="12" width="8" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'hawke' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#92400e" />
          <rect x="2" y="4" width="12" height="2" fill="#1e293b" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="3" height="2" fill="#020617" />
          <rect x="5" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="10" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#0f172a" />
          <rect x="5" y="12" width="6" height="4" fill="#cbd5e1" />
        </>
      )}
    </svg>
  );
}

function getPersonaVoiceUri(mode) {
  const s = getSettings?.() || {};
  if (mode === 'kitt') return s.aiVoiceKitt || 'auto';
  if (mode === 'hal') return s.aiVoiceHal || 'auto';
  return s.aiVoiceValkyrie || 'auto';
}

const EightiesIconsStrip = memo(function EightiesIconsStrip({ compact = false }) {
  const [selectedId, setSelectedId] = useState(compact ? '' : 'ferris');
  const [quoteIdxMap, setQuoteIdxMap] = useState({});
  const [speakingId, setSpeakingId] = useState('');

  const selected = EIGHTIES_ICON_CAST.find((c) => c.id === selectedId) || null;
  const activeQuoteIdx = selected ? (quoteIdxMap[selected.id] || 0) % selected.quotes.length : 0;
  const activeQuote = selected ? selected.quotes[activeQuoteIdx] : '';

  const handleSelectChar = (char) => {
    sfx.playToggle?.();
    if (selectedId === char.id) {
      setQuoteIdxMap((prev) => ({
        ...prev,
        [char.id]: ((prev[char.id] || 0) + 1) % char.quotes.length
      }));
    } else {
      setSelectedId(char.id);
    }
  };

  const handleNextQuote = () => {
    if (!selected) return;
    sfx.playPop?.(1);
    setQuoteIdxMap((prev) => ({
      ...prev,
      [selected.id]: ((prev[selected.id] || 0) + 1) % selected.quotes.length
    }));
  };

  const handleSpeakLine = () => {
    if (!selected || !activeQuote) return;
    const mode = selected.voiceMode || 'valkyrie';
    speakWithPersona(activeQuote, {
      mode,
      voiceUri: getPersonaVoiceUri(mode),
      fromGesture: true,
      onStart: () => setSpeakingId(selected.id),
      onEnd: () => setSpeakingId((cur) => (cur === selected.id ? '' : cur))
    });
  };

  const handleRandomQuote = () => {
    sfx.playToggle?.();
    const pick = EIGHTIES_ICON_CAST[Math.floor(Math.random() * EIGHTIES_ICON_CAST.length)];
    const qIdx = Math.floor(Math.random() * pick.quotes.length);
    setSelectedId(pick.id);
    setQuoteIdxMap((prev) => ({ ...prev, [pick.id]: qIdx }));
  };

  return (
    <section
      className={`tm-80s-cast-bar ${compact ? 'is-compact' : ''}`}
      aria-label="1980s Arcade Crew & Chopper Patrol"
    >
      <div className="tm-80s-cast-header">
        <div className="tm-80s-cast-title">
          <span className="tm-80s-crt-dot" aria-hidden="true" />
          <span>📺 1980s ARCADE CREW ({EIGHTIES_ICON_CAST.length} ICONS)</span>
          <span className="tm-80s-price-tag">1985 PRICES (25¢ COIN-OP)</span>
        </div>
        <div className="tm-80s-chopper-btns">
          <button
            type="button"
            className="tm-80s-chopper-btn is-random"
            onClick={handleRandomQuote}
            title="Pick a random 80s character and quote"
          >
            🎲 Random Line
          </button>
          <button
            type="button"
            className="tm-80s-chopper-btn is-airwolf"
            onClick={() => triggerHelicopterFlyby('airwolf')}
          >
            🦅 Night Viper Flyby
          </button>
          <button
            type="button"
            className="tm-80s-chopper-btn is-bluethunder"
            onClick={() => triggerHelicopterFlyby('bluethunder')}
          >
            🚁 Sky Patrol
          </button>
        </div>
      </div>

      <div className="tm-80s-faces-rail" role="list">
        {EIGHTIES_ICON_CAST.map((char) => {
          const active = selectedId === char.id;
          return (
            <button
              key={char.id}
              type="button"
              role="listitem"
              className={`tm-80s-face-chip ${active ? 'is-active' : ''}`}
              style={{
                '--char-bg': char.bg,
                '--char-accent': char.accent
              }}
              onClick={() => handleSelectChar(char)}
              title={`${char.fullName} — ${char.movie} (Click again for next quote)`}
            >
              <EightiesDigitalFaceSvg id={char.id} size={compact ? 30 : 38} />
              <span className="tm-80s-face-name">{char.name}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="tm-80s-dossier-card"
          style={{ '--char-accent': selected.accent }}
        >
          <div className="tm-80s-dossier-avatar">
            <EightiesDigitalFaceSvg id={selected.id} size={56} />
          </div>
          <div className="tm-80s-dossier-body">
            <div className="tm-80s-dossier-top">
              <strong>{selected.fullName}</strong>
              <span className="tm-80s-dossier-movie">{selected.movie}</span>
              <span className="tm-80s-dossier-role">{selected.role}</span>
              <span className="tm-80s-quote-counter">
                Line {activeQuoteIdx + 1}/{selected.quotes.length}
              </span>
            </div>

            <div className="tm-80s-dossier-quote" onClick={handleNextQuote} title="Click for next quote">
              “{activeQuote}”
            </div>

            <div className="tm-80s-dossier-actions">
              <button
                type="button"
                className="tm-80s-quote-btn"
                onClick={handleNextQuote}
              >
                💬 Next Quote ({activeQuoteIdx + 1}/{selected.quotes.length})
              </button>
              <button
                type="button"
                className={`tm-80s-quote-btn is-speak ${speakingId === selected.id ? 'is-speaking' : ''}`}
                onClick={handleSpeakLine}
              >
                {speakingId === selected.id ? '🎙️ Speaking...' : '🔊 Speak Line'}
              </button>
              <span className="tm-80s-quote-dots" aria-hidden="true">
                {selected.quotes.map((_, idx) => (
                  <span
                    key={idx}
                    className={`tm-80s-quote-dot ${idx === activeQuoteIdx ? 'is-on' : ''}`}
                    onClick={() => setQuoteIdxMap((prev) => ({ ...prev, [selected.id]: idx }))}
                  />
                ))}
              </span>
            </div>

            <div className="tm-80s-dossier-meta">
              <span className="tm-80s-meta-pill">
                🎟️ 1985 Prop: {selected.item80s} —{' '}
                <strong>{formatMoney(selected.priceTokens)}</strong>
              </span>
              {selected.id === 'hawke' && (
                <button
                  type="button"
                  className="tm-80s-chopper-btn is-airwolf"
                  onClick={() => triggerHelicopterFlyby('both', 'ACE VEGA: DOUBLE CHOPPER SCRAMBLE!')}
                >
                  ⚡ Scramble Night Viper + Sky Patrol
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            className="tm-80s-dossier-close"
            onClick={() => setSelectedId('')}
            aria-label="Close character dossier"
          >
            ✕
          </button>
        </div>
      )}
    </section>
  );
});

export default EightiesIconsStrip;
