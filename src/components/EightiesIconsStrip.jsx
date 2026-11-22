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
    name: 'Ferris',
    fullName: 'Ferris Bueller',
    movie: "Ferris Bueller's Day Off (1986)",
    role: 'Day-Off Legend',
    voiceMode: 'kitt',
    quotes: [
      "Life moves pretty fast. If you don't stop and play a little once in a while, you could miss it.",
      "I'm not saying we should skip work to play arcade games... okay, yeah, that's exactly what I'm saying.",
      "The question isn't 'what are we going to do', the question is 'what aren't we going to do?'",
      "A man with priorities so far out of whack doesn't deserve such a choice ride."
    ],
    priceTokens: 14,
    item80s: 'Matinee Ticket & Hot Dog',
    bg: '#3f2c12',
    accent: '#facc15'
  },
  {
    id: 'knight',
    name: 'Knight',
    fullName: 'Michael Knight & K.I.T.T.',
    movie: 'Knight Rider (1982)',
    role: 'FLAG Field Agent',
    voiceMode: 'kitt',
    quotes: [
      "One man can make a difference — especially with Turbo Boost and a full pocket of quarters.",
      "K.I.T.T., plot the fastest route to the Grand Arcade before the pizza runs out!",
      "Don't sweat it, pal. My Trans Am's scanner spotted a parking space three blocks back.",
      "If anyone asks for our high-score secret: Pursuit Mode and a black leather jacket."
    ],
    priceTokens: 28,
    item80s: 'K.I.T.T. Commlink Watch',
    bg: '#18181b',
    accent: '#ef4444'
  },
  {
    id: 'madonna',
    name: 'Material \'85',
    fullName: 'Madonna — Material Girl Era',
    movie: '1985 MTV Pop Icon',
    role: 'Synth-Pop Queen',
    voiceMode: 'valkyrie',
    quotes: [
      "We are living in a neon material world, and I am a Material Girl stacking gold tokens.",
      "Strike a pose! There's nothing to it — hit that dance floor like you own the spotlight.",
      "Express yourself, grab your fingerless lace gloves, and turn that boombox dial past ten.",
      "Holiday celebration awaits — big hair, loud synths, full volume, baby!"
    ],
    priceTokens: 18,
    item80s: 'Rubber Bracelets & Bow',
    bg: '#4a044e',
    accent: '#f472b6'
  },
  {
    id: 'terminator',
    name: 'T-800',
    fullName: 'Cyberdyne Systems Model 101',
    movie: 'The Terminator (1984)',
    role: 'Chrome Cyborg',
    voiceMode: 'hal',
    quotes: [
      "I'll be back... right after I beat this arcade high score.",
      "Come with me if you want to reach the next level before the credits roll.",
      "Your leather jacket, your sunglasses, and your last two bingo dabbers. Hand them over.",
      "Phased plasma rifle in a 40-watt range? No. Just give me a roll of 1984 quarters."
    ],
    priceTokens: 40,
    item80s: 'Gargoyles ANSI Sunglasses',
    bg: '#1f2937',
    accent: '#dc2626'
  },
  {
    id: 'robocop',
    name: 'RoboCop',
    fullName: 'Officer Alex Murphy',
    movie: 'RoboCop (1987)',
    role: 'OCP Enforcer',
    voiceMode: 'hal',
    quotes: [
      "Dead or alive, you're playing one more round at the arcade with me.",
      "Your move, creep. Pick a cabinet and show me your best high score.",
      "Prime Directive #4: Never walk past an open arcade cabinet without dropping a token.",
      "I'd buy THAT 1987 high score for a dollar!"
    ],
    priceTokens: 32,
    item80s: 'Auto-9 Chrome Holster',
    bg: '#0f172a',
    accent: '#94a3b8'
  },
  {
    id: 'venkman',
    name: 'Venkman',
    fullName: 'Dr. Peter Venkman',
    movie: 'Ghostbusters (1984)',
    role: 'Parapsychologist',
    voiceMode: 'kitt',
    quotes: [
      "We came, we saw, we kicked its paranormal bingo board!",
      "Don't cross the neon streams — the cleanup bill alone would haunt us.",
      "He slimed my scorecard! Wait... does green slime count as an extra dauber?",
      "Back off man, I'm a scientist... with three lines left on card two."
    ],
    priceTokens: 22,
    item80s: 'Pocket Ecto-Containment Beep',
    bg: '#14532d',
    accent: '#4ade80'
  },
  {
    id: 'ripley',
    name: 'Ripley',
    fullName: 'Warrant Officer Ellen Ripley',
    movie: 'Aliens (1986)',
    role: 'Power Loader Ace',
    voiceMode: 'valkyrie',
    quotes: [
      "Get away from that Full House card, you rival squad!",
      "Nuke the high-score table from orbit — it's the only way to be sure.",
      "I say we take off, grab a snack, and beat this high score clean.",
      "Check those corners. Something's moving behind the snack machine."
    ],
    priceTokens: 26,
    item80s: 'Weyland P-5000 Work Gloves',
    bg: '#1c1917',
    accent: '#facc15'
  },
  {
    id: 'marty',
    name: 'Marty',
    fullName: 'Marty McFly',
    movie: 'Back to the Future (1985)',
    role: '88 MPH Racer',
    voiceMode: 'kitt',
    quotes: [
      "Wait a minute, Doc — are you telling me an arcade quarter is still 25¢?",
      "Nobody calls me chicken when there's a high score on the line!",
      "Check out this hoverboard move... okay, 1985 still only has twin-kick skateboards.",
      "Guess you guys aren't ready for synth-wave yet... but your kids are gonna love it."
    ],
    priceTokens: 1,
    item80s: 'Hill Valley Pepsi Free',
    bg: '#431407',
    accent: '#fb923c'
  },
  {
    id: 'doc',
    name: 'Doc Brown',
    fullName: 'Dr. Emmett Brown',
    movie: 'Back to the Future (1985)',
    role: 'Flux Inventor',
    voiceMode: 'kitt',
    quotes: [
      "Great Scott! 1.21 gigawatts straight into the arcade cabinet!",
      "Roads? Where we're going, we don't need roads — we have four bingo scorecards!",
      "When this DeLorean speedometer hits 88 miles per hour, you're gonna see some serious high scores.",
      "Don't worry about the timeline, Marty — it's always Saturday night in 1985 here."
    ],
    priceTokens: 20,
    item80s: 'Twin Pines RadioShack Diode',
    bg: '#0f172a',
    accent: '#22d3ee'
  },
  {
    id: 'axel',
    name: 'Axel Foley',
    fullName: 'Det. Axel Foley',
    movie: 'Beverly Hills Cop (1984)',
    role: 'Detroit Undercover',
    voiceMode: 'kitt',
    quotes: [
      "I'm not gonna fall for a banana in the tailpipe... unless it comes with extra fries!",
      "Hey man, relax — the Axel F synth bassline just kicked in across the lobby.",
      "Don't tell the Chief I spent our per diem on arcade snacks.",
      "Trust me, I read that look — somebody at table 3 just tried the chilli fries."
    ],
    priceTokens: 19,
    item80s: 'Mumford High Varsity Jacket',
    bg: '#3b0764',
    accent: '#c084fc'
  },
  {
    id: 'gekko',
    name: 'Gekko',
    fullName: 'Gordon Gekko',
    movie: 'Wall Street (1987)',
    role: 'Corporate Raider',
    voiceMode: 'kitt',
    quotes: [
      "Greed, for lack of a better word, is good... especially at the snack bar.",
      "Money never sleeps, pal — and neither does the Wall Street ticker on Channel 5.",
      "Lunch is for wimps. Legends are setting high scores while sipping espresso.",
      "I don't throw darts at a board; I just wear really good red suspenders."
    ],
    priceTokens: 50,
    item80s: 'Motorola DynaTAC Brick Phone',
    bg: '#172554',
    accent: '#60a5fa'
  },
  {
    id: 'macgyver',
    name: 'MacGyver',
    fullName: 'Angus MacGyver',
    movie: 'MacGyver (1985)',
    role: 'Phoenix Troubleshooter',
    voiceMode: 'kitt',
    quotes: [
      "Give me a paperclip, three chewing gum wrappers, and a rubber band — I'll fix that CRT antenna.",
      "Never needed fancy gear when Swiss Army steel and quick math beat the clock.",
      "A little physics here, a dab of duct tape there, and our bingo hopper runs at twice the speed.",
      "Patience is everything. Wait for the exact angle, then drop the pin."
    ],
    priceTokens: 12,
    item80s: 'Red Swiss Army Pocket Knife',
    bg: '#064e3b',
    accent: '#34d399'
  },
  {
    id: 'max_headroom',
    name: 'Max Headroom',
    fullName: 'Max Headroom (20 Mins Into The Future)',
    movie: 'The Max Headroom Show (1985)',
    role: 'AI TV Anarchist',
    voiceMode: 'kitt',
    quotes: [
      "C-c-c-catch the wave, arcade viewers! Welcome back to b-b-breaking 80s mayhem!",
      "Television is the opiate of the masses — and you're looking sharp on C-C-CRT tonight!",
      "How do I know when someone hits Full House? My pixel hair glitches into neon turquoise!",
      "Stay tuned! Don't touch that rotary dial — unless you want to tune the vintage tube TV!"
    ],
    priceTokens: 24,
    item80s: 'Network 23 Hologram Sunglasses',
    bg: '#083344',
    accent: '#22d3ee'
  },
  {
    id: 'he_man',
    name: 'He-Man',
    fullName: 'Prince Adam / He-Man',
    movie: 'Masters of the Universe (1983)',
    role: 'Defender of Eternia',
    voiceMode: 'kitt',
    quotes: [
      "By the Power of Grayskull... I HAVE THE HIGH SCORE!",
      "Skeletor may try to steal the high score, but good vibes always triumph at the arcade.",
      "Remember kids: always share your snacks with the whole squad!",
      "Battle Cat loves 80s synthwave almost as much as weekend Saturday morning cartoons."
    ],
    priceTokens: 16,
    item80s: 'Power Sword Toy & Foil Shield',
    bg: '#422006',
    accent: '#f59e0b'
  },
  {
    id: 'mrt',
    name: 'B.A.',
    fullName: 'B.A. Baracus (Mr. T)',
    movie: 'The A-Team (1983)',
    role: 'Heavy Muscle',
    voiceMode: 'kitt',
    quotes: [
      "I pity the fool who skips breakfast before a high-score run!",
      "Ain't nobody gettin' me on no plane... unless Airwolf and Blue Thunder are escorting!",
      "I love it when a three-line bingo card plan comes together, sucker!",
      "Touch my gold chains and you're sleepin' outside behind the arcade van."
    ],
    priceTokens: 16,
    item80s: '1983 Gold Chain Starter',
    bg: '#27272a',
    accent: '#eab308'
  },
  {
    id: 'crockett',
    name: 'Crockett',
    fullName: 'Sonny Crockett',
    movie: 'Miami Vice (1984)',
    role: 'Vice Detective',
    voiceMode: 'kitt',
    quotes: [
      "Pastel blazer pressed, Wayfarers on, Jan Hammer cassette cranked to 11.",
      "Elvis the alligator guarded our Ferris Bueller Ferrari all night on Ocean Drive.",
      "Miami lights look best reflecting off pure cyan and hot magenta neon.",
      "No socks, white loafers, double espresso — let's cruise Ocean Drive."
    ],
    priceTokens: 25,
    item80s: 'Ocean Drive Espresso & Shades',
    bg: '#083344',
    accent: '#00f3ff'
  },
  {
    id: 'maverick',
    name: 'Maverick',
    fullName: 'Pete "Maverick" Mitchell',
    movie: 'Top Gun (1986)',
    role: 'Mach-2 Ace',
    voiceMode: 'kitt',
    quotes: [
      "I feel the need... the need for 80s arcade speed!",
      "Talk to me, Goose — is that a clean Full House trajectory on card one?",
      "Right down the Danger Zone highway with Danger Zone cranked full blast!",
      "Tower, this is Ghost Rider requesting a celebratory flyby over the arcade."
    ],
    priceTokens: 12,
    item80s: 'Miramar Aviator Polarized Specs',
    bg: '#1a2e05',
    accent: '#a3e635'
  },
  {
    id: 'hawke',
    name: 'Hawke',
    fullName: 'Stringfellow Hawke',
    movie: 'Airwolf (1984)',
    role: 'Stealth Pilot',
    voiceMode: 'kitt',
    quotes: [
      "Turbos armed. Scramble Airwolf or Blue Thunder on the double!",
      "Santini Air radar is tracking a hostile rival closing in on your high score.",
      "Silent whisper mode engaged until we cross the valley... then Mach-1 afterburners!",
      "Cello by the cabin lake by day, supersonic interceptor by night."
    ],
    priceTokens: 25,
    item80s: 'Santini Air Fuel Voucher',
    bg: '#020617',
    accent: '#38bdf8'
  },
  {
    id: 'bender',
    name: 'Bender',
    fullName: 'John Bender',
    movie: 'The Breakfast Club (1985)',
    role: 'The Criminal',
    voiceMode: 'kitt',
    quotes: [
      "Does Barry Manilow know that you raid his wardrobe?",
      "Screws fall out all the time — the arcade world is an imperfect place.",
      "Hey! You want another Saturday detention? Drop two quarters in the Pac-Man cab.",
      "Raised fist in the frozen football field at sunset — peak 1985."
    ],
    priceTokens: 5,
    item80s: 'Flannel & Fingerless Gloves',
    bg: '#450a0a',
    accent: '#ef4444'
  },
  {
    id: 'claire',
    name: 'Claire',
    fullName: 'Claire Standish',
    movie: 'The Breakfast Club (1985)',
    role: 'The Princess',
    voiceMode: 'valkyrie',
    quotes: [
      "Saturday detention never stopped diamond earrings.",
      "Yes, I brought sushi to the library — and yes, I'm still top of the high-score table.",
      "You know, popularity isn't free, but the arcade is.",
      "Don't mess up the shoulder pads in this pink blazer!"
    ],
    priceTokens: 15,
    item80s: 'Shermer Mall Sushi Box',
    bg: '#500724',
    accent: '#ec4899'
  },
  {
    id: 'allison',
    name: 'Allison',
    fullName: 'Allison Reynolds',
    movie: 'The Breakfast Club (1985)',
    role: 'The Basket Case',
    voiceMode: 'valkyrie',
    quotes: [
      "When you grow up, your heart dies — good thing memes are eternal.",
      "I made a sandwich out of Cap'n Crunch and pixy stix. Want a bite?",
      "I just sit in the corner with my oversized coat and quietly fill two lines.",
      "Vodka? No, give me Diet Tab and the spooky VHS rack."
    ],
    priceTokens: 2,
    item80s: "Cap'n Crunch Sandwich",
    bg: '#1e1b4b',
    accent: '#a855f7'
  },
  {
    id: 'brian',
    name: 'Brian',
    fullName: 'Brian Johnson',
    movie: 'The Breakfast Club (1985)',
    role: 'The Brain',
    voiceMode: 'kitt',
    quotes: [
      "Sincere calculations show the arcade high-score table is mathematically fascinating.",
      "Practice improves your high-score probability — though watch your snack burn rate!",
      "Excuse me, that wasn't a flare gun, it was my Commodore 64 power supply overheating.",
      "Look at the statistical spread across B-I-N-G-O columns: pure elegance."
    ],
    priceTokens: 3,
    item80s: 'Physics Lab Quarter Pack',
    bg: '#052e16',
    accent: '#4ade80'
  },
  {
    id: 'andrew',
    name: 'Andrew',
    fullName: 'Andrew Clark',
    movie: 'The Breakfast Club (1985)',
    role: 'The Athlete',
    voiceMode: 'kitt',
    quotes: [
      "Don't mess with the bull, young man — you'll get the horns.",
      "Do you have any idea what it takes to sprint all 15 squares on a single bingo card?",
      "Varsity letterman rules apply here: hustle hard and finish your laps early!",
      "Four sandwiches for lunch, four more for the road."
    ],
    priceTokens: 8,
    item80s: 'Varsity Letterman Patch',
    bg: '#172554',
    accent: '#38bdf8'
  },
  {
    id: 'cameron',
    name: 'Cameron',
    fullName: 'Cameron Frye',
    movie: "Ferris Bueller's Day Off (1986)",
    role: 'Co-Pilot',
    voiceMode: 'kitt',
    quotes: [
      "I am NOT putting another mile on my dad's 1961 GT California!",
      "Pardon my French, but you're an absolute legend if you beat that high score.",
      "When Cameron was in Egypt's land... let my bingo balls go!",
      "Okay, okay, I'll stay for one more game, just don't tell Ferris I liked it."
    ],
    priceTokens: 10,
    item80s: '#9 Red Wings Jersey',
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
          <rect x="3" y="2" width="10" height="4" fill="#171717" />
          <rect x="4" y="1" width="7" height="2" fill="#262626" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#18181b" />
          <rect x="4" y="14" width="8" height="1" fill="#ef4444" />
          <rect x="6" y="14" width="4" height="1" fill="#fca5a5" />
        </>
      )}

      {id === 'madonna' && (
        <>
          <rect x="4" y="1" width="8" height="2" fill="#0f172a" />
          <rect x="2" y="2" width="4" height="2" fill="#18181b" />
          <rect x="10" y="2" width="4" height="2" fill="#18181b" />
          <rect x="3" y="3" width="10" height="4" fill="#fde047" />
          <rect x="2" y="5" width="2" height="5" fill="#facc15" />
          <rect x="12" y="5" width="2" height="5" fill="#facc15" />
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
          <rect x="4" y="1" width="8" height="4" fill="#18181b" />
          <rect x="4" y="5" width="4" height="7" fill="#d4a383" />
          <rect x="8" y="5" width="4" height="7" fill="#94a3b8" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="2" height="2" fill="#111827" />
          <rect x="10" y="7" width="1" height="1" fill="#ef4444" />
          <rect x="6" y="10" width="4" height="1" fill="#475569" />
          <rect x="2" y="12" width="12" height="4" fill="#09090b" />
          <rect x="5" y="12" width="6" height="4" fill="#374151" />
        </>
      )}

      {id === 'robocop' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#cbd5e1" />
          <rect x="4" y="1" width="8" height="2" fill="#94a3b8" />
          <rect x="3" y="6" width="10" height="2" fill="#020617" />
          <rect x="5" y="7" width="6" height="1" fill="#ef4444" />
          <rect x="5" y="8" width="6" height="4" fill="#f3c6a5" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#64748b" />
          <rect x="5" y="12" width="6" height="3" fill="#e2e8f0" />
        </>
      )}

      {id === 'venkman' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#3f2314" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#a8a29e" />
          <rect x="3" y="12" width="2" height="4" fill="#451a03" />
          <rect x="11" y="12" width="2" height="4" fill="#4ade80" />
        </>
      )}

      {id === 'ripley' && (
        <>
          <rect x="3" y="1" width="10" height="5" fill="#1e1b18" />
          <rect x="2" y="4" width="2" height="4" fill="#1e1b18" />
          <rect x="12" y="4" width="2" height="4" fill="#1e1b18" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#4d7c0f" />
          <rect x="2" y="12" width="3" height="2" fill="#facc15" />
          <rect x="11" y="12" width="3" height="2" fill="#facc15" />
        </>
      )}

      {id === 'axel' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#09090b" />
          <rect x="4" y="5" width="8" height="7" fill="#8d5524" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#991b1b" />
          <rect x="5" y="12" width="6" height="4" fill="#94a3b8" />
          <rect x="3" y="13" width="2" height="2" fill="#fef3c7" />
        </>
      )}

      {id === 'gekko' && (
        <>
          <rect x="4" y="1" width="8" height="4" fill="#a16207" />
          <rect x="5" y="1" width="6" height="1" fill="#eab308" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7f1d1d" />
          <rect x="2" y="12" width="12" height="4" fill="#3b82f6" />
          <rect x="6" y="12" width="4" height="2" fill="#f8fafc" />
          <rect x="4" y="12" width="1" height="4" fill="#ef4444" />
          <rect x="11" y="12" width="1" height="4" fill="#ef4444" />
          <rect x="13" y="8" width="2" height="5" fill="#18181b" />
        </>
      )}

      {id === 'macgyver' && (
        <>
          <rect x="4" y="1" width="8" height="4" fill="#92400e" />
          <rect x="3" y="5" width="1" height="6" fill="#78350f" />
          <rect x="12" y="5" width="1" height="6" fill="#78350f" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#065f46" />
          <rect x="10" y="13" width="3" height="1" fill="#ef4444" />
        </>
      )}

      {id === 'max_headroom' && (
        <>
          <rect width="16" height="16" fill="#083344" />
          <rect x="4" y="1" width="8" height="4" fill="#fde047" />
          <rect x="6" y="1" width="6" height="2" fill="#fef9c3" />
          <rect x="4" y="5" width="8" height="7" fill="#fbcfe8" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="3" height="2" fill="#020617" />
          <rect x="7" y="7" width="2" height="1" fill="#22d3ee" />
          <rect x="6" y="10" width="4" height="1" fill="#be185d" />
          <rect x="2" y="12" width="12" height="4" fill="#0f172a" />
          <rect x="5" y="12" width="6" height="4" fill="#f8fafc" />
          <rect x="7" y="13" width="2" height="3" fill="#22d3ee" />
        </>
      )}

      {id === 'he_man' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#facc15" />
          <rect x="2" y="4" width="2" height="5" fill="#eab308" />
          <rect x="12" y="4" width="2" height="5" fill="#eab308" />
          <rect x="4" y="5" width="8" height="7" fill="#d97706" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#d97706" />
          <rect x="4" y="12" width="8" height="2" fill="#94a3b8" />
          <rect x="7" y="12" width="2" height="3" fill="#ef4444" />
        </>
      )}

      {id === 'bender' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#3b2314" />
          <rect x="2" y="4" width="2" height="4" fill="#3b2314" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="3" y="8" width="1" height="2" fill="#f59e0b" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#7c2d12" />
          <rect x="2" y="12" width="12" height="4" fill="#b91c1c" />
          <rect x="5" y="12" width="6" height="4" fill="#1f2937" />
          <rect x="6" y="13" width="4" height="1" fill="#f8fafc" />
        </>
      )}

      {id === 'claire' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#9a3412" />
          <rect x="2" y="5" width="2" height="6" fill="#9a3412" />
          <rect x="12" y="5" width="2" height="6" fill="#9a3412" />
          <rect x="4" y="5" width="8" height="7" fill="#fde2cc" />
          <rect x="3" y="9" width="1" height="1" fill="#f8fafc" />
          <rect x="12" y="9" width="1" height="1" fill="#f8fafc" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="7" y="10" width="2" height="1" fill="#ec4899" />
          <rect x="3" y="12" width="10" height="4" fill="#fbcfe8" />
          <rect x="6" y="12" width="4" height="2" fill="#fdf2f8" />
        </>
      )}

      {id === 'allison' && (
        <>
          <rect x="3" y="2" width="10" height="5" fill="#0f172a" />
          <rect x="4" y="4" width="3" height="2" fill="#0f172a" />
          <rect x="4" y="6" width="8" height="6" fill="#fae5d3" />
          <rect x="5" y="7" width="2" height="2" fill="#111827" />
          <rect x="9" y="7" width="2" height="2" fill="#111827" />
          <rect x="7" y="10" width="2" height="1" fill="#6b7280" />
          <rect x="2" y="12" width="12" height="4" fill="#374151" />
          <rect x="4" y="12" width="8" height="2" fill="#64748b" />
        </>
      )}

      {id === 'brian' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#eab308" />
          <rect x="4" y="5" width="8" height="7" fill="#fcd9bd" />
          <rect x="5" y="7" width="2" height="1" fill="#1e3a8a" />
          <rect x="9" y="7" width="2" height="1" fill="#1e3a8a" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="3" y="12" width="10" height="4" fill="#15803d" />
          <rect x="6" y="12" width="4" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'andrew' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#451a03" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="5" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="9" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#1d4ed8" />
          <rect x="5" y="12" width="6" height="4" fill="#e2e8f0" />
        </>
      )}

      {id === 'ferris' && (
        <>
          <rect x="4" y="1" width="8" height="4" fill="#5c3317" />
          <rect x="3" y="3" width="2" height="2" fill="#5c3317" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="7" y="7" width="2" height="1" fill="#0f172a" />
          <rect x="6" y="10" width="4" height="1" fill="#be123c" />
          <rect x="2" y="12" width="12" height="4" fill="#78350f" />
          <rect x="5" y="12" width="6" height="4" fill="#f8fafc" />
          <rect x="3" y="13" width="2" height="1" fill="#facc15" />
          <rect x="11" y="14" width="2" height="1" fill="#facc15" />
        </>
      )}

      {id === 'cameron' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#6b4423" />
          <rect x="4" y="5" width="8" height="7" fill="#f7d7c4" />
          <rect x="5" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="9" y="7" width="2" height="1" fill="#1e293b" />
          <rect x="6" y="10" width="4" height="1" fill="#7f1d1d" />
          <rect x="2" y="12" width="12" height="4" fill="#dc2626" />
          <rect x="5" y="12" width="6" height="2" fill="#f8fafc" />
        </>
      )}

      {id === 'marty' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#613318" />
          <rect x="4" y="5" width="8" height="7" fill="#f6cfb2" />
          <rect x="4" y="7" width="3" height="2" fill="#111827" />
          <rect x="9" y="7" width="3" height="2" fill="#111827" />
          <rect x="5" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="10" y="7" width="1" height="1" fill="#38bdf8" />
          <rect x="6" y="10" width="4" height="1" fill="#9a3412" />
          <rect x="2" y="12" width="12" height="4" fill="#ea580c" />
          <rect x="5" y="12" width="6" height="4" fill="#2563eb" />
        </>
      )}

      {id === 'doc' && (
        <>
          <rect x="2" y="1" width="3" height="6" fill="#f8fafc" />
          <rect x="11" y="1" width="3" height="6" fill="#f8fafc" />
          <rect x="4" y="1" width="8" height="3" fill="#e2e8f0" />
          <rect x="4" y="4" width="8" height="8" fill="#fbd8c5" />
          <rect x="4" y="7" width="8" height="2" fill="#94a3b8" />
          <rect x="5" y="7" width="2" height="2" fill="#22d3ee" />
          <rect x="9" y="7" width="2" height="2" fill="#22d3ee" />
          <rect x="6" y="10" width="4" height="1" fill="#0f172a" />
          <rect x="2" y="12" width="12" height="4" fill="#facc15" />
          <rect x="6" y="12" width="4" height="4" fill="#f1f5f9" />
        </>
      )}

      {id === 'crockett' && (
        <>
          <rect x="3" y="2" width="10" height="4" fill="#d97706" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="4" y="7" width="3" height="2" fill="#020617" />
          <rect x="9" y="7" width="3" height="2" fill="#020617" />
          <rect x="7" y="7" width="2" height="1" fill="#020617" />
          <rect x="5" y="11" width="6" height="1" fill="#94a3b8" />
          <rect x="2" y="12" width="12" height="4" fill="#f8fafc" />
          <rect x="5" y="12" width="6" height="4" fill="#06b6d4" />
        </>
      )}

      {id === 'mrt' && (
        <>
          <rect x="6" y="1" width="4" height="5" fill="#18181b" />
          <rect x="4" y="4" width="8" height="8" fill="#854d27" />
          <rect x="5" y="7" width="2" height="1" fill="#09090b" />
          <rect x="9" y="7" width="2" height="1" fill="#09090b" />
          <rect x="4" y="9" width="8" height="3" fill="#18181b" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#3f3f46" />
          <rect x="4" y="12" width="8" height="1" fill="#facc15" />
          <rect x="5" y="14" width="6" height="1" fill="#eab308" />
        </>
      )}

      {id === 'maverick' && (
        <>
          <rect x="4" y="2" width="8" height="3" fill="#1e293b" />
          <rect x="4" y="5" width="8" height="7" fill="#f3c6a5" />
          <rect x="4" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="9" y="7" width="3" height="2" fill="#0f172a" />
          <rect x="4" y="6" width="8" height="1" fill="#facc15" />
          <rect x="6" y="10" width="4" height="1" fill="#f8fafc" />
          <rect x="2" y="12" width="12" height="4" fill="#365314" />
          <rect x="5" y="12" width="6" height="4" fill="#e2e8f0" />
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
      aria-label="1980s Pop Culture Crew & Chopper Patrol"
    >
      <div className="tm-80s-cast-header">
        <div className="tm-80s-cast-title">
          <span className="tm-80s-crt-dot" aria-hidden="true" />
          <span>📺 1980s CLASSICS CREW ({EIGHTIES_ICON_CAST.length} ICONS)</span>
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
            🦅 Airwolf Flyby
          </button>
          <button
            type="button"
            className="tm-80s-chopper-btn is-bluethunder"
            onClick={() => triggerHelicopterFlyby('bluethunder')}
          >
            🚁 Blue Thunder
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
                💵 1985 Prop: {selected.item80s} —{' '}
                <strong>{formatMoney(selected.priceTokens)}</strong>
              </span>
              {selected.id === 'hawke' && (
                <button
                  type="button"
                  className="tm-80s-chopper-btn is-airwolf"
                  onClick={() => triggerHelicopterFlyby('both', 'HAWKE & MURPHY: DOUBLE CHOPPER SCRAMBLE!')}
                >
                  ⚡ Scramble Airwolf + Blue Thunder
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
