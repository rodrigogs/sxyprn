import { describe, expect, it } from 'vitest';
import * as api from '../../src/index.js';

describe('package entry', () => {
  it('loads the public types module (no runtime exports until v0.1.0)', () => {
    expect(Object.keys(api).sort()).toEqual([]);
  });
});
