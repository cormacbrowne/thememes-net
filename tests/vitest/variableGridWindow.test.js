import { describe, expect, it } from 'vitest';
import { buildGridRows, computeVariableGridWindow } from '../../src/utils/feedPagination';

describe('buildGridRows', () => {
  it('fills rows by column count and gives full-width entries their own row', () => {
    const entries = [{}, {}, {}, { fullWidth: true }, {}, {}, {}];
    expect(buildGridRows(entries, 2)).toEqual([[0, 1], [2], [3], [4, 5], [6]]);
    expect(buildGridRows(entries, 1)).toEqual([[0], [1], [2], [3], [4], [5], [6]]);
  });
});

describe('computeVariableGridWindow', () => {
  const gapPx = 16;

  it('builds the top spacer from the real heights of the rows it replaces', () => {
    // Phone feed: cards of very different heights (iPhone jitter report, 20 Nov 2026).
    const rowHeights = [1183, 409, 476, 518, 566, 520, 539, 743, 539, 559];
    const win = computeVariableGridWindow({
      rowHeights,
      gapPx,
      scrollY: 1183 + 16 + 409 + 16 + 476 + 16 + 300,
      viewportHeight: 844,
      overscanPx: 0
    });
    expect(win.startRow).toBe(3);
    expect(win.topSpacerPx).toBe(1183 + 16 + 409 + 16 + 476 + 16);
    const rendered = rowHeights.slice(win.startRow, win.endRow).reduce((a, h) => a + h + gapPx, 0);
    // Spacers + rendered rows always add up to the full grid height.
    expect(win.topSpacerPx + rendered + (win.bottomSpacerPx ? win.bottomSpacerPx - gapPx : -gapPx)).toBe(win.totalPx);
  });

  it('uses the estimate for rows not measured yet, and keeps a minimum window', () => {
    const win = computeVariableGridWindow({
      rowHeights: new Array(100).fill(null),
      estimateRowPx: 500,
      gapPx,
      scrollY: 0,
      viewportHeight: 844,
      overscanPx: 0,
      minWindowRows: 24
    });
    expect(win.startRow).toBe(0);
    expect(win.endRow).toBe(24);
    expect(win.totalPx).toBe(100 * 516 - 16);
  });

  it('renders everything when there are no more rows than the minimum window', () => {
    const win = computeVariableGridWindow({ rowHeights: [300, 300], minWindowRows: 24 });
    expect(win).toMatchObject({ startRow: 0, endRow: 2, topSpacerPx: 0, bottomSpacerPx: 0 });
  });
});
