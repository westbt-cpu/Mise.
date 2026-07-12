import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, parseLine, match } from '../js/interpret.js';

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
