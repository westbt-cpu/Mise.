import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, parseLine, match, parseHaulLine, normalizeExpiry } from '../js/interpret.js';

describe('parseLine', () => {
  // Plain "Name, N" is the app's own placeholder example format.
  // Regression guard: older bullet-filter code dropped these non-bullet lines.
  it('parses "Coconut Milk, 2" → {name, qty:2}', () => {
    assert.deepEqual(parseLine('Coconut Milk, 2'), {
      name: 'Coconut Milk',
      qty: 2,
    });
  });

  it('parses bullet + dash form "• Olive Oil - 1"', () => {
    assert.deepEqual(parseLine('• Olive Oil - 1'), {
      name: 'Olive Oil',
      qty: 1,
    });
  });

  it('parses "2 x Black Beans"', () => {
    assert.deepEqual(parseLine('2 x Black Beans'), {
      name: 'Black Beans',
      qty: 2,
    });
  });

  it('parses "Rice (3)"', () => {
    assert.deepEqual(parseLine('Rice (3)'), { name: 'Rice', qty: 3 });
  });

  it('defaults qty to 1 for bare names', () => {
    assert.deepEqual(parseLine('Just A Name'), {
      name: 'Just A Name',
      qty: 1,
    });
  });

  it('returns null for empty / bullet-only lines', () => {
    assert.equal(parseLine(''), null);
    assert.equal(parseLine('   '), null);
    assert.equal(parseLine('•'), null);
    assert.equal(parseLine('  -  '), null);
  });
});

describe('normalize / match', () => {
  const items = (names) => names.map((name, i) => ({ id: String(i), name, qty: 1 }));

  it("matches 'Unsalted Butter' to station 'butter'", () => {
    const hit = match('Unsalted Butter', items(['butter']));
    assert.ok(hit);
    assert.equal(hit.name, 'butter');
  });

  it("matches 'all-purpose flour' to station 'AP flour'", () => {
    const hit = match('all-purpose flour', items(['AP flour']));
    assert.ok(hit);
    assert.equal(hit.name, 'AP flour');
  });

  it("matches 'Rolled Oats' to station 'oats'", () => {
    const hit = match('Rolled Oats', items(['oats']));
    assert.ok(hit);
    assert.equal(hit.name, 'oats');
  });

  it('leaves a true non-match unmatched', () => {
    assert.equal(match('saffron', items(['butter', 'flour', 'oats'])), undefined);
  });

  it('normalize strips salt modifiers and collapses AP flour', () => {
    assert.equal(normalize('Unsalted Butter'), 'butter');
    assert.equal(normalize('all-purpose flour'), 'ap flour');
  });
});

describe('match — substring false-positive guards', () => {
  // Regression guards: raw includes() matching wrongly paired these.
  const station = [
    { id: 'i1', name: 'Olive Oil', qty: 1 },
    { id: 'i2', name: 'tea', qty: 1 },
    { id: 'i3', name: 'salt', qty: 1 },
  ];
  it('"foil" does not match "Olive Oil"', () => {
    assert.equal(match('foil', station), undefined);
  });
  it('"steak" does not match "tea"', () => {
    assert.equal(match('steak', station), undefined);
  });
  it('"basalt" does not match "salt"', () => {
    assert.equal(match('basalt', station), undefined);
  });
  it('whole-word overlap still matches: "oil" → "Olive Oil"', () => {
    assert.equal(match('oil', station)?.id, 'i1');
  });
  it('"Rolled Oats" still matches item "oats"', () => {
    assert.equal(match('Rolled Oats', [{ id: 'i4', name: 'oats', qty: 1 }])?.id, 'i4');
  });
});

describe('parseHaulLine — extended haul import format', () => {
  it('parses full pipe format: name | qty | category | notes | expiry', () => {
    assert.deepEqual(parseHaulLine('Coconut Milk | 2 | Canned Goods | Thai Kitchen 13.5oz | 2027-03'), {
      name: 'Coconut Milk', qty: 2, category: 'Canned Goods',
      notes: 'Thai Kitchen 13.5oz', expiry: '2027-03-01',
    });
  });
  it('accepts trailing fields dropped', () => {
    assert.deepEqual(parseHaulLine('Coconut Milk | 2'), { name: 'Coconut Milk', qty: 2 });
  });
  it('full YYYY-MM-DD expiry passes through', () => {
    assert.equal(parseHaulLine('Oats | 1 | Grains | x | 2027-03-15').expiry, '2027-03-15');
  });
  it('junk qty defaults to 1; junk expiry dropped', () => {
    const p = parseHaulLine('Oats | many | Grains | | soon');
    assert.equal(p.qty, 1);
    assert.equal(p.expiry, undefined);
  });
  it('falls back to parseLine for plain comma lines', () => {
    assert.deepEqual(parseHaulLine('Coconut Milk, 2'), { name: 'Coconut Milk', qty: 2 });
  });
  it('empty name yields null', () => {
    assert.equal(parseHaulLine(' | 2 | Grains'), null);
  });
});

describe('normalizeExpiry', () => {
  it('passes YYYY-MM-DD, expands YYYY-MM, rejects junk', () => {
    assert.equal(normalizeExpiry('2027-03-15'), '2027-03-15');
    assert.equal(normalizeExpiry('2027-03'), '2027-03-01');
    assert.equal(normalizeExpiry('March 2027'), '');
    assert.equal(normalizeExpiry(''), '');
  });
});
