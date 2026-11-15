// ==========================================
// Phase 33 task 33.4 — text blocklist used by textFilter.js.
// Terms are ROT13-encoded so slurs do not sit in the source as plain text (decode: a↔n, b↔o, …).
// To add a term: ROT13-encode it (e.g. echo word | tr 'a-z' 'n-za-m') and add a row.
//   category: hate | threat | sexual | spam
//   mode:     'word'   = whole words / phrases only (avoids "Scunthorpe" false positives)
//             'inside' = also inside longer words (only for distinctive slurs)
// Ordinary swearing is deliberately NOT here: memes are allowed to be rude.
// ==========================================
export const ENCODED_BLOCKLIST = [
  ['avttre', 'hate', 'inside'],
  ['avttn', 'hate', 'inside'],
  ['puvax', 'hate', 'word'],
  ['fcvp', 'hate', 'word'],
  ['xvxr', 'hate', 'word'],
  ['jrgonpx', 'hate', 'inside'],
  ['enturnq', 'hate', 'inside'],
  ['gbjryurnq', 'hate', 'inside'],
  ['snttbg', 'hate', 'inside'],
  ['snt', 'hate', 'word'],
  ['qlxr', 'hate', 'word'],
  ['genaal', 'hate', 'inside'],
  ['ergneq', 'hate', 'word'],
  ['cnxv', 'hate', 'word'],
  ['tbbx', 'hate', 'word'],
  ['ornare', 'hate', 'word'],
  ['pbba', 'hate', 'word'],
  ['tbyyvjbt', 'hate', 'inside'],
  ['cvxrl', 'hate', 'word'],
  ['tlccb', 'hate', 'word'],
  ['urvy uvgyre', 'hate', 'word'],
  ['fvrt urvy', 'hate', 'word'],
  ['tnf gur wrjf', 'hate', 'word'],
  ['juvgr cbjre', 'hate', 'word'],
  ['xvyy lbhefrys', 'threat', 'word'],
  ['xvyy hefrys', 'threat', 'word'],
  ['xvyy lfrys', 'threat', 'word'],
  ['xlf', 'threat', 'word'],
  ['arpx lbhefrys', 'threat', 'word'],
  ['unat lbhefrys', 'threat', 'word'],
  ['tb qvr', 'threat', 'word'],
  ['ubcr lbh qvr', 'threat', 'word'],
  ['v jvyy xvyy lbh', 'threat', 'word'],
  ['vz tbvat gb xvyy lbh', 'threat', 'word'],
  ['vz tbaan xvyy lbh', 'threat', 'word'],
  ['v xabj jurer lbh yvir', 'threat', 'word'],
  ['fubbg hc gur fpubby', 'threat', 'word'],
  ['obzo gur fpubby', 'threat', 'word'],
  ['cbea', 'sexual', 'word'],
  ['cbeab', 'sexual', 'word'],
  ['cbeauho', 'sexual', 'inside'],
  ['kivqrbf', 'sexual', 'inside'],
  ['uragnv', 'sexual', 'word'],
  ['ahqrf', 'sexual', 'word'],
  ['fraq ahqrf', 'sexual', 'word'],
  ['baylsnaf', 'sexual', 'inside'],
  ['oybjwbo', 'sexual', 'inside'],
  ['phzfubg', 'sexual', 'inside'],
  ['encr', 'sexual', 'word'],
  ['encvfg', 'sexual', 'word'],
  ['ybyv', 'sexual', 'word'],
  ['puvyq cbea', 'sexual', 'word'],
  ['wnvyonvg', 'sexual', 'inside'],
  ['serr ebohk', 'spam', 'word'],
  ['serr iohpxf', 'spam', 'word'],
  ['pelcgb tvirnjnl', 'spam', 'word'],
  ['qbhoyr lbhe ovgpbva', 'spam', 'word']
];

export const rot13 = (s) =>
  s.replace(/[a-z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 97 + 13) % 26) + 97));
