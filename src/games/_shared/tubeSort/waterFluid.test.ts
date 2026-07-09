import { describe, expect, it } from 'vitest';
import { mergeTubeLayers, visualLayers } from './waterFluid';

describe('waterFluid', () => {
  it('merges consecutive same colors into one body', () => {
    expect(mergeTubeLayers([1, 1, 2, 2])).toEqual([
      { colorId: 1, units: 2 },
      { colorId: 2, units: 2 },
    ]);
  });

  it('animates partial drain on the top color run only', () => {
    const source = visualLayers([1, 1, 2, 2], 0, { drainTop: 1.5, drainColor: 2 });
    expect(source[source.length - 1]).toEqual({ colorId: 2, units: 0.5 });

    const dest = visualLayers([2], 0, { pourColor: 1, pourUnits: 1.5 });
    expect(dest).toEqual([
      { colorId: 2, units: 1 },
      { colorId: 1, units: 1.5 },
    ]);
  });
});
