import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTrail, generateMine, MINE_ENTRY } from '../src/world.js';
import { M, MINE_W, TRAIL_LEN, TOWN_END } from '../src/data.js';

test('stien er deterministisk', () => {
  assert.deepEqual(generateTrail(42).surf, generateTrail(42).surf);
});

test('ingen trinn høyere enn et hopp, og alt er på plass (300 frø)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const t = generateTrail(seed * 7919);
    for (let x = 1; x < TRAIL_LEN; x++) {
      assert.ok(Math.abs(t.surf[x] - t.surf[x - 1]) <= 2, `seed ${seed}: trinn ved x=${x}`);
    }
    assert.ok(t.needle > TOWN_END, `seed ${seed}: mangler Nåla`);
    assert.ok(t.dutch > TOWN_END, `seed ${seed}: mangler Hollenderen`);
    assert.ok(t.mines.length >= 5, `seed ${seed}: for få gruver`);
    assert.ok(t.creeks.length >= 4, `seed ${seed}: for få bekker`);
  }
});

test('gruver har inngang, stige ned og gull', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const t = generateMine(seed * 31, seed % 5 === 0);
    assert.equal(t[MINE_ENTRY.y * MINE_W + MINE_ENTRY.x], M.AIR);
    assert.equal(t[MINE_ENTRY.y * MINE_W + 1], M.EXIT);
    assert.ok(t.some((v) => v === M.LADDER), `seed ${seed}: ingen sjakt`);
    assert.ok(t.some((v) => v === M.VEIN || v === M.RICH), `seed ${seed}: ingen gullårer`);
  }
});
