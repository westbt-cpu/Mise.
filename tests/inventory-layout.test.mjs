import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

describe('inventory grid swipe cards',()=>{
  it('fills stretched grid rows so swipe actions do not show below shorter cards',()=>{
    assert.match(html,/\.items-grid \.swipe-item \.swipe-inner\.item-card\{[^}]*height:100%/);
  });
});
