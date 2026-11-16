// Single-centre-line SVG tube paths for THE MEMES.net neon sign (Phase 35.3).
// Real glass tubes bend with rounded corners and leave tiny gaps where one bend ends and another begins.

export const SIGN_VIEWBOX = '0 0 298 126';
export const ICON_VIEWBOX = '0 0 64 76';

// Rounded glass-bent letter paths (drawn in local letter coordinates)
const PATH_T = 'M1 1 H12 M6.5 3 V14';
const PATH_H = 'M1 0 V14 M1 7 H10 M10 0 V14';
const PATH_E_SM = 'M10 1 H2 Q0 1 0 3 V11 Q0 13 2 13 H10 M2 7 H7.5';

// Big MEMES letters (60px cap height, rounded glass bends + subtle tube gaps)
const PATH_M = 'M0 60 V4 Q0 0 3 4 L21 33 Q22 35 23 33 L41 4 Q44 0 44 4 V60';
const PATH_E = 'M30 0 H4 Q0 0 0 4 V56 Q0 60 4 60 H30 M2 30 H22';
const PATH_S = 'M34 9 C34 -2 0 -2 0 15 C0 32 34 28 34 45 C34 62 0 62 0 51';

export const SIGN_TUBES = [
  // [colour, x, y, strokeWidth, path, extraClass]
  ['cyan', 30, 8, 2.6, PATH_T, ''],
  ['cyan', 48, 8, 2.6, PATH_H, ''],
  ['cyan', 65, 8, 2.6, PATH_E_SM, ''],
  ['pink', 29, 34, 5, PATH_M, ''],
  ['pink', 87, 34, 5, PATH_E, ''],
  ['pink', 131, 34, 5, PATH_M, 'is-buzz'], // middle M has a loose connection
  ['pink', 189, 34, 5, PATH_E, ''],
  ['pink', 233, 34, 5, PATH_S, ''],
  ['amber', 29, 110, 2.6, 'M0 0 H116 L124 -8 L132 8 L140 -2 L144 0 H166', ''], // underline + zap
  ['cyan', 203, 101, 2.6, 'M0 13.5 v0.01', ''], // dot
  ['cyan', 210, 101, 2.6, 'M0 14 V5 M0 8 C0 2 10 2 10 8 V14', ''], // n
  ['cyan', 227, 101, 2.6, 'M1 9 H10 C10 1 0 1 0 8.5 C0 15.5 8 15.5 10 12', ''], // e
  ['cyan', 244, 101, 2.6, 'M4 0 V10.5 Q4 14 7.5 14 H10 M0 5 H9', ''] // t
];

export const ICON_TUBES = [
  ['pink', 10, 6, 5.2, PATH_M, ''],
  ['amber', 10, 70, 3, 'M0 0 H17 L21 -4 L25 4 L29 0 H44', '']
];
