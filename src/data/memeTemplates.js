// ==========================================
// Meme Template Library (Nov 2026).
// Each template is OUR OWN ORIGINAL artwork of a well-known meme format (made with Google Gemini),
// not a copy of the famous photo, so the pictures are free for everyone to use and share.
//
// Shared by the React app (TemplateLibraryPage / TemplatePage / MemeForge), the static
// prerenderer (scripts/prerender-seo.mjs) and the live sitemap (api/sitemap.js).
//
// slots: caption boxes in 0–1 image coordinates (x/y = centre, w/h = size).
//   style 'impact' = white Impact with black outline (classic meme text)
//   style 'dark'   = bold black text for white/light panels
//   style 'sign'   = bold white text without outline (road signs, dark plates)
// ==========================================

export const TEMPLATE_IMAGE_DIR = '/meme-templates';

const SLOT_STYLES = {
  impact: { font: 'Anton', fill: '#ffffff', stroke: 0.09, strokeColor: '#000000', caps: true },
  dark: { font: 'Inter', fill: '#111111', stroke: 0, strokeColor: '#ffffff', caps: false },
  sign: { font: 'Inter', fill: '#ffffff', stroke: 0, strokeColor: '#000000', caps: false }
};

export function slotLayerStyle(style = 'impact') {
  return SLOT_STYLES[style] || SLOT_STYLES.impact;
}

// Classic top + bottom Impact captions.
const topBottom = (top = 'Top text', bottom = 'Bottom text') => [
  { label: top, style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
  { label: bottom, style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.14 }
];

// Templates without `height` are 1080x1080; the rest are 1080 wide.
const RAW_TEMPLATES = [
  {
    slug: 'two-buttons',
    name: 'Two Buttons',
    aka: ['Daily Struggle', 'Two Red Buttons', 'Sweating Guy Buttons'],
    category: 'relatable',
    summary: 'A nervous man sweats over two big red buttons he can’t choose between.',
    meaning:
      'Two Buttons is the go-to meme for an impossible choice. The top panel shows two big red buttons, each labelled with an option, and the bottom panel shows someone sweating buckets because they can’t pick. The joke works best when both options are equally tempting, contradictory, or equally bad.',
    howTo:
      'Write one option on each button label, then optionally label the sweating man as yourself, a group or a brand. Keep each button to two to five words so it fits the label plate.',
    aiHint: 'Two Buttons: two button labels for two conflicting options, plus a label for the sweating person who cannot choose.',
    slots: [
      { label: 'Left button', style: 'dark', x: 0.255, y: 0.152, w: 0.27, h: 0.1 },
      { label: 'Right button', style: 'dark', x: 0.565, y: 0.097, w: 0.22, h: 0.085 },
      { label: 'Sweating person', style: 'impact', x: 0.5, y: 0.93, w: 0.92, h: 0.12 }
    ],
    examples: [
      ['Go to bed early', 'Watch one more episode', 'Me at 1 AM'],
      ['Save money', 'Order takeaway again', 'My bank account'],
      ['Reply now', 'Leave them on read', 'Introverts']
    ]
  },
  {
    slug: 'drake-reject-approve',
    hidden: true, // Legal hold, D-003 Finding 6 (21 Nov 2026). Not deleted.
    name: 'Reject / Approve (Drake-style)',
    aka: ['Drake Meme', 'Drake Hotline Bling', 'No / Yes Meme', 'Hotline Bling Meme'],
    category: 'relatable',
    summary: 'A guy in an orange puffer jacket rejects one thing and happily approves another.',
    meaning:
      'The reject / approve format, best known as the “Drake meme”, compares two things. In the top panel the character turns away in disgust; in the bottom panel he points and smiles in approval. The thing on top is what you reject, the thing on the bottom is what you prefer, and the funniest versions make the approved option sillier than the rejected one.',
    howTo:
      'Put the thing you reject in the top-right box and the thing you prefer in the bottom-right box. Short phrases work best because the boxes are square.',
    aiHint: 'Reject/approve (Drake format): first line = the thing rejected, second line = the thing preferred.',
    slots: [
      { label: 'Rejected (top)', style: 'dark', x: 0.755, y: 0.245, w: 0.44, h: 0.42 },
      { label: 'Approved (bottom)', style: 'dark', x: 0.755, y: 0.755, w: 0.44, h: 0.42 }
    ],
    examples: [
      ['Fixing the bug', 'Renaming the bug a feature'],
      ['Going to the gym', 'Buying gym clothes'],
      ['Reading the instructions', 'Guessing and hoping']
    ]
  },
  {
    slug: 'distracted-boyfriend',
    name: 'Distracted Boyfriend',
    aka: ['Guy Looking At Another Girl', 'Jealous Girlfriend Meme', 'Man Looking Back'],
    category: 'relatable',
    summary: 'A man holding his girlfriend’s hand turns to stare at a woman in red while his girlfriend glares at him.',
    meaning:
      'Distracted Boyfriend is about being tempted away from what you already have. The boyfriend is you (or anyone), the woman walking past is the shiny new temptation, and the outraged girlfriend is the responsibility you should be paying attention to. It works for hobbies, brands, games, habits and anything with a loyal option and a tempting new one.',
    howTo:
      'Label the new temptation (left), the distracted person (middle) and the thing being neglected (right). One or two words per label is ideal.',
    aiHint: 'Distracted Boyfriend: three labels: the new temptation (woman passing), the distracted person (boyfriend), the neglected thing (girlfriend).',
    slots: [
      { label: 'Temptation (left)', style: 'impact', x: 0.25, y: 0.66, w: 0.4, h: 0.14 },
      { label: 'Distracted person', style: 'impact', x: 0.61, y: 0.6, w: 0.3, h: 0.12 },
      { label: 'Neglected (right)', style: 'impact', x: 0.85, y: 0.74, w: 0.28, h: 0.14 }
    ],
    examples: [
      ['A new game', 'Me', 'The 40 games I already own'],
      ['Starting a new project', 'Developers', 'Finishing the old one'],
      ['Doom scrolling', 'My brain', 'Sleep']
    ]
  },
  {
    slug: 'expanding-brain',
    name: 'Expanding Brain',
    aka: ['Galaxy Brain', 'Brain Size Meme', 'Glowing Brain'],
    category: 'tech',
    summary: 'Four panels of a brain getting bigger and brighter, from small to cosmic.',
    meaning:
      'Expanding Brain ranks four ideas from “normal” to “galaxy-brained”. Each panel’s brain glows brighter, which pretends the ideas get smarter, but the joke is usually that they get more ridiculous. The final, cosmic brain should be the most absurd or overthought option.',
    howTo:
      'Write four ideas in the white boxes from top to bottom, starting sensible and ending ridiculous. Keep each line short so it fits beside the brain.',
    aiHint: 'Expanding Brain: four lines from sensible to absurdly overthought, one per brain level.',
    slots: [
      { label: 'Small brain', style: 'dark', x: 0.25, y: 0.125, w: 0.46, h: 0.22 },
      { label: 'Normal brain', style: 'dark', x: 0.25, y: 0.375, w: 0.46, h: 0.22 },
      { label: 'Glowing brain', style: 'dark', x: 0.25, y: 0.625, w: 0.46, h: 0.22 },
      { label: 'Galaxy brain', style: 'dark', x: 0.25, y: 0.875, w: 0.46, h: 0.22 }
    ],
    examples: [
      ['Sleeping 8 hours', 'Sleeping 6 hours', 'Napping at lunch', 'Never sleeping and calling it a lifestyle'],
      ['Writing notes', 'Making flashcards', 'Rewatching the lecture', 'Learning it all the night before'],
      ['Saving money', 'Investing', 'Crypto', 'Spending it all so inflation can’t get it']
    ]
  },
  {
    slug: 'this-is-fine',
    name: 'This Is Fine (Everything Is Fine)',
    aka: ['Everything Is Fine', 'Room On Fire Meme', 'Calm In Chaos'],
    category: 'relatable',
    summary: 'A calm hamster sips coffee at the table while the whole room burns.',
    meaning:
      'This Is Fine is about pretending everything is under control while disaster happens all around you. The character smiles and sips coffee in a burning room. Use it for exams, deadlines, group chats, the news, or any situation where you are calmly ignoring the obvious fire.',
    howTo:
      'Put the disaster at the top and the calm denial at the bottom, or use a single line like “this is fine” for the classic version.',
    aiHint: 'This Is Fine: top = the disaster happening, bottom = the calm, in-denial reaction.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.14 }
    ],
    examples: [
      ['Exam tomorrow, haven’t started', 'This is fine'],
      ['14 browser tabs, 3 deadlines, 0 plans', 'Everything is under control'],
      ['When the group project is due in an hour', 'I work better under pressure']
    ]
  },
  {
    slug: 'change-my-mind',
    name: 'Change My Mind',
    aka: ['Prove Me Wrong', 'Sign On Table Meme', 'Change My Mind Sign'],
    category: 'relatable',
    summary: 'A smug guy sits behind a table with a blank sign, daring you to argue.',
    meaning:
      'Change My Mind is for stating a hot take and daring people to argue. A confident man sits behind a table holding a coffee, with your opinion on the sign in front of him. The best signs are short, confident and slightly controversial.',
    howTo:
      'Write your hot take on the sign. Keep it to one short sentence; the classic ending is your take followed by nothing else, because the format already implies “change my mind”.',
    aiHint: 'Change My Mind: one short, confident hot take written on the sign.',
    slots: [{ label: 'Sign', style: 'dark', x: 0.5, y: 0.685, w: 0.44, h: 0.26 }],
    examples: [['Cereal is soup'], ['Mondays should be optional'], ['Pineapple belongs on pizza']]
  },
  {
    slug: 'woman-yelling-at-cat',
    hidden: true, // Legal hold, D-003 Finding 6 (21 Nov 2026). Not deleted.
    name: 'Woman Yelling at Cat',
    aka: ['Lady Yelling At Cat', 'Angry Woman And Cat', 'Cat At Dinner Table'],
    category: 'dank',
    summary: 'A crying woman yells and points while a white cat at the dinner table looks unbothered.',
    meaning:
      'Woman Yelling at Cat is a two-sided argument. On the left, someone is furious and emotional; on the right, the cat calmly replies with something smug, confused or completely unbothered. Write the angry accusation on the left and the cat’s deadpan reply on the right.',
    howTo:
      'Put the angry accusation above the woman and the cat’s calm reply above the cat. It works best as a real back-and-forth.',
    aiHint: 'Woman Yelling at Cat: line 1 = angry accusation from the woman, line 2 = the cat’s calm, smug or confused reply.',
    slots: [
      { label: 'Woman (angry)', style: 'dark', x: 0.25, y: 0.08, w: 0.46, h: 0.14 },
      { label: 'Cat (reply)', style: 'dark', x: 0.75, y: 0.08, w: 0.46, h: 0.14 }
    ],
    examples: [
      ['You said you’d only play one game!', 'It was a best of 7'],
      ['You ate all the snacks!', 'You bought them for a reason'],
      ['Why are you awake at 3 AM?', 'Why are you?']
    ]
  },
  {
    slug: 'stonks',
    name: 'Stonks',
    aka: ['Stonks Guy', 'Stocks Meme', 'Not Stonks', 'Meme Man Stonks'],
    category: 'tech',
    summary: 'A smug mannequin businessman in front of a green chart shooting upwards.',
    meaning:
      'Stonks mocks bad financial or life decisions dressed up as genius moves. The proud businessman stands in front of a rocketing green chart, celebrating a “gain” that is obviously not a gain. Deliberately misspelling “stonks” is part of the joke.',
    howTo:
      'Write the questionable decision at the top and “stonks” at the bottom, or put the whole joke in one line.',
    aiHint: 'Stonks: top = a ridiculous decision presented as genius, bottom = usually just “stonks”.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.9, w: 0.94, h: 0.16 }
    ],
    examples: [
      ['Buys a £5 coffee to save time', 'Stonks'],
      ['Sells my old phone, buys a case for the new one', 'Stonks'],
      ['Finds £10 in last year’s coat', 'Stonks']
    ]
  },
  {
    slug: 'gigachad',
    name: 'Gigachad',
    aka: ['Chad Meme', 'Average Enjoyer', 'Chad Face'],
    category: 'dank',
    summary: 'A black-and-white portrait of an impossibly chiseled, confident man.',
    meaning:
      'The Gigachad format celebrates someone calmly and confidently doing the “uncool” or unbothered thing. It is often paired with phrases like “average enjoyer” or used to show the ultra-confident side of an argument.',
    howTo:
      'Write the confident, unbothered take at the bottom, with an optional setup line on top.',
    aiHint: 'Gigachad: top = setup or a common complaint, bottom = the calm, ultra-confident response.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.14 }
    ],
    examples: [
      ['Everyone: skips the tutorial', 'Me: reads the whole manual'],
      ['They said the sequel was bad', 'I liked it'],
      ['Pineapple on pizza enjoyer', 'Yes']
    ]
  },
  {
    slug: 'clown-makeup',
    name: 'Clown Makeup',
    aka: ['Clown Applying Makeup', 'Putting On Clown Makeup', 'Clown Meme'],
    category: 'dank',
    summary: 'Four panels of a man slowly turning himself into a full clown in the mirror.',
    meaning:
      'Clown Makeup shows someone making themselves look more foolish with every decision. Each panel adds more makeup until he is a full clown. Write four escalating bad decisions or bad takes, with the last one being the most foolish.',
    howTo:
      'Write four steps of the same bad idea in the white boxes, getting worse each time.',
    aiHint: 'Clown Makeup: four escalating steps of a foolish decision or belief, last one the worst.',
    slots: [
      { label: 'Step 1', style: 'dark', x: 0.25, y: 0.125, w: 0.46, h: 0.22 },
      { label: 'Step 2', style: 'dark', x: 0.25, y: 0.375, w: 0.46, h: 0.22 },
      { label: 'Step 3', style: 'dark', x: 0.25, y: 0.625, w: 0.46, h: 0.22 },
      { label: 'Step 4', style: 'dark', x: 0.25, y: 0.875, w: 0.46, h: 0.22 }
    ],
    examples: [
      ['I’ll just watch one episode', 'OK, one more', 'It’s only 2 AM', 'Work is optional anyway'],
      ['This bug will take 5 minutes', 'Maybe 10', 'I’ll rewrite the whole file', 'It worked before I touched it'],
      ['I’ll start the diet Monday', 'Next Monday', 'After the holidays', 'Diets are a social construct']
    ]
  },
  {
    slug: 'surprised-face',
    name: 'Surprised Shock Face',
    aka: ['Shocked Face Meme', 'Surprised Hamster', 'Shook Meme'],
    category: 'dank',
    summary: 'A round, fluffy hamster frozen with a wide-open mouth in total disbelief.',
    meaning:
      'The shocked-face format is for being surprised by something completely predictable. Set up a choice with an obvious consequence, then show the shocked face at the result. The more obvious the outcome, the funnier it is.',
    howTo:
      'Write the setup and the obvious consequence at the top, and an optional reaction at the bottom.',
    aiHint: 'Surprised face: top = an obvious cause and effect, bottom = optional shocked reaction.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.1, w: 0.94, h: 0.18 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.12 }
    ],
    examples: [
      ['Stays up all night, is tired the next day', ''],
      ['Doesn’t charge phone, phone dies', 'Me:'],
      ['Doesn’t study, fails test', '']
    ]
  },
  {
    slug: 'trade-offer',
    name: 'Trade Offer',
    aka: ['Trade Offer Guy', 'I Receive You Receive', 'Trade Deal Meme'],
    category: 'dank',
    summary: 'A man in a suit presents a deal with his hands out: I receive, you receive.',
    meaning:
      'Trade Offer presents a hilariously one-sided deal. The header says “Trade offer”, the left side says what “I receive” and the right side what “you receive”. The joke is usually that one side gets everything and the other gets something useless.',
    howTo:
      'Use the header for “Trade offer”, then fill in what I receive (left) and what you receive (right).',
    aiHint: 'Trade Offer: line 1 = header (usually “Trade offer”), line 2 = “I receive: …”, line 3 = “You receive: …”.',
    slots: [
      { label: 'Header', style: 'impact', x: 0.5, y: 0.08, w: 0.9, h: 0.12 },
      { label: 'I receive (left)', style: 'impact', x: 0.17, y: 0.52, w: 0.3, h: 0.24 },
      { label: 'You receive (right)', style: 'impact', x: 0.83, y: 0.52, w: 0.3, h: 0.24 }
    ],
    examples: [
      ['Trade offer', 'I receive: your fries', 'You receive: my company'],
      ['Trade offer', 'I receive: the last slice', 'You receive: a high five'],
      ['Trade offer', 'I receive: 8 hours sleep', 'You receive: a quiet morning']
    ]
  },
  {
    slug: 'bell-curve',
    name: 'IQ Bell Curve',
    aka: ['Midwit Meme', 'Bell Curve Meme', 'IQ Distribution Meme'],
    category: 'tech',
    summary: 'A happy simple guy and a calm wise monk agree, while the overthinker in the middle cries.',
    meaning:
      'The bell curve (or “midwit”) meme shows that the simplest and the wisest people often reach the same answer, while the person in the middle overthinks everything. The left and right characters say the same simple thing; the middle one rants a long, stressed explanation.',
    howTo:
      'Give the left and right characters the same short answer, and the crying character in the middle a long, overcomplicated one.',
    aiHint: 'IQ bell curve: line 1 = simple answer (left), line 2 = overcomplicated stressed rant (middle), line 3 = the same simple answer (right).',
    slots: [
      { label: 'Simple (left)', style: 'dark', x: 0.16, y: 0.48, w: 0.28, h: 0.14 },
      { label: 'Overthinker (middle)', style: 'dark', x: 0.5, y: 0.1, w: 0.62, h: 0.16 },
      { label: 'Wise (right)', style: 'dark', x: 0.84, y: 0.48, w: 0.28, h: 0.14 }
    ],
    examples: [
      ['Just turn it off and on again', 'No, you need to check the drivers, the registry, the BIOS…', 'Just turn it off and on again'],
      ['Eat when hungry', 'You must track every macro and fast for 16 hours', 'Eat when hungry'],
      ['Sleep is good', 'Sleep is for the weak, grind 24/7', 'Sleep is good']
    ]
  },
  {
    slug: 'exit-ramp',
    name: 'Exit Ramp (Left Exit 12 Off Ramp)',
    aka: ['Left Exit 12 Off Ramp', 'Car Swerving Exit Meme', 'Highway Exit Meme'],
    category: 'relatable',
    summary: 'A red sports car swerves onto the exit ramp at the last second under two road signs.',
    meaning:
      'The exit ramp meme shows someone dramatically choosing the worse option at the last second. One road sign is the sensible path, the other is the tempting exit, and the car (you) swerves hard towards the exit.',
    howTo:
      'Write the sensible choice on the left sign, the tempting choice on the right sign, and label the car as the person making the choice.',
    aiHint: 'Exit ramp: line 1 = sensible choice (straight-on sign), line 2 = tempting choice (exit sign), line 3 = who is swerving (the car).',
    slots: [
      { label: 'Straight on (left sign)', style: 'sign', x: 0.312, y: 0.216, w: 0.25, h: 0.13 },
      { label: 'Exit (right sign)', style: 'sign', x: 0.691, y: 0.216, w: 0.25, h: 0.13 },
      { label: 'The car', style: 'impact', x: 0.6, y: 0.76, w: 0.6, h: 0.11 }
    ],
    examples: [
      ['Doing my homework', 'Rearranging my room', 'Me at 9 PM'],
      ['Saving for a house', 'Limited edition sneakers', 'My wallet'],
      ['Going to sleep', 'Researching the Roman Empire', 'Me at midnight']
    ]
  },
  {
    slug: 'pointing-at-each-other',
    name: 'Pointing at Each Other',
    aka: ['Two Guys Pointing', 'Same Person Pointing', 'Twins Pointing Meme'],
    category: 'dank',
    summary: 'Two identical twins in orange jumpsuits point accusingly at each other.',
    meaning:
      'The pointing format is for two people, groups or things that are exactly the same but accuse each other, or that discover they are basically identical. Label each twin, and the joke writes itself.',
    howTo:
      'Label the left twin and the right twin with two things that are secretly the same.',
    aiHint: 'Pointing at each other: two labels for two things that are secretly identical or blame each other.',
    slots: [
      { label: 'Left twin', style: 'impact', x: 0.27, y: 0.12, w: 0.48, h: 0.14 },
      { label: 'Right twin', style: 'impact', x: 0.73, y: 0.12, w: 0.48, h: 0.14 }
    ],
    examples: [
      ['Cat people', 'Dog people'],
      ['Me blaming the Wi-Fi', 'The Wi-Fi blaming me'],
      ['Frontend devs', 'Backend devs']
    ]
  },
  {
    slug: 'hide-the-pain',
    name: 'Hide the Pain',
    aka: ['Hiding The Pain Meme', 'Smiling Through Pain', 'Forced Smile Meme'],
    category: 'relatable',
    summary: 'A kind older man at a laptop gives a forced smile while his eyes scream inside.',
    meaning:
      'Hide the Pain is about smiling politely while you are suffering inside. The man’s cheerful stock-photo smile and pained eyes are perfect for awkward work moments, family dinners, group chats and anything you have to pretend is fine.',
    howTo:
      'Write the painful situation on top and the forced polite reaction at the bottom.',
    aiHint: 'Hide the Pain: top = a painful or awkward situation, bottom = the forced polite response.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.14 }
    ],
    examples: [
      ['When the meeting could have been an email', 'Great point, let’s circle back'],
      ['Grandma asks if I’m still single', 'Haha, yep'],
      ['Teacher: “this will be on the test”', 'Me who wasn’t listening:']
    ]
  },
  {
    slug: 'panik-kalm-panik',
    name: 'Panik Kalm Panik',
    aka: ['Panic Calm Panic', 'Panik Kalm', 'Panik Meme'],
    category: 'dank',
    summary: 'A frazzled owl panics, then calms down, then panics even harder.',
    meaning:
      'Panik Kalm Panik follows a three-step emotional rollercoaster: something scary happens (panic), something reassuring happens (calm), then something even worse is revealed (panic again). The misspelling “panik / kalm” is part of the classic joke.',
    howTo:
      'Write the scary thing, the reassuring thing and the worse twist in the three white boxes.',
    aiHint: 'Panik Kalm Panik: three lines: scary event, reassuring fact, worse twist.',
    slots: [
      { label: 'Panic', style: 'dark', x: 0.25, y: 0.167, w: 0.46, h: 0.3 },
      { label: 'Calm', style: 'dark', x: 0.25, y: 0.5, w: 0.46, h: 0.3 },
      { label: 'Panic again', style: 'dark', x: 0.25, y: 0.833, w: 0.46, h: 0.3 }
    ],
    examples: [
      ['Surprise test today', 'It’s open book', 'You left your book at home'],
      ['Phone at 1%', 'Charger in bag', 'Wrong charger'],
      ['Mum calls my full name', 'She just wants help with the TV', 'She found my report card']
    ]
  },
  {
    slug: 'side-eye-monkey',
    name: 'Side-Eye Monkey',
    aka: ['Monkey Puppet Meme', 'Awkward Look Monkey', 'Side Eye Meme'],
    category: 'relatable',
    summary: 'A fluffy orange monkey plush stares ahead, then nervously glances to the side.',
    meaning:
      'The side-eye monkey is the reaction to an awkward or guilty moment: when someone says something that applies to you and you look away hoping nobody notices. One line of setup is all it needs.',
    howTo: 'Write the awkward situation at the top. The two panels do the rest.',
    aiHint: 'Side-eye monkey: one line describing an awkward moment where you feel guilty or called out.',
    slots: [{ label: 'Top text', style: 'dark', x: 0.5, y: 0.125, w: 0.94, h: 0.2 }],
    examples: [
      ['Teacher: “Someone didn’t do the homework”'],
      ['When mum asks who finished the biscuits'],
      ['When the tutorial says “don’t do this” and you already did']
    ]
  },
  {
    slug: 'two-guys-on-a-bus',
    name: 'Two People on a Bus',
    aka: ['Two Guys On A Bus', 'Bus Window Meme', 'Rock Wall Vs View'],
    category: 'relatable',
    summary: 'On a bus, one passenger stares sadly at a rock wall while the other enjoys a lake view.',
    meaning:
      'Two People on a Bus compares two perspectives on the same situation. The sad passenger stares at a dull rock wall; the happy one sees a stunning view. Label each side with who they are and how they see things.',
    howTo: 'Label the sad side (left) and the happy side (right) with two different outlooks.',
    aiHint: 'Two people on a bus: line 1 = the gloomy side (rock wall), line 2 = the happy side (lake view).',
    slots: [
      { label: 'Gloomy side', style: 'dark', x: 0.25, y: 0.125, w: 0.46, h: 0.2 },
      { label: 'Happy side', style: 'dark', x: 0.75, y: 0.125, w: 0.46, h: 0.2 }
    ],
    examples: [
      ['People who check their exam results', 'People who don’t'],
      ['Me reading the news', 'My dog'],
      ['Monday', 'Friday']
    ]
  },
  {
    slug: 'car-salesman-slaps-roof',
    name: 'Car Salesman Slaps Roof',
    aka: ['Slaps Roof Of Car', 'This Bad Boy Can Fit', 'Car Salesman Meme'],
    category: 'dank',
    summary: 'A grinning car salesman slaps the roof of a shiny hatchback on the forecourt.',
    meaning:
      'Car Salesman Slaps Roof is a sales-pitch joke. The classic line is “*slaps roof of car* this bad boy can fit so much ___ in it”. Swap the car for anything and fill it with something ridiculous.',
    howTo:
      'Write the slap line at the top and the absurd pitch at the bottom.',
    aiHint: 'Car salesman: top = “*slaps roof of …*”, bottom = “this bad boy can fit so much … in it” with something absurd.',
    slots: [
      { label: 'Top text', style: 'impact', x: 0.5, y: 0.08, w: 0.94, h: 0.14 },
      { label: 'Bottom text', style: 'impact', x: 0.5, y: 0.92, w: 0.94, h: 0.14 }
    ],
    examples: [
      ['*slaps roof of brain*', 'This bad boy can fit so many song lyrics and zero exam answers'],
      ['*slaps roof of phone*', 'This bad boy can fit so many screenshots you’ll never look at'],
      ['*slaps roof of backpack*', 'This bad boy can fit so many crumpled worksheets']
    ]
  },
  {
    slug: 'four-step-plan',
    name: 'Four-Step Plan',
    aka: ['Plan Meme', 'Flip Chart Plan', 'Presentation Plan Meme', 'Step 4 Plan'],
    category: 'relatable',
    summary: 'An inventor proudly presents a plan on a flip chart, then spots the flaw in step four.',
    meaning:
      'The Four-Step Plan meme shows a plan that sounds great for three steps. In the fourth panel the presenter repeats step three and finally notices the problem, staring at the chart in horror. The joke is that the flaw was obvious all along.',
    howTo:
      'Write steps one to three on the first three flip charts, then repeat step three (or the obvious catch) on the fourth. Keep each step short so it fits the chart.',
    aiHint: 'Four-step plan: three plan steps that sound fine, then a fourth that repeats step three or reveals the obvious flaw.',
    slots: [
      { label: 'Step 1', style: 'dark', x: 0.14, y: 0.18, w: 0.18, h: 0.28 },
      { label: 'Step 2', style: 'dark', x: 0.64, y: 0.18, w: 0.17, h: 0.28 },
      { label: 'Step 3', style: 'dark', x: 0.385, y: 0.69, w: 0.19, h: 0.26 },
      { label: 'Step 4 (the flaw)', style: 'dark', x: 0.875, y: 0.69, w: 0.17, h: 0.26 }
    ],
    examples: [
      ['Start a diet', 'Buy healthy food', 'Feel great', 'Feel great so order pizza'],
      ['Wake up early', 'Go for a run', 'Be productive', 'Be productive tomorrow instead'],
      ['Save money', 'Stop buying coffee', 'Have more money', 'Have more money for coffee']
    ]
  },
  {
    slug: 'once-again-asking',
    name: 'I Am Once Again Asking',
    aka: ['Bernie Once Again Asking', 'Once Again Asking Meme', 'Bernie Sanders Meme', 'I Am Once Again Asking For'],
    category: 'dank',
    summary: 'A weary man at a podium looks into the camera and pleads for the same thing yet again.',
    meaning:
      'I Am Once Again Asking is for a request you have made many, many times before. The tired, earnest speaker makes it clear they are fed up of asking, which makes the request funnier the smaller it is.',
    howTo:
      'Keep the top line as “I am once again asking” and put the thing you keep asking for at the bottom.',
    aiHint: 'Once again asking: top = “I am once again asking”, bottom = the small thing being asked for yet again.',
    slots: topBottom(),
    height: 603,
    examples: [
      ['I am once again asking', 'for someone to reply in the group chat'],
      ['I am once again asking', 'for you to put the lid back on the milk'],
      ['I am once again asking', 'for one weekend without homework']
    ]
  },
  {
    slug: 'is-this-a-pigeon',
    name: 'Is This a Pigeon?',
    aka: ['Is This A Butterfly', 'Butterfly Meme', 'Anime Butterfly Guy', 'Is This A Meme'],
    category: 'dank',
    summary: 'A puzzled anime man gestures at a butterfly and gets completely the wrong idea.',
    meaning:
      'Is This a Pigeon? is about confidently misunderstanding something. Label the man (who is confused), the butterfly (what he sees) and the bottom question (his wrong conclusion). The bigger the misunderstanding, the better.',
    howTo:
      'Label the man, label the butterfly, then write his wrong conclusion as a question along the bottom, such as “Is this a …?”.',
    aiHint: 'Is this a pigeon: line 1 = the confused person, line 2 = the thing they see, line 3 = their wrong “Is this a …?” question.',
    slots: [
      { label: 'The person', style: 'impact', x: 0.4, y: 0.62, w: 0.32, h: 0.12 },
      { label: 'The butterfly', style: 'impact', x: 0.8, y: 0.45, w: 0.34, h: 0.12 },
      { label: 'The question', style: 'dark', x: 0.5, y: 0.91, w: 0.94, h: 0.14 }
    ],
    height: 603,
    examples: [
      ['Me', 'One sunny day', 'Is this summer?'],
      ['My dad', 'Any button on the remote', 'Is this the internet?'],
      ['Me', 'A slightly hard question', 'Is this an exam?']
    ]
  },
  {
    slug: 'disaster-girl',
    hidden: true, // Legal hold, D-003 Finding 6 (21 Nov 2026). Not deleted.
    name: 'Disaster Girl',
    aka: ['Girl Smiling At Fire', 'House On Fire Girl', 'Burning House Girl'],
    category: 'relatable',
    summary: 'A little girl smiles knowingly at the camera while a house burns behind her.',
    meaning:
      'Disaster Girl is for quietly enjoying chaos you may (or may not) have caused. The child looks pleased and innocent while everything behind her goes up in flames.',
    howTo: 'Put the chaos at the top and the smug, guilty reaction at the bottom.',
    aiHint: 'Disaster Girl: top = the chaos that happened, bottom = the smug, guilty or innocent reaction.',
    slots: topBottom(),
    height: 806,
    examples: [
      ['When you reply-all by accident', 'and it wasn’t even your fault'],
      ['Told the group chat “someone” ate the cake', 'Watching it unfold'],
      ['Mentioned pineapple pizza at dinner', 'and walked away']
    ]
  },
  {
    slug: 'success-kid',
    name: 'Success Kid',
    aka: ['Fist Pump Baby', 'Victory Baby', 'I Hate Sandcastles'],
    category: 'relatable',
    summary: 'A toddler on the beach clenches a fist of sand in a proud, determined fist pump.',
    meaning:
      'Success Kid celebrates small, satisfying wins. The tinier and more everyday the victory, the funnier the determined fist pump becomes.',
    howTo: 'Set up the situation at the top and the small win at the bottom.',
    aiHint: 'Success Kid: top = the situation, bottom = the small, satisfying win.',
    slots: topBottom(),
    examples: [
      ['Found chips in the cupboard', 'that I forgot I bought'],
      ['Teacher forgot to set homework', 'Nobody reminded her'],
      ['Phone at 1%', 'Made it home']
    ]
  },
  {
    slug: 'roll-safe',
    name: 'Roll Safe (Think About It)',
    aka: ['Think About It Meme', 'Tapping Head Meme', 'Smart Guy Meme', 'Big Brain Logic'],
    category: 'dank',
    summary: 'A smirking man taps his temple as he shares a “genius” idea.',
    meaning:
      'Roll Safe shares a life hack that sounds clever but is obviously terrible logic. The confident smirk and the finger on the temple sell the idea as genius.',
    howTo: 'Write the problem at the top and the terrible “clever” solution at the bottom.',
    aiHint: 'Roll Safe: top = a problem, bottom = a smug, terrible-logic solution.',
    slots: topBottom(),
    height: 603,
    examples: [
      ['Can’t be late for school', 'if you never go home'],
      ['Can’t fail the test', 'if you don’t take it'],
      ['Can’t lose your phone', 'if you never put it down']
    ]
  },
  {
    slug: 'hero-slaps-sidekick',
    hidden: true, // Legal hold, D-003 Finding 6 (21 Nov 2026). Not deleted.
    name: 'Hero Slaps Sidekick',
    aka: ['Superhero Slap Meme', 'Slapping Sidekick', 'Comic Slap Meme', 'Shut Up Slap'],
    category: 'dank',
    summary: 'A caped hero slaps his sidekick mid-sentence in a retro comic panel.',
    meaning:
      'Hero Slaps Sidekick shuts down a bad take. The sidekick starts saying something silly, and the hero interrupts with a slap and the correct answer.',
    howTo:
      'Put the sidekick’s bad take in the left bubble and the hero’s correction in the right bubble.',
    aiHint: 'Hero slaps sidekick: line 1 = the sidekick’s silly or wrong statement (cut off), line 2 = the hero’s firm correction.',
    slots: [
      { label: 'Sidekick says', style: 'dark', x: 0.27, y: 0.115, w: 0.42, h: 0.13 },
      { label: 'Hero replies', style: 'dark', x: 0.76, y: 0.115, w: 0.3, h: 0.13 }
    ],
    examples: [
      ['Can we skip the sequel and just—', 'NO'],
      ['Let’s just do the homework tomorr—', 'TODAY'],
      ['Pineapple on pizza is—', 'DON’T']
    ]
  },
  {
    slug: 'mocking-chicken',
    name: 'Mocking Chicken (aLtErNaTiNg CaPs)',
    aka: ['Mocking Meme', 'Alternating Caps Meme', 'Mocking Text Meme', 'Mocking SpongeBob Style'],
    category: 'dank',
    summary: 'A goofy yellow chicken bends over in a lopsided, mocking pose.',
    meaning:
      'The mocking meme repeats something annoying someone said in alternating caps, as if said in a silly voice. Quote it normally at the top, then mock it at the bottom.',
    howTo:
      'Write the quote normally at the top, then repeat it at the bottom in aLtErNaTiNg CaPs.',
    aiHint: 'Mocking: top = an annoying quote, bottom = the same quote in alternating caps (e.g. “yOu ShOuLd…”).',
    slots: topBottom('The quote', 'Mocking version'),
    height: 603,
    examples: [
      ['You should drink more water', 'yOu ShOuLd DrInK mOrE wAtEr'],
      ['Have you tried turning it off and on?', 'HaVe YoU tRiEd TuRnInG iT oFf'],
      ['Back in my day', 'BaCk In My DaY']
    ]
  },
  {
    slug: 'fancy-hamster',
    name: 'Fancy Hamster (Tuxedo Meme)',
    aka: ['Tuxedo Meme', 'Fancy Meme', 'Classy Hamster', 'Tuxedo Winnie The Pooh Style'],
    category: 'dank',
    summary: 'A plain hamster in a T-shirt, then the same hamster in a tuxedo looking very refined.',
    meaning:
      'The fancy meme compares a normal way of saying something with a ridiculously posh way of saying exactly the same thing. The tuxedo panel is the pretentious version.',
    howTo: 'Write the normal wording in the top box and the fancy, over-the-top version in the bottom box.',
    aiHint: 'Fancy/tuxedo: line 1 = the plain way to say something, line 2 = a pretentious, fancy way to say the same thing.',
    slots: [
      { label: 'Plain version', style: 'dark', x: 0.76, y: 0.255, w: 0.4, h: 0.4 },
      { label: 'Fancy version', style: 'dark', x: 0.76, y: 0.745, w: 0.4, h: 0.4 }
    ],
    height: 1341,
    examples: [
      ['Chips', 'Artisanal hand-cut potato batons'],
      ['Being lazy', 'Energy conservation strategy'],
      ['Leftover pizza for breakfast', 'Reheated Italian morning cuisine']
    ]
  },
  {
    slug: 'waiting-skeleton',
    name: 'Waiting Skeleton',
    aka: ['Skeleton On Bench', 'Still Waiting Meme', 'Me Waiting Skeleton'],
    category: 'relatable',
    summary: 'A cobweb-covered skeleton sits on a park bench, still holding its phone.',
    meaning:
      'Waiting Skeleton is for anything that is taking forever: replies, deliveries, updates, decisions. You waited so long you turned into a skeleton.',
    howTo: 'Write who is waiting at the top and what they are waiting for at the bottom.',
    aiHint: 'Waiting skeleton: top = who is waiting, bottom = the thing that is taking forever.',
    slots: topBottom(),
    examples: [
      ['Me waiting for the group chat', 'to agree on a restaurant'],
      ['Me waiting', 'for my game to finish updating'],
      ['Still waiting', 'for that “quick” 5-minute meeting to end']
    ]
  },
  {
    slug: 'cheers-toast',
    name: 'Cheers Toast',
    aka: ['Leonardo DiCaprio Cheers', 'Raising Glass Meme', 'Cheers Meme', 'Toast Meme'],
    category: 'relatable',
    summary: 'A grinning man in a tuxedo raises his glass to the camera at a lavish party.',
    meaning:
      'The Cheers meme toasts someone or something, sincerely or sarcastically. It is perfect for congratulating people on tiny achievements or saluting a fellow sufferer.',
    howTo: 'Write who you are toasting at the top and why at the bottom.',
    aiHint: 'Cheers: top = who is being toasted, bottom = the reason (sincere or sarcastic).',
    slots: topBottom(),
    height: 603,
    examples: [
      ['To everyone who said they’d bring snacks', 'and actually did'],
      ['Here’s to the people', 'who read the instructions first'],
      ['Cheers to the one teacher', 'who never sets weekend homework']
    ]
  },
  {
    slug: 'always-has-been',
    name: 'Always Has Been',
    aka: ['Wait It’s All', 'Astronaut Meme', 'Ohio Astronaut Meme', 'Always Has Been Astronaut'],
    category: 'dank',
    summary: 'An astronaut realises something about Earth while another floats behind him.',
    meaning:
      'Always Has Been is a shocking discovery that was obvious all along. The first astronaut says “Wait, it’s all …?” and the second confirms: “Always has been.”',
    howTo:
      'Write “Wait, it’s all …?” for the front astronaut and “Always has been” for the one behind.',
    aiHint: 'Always has been: line 1 = “Wait, it’s all …?” discovery, line 2 = “Always has been”.',
    slots: [
      { label: 'Front astronaut', style: 'impact', x: 0.3, y: 0.08, w: 0.56, h: 0.14 },
      { label: 'Astronaut behind', style: 'impact', x: 0.75, y: 0.9, w: 0.46, h: 0.14 }
    ],
    height: 603,
    examples: [
      ['Wait, it’s all just checking your phone?', 'Always has been'],
      ['Wait, school is just group projects?', 'Always has been'],
      ['Wait, it’s all reruns?', 'Always has been']
    ]
  },
  {
    slug: 'for-the-better-right',
    name: 'For the Better, Right?',
    aka: ['Four Panel Smirk Meme', 'Right? Meme', 'Hopeful Question Meme'],
    category: 'dank',
    summary: 'A couple in a meadow: he states a plan, she asks hopefully, he smirks silently, she asks again.',
    meaning:
      'This four-panel meme is about a worrying plan. One person announces something, the other asks a hopeful question, gets only a silent smirk, and asks again, now nervous.',
    howTo:
      'Write the plan in panel 1, the hopeful question in panel 2, leave panel 3 blank (or “…”), and repeat the question in panel 4.',
    aiHint: 'For the better, right: line 1 = a plan, line 2 = a hopeful question, line 3 = “…”, line 4 = the same question again, worried.',
    slots: [
      { label: 'The plan', style: 'dark', x: 0.255, y: 0.46, w: 0.44, h: 0.055 },
      { label: 'Hopeful question', style: 'dark', x: 0.745, y: 0.46, w: 0.44, h: 0.055 },
      { label: 'Silence', style: 'dark', x: 0.255, y: 0.945, w: 0.44, h: 0.055 },
      { label: 'Asks again', style: 'dark', x: 0.745, y: 0.945, w: 0.44, h: 0.055 }
    ],
    examples: [
      ['I’m going to the shop', 'You’ll buy what’s on the list, right?', '…', 'You’ll buy what’s on the list, right?'],
      ['I’m going to fix the Wi-Fi', 'You know how, right?', '…', 'You know how, right?'],
      ['I’m cooking tonight', 'Something we can eat, right?', '…', 'Something we can eat, right?']
    ]
  },
  {
    slug: 'epic-handshake',
    name: 'Epic Handshake',
    aka: ['Arm Wrestling Handshake', 'Predator Handshake', 'Agreement Handshake Meme'],
    category: 'relatable',
    summary: 'Two muscular arms clasp in a powerful handshake against a jungle background.',
    meaning:
      'Epic Handshake shows two very different groups agreeing on one thing. Label each arm with a group and the handshake with what they have in common.',
    howTo: 'Label the left arm, the right arm, then the shared thing above the handshake.',
    aiHint: 'Epic handshake: line 1 = group one, line 2 = group two, line 3 = the surprising thing they agree on.',
    slots: [
      { label: 'Left arm', style: 'impact', x: 0.18, y: 0.78, w: 0.34, h: 0.14 },
      { label: 'Right arm', style: 'impact', x: 0.82, y: 0.78, w: 0.34, h: 0.14 },
      { label: 'Shared thing', style: 'impact', x: 0.5, y: 0.14, w: 0.5, h: 0.14 }
    ],
    height: 603,
    examples: [
      ['Cats', 'Toddlers', 'Knocking things off tables'],
      ['Students', 'Teachers', 'Wanting the holidays'],
      ['Gamers', 'Parents', 'One more minute']
    ]
  },
  {
    slug: 'buff-doge-vs-cheems',
    name: 'Buff Doge vs Cheems',
    aka: ['Swole Doge Vs Cheems', 'Then Vs Now Doge', 'Strong Dog Weak Dog'],
    category: 'dank',
    summary: 'A huge muscular Shiba Inu stands beside a small, sad, hunched one.',
    meaning:
      'Buff Doge vs Cheems compares a strong past with a weak present (or a tough version with a soft one). The buff dog shows how things used to be; the small dog shows how they are now.',
    howTo: 'Write the strong “then” above the buff dog and the weak “now” above the small dog.',
    aiHint: 'Buff Doge vs Cheems: line 1 = the strong past version, line 2 = the weak present version.',
    slots: [
      { label: 'Buff dog (then)', style: 'dark', x: 0.27, y: 0.06, w: 0.5, h: 0.1 },
      { label: 'Small dog (now)', style: 'dark', x: 0.75, y: 0.25, w: 0.44, h: 0.3 }
    ],
    height: 603,
    examples: [
      ['Phones in 2005: survive falling off a building', 'Phones now: crack if you look at them'],
      ['Kids in 1995: played outside all day', 'Kids now: Wi-Fi is slow, day ruined'],
      ['Me at 9 AM: ready to work', 'Me at 3 PM: need a nap']
    ]
  },
  {
    slug: 'lonely-waiting',
    name: 'Lonely Waiting',
    aka: ['Sad Pablo Escobar', 'Waiting Alone Meme', 'Lonely Man Meme', 'Sad Waiting Meme'],
    category: 'relatable',
    summary: 'Three frames of a lonely man waiting: on a swing, on a sofa, on a bench.',
    meaning:
      'Lonely Waiting is about boredom and loneliness: waiting for someone, something, or anything to happen. One caption covers all three sad frames.',
    howTo: 'Write one caption along the bottom describing the lonely, boring wait.',
    aiHint: 'Lonely waiting: one line describing a lonely, boring wait.',
    slots: [{ label: 'Caption', style: 'dark', x: 0.5, y: 0.93, w: 0.96, h: 0.11 }],
    height: 603,
    examples: [
      ['Me waiting for someone to like my meme'],
      ['Me waiting for my friends to finish their game'],
      ['Me after everyone leaves the group chat']
    ]
  },
  {
    slug: 'no-question-face',
    name: 'No …? Smug Face',
    aka: ['No Meme', 'No Bitches Meme', 'Megamind No Style', 'Smug No Face'],
    category: 'dank',
    summary: 'A smug big-headed cartoon cat raises an eyebrow with a sly half-smile.',
    meaning:
      'The “No …?” meme teases someone for clearly missing out on something. The smug face asks “No ___?” as if it is the most obvious thing in the world.',
    howTo: 'Write a single “No ___?” question at the top. Leave the bottom blank or add a follow-up.',
    aiHint: 'No …? face: top = a smug “No ___?” question, bottom = optional short follow-up.',
    slots: topBottom(),
    examples: [
      ['No snacks?', ''],
      ['No weekend plans?', ''],
      ['No charger?', '']
    ]
  },
  {
    slug: 'it-was-aliens',
    name: 'It Was Aliens',
    aka: ['Aliens Guy Meme', 'Aliens Meme', 'History Aliens Guy', 'I’m Not Saying It Was Aliens'],
    category: 'dank',
    summary: 'A man with wild, spiky hair explains something intensely in a documentary interview.',
    meaning:
      'It Was Aliens blames any mystery on aliens. The intense explanation and wild hair make even the most everyday mystery sound like a conspiracy.',
    howTo: 'Describe the mystery at the top and blame aliens at the bottom.',
    aiHint: 'Aliens: top = an everyday mystery, bottom = “Aliens” or “I’m not saying it was aliens, but…”.',
    slots: topBottom(),
    height: 603,
    examples: [
      ['Odd socks in the wash?', 'Aliens'],
      ['Who ate the last biscuit?', 'Aliens'],
      ['I’m not saying my homework was taken', 'but it was aliens']
    ]
  },
  {
    slug: 'bad-luck-brian',
    name: 'Bad Luck Brian',
    aka: ['Unlucky Kid Meme', 'School Photo Meme', 'Bad Luck Meme'],
    category: 'relatable',
    summary: 'An awkward kid with braces and a bowl cut grins in his school photo.',
    meaning:
      'Bad Luck Brian is the unluckiest kid alive. The top line sets up something good, and the bottom line is the unlucky twist that ruins it.',
    howTo: 'Write something good at the top and the unlucky twist at the bottom.',
    aiHint: 'Bad Luck Brian: top = something good that happens, bottom = the unlucky twist.',
    slots: topBottom(),
    examples: [
      ['Finally gets a day off', 'It rains'],
      ['Wins a free pizza', 'Allergic to cheese'],
      ['Studies all night', 'Wrong exam']
    ]
  },
  {
    slug: 'grumpy-kitty',
    name: 'Grumpy Kitty',
    aka: ['Grumpy Cat Meme', 'Unimpressed Cat', 'Angry Cat Meme', 'No Cat'],
    category: 'relatable',
    summary: 'A small tabby cat stares at the camera looking deeply unimpressed.',
    meaning:
      'Grumpy Kitty says no to everything. Flat, grumpy refusals and complaints are the whole joke.',
    howTo: 'Write a cheerful setup at the top and a flat, grumpy response at the bottom.',
    aiHint: 'Grumpy cat: top = something fun or a question, bottom = a flat, grumpy refusal.',
    slots: topBottom(),
    examples: [
      ['I had fun once', 'It was awful'],
      ['You want a hug?', 'No'],
      ['Monday', 'Why']
    ]
  },
  {
    slug: 'workshop-argument',
    name: 'Workshop Argument',
    aka: ['American Chopper Argument', 'Five Panel Argument', 'Chair Throw Meme', 'Shouting Argument Meme'],
    category: 'tech',
    summary: 'Two men in a motorbike workshop shout at each other across five panels until a chair goes flying.',
    meaning:
      'The Workshop Argument stages an escalating debate about something trivial. Each panel is a louder comeback, and the last panel ends it with a flying chair.',
    howTo:
      'Write the argument as five lines, alternating between the two speakers. Make it more heated each panel.',
    aiHint: 'Workshop argument: five escalating lines alternating between two people arguing about something trivial.',
    slots: [
      { label: 'Panel 1', style: 'impact', x: 0.5, y: 0.16, w: 0.94, h: 0.05 },
      { label: 'Panel 2', style: 'impact', x: 0.5, y: 0.365, w: 0.94, h: 0.05 },
      { label: 'Panel 3', style: 'impact', x: 0.5, y: 0.565, w: 0.94, h: 0.05 },
      { label: 'Panel 4', style: 'impact', x: 0.5, y: 0.765, w: 0.94, h: 0.05 },
      { label: 'Panel 5', style: 'impact', x: 0.5, y: 0.945, w: 0.94, h: 0.05 }
    ],
    height: 1935,
    examples: [
      ['Tabs are better', 'Spaces are better', 'Tabs save bytes', 'Spaces look the same everywhere', 'JUST USE A FORMATTER'],
      ['Cereal first', 'Milk first', 'Cereal stays crunchy', 'Milk first is efficient', 'IT’S SOUP EITHER WAY'],
      ['It’s pronounced GIF', 'It’s JIF', 'The creator said JIF', 'Graphics starts with G', 'NOBODY CARES']
    ]
  },
  {
    slug: 'blinking-guy',
    name: 'Blinking Guy',
    aka: ['Blinking White Guy', 'Disbelief Blink', 'Confused Blink Meme'],
    category: 'relatable',
    summary: 'A man in a grey hoodie blinks mid-turn in total disbelief.',
    meaning:
      'Blinking Guy is pure “did that just happen?” disbelief. Use it when someone says or does something so strange you have to blink twice.',
    howTo: 'Write the unbelievable thing in the white strip at the top.',
    aiHint: 'Blinking guy: one line describing something unbelievable someone said or did.',
    slots: [{ label: 'Caption', style: 'dark', x: 0.5, y: 0.065, w: 0.96, h: 0.12 }],
    height: 603,
    examples: [
      ['When they say reply-all was the plan all along'],
      ['When someone says they don’t like chips'],
      ['When the teacher says the test is today']
    ]
  },
  {
    slug: 'hard-to-swallow-pills',
    name: 'Hard to Swallow Pills',
    aka: ['Pill Bottle Meme', 'Hard Truth Meme', 'Truth Pill Meme'],
    category: 'relatable',
    summary: 'A hand holds an orange pill bottle with a blank label next to a single large pill.',
    meaning:
      'Hard to Swallow Pills delivers an uncomfortable truth. The bottle says “Hard to swallow pills”, and the caption is the truth nobody wants to hear.',
    howTo: 'Keep “Hard to swallow pills” on the bottle label and write the uncomfortable truth at the top.',
    aiHint: 'Hard to swallow pills: line 1 = “Hard to swallow pills” (bottle label), line 2 = an uncomfortable truth.',
    slots: [
      { label: 'Bottle label', style: 'dark', x: 0.455, y: 0.47, w: 0.22, h: 0.2 },
      { label: 'The hard truth', style: 'dark', x: 0.5, y: 0.08, w: 0.9, h: 0.13 }
    ],
    examples: [
      ['Hard to swallow pills', 'You don’t need another notebook'],
      ['Hard to swallow pills', 'The shortcut took longer'],
      ['Hard to swallow pills', 'Nobody reads the terms and conditions']
    ]
  },
  {
    slug: 'am-i-out-of-touch',
    name: 'Am I Out of Touch?',
    aka: ['Am I So Out Of Touch', 'No It’s The Children Who Are Wrong', 'Out Of Touch Meme'],
    category: 'dank',
    summary: 'A man in a suit doubts himself for a moment, then confidently decides everyone else is wrong.',
    meaning:
      'Am I Out of Touch? is about refusing to admit you are wrong. In the first panel there is a moment of self-doubt; in the second, the person confidently blames everyone else.',
    howTo: 'Write the moment of doubt on the left and the confident wrong conclusion on the right.',
    aiHint: 'Am I out of touch: line 1 = a moment of self-doubt, line 2 = deciding confidently that everyone else is wrong.',
    slots: [
      { label: 'Self-doubt', style: 'dark', x: 0.25, y: 0.07, w: 0.46, h: 0.12 },
      { label: 'Everyone else is wrong', style: 'dark', x: 0.75, y: 0.07, w: 0.46, h: 0.12 }
    ],
    height: 603,
    examples: [
      ['Am I wrong for replying “k”?', 'No, it’s everyone else who is rude'],
      ['Am I bad at this game?', 'No, the controller is broken'],
      ['Should I have started earlier?', 'No, the deadline is unfair']
    ]
  },
  {
    slug: 'sleeping-then-awake',
    name: 'Sleeping Then Awake',
    aka: ['Sleeping Shaq', 'Wake Up Meme', 'Asleep Then Awake Meme'],
    category: 'relatable',
    summary: 'A huge man in a tracksuit dozes courtside, then sits up wide awake.',
    meaning:
      'Sleeping Then Awake compares something boring you ignore with something exciting that wakes you up instantly.',
    howTo: 'Write the boring thing on the top panel and the exciting thing on the bottom panel.',
    aiHint: 'Sleeping then awake: line 1 = something boring that sends you to sleep, line 2 = something that wakes you up instantly.',
    slots: [
      { label: 'Asleep for', style: 'impact', x: 0.5, y: 0.44, w: 0.66, h: 0.09 },
      { label: 'Awake for', style: 'impact', x: 0.5, y: 0.94, w: 0.66, h: 0.09 }
    ],
    height: 1341,
    examples: [
      ['My alarm', 'Someone opens a crisp packet'],
      ['The lesson', 'The bell'],
      ['Being asked to tidy up', 'Pizza arrives']
    ]
  },
  {
    slug: 'kombucha-girl',
    name: 'Kombucha Girl',
    aka: ['Disgust To Approval Meme', 'Unsure Reaction Meme', 'Kombucha Meme'],
    category: 'relatable',
    summary: 'A woman with pink hair grimaces at a drink, hesitates, then decides she likes it.',
    meaning:
      'Kombucha Girl shows a reaction moving from disgust to uncertainty to approval. Use it for things you hated at first but secretly grew to like.',
    howTo: 'Write the first try, the second thought and the final verdict, one per panel.',
    aiHint: 'Kombucha Girl: line 1 = first try (disgust), line 2 = unsure second thought, line 3 = grudging approval.',
    slots: [
      { label: 'Disgust', style: 'impact', x: 0.5, y: 0.29, w: 0.94, h: 0.07 },
      { label: 'Unsure', style: 'impact', x: 0.5, y: 0.62, w: 0.94, h: 0.07 },
      { label: 'Approval', style: 'impact', x: 0.5, y: 0.955, w: 0.94, h: 0.07 }
    ],
    height: 1341,
    examples: [
      ['Trying a new song', 'Second listen', 'The 40th listen'],
      ['First day of the diet', 'Day two', 'Week three'],
      ['Olives at 8', 'Olives at 16', 'Olives at 25']
    ]
  },
  {
    slug: 'yes-chad',
    name: 'Yes Chad',
    aka: ['Nordic Gamer Meme', 'Yes Meme', 'Chad Yes', 'Average Enjoyer Yes'],
    category: 'dank',
    summary: 'A crude frowning cartoon man points accusingly at a calm, bearded blond man.',
    meaning:
      'Yes Chad owns an accusation with total confidence. The angry character points out something “embarrassing”, and the calm, bearded man simply says “Yes.”',
    howTo: 'Write the accusation over the angry cartoon and “Yes.” over the calm man.',
    aiHint: 'Yes Chad: line 1 = an accusing or mocking question, line 2 = a calm, confident “Yes.”',
    slots: [
      { label: 'Accusation', style: 'dark', x: 0.25, y: 0.1, w: 0.46, h: 0.16 },
      { label: 'Calm reply', style: 'impact', x: 0.75, y: 0.1, w: 0.46, h: 0.16 }
    ],
    height: 603,
    examples: [
      ['You still use a wired mouse?', 'Yes.'],
      ['You actually read the manual?', 'Yes.'],
      ['You eat cereal for dinner?', 'Yes.']
    ]
  },
  {
    slug: 'absolute-cinema',
    name: 'Absolute Cinema',
    aka: ['This Is Cinema', 'Cinema Meme', 'Hands Up Cinema Meme'],
    category: 'dank',
    summary: 'An elderly man in a black turtleneck raises both hands, eyes closed, overwhelmed by a masterpiece.',
    meaning:
      'Absolute Cinema praises something everyday as if it were a cinematic masterpiece. The more ordinary the thing, the funnier the reverence.',
    howTo: 'Describe the everyday moment at the top and write “Absolute cinema” at the bottom.',
    aiHint: 'Absolute cinema: top = an everyday moment, bottom = “Absolute cinema”.',
    slots: topBottom(),
    height: 603,
    examples: [
      ['When the toast lands butter side up', 'Absolute cinema'],
      ['Bus arrives the second you reach the stop', 'Absolute cinema'],
      ['Cable untangles in one pull', 'Absolute cinema']
    ]
  },
  {
    slug: 'boardroom-meeting',
    name: 'Boardroom Meeting Suggestion',
    aka: ['Boardroom Meme', 'Thrown Out Window Meme', 'Meeting Suggestion Meme'],
    category: 'tech',
    summary: 'A boss asks the team for ideas and throws the one with the honest answer out of the window.',
    meaning:
      'The Boardroom Meeting meme mocks bosses who ignore the obvious answer. The boss asks a question, someone gives the safe answer, and whoever says the honest (correct) answer gets thrown out of the window.',
    howTo:
      'Write the boss’s question in bubble one, a safe suggestion in bubble two, and the honest answer in bubble three.',
    aiHint: 'Boardroom meeting: line 1 = the boss’s question, line 2 = a safe, boring suggestion, line 3 = the honest answer that gets the person thrown out.',
    slots: [
      { label: 'Boss asks', style: 'dark', x: 0.315, y: 0.1, w: 0.25, h: 0.12 },
      { label: 'Safe suggestion', style: 'dark', x: 0.76, y: 0.1, w: 0.28, h: 0.12 },
      { label: 'Honest answer', style: 'dark', x: 0.25, y: 0.59, w: 0.33, h: 0.12 }
    ],
    examples: [
      ['How do we fix the bug?', 'Add more logging', 'Read the error message'],
      ['How do we get more sales?', 'A new logo', 'Lower the prices'],
      ['How do we save time?', 'Another meeting', 'Fewer meetings']
    ]
  },
  {
    slug: 'evil-inner-voice',
    name: 'Evil Inner Voice',
    aka: ['Me Vs Also Me', 'Hooded Puppet Meme', 'Dark Side Meme', 'Evil Kermit Style'],
    category: 'relatable',
    summary: 'A knitted lizard puppet faces its twin in a dark hooded cloak, like a sinister inner voice.',
    meaning:
      'Evil Inner Voice is the battle between good intentions and temptation. The normal puppet is you trying to be sensible; the hooded twin is the voice in your head suggesting the bad idea.',
    howTo: 'Write your sensible plan on the left and the tempting bad idea on the right.',
    aiHint: 'Evil inner voice: line 1 = “Me: …” a sensible plan, line 2 = “Also me: …” the tempting bad idea.',
    slots: [
      { label: 'Me', style: 'impact', x: 0.25, y: 0.08, w: 0.46, h: 0.14 },
      { label: 'Also me (hooded)', style: 'impact', x: 0.75, y: 0.08, w: 0.46, h: 0.14 }
    ],
    height: 603,
    examples: [
      ['Me: I should go to bed', 'Also me: one more video'],
      ['Me: I’ll save money', 'Also me: free delivery over £20'],
      ['Me: I’ll start revising', 'Also me: tidy your whole room first']
    ]
  },
  {
    slug: 'not-sure-if',
    name: 'Not Sure If',
    aka: ['Not Sure If Meme', 'Squinting Suspicious Meme', 'Futurama Fry Style'],
    category: 'relatable',
    summary: 'A cartoon man with a messy black quiff squints in deep suspicion.',
    meaning:
      'Not Sure If is for two possibilities you can’t tell apart. The squinting face is trying very hard to work out which one it is.',
    howTo: 'Write “Not sure if …” at the top and “or …” at the bottom.',
    aiHint: 'Not sure if: top = “Not sure if …”, bottom = “or …” with an alternative that looks the same.',
    slots: topBottom(),
    height: 603,
    examples: [
      ['Not sure if hungry', 'or just bored'],
      ['Not sure if they’re joking', 'or I’m in trouble'],
      ['Not sure if the Wi-Fi is slow', 'or my laptop is dying']
    ]
  },
  {
    slug: 'draw-25',
    name: 'Draw 25',
    aka: ['Or Draw 25', 'Draw 25 Cards Meme', 'Card Game Meme'],
    category: 'dank',
    summary: 'A hand offers one blank card, then a smug man holds an enormous fan of cards.',
    meaning:
      'Draw 25 is for something people would rather suffer than do. The card offers a simple task “or draw 25”, and the bottom panel shows them choosing to draw an absurd pile of cards instead.',
    howTo: 'Write “Do X or draw 25” on the card and a label for the person who drew 25 at the bottom.',
    aiHint: 'Draw 25: line 1 = “[simple task] or draw 25” on the card, line 2 = who chose to draw 25.',
    slots: [
      { label: 'The card', style: 'dark', x: 0.495, y: 0.22, w: 0.22, h: 0.16 },
      { label: 'Person who drew 25', style: 'impact', x: 0.5, y: 0.95, w: 0.94, h: 0.07 }
    ],
    height: 1341,
    examples: [
      ['Admit you’re wrong or draw 25', 'Me'],
      ['Say sorry first or draw 25', 'Every sibling ever'],
      ['Read the instructions or draw 25', 'Dads building furniture']
    ]
  }
];

function buildFaq(t) {
  return [
    {
      q: `What does the ${t.name} meme mean?`,
      a: t.meaning
    },
    {
      q: `How do I make a ${t.name} meme?`,
      a: `${t.howTo} Tap “Use this template”, type your text in the boxes (or let the AI Caption Writer suggest some), then download, share or post it. No sign-up needed.`
    },
    {
      q: `Is this ${t.name} template free to use?`,
      a: `Yes. This ${t.name} template is an AI-generated image made for THE MEMES.net, so you can make, download and share memes with it for free. Downloads carry a small thememes.net watermark.`
    },
    {
      q: 'Why does it look different from the version I know?',
      a: 'Many famous meme pictures are photos owned by other people. Our version is a new AI-generated image that keeps the joke structure, so it looks a little different.'
    }
  ];
}

export const MEME_TEMPLATES = RAW_TEMPLATES.filter((t) => !t.hidden).map((t) => ({
  ...t,
  id: `mt-${t.slug}`,
  path: `/templates/${t.slug}-meme-template`,
  image: `${TEMPLATE_IMAGE_DIR}/${t.slug}.webp`,
  thumb: `${TEMPLATE_IMAGE_DIR}/${t.slug}-thumb.webp`,
  width: 1080,
  height: t.height || 1080,
  title: `${t.name} Meme Template — Free Meme Generator | THE MEMES.net`,
  description: `Make a ${t.name} meme free online. ${t.summary} Add your own text or let AI write it, then download or share. No sign-up.`.slice(
    0,
    300
  ),
  faq: buildFaq(t)
}));

const BY_SLUG = new Map(MEME_TEMPLATES.map((t) => [t.slug, t]));
const BY_PATH = new Map(MEME_TEMPLATES.map((t) => [t.path, t]));
const BY_ID = new Map(MEME_TEMPLATES.map((t) => [t.id, t]));

export const TEMPLATES_INDEX_PATH = '/templates';

export function getTemplateBySlug(slug) {
  return BY_SLUG.get(String(slug || '').toLowerCase()) || null;
}
export function getTemplateById(id) {
  return BY_ID.get(id) || null;
}

/** '/templates/two-buttons-meme-template' → template (also accepts '/templates/two-buttons'). */
export function getTemplateByPath(pathname) {
  const p = String(pathname || '').toLowerCase().replace(/\/+$/, '');
  if (BY_PATH.has(p)) return BY_PATH.get(p);
  const m = p.match(/^\/templates\/([a-z0-9-]+?)(?:-meme-(?:template|generator))?$/);
  return m ? BY_SLUG.get(m[1]) || null : null;
}

export function relatedTemplates(template, count = 6) {
  const same = MEME_TEMPLATES.filter((t) => t.slug !== template.slug && t.category === template.category);
  const rest = MEME_TEMPLATES.filter((t) => t.slug !== template.slug && t.category !== template.category);
  return [...same, ...rest].slice(0, count);
}

/** Text layers for the editor, positioned on the template's caption boxes. */
export function templateTextLayers(template, makeTextLayer, texts = []) {
  return template.slots.map((s, i) =>
    makeTextLayer({
      slot: i === 0 ? 'top' : i === template.slots.length - 1 ? 'bottom' : `s${i}`,
      label: s.label,
      text: texts[i] ?? '',
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      // Start big relative to the box; the editor shrinks long text to fit.
      size: s.style === 'impact' ? Math.min(0.085, s.h * 0.6) : Math.min(0.075, s.h * 0.45),
      align: 'center',
      ...slotLayerStyle(s.style)
    })
  );
}
