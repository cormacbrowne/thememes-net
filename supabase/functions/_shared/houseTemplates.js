// ==========================================
// Workstream 1 — template library the house agent may use.
// Mirrors STUDIO_TEMPLATES in src/data/starterMemes.js (same ids, /seed/ images, categories and
// layouts); tests/unit/houseAgent.unit.mjs fails if the two drift apart.
// Pure JS: runs in the Edge runtime and in node --test.
//
// House memes are NOT re-rendered: image_url is the /seed/ template and the caption is an
// unburned overlay (`overlay.live = true`) that the feed draws with MemeOverlay, using the
// same layer geometry as the Meme Forge layouts (src/components/forge/forgeEngine.js).
// ==========================================

export const HOUSE_TEMPLATES = [
  { id: 'tpl-drake-compare', category: 'relatable', layoutId: 'drake', name: '2-Panel Reject / Approve', slots: ['Top panel: the thing being rejected', 'Bottom panel: the thing preferred instead'] },
  { id: 'tpl-expanding-brain', category: 'tech', layoutId: 'classic', name: 'Expanding Galaxy Brain', slots: ['Top line: the small-brain take', 'Bottom line: the galaxy-brain take'] },
  { id: 'tpl-two-buttons', category: 'relatable', layoutId: 'classic', name: 'Two Red Buttons (sweating over a choice)', slots: ['Top line: option A', 'Bottom line: option B'] },
  { id: 'tpl-distracted-choice', category: 'tech', layoutId: 'classic', name: 'Distracted By Shiny New Thing', slots: ['Top line: the shiny new thing', 'Bottom line: the thing being neglected'] },
  { id: 'tpl-this-is-fine', category: 'tech', layoutId: 'classic', name: 'Calm in the Chaos (room on fire)', slots: ['Top line: the situation', 'Bottom line: the calm denial'] },
  { id: 'tpl-change-my-mind', category: 'dank', layoutId: 'classic', name: 'Hot Take Booth', slots: ['Top line: the hot take', 'Bottom line: a confident dare to disagree'] },
  { id: 'tpl-buff-vs-smol', category: 'gaming', layoutId: 'classic', name: 'Buff vs Smol', slots: ['Top line: the strong old version', 'Bottom line: the weak new version'] },
  { id: 'tpl-stonks-up', category: 'dank', layoutId: 'classic', name: 'Line Goes Up', slots: ['Top line: the questionable move', 'Bottom line: the smug payoff'] },
  { id: 'tpl-not-stonks', category: 'dank', layoutId: 'classic', name: 'Line Goes Down', slots: ['Top line: the bad outcome', 'Bottom line: the painful result'] },
  { id: 'tpl-woman-yelling-cat', category: 'relatable', layoutId: 'classic', name: 'Yelling vs Unbothered Dinner Cat', slots: ['Top line: the furious accusation', 'Bottom line: the unbothered reply'] },
  { id: 'tpl-gigachad-verdict', category: 'dank', layoutId: 'classic', name: 'Unbothered Verdict', slots: ['Top line: the bold choice', 'Bottom line: the confident punchline'] },
  { id: 'tpl-clown-makeup', category: 'relatable', layoutId: 'classic', name: '4-Step Clown Makeup', slots: ['Top line: the first naive belief', 'Bottom line: the full-clown realisation'] },
  { id: 'tpl-always-has-been', category: 'dank', layoutId: 'classic', name: 'It Was Always This Way', slots: ['Top line: a shocked discovery', 'Bottom line: the bored reply that nothing has changed'] },
  { id: 'tpl-brain-at-3am', category: 'relatable', layoutId: 'classic', name: 'Brain wakes you up at 3 AM', slots: ['Top line: trying to sleep', 'Bottom line: what the brain suddenly brings up'] },
  { id: 'tpl-surprised-shock', category: 'gaming', layoutId: 'classic', name: 'Surprised shock face', slots: ['Top line: the setup', 'Bottom line: the shocking (obvious) result'] },
  { id: 'tpl-trade-offer', category: 'gaming', layoutId: 'classic', name: 'Trade offer', slots: ['Top line: I receive ...', 'Bottom line: you receive ...'] },
  { id: 'tpl-bell-curve-iq', category: 'tech', layoutId: 'classic', name: 'IQ bell curve (midwit)', slots: ['Top line: the simple answer both ends agree on', 'Bottom line: the overcomplicated midwit take'] },
  { id: 'tpl-highway-exit', category: 'gaming', layoutId: 'classic', name: 'Highway exit drift turn', slots: ['Top line: the sensible road', 'Bottom line: the chaotic exit taken'] },
  { id: 'tpl-spiderman-point', category: 'tech', layoutId: 'classic', name: 'Two identical people pointing at each other', slots: ['Top line: one side', 'Bottom line: the identical other side'] },
  { id: 'tpl-trophy-celebration', category: 'gaming', layoutId: 'classic', name: 'Over-celebrating 3rd place', slots: ['Top line: the tiny achievement', 'Bottom line: the huge celebration'] }
];

export const templateSrc = (id) => `/seed/${id}.webp`;
export const houseTemplateById = (id) => HOUSE_TEMPLATES.find((t) => t.id === id) || null;

/** Same defaults as makeTextLayer() in forgeEngine.js. */
function textLayer(overrides) {
  return {
    type: 'text',
    text: '',
    x: 0.5,
    y: 0.5,
    w: 0.9,
    h: 0.16,
    rot: 0,
    font: 'Anton',
    size: 0.09,
    fill: '#ffffff',
    stroke: 0.09,
    strokeColor: '#000000',
    align: 'center',
    caps: true,
    ...overrides
  };
}

const blackCaption = { fill: '#000000', stroke: 0, caps: false, font: 'Inter', size: 0.07 };

/**
 * overlay JSON for a house meme: the caption lines placed like the Forge layout for that
 * template ('classic' top/bottom, 'drake' right-hand panels). `live: true` tells the feed to
 * draw it over the bare template (house memes have no burned-in text).
 */
export function buildHouseOverlay(templateId, lines = []) {
  const t = houseTemplateById(templateId);
  const [a = '', b = ''] = lines.map((l) => String(l ?? '').trim());
  const layers =
    t?.layoutId === 'drake'
      ? [
          textLayer({ ...blackCaption, id: 'house-1', text: a, x: 0.75, y: 0.25, w: 0.44, h: 0.4 }),
          textLayer({ ...blackCaption, id: 'house-2', text: b, x: 0.75, y: 0.75, w: 0.44, h: 0.4 })
        ]
      : [
          textLayer({ id: 'house-1', text: a, y: 0.1, h: 0.18 }),
          textLayer({ id: 'house-2', text: b, y: 0.9, h: 0.18 })
        ];
  return { v: 1, burned: false, live: true, layers: layers.filter((l) => l.text) };
}
