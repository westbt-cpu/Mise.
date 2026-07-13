import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadKitchen() {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('const Kitchen = (() => {');
  const end = html.indexOf('\n})();', start);
  assert.notEqual(start, -1, 'Kitchen module should exist in index.html');
  assert.notEqual(end, -1, 'Kitchen module should have a closing boundary');

  const source = `${html.slice(start, end + 6)}\nKitchen;`;
  let saveCount = 0;
  const context = {
    uid: () => 'generated-id',
    save: () => { saveCount += 1; },
    saveRecipes: () => {},
    saveStaples: () => {},
    clearDemo: () => {},
    daysUntilExpiry: () => null,
    Planner: { consumption: () => ({ plan: [], skipped: [] }) },
  };

  return {
    Kitchen: vm.runInNewContext(source, context),
    saveCount: () => saveCount,
  };
}

describe('Kitchen restock threshold', () => {
  it('defaults new items to one and preserves an explicit zero on update', () => {
    const { Kitchen, saveCount } = loadKitchen();

    const item = Kitchen.addItem({ name: 'Flour', qty: 2 });
    assert.equal(item.threshold, 1);

    let updated = Kitchen.updateItem(item.id, { threshold: 3 });
    assert.equal(updated.threshold, 3);

    updated = Kitchen.updateItem(item.id, { threshold: 0 });
    assert.equal(updated.threshold, 0);
    assert.equal(saveCount(), 3, 'each mutation should still persist');
  });

  it('accepts zero from the form save path without coercing back to one', () => {
    const { Kitchen } = loadKitchen();
    const item = Kitchen.addItem({ name: 'Salt', qty: 1, threshold: 1 });
    // saveItem passes the raw input string through; Kitchen must not ||1 it away
    const updated = Kitchen.updateItem(item.id, { threshold: '0' });
    assert.equal(updated.threshold, 0);
  });

  it('presents one as the default when opening the new-item form', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="f-thresh" value="1"/);
    assert.match(html, /function openAddSheet[\s\S]*?getElementById\('f-thresh'\)\.value=1;/);
    // form must pass the raw value so zero survives (no ||1 on the form read)
    assert.match(html, /threshold:document\.getElementById\('f-thresh'\)\.value/);
  });
});

describe('Kitchen settings order', () => {
  it('moves locations and categories and persists each change', () => {
    const { Kitchen, saveCount } = loadKitchen();
    Kitchen.replaceLocations(['Pantry', 'Fridge', 'Freezer']);
    Kitchen.replaceCategories(['Produce', 'Dairy', 'Other']);

    assert.equal(Kitchen.moveLocation(2, -1), true);
    assert.deepEqual([...Kitchen.locations()], ['Pantry', 'Freezer', 'Fridge']);
    assert.equal(Kitchen.moveCategory(0, 1), true);
    assert.deepEqual([...Kitchen.categories()], ['Dairy', 'Produce', 'Other']);
    assert.equal(saveCount(), 2);
  });

  it('rejects moves beyond either end without persisting', () => {
    const { Kitchen, saveCount } = loadKitchen();
    Kitchen.replaceLocations(['Pantry', 'Fridge']);
    Kitchen.replaceCategories(['Produce', 'Other']);

    assert.equal(Kitchen.moveLocation(0, -1), false);
    assert.equal(Kitchen.moveCategory(1, 1), false);
    assert.equal(saveCount(), 0);
  });

  it('populates item-entry selects in the persisted array order', () => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /f-category'\)\.innerHTML=categories\.map/);
    assert.match(html, /f-location'\)\.innerHTML=locations\.map/);
  });
});
