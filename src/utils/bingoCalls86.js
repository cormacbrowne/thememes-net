// ==========================================
// NEON BINGO '86 — ALL 90 COMEDY CALLOUTS, RETRO TICKETS & PRIZE VERIFIER
// Authentic 1986 UK/Arcade Bingo Hall Rhymes + 80s Pop-Culture Comedy
// ==========================================

export const DABBER_COLORS = [
  { id: 'pink', name: 'Laser Pink', hex: '#ff2a85', ink: 'rgba(255, 42, 133, 0.86)', glow: 'rgba(255, 42, 133, 0.55)', emoji: '💖' },
  { id: 'cyan', name: 'Electric Cyan', hex: '#00f3ff', ink: 'rgba(0, 243, 255, 0.84)', glow: 'rgba(0, 243, 255, 0.55)', emoji: '⚡' },
  { id: 'lime', name: 'Acid Lime', hex: '#4ade80', ink: 'rgba(74, 222, 128, 0.84)', glow: 'rgba(74, 222, 128, 0.55)', emoji: '🧪' },
  { id: 'gold', name: 'Solar Gold', hex: '#facc15', ink: 'rgba(250, 204, 21, 0.86)', glow: 'rgba(250, 204, 21, 0.55)', emoji: '☀️' },
  { id: 'purple', name: 'UV Violet', hex: '#c084fc', ink: 'rgba(192, 132, 252, 0.86)', glow: 'rgba(192, 132, 252, 0.55)', emoji: '🔮' }
];

export const RETRO_CARD_THEMES = [
  { id: 'miami', label: '🌴 Miami ’86', badge: '#ff2a85' },
  { id: 'crt', label: '📟 Phosphor CRT', badge: '#4ade80' },
  { id: 'outrun', label: '🌆 Outrun Cyan', badge: '#00f3ff' },
  { id: 'gold', label: '👑 Golden VIP', badge: '#facc15' }
];

export const BINGO_CALLS_86 = {
  1: { call: "Kelly's Eye", chant: 'Number One — Butterfingers Down!', emoji: '👁️', sfxType: 'synth' },
  2: { call: 'One Little Duck', chant: 'Quack! Just the one duck, mind the synth!', emoji: '🦆', sfxType: 'duck' },
  3: { call: 'Cup of Tea', chant: 'Pop the kettle on, two sugars!', emoji: '☕', sfxType: 'boing' },
  4: { call: 'Knock at the Door', chant: 'Knock knock! Is it the Boss Key?', emoji: '🚪', sfxType: 'synth' },
  5: { call: 'Man Alive!', chant: "That mullet's illegal in four boroughs!", emoji: '🕺', sfxType: 'whistle' },
  6: { call: "Tom Mix / Half a Dozen", chant: 'Six golden eggs in the Cassette!', emoji: '🥚', sfxType: 'boing' },
  7: { call: 'Lucky Seven', chant: 'James Bond on a BMX! 007!', emoji: '🎰', sfxType: 'coin' },
  8: { call: 'Garden Gate', chant: 'Golden Disc at the Garden Gate — Number 8!', emoji: '⛩️', sfxType: 'synth' },
  9: { call: "Doctor's Orders", chant: 'Say Ahhh — Take two floppy disks!', emoji: '🩺', sfxType: 'boing' },
  10: { call: "Prime Minister's Den", chant: 'Downing Street Disco — Number 10!', emoji: '🏛️', sfxType: 'horn' },
  11: { call: 'Legs Eleven!', chant: '*WOLF WHISTLE!* Check those leg warmers!', emoji: '💃', sfxType: 'whistle' },
  12: { call: 'One Dozen', chant: 'Twelve 12-inch Synth Remixes!', emoji: '💿', sfxType: 'coin' },
  13: { call: 'Unlucky for Some', chant: 'Hide behind the arcade cabinet!', emoji: '🐈‍⬛', sfxType: 'boing' },
  14: { call: "Valentine's Day", chant: 'Send a Neon LoveFax — 14!', emoji: '💘', sfxType: 'whistle' },
  15: { call: 'Young and Keen', chant: 'Fifteen Minutes of MTV Fame!', emoji: '📺', sfxType: 'synth' },
  16: { call: 'Sweet Sixteen', chant: 'Sixteen-Bit Graphics Unlocked!', emoji: '🍬', sfxType: 'coin' },
  17: { call: 'Dancing Queen', chant: 'Young and sweet, only 17!', emoji: '🪩', sfxType: 'whistle' },
  18: { call: 'Coming of Age', chant: 'Allowed into the Neon Disco now!', emoji: '🍾', sfxType: 'horn' },
  19: { call: 'Goodbye Teens', chant: 'Last chance before a mortgage!', emoji: '🎸', sfxType: 'synth' },
  20: { call: 'One Score', chant: 'Getting Plenty — Twenty, 2-0!', emoji: '💯', sfxType: 'coin' },
  21: { call: 'Key of the Door', chant: 'Royal Salute — Keys to the Turbo Capri!', emoji: '🔑', sfxType: 'coin' },
  22: { call: 'Two Little Ducks', chant: 'QUACK! QUACK! Number 22!', emoji: '🦆🦆', sfxType: 'duck' },
  23: { call: 'Thee and Me', chant: 'The Lord is My Shepherd — Number 23!', emoji: '🕺', sfxType: 'synth' },
  24: { call: 'Two Dozen', chant: 'Knock at the Door — 24 Hours of VHS!', emoji: '📼', sfxType: 'boing' },
  25: { call: 'Duck and Dive!', chant: 'QUACK! Duck and Dive — 25!', emoji: '🦆🏊', sfxType: 'duck' },
  26: { call: 'Pick and Mix', chant: 'Woolworths Sweet Counter — Two & Six!', emoji: '🍭', sfxType: 'coin' },
  27: { call: 'Gateway to Heaven', chant: 'Wait, ducks in heaven? Number 27!', emoji: '😇', sfxType: 'synth' },
  28: { call: 'Overweight (In a State)', chant: 'Put down the prawn cocktail crisps!', emoji: '🍤', sfxType: 'boing' },
  29: { call: 'Rise and Shine', chant: 'Alarm clock at 8 AM — Rise & Shine!', emoji: '⏰', sfxType: 'bell' },
  30: { call: 'Dirty Gertie', chant: 'Ooooh cheeky! Blind 30 — 3-0!', emoji: '💋', sfxType: 'whistle' },
  31: { call: 'Get Up and Run', chant: 'Lace up your Reebok Pumps — 31!', emoji: '👟', sfxType: 'boing' },
  32: { call: 'Buckle My Shoe', chant: 'Velcro sneakers or buckle — 32!', emoji: '👞', sfxType: 'synth' },
  33: { call: 'All the Threes / Dirty Knees', chant: 'Two Little Fleas on Dirty Knees — 33!', emoji: '🦵', sfxType: 'boing' },
  34: { call: 'Ask for More', chant: 'Oliver Twist with a Walkman — 34!', emoji: '🎧', sfxType: 'coin' },
  35: { call: 'Jump and Jive', chant: 'Breakdance on cardboard! 35!', emoji: '📻', sfxType: 'synth' },
  36: { call: 'Three Dozen', chant: 'Thirty-Six — Triple-deckers on the Telly!', emoji: '🥐', sfxType: 'boing' },
  37: { call: 'More Than Eleven', chant: "Can't argue with Bingo Math — 37!", emoji: '🧮', sfxType: 'synth' },
  38: { call: 'Christmas Cake', chant: 'Save a slice for Nanna Turbo — 38!', emoji: '🍰', sfxType: 'boing' },
  39: { call: 'Those Famous Steps', chant: '39 Steps — All the Three-Nine!', emoji: '🪜', sfxType: 'synth' },
  40: { call: 'Life Begins at Forty!', chant: 'Time to buy a mid-life leather jacket!', emoji: '🧥', sfxType: 'horn' },
  41: { call: 'Time for Fun', chant: 'Stop working, hit the Neon Arcade — 41!', emoji: '🕹️', sfxType: 'coin' },
  42: { call: 'Winnie the Pooh', chant: 'Meaning of Life, Universe & Dabbers — 42!', emoji: '🍯', sfxType: 'synth' },
  43: { call: 'Down on Your Knees', chant: 'Check under the pew for dropped pennies!', emoji: '🪙', sfxType: 'boing' },
  44: { call: 'Droopy Drawers!', chant: '*TWANG!* Somebody buy a belt — 44!', emoji: '🩳', sfxType: 'boing' },
  45: { call: 'Halfway There!', chant: 'Living on a Prayer — Whoa-oh! 45!', emoji: '🎸', sfxType: 'horn' },
  46: { call: 'Up to Tricks', chant: 'Neon Goose on the loose — 46!', emoji: '🪿', sfxType: 'duck' },
  47: { call: 'Four and Seven', chant: 'AK-47? No mate, just lucky Bingo — 47!', emoji: '🌟', sfxType: 'synth' },
  48: { call: 'Four Dozen', chant: 'Four Dozen Donuts — Number 48!', emoji: '🍩', sfxType: 'boing' },
  49: { call: 'PC / Copper at the Door', chant: 'PC 49 — Hide the dodgy VHS tapes!', emoji: '🚔', sfxType: 'whistle' },
  50: { call: 'Half a Century!', chant: 'Bullseye! Fifty Golden Coins — 5-0!', emoji: '🎯', sfxType: 'coin' },
  51: { call: 'Tweak of the Thumb', chant: 'I Love My Mum — Fifty-One!', emoji: '👍', sfxType: 'synth' },
  52: { call: 'Danny La Rue', chant: 'Sparkly Sequins Everywhere — 52!', emoji: '✨', sfxType: 'whistle' },
  53: { call: 'Here Comes Herbie!', chant: 'Beep Beep! Sticking in the Tree — 53!', emoji: '🚗', sfxType: 'horn' },
  54: { call: 'Clean the Floor', chant: 'Grab the Henry Hoover — 54!', emoji: '🧹', sfxType: 'boing' },
  55: { call: 'Snakes Alive!', chant: 'HISSSS-HISSSS! Double Fives — 55!', emoji: '🐍', sfxType: 'synth' },
  56: { call: 'Shotts Bus / Was She Worth It?', chant: '"Every penny!" Five and Six — 56!', emoji: '🚌', sfxType: 'horn' },
  57: { call: 'Heinz Varieties', chant: '57 Beans on Toast Forever!', emoji: '🥫', sfxType: 'boing' },
  58: { call: 'Make Them Wait', chant: 'Dial-Up Modem Loading... Please Wait — 58!', emoji: '☎️', sfxType: 'synth' },
  59: { call: 'Brighton Line', chant: 'End of the Pier Disco — 59!', emoji: '🎡', sfxType: 'bell' },
  60: { call: 'Five Dozen', chant: "Grandma's Getting Frisky — Blind 60!", emoji: '👵', sfxType: 'whistle' },
  61: { call: "Baker's Bun", chant: 'Fresh out the oven — Sixty-One!', emoji: '🥐', sfxType: 'boing' },
  62: { call: 'Tickety-Boo!', chant: 'Turn the Screw — Everything is Tickety-Boo!', emoji: '🔩', sfxType: 'synth' },
  63: { call: 'Tickle Me!', chant: 'Ooooh stop it! Tickle Me — 63!', emoji: '🤭', sfxType: 'whistle' },
  64: { call: 'Red Raw (Commodore 64!)', chant: 'LOAD "*",8,1 — Almost Retired — 64!', emoji: '🖥️', sfxType: 'coin' },
  65: { call: 'Old Age Pension', chant: 'Free Bus Pass & Bingo Chips — 65!', emoji: '🎫', sfxType: 'horn' },
  66: { call: 'Clickety Click!', chant: 'CHOO CHOO! All the Sixes — 66!', emoji: '🚂', sfxType: 'bell' },
  67: { call: 'Stairway to Heaven', chant: 'Play the forbidden guitar riff — 67!', emoji: '🎸', sfxType: 'synth' },
  68: { call: 'Saving Grace', chant: 'Checking Down the Line — 68!', emoji: '🙏', sfxType: 'synth' },
  69: { call: 'Anyway Up!', chant: 'Either Way Up — Keep it PG, Hall! 69!', emoji: '🙃', sfxType: 'whistle' },
  70: { call: 'Three Score and Ten', chant: 'Blind 70 — Put your bifocals on!', emoji: '👓', sfxType: 'boing' },
  71: { call: 'Bang on the Drum', chant: '1986 LinnDrum Solo — Number 71!', emoji: '🥁', sfxType: 'horn' },
  72: { call: 'Six Dozen', chant: 'Danny La Rue Part Two — 72!', emoji: '🎩', sfxType: 'synth' },
  73: { call: 'Queen Bee', chant: 'Buzzin around the Bingo Hall — 73!', emoji: '🐝', sfxType: 'whistle' },
  74: { call: 'Hit the Floor / Candy Store', chant: 'Neon Limbo Time — Seventy-Four!', emoji: '🍬', sfxType: 'coin' },
  75: { call: 'Strive and Strive', chant: 'Top of the Bingo Column — 75!', emoji: '🏆', sfxType: 'horn' },
  76: { call: 'Trombones!', chant: 'Seventy-Six Trombones Led the Parade!', emoji: '🎺', sfxType: 'horn' },
  77: { call: 'Sunset Strip!', chant: 'Two Little Crutches on Sunset Strip — 77!', emoji: '🌴', sfxType: 'whistle' },
  78: { call: "Heaven's Gate", chant: "Thirty-Nine Plus Thirty-Nine — 78!", emoji: '🕊️', sfxType: 'synth' },
  79: { call: 'One More Time!', chant: 'Daft Synthwave Encore — 79!', emoji: '🔁', sfxType: 'synth' },
  80: { call: "Eight and Blank / Gandhi's Breakfast", chant: 'Ate Nothing! Zero Calorie Bingo — 80!', emoji: '🍽️', sfxType: 'boing' },
  81: { call: 'Stop and Run', chant: 'Fat Lady with a Walking Stick — 81!', emoji: '🦯', sfxType: 'boing' },
  82: { call: 'Straight on Through', chant: 'Donut Drive-Thru — Number 82!', emoji: '🛣️', sfxType: 'horn' },
  83: { call: 'Time for Tea', chant: 'Break out the Rich Tea biscuits — 83!', emoji: '🫖', sfxType: 'bell' },
  84: { call: 'Seven Dozen!', chant: 'Give Me More — Eighty-Four!', emoji: '🎂', sfxType: 'coin' },
  85: { call: 'Staying Alive!', chant: 'Ah, ah, ah, ah — Disco Disco 85!', emoji: '🕺', sfxType: 'whistle' },
  86: { call: 'Between the Sticks — 1986!', chant: 'THE GREATEST YEAR IN ARCADE HISTORY — 86!', emoji: '🕹️', sfxType: 'horn' },
  87: { call: 'Torquay in Devon', chant: 'Fawlty Towers Bingo Night — 87!', emoji: '🏖️', sfxType: 'boing' },
  88: { call: 'Two Fat Ladies — 88 MPH!', chant: 'WOBBLE WOBBLE! FLUX CAPACITOR CHARGED — 88!', emoji: '🏎️⚡', sfxType: 'horn' },
  89: { call: 'Nearly There!', chant: 'One Short of the Shop — Hold Your Breath!', emoji: '😬', sfxType: 'bell' },
  90: { call: 'Top of the Shop!', chant: 'END OF THE LINE! TOP OF THE SHOP — 90!', emoji: '👑', sfxType: 'horn' }
};

export const RIVAL_HALL_PLAYERS = [
  { id: 'nanna', name: 'Nanna Turbo ’86', avatar: '👵', bio: '4 lucky trolls on the desk', baseLuck: 0.96 },
  { id: 'barry', name: 'Synthwave Barry', avatar: '🕶️', bio: 'Double-fisting UV pink dabbers', baseLuck: 0.94 },
  { id: 'brenda', name: 'Big Perm Brenda', avatar: '🐩', bio: 'Hairspray can visible from orbit', baseLuck: 0.92 },
  { id: 'clive', name: 'Commodore Clive', avatar: '🤖', bio: 'Running Bingo.BAS on 64KB RAM', baseLuck: 0.9 }
];

export const FALSE_CALL_ROASTS = [
  'Put your bifocals on, petal! That is a BOGUS BINGO! The pensioners in Row 3 are pelting you with Custard Creams!',
  'FALSE CALL! Security is confiscating your neon dabber! Check your numbers before shouting in the hall!',
  'BOOOOO! Even Commodore Clive on 64KB RAM knows you are bluffing! Tomato Squadron, fire at will!',
  'NOT EVEN CLOSE! Were you dabbing phone numbers?! Big Perm Brenda is tutting loudly from Table 4!',
  'SHAME! BOGUS CLAIM! That card has fewer dabs than a blank floppy disk!'
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates an authentic 90-Ball UK Bingo Ticket (3 rows x 9 cols, 15 numbers total, 5 per row).
 * Col 0: 1..9, Col 1: 10..19, ..., Col 7: 70..79, Col 8: 80..90. Numbers in each column sorted top-to-bottom.
 */
export function generate90BallCard(cardIndex = 0) {
  const colRanges = [
    [1, 9],
    [10, 19],
    [20, 29],
    [30, 39],
    [40, 49],
    [50, 59],
    [60, 69],
    [70, 79],
    [80, 90]
  ];

  // Try building valid 3x9 layout where every col has 1-3 nums and every row has 5 nums
  let grid;
  for (let attempt = 0; attempt < 30; attempt++) {
    grid = Array.from({ length: 3 }, () => Array(9).fill(null));
    const colCounts = Array(9).fill(1); // minimum 1 per column (9 used)
    let remaining = 6; // 15 total numbers
    while (remaining > 0) {
      const c = Math.floor(Math.random() * 9);
      if (colCounts[c] < 3) {
        colCounts[c] += 1;
        remaining -= 1;
      }
    }

    const rowCounts = [0, 0, 0];
    // Assign columns with count=3 first, then 2, then 1 so row targets stay balanced (5,5,5)
    const colsByCount = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort((a, b) => colCounts[b] - colCounts[a]);
    let failed = false;
    for (const c of colsByCount) {
      const need = colCounts[c];
      const eligibleRows = [0, 1, 2]
        .filter((r) => rowCounts[r] < 5)
        .sort((a, b) => rowCounts[a] - rowCounts[b] + (Math.random() - 0.5) * 0.4);
      if (eligibleRows.length < need) {
        failed = true;
        break;
      }
      for (let k = 0; k < need; k++) {
        const r = eligibleRows[k];
        rowCounts[r] += 1;
        grid[r][c] = -1; // mark slot active
      }
    }
    if (!failed && rowCounts[0] === 5 && rowCounts[1] === 5 && rowCounts[2] === 5) {
      break;
    }
  }

  const numbers = [];
  for (let c = 0; c < 9; c++) {
    const [min, max] = colRanges[c];
    const pool = [];
    for (let n = min; n <= max; n++) pool.push(n);
    const activeRows = [0, 1, 2].filter((r) => grid[r][c] === -1);
    const picked = shuffle(pool).slice(0, activeRows.length).sort((a, b) => a - b);
    activeRows.forEach((r, idx) => {
      grid[r][c] = picked[idx];
      numbers.push(picked[idx]);
    });
  }

  return {
    id: `card-90-${cardIndex}-${Math.random().toString(36).slice(2, 6)}`,
    mode: '90',
    label: `TICKET #0${cardIndex + 1}`,
    serial: `86-${1040 + cardIndex * 111}`,
    grid,
    numbers
  };
}

/**
 * Generates a classic 75-Ball 5x5 Arcade Grid (B-I-N-G-O), center cell = FREE.
 */
export function generate75BallCard(cardIndex = 0) {
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75]
  ];
  const cols = ranges.map(([min, max], colIdx) => {
    const pool = [];
    for (let n = min; n <= max; n++) pool.push(n);
    const picked = shuffle(pool).slice(0, 5);
    if (colIdx === 2) picked[2] = 'FREE';
    return picked;
  });

  const grid = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => cols[c][r])
  );
  const numbers = grid.flat().filter((v) => typeof v === 'number');

  return {
    id: `card-75-${cardIndex}-${Math.random().toString(36).slice(2, 6)}`,
    mode: '75',
    label: `CARD #0${cardIndex + 1}`,
    serial: `75-${2086 + cardIndex * 101}`,
    grid,
    numbers
  };
}

/**
 * Evaluates prizes completed & dabbed on a card.
 */
export function evaluateCardStatus(card, calledSet, dabbedSet) {
  const isCellDabbed = (val) => val === 'FREE' || dabbedSet.has(val);
  let completedLines = 0;
  let completedCorners;
  let minLineMissing = 99;
  const nearWinNumbers = new Set();

  if (card.mode === '90') {
    // 3 horizontal rows, each has 5 numbers
    card.grid.forEach((row) => {
      const nums = row.filter((v) => typeof v === 'number');
      const missing = nums.filter((n) => !isCellDabbed(n));
      if (missing.length === 0) {
        completedLines += 1;
      } else if (missing.length <= minLineMissing) {
        if (missing.length < minLineMissing) {
          nearWinNumbers.clear();
          minLineMissing = missing.length;
        }
        missing.forEach((n) => nearWinNumbers.add(n));
      }
    });
    // 4 Corners: first & last numbers of Row 0 and Row 2
    const topNums = card.grid[0].filter((v) => typeof v === 'number');
    const botNums = card.grid[2].filter((v) => typeof v === 'number');
    const corners = [topNums[0], topNums[topNums.length - 1], botNums[0], botNums[botNums.length - 1]];
    completedCorners = corners.every((n) => isCellDabbed(n));
  } else {
    // 75-Ball 5x5: rows, cols, 2 diagonals + 4 corners
    const lines = [];
    for (let r = 0; r < 5; r++) lines.push(card.grid[r]);
    for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => card.grid[r][c]));
    lines.push([0, 1, 2, 3, 4].map((i) => card.grid[i][i]));
    lines.push([0, 1, 2, 3, 4].map((i) => card.grid[i][4 - i]));

    lines.forEach((line) => {
      const nums = line.filter((v) => typeof v === 'number');
      const missing = nums.filter((n) => !isCellDabbed(n));
      if (missing.length === 0) {
        completedLines += 1;
      } else if (missing.length <= minLineMissing) {
        if (missing.length < minLineMissing) {
          nearWinNumbers.clear();
          minLineMissing = missing.length;
        }
        missing.forEach((n) => nearWinNumbers.add(n));
      }
    });

    const corners = [card.grid[0][0], card.grid[0][4], card.grid[4][0], card.grid[4][4]];
    completedCorners = corners.every((n) => isCellDabbed(n));
  }

  const dabbedCount = card.numbers.filter((n) => dabbedSet.has(n)).length;
  const totalCount = card.numbers.length;
  const undabbedCalled = card.numbers.filter((n) => calledSet.has(n) && !dabbedSet.has(n));
  const fullHouse = dabbedCount === totalCount && totalCount > 0;

  // Check if player would have won if they had dabbed their called numbers
  const calledLineCount =
    card.mode === '90'
      ? card.grid.filter((row) => row.filter((v) => typeof v === 'number').every((n) => calledSet.has(n))).length
      : (() => {
          const all = [];
          for (let r = 0; r < 5; r++) all.push(card.grid[r]);
          for (let c = 0; c < 5; c++) all.push([0, 1, 2, 3, 4].map((r) => card.grid[r][c]));
          all.push([0, 1, 2, 3, 4].map((i) => card.grid[i][i]));
          all.push([0, 1, 2, 3, 4].map((i) => card.grid[i][4 - i]));
          return all.filter((l) => l.every((v) => v === 'FREE' || calledSet.has(v))).length;
        })();

  return {
    oneLine: completedLines >= 1,
    twoLines: completedLines >= 2,
    fourCorners: completedCorners,
    fullHouse,
    completedLines,
    dabbedCount,
    totalCount,
    remainingForHouse: totalCount - dabbedCount,
    undabbedCalled,
    calledButUndabbedWin: calledLineCount > completedLines,
    oneToGo: minLineMissing === 1 ? [...nearWinNumbers] : []
  };
}
