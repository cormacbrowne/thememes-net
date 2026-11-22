import { describe, expect, it } from 'vitest';
import { umamiProps } from '../../src/lib/analytics.ts';

describe('umamiProps', () => {
  it('removes content IDs that could link an event to an account', () => {
    expect(
      umamiProps({ channel: 'battle_link', meme_id: 'm1', battle: 'b1', entry: 'e1' })
    ).toEqual({ channel: 'battle_link' });
  });

  it('keeps non-identifying props and does not change the original', () => {
    const props = { channel: 'x', meme_id: 'm1', solved: 3, won: true };
    expect(umamiProps(props)).toEqual({ channel: 'x', solved: 3, won: true });
    expect(props.meme_id).toBe('m1');
  });
});
