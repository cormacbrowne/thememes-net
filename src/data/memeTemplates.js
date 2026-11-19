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
      a: `Yes. This ${t.name} template is our own original artwork of the format, made for THE MEMES.net, so you can make, download and share memes with it for free. Downloads carry a small thememes.net watermark.`
    },
    {
      q: 'Why does it look different from the version I know?',
      a: 'Many famous meme pictures are photos owned by other people. We redrew each format as new original art so you get the same joke structure in a crisp, high-quality picture that is safe to share anywhere.'
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
  height: 1080,
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
