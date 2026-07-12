import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readiness, detail, consumption, isStaple } from '../js/planner.js';

function recipe(ings) {
  return { id: 'r1', name: 'Test', ingredients: ings };
}

function item(id, name, qty, extra = {}) {
  return { id, name, qty, unit: '', ...extra };
}

describe('readiness', () => {
  const staples = ['salt', 'pepper'];

  it('ready when every ingredient is present or staple', () => {
    const r = recipe([
      { name: 'Butter', amount: 50 },
      { name: 'Salt', amount: 1 },
    ]);
    const items = [item('1', 'Butter', 2)];
    assert.equal(readiness(r, items, staples), 'ready');
  });

  it('mostly when at least half of ingredients are ok', () => {
    // 2 of 3 ok → ceil(3/2)=2 → mostly
    const r = recipe([
      { name: 'Butter', amount: 50 },
      { name: 'Eggs', amount: 2 },
      { name: 'Saffron', amount: 1 },
    ]);
    const items = [item('1', 'Butter', 1), item('2', 'Eggs', 6)];
    assert.equal(readiness(r, items, staples), 'mostly');
  });

  it('missing when fewer than half are available', () => {
    const r = recipe([
      { name: 'Butter', amount: 50 },
      { name: 'Eggs', amount: 2 },
      { name: 'Saffron', amount: 1 },
      { name: 'Truffle', amount: 1 },
    ]);
    const items = [item('1', 'Butter', 1)];
    assert.equal(readiness(r, items, staples), 'missing');
  });

  it('empty ingredient list is ready', () => {
    assert.equal(readiness(recipe([]), [], staples), 'ready');
  });
});

describe('detail', () => {
  const staples = ['salt'];

  it("marks qty>0 'ok' and qty 0 'out' regardless of ing.amount", () => {
    // Regression: old code compared item.qty >= ing.amount (1>=90 → false → 'out').
    // Package count is never compared to recipe measure amounts.
    const r = recipe([
      { name: 'Coconut Milk', amount: 90 },
      { name: 'Rice', amount: 200 },
      { name: 'Salt', amount: 1 },
      { name: 'Saffron', amount: 1 },
    ]);
    const items = [
      item('1', 'Coconut Milk', 1),
      item('2', 'Rice', 0),
    ];
    const { details } = detail(r, 1, items, staples);
    assert.equal(details[0].status, 'ok');
    assert.equal(details[0].haveQty, 1);
    assert.equal(details[1].status, 'out');
    assert.equal(details[1].haveQty, 0);
    assert.equal(details[2].status, 'staple');
    assert.equal(details[3].status, 'missing');
  });
});

describe('consumption', () => {
  const staples = ['salt', 'olive oil'];

  it('decrements exactly 1 per matched non-staple; skips staples/unmatched/muted with reasons', () => {
    const r = recipe([
      { name: 'Butter', amount: 50 },
      { name: 'Butter', amount: 25 }, // second hit on same package line
      { name: 'Salt', amount: 1 },
      { name: 'Saffron', amount: 1 },
      { name: 'Vanilla', amount: 1 },
      { name: 'Eggs', amount: 2 },
    ]);
    const items = [
      item('b', 'Butter', 2),
      item('v', 'Vanilla Extract', 1, { noAlert: true }),
      item('e', 'Eggs', 0),
    ];
    const { plan, skipped } = consumption(r, 1, items, staples);

    // Two butter hits → two plan steps (package decrement of 1 each)
    assert.equal(plan.length, 2);
    assert.equal(plan[0].id, 'b');
    assert.equal(plan[1].id, 'b');

    const reasons = Object.fromEntries(skipped.map((s) => [s.name, s.reason]));
    assert.equal(reasons['Salt'], 'staple');
    assert.equal(reasons['Saffron'], 'not in station');
    assert.equal(reasons['Vanilla'], 'muted');
    assert.equal(reasons['Eggs'], 'already out');
  });
});

describe('isStaple — substring false-positive guards', () => {
  it('"basalt" is not the staple "salt"', () => {
    assert.equal(isStaple('basalt', ['salt']), false);
  });
  it('"kosher salt" matches the staple "salt"', () => {
    assert.equal(isStaple('kosher salt', ['salt']), true);
  });
  it('"extra virgin olive oil" matches the staple "olive oil"', () => {
    assert.equal(isStaple('extra virgin olive oil', ['olive oil']), true);
  });
});
