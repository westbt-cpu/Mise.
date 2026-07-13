import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

describe('installed-app updates', () => {
  it('offers a Settings action that checks for and activates updates', () => {
    assert.match(html, /id="app-update-btn"[^>]*onclick="refreshApp\(\)"/);
    assert.match(html, /async function refreshApp\(\)/);
    assert.match(html, /registration\.update\(\)/);
    assert.match(html, /SKIP_WAITING/);
  });

  it('lets the page activate a waiting service worker', () => {
    assert.match(worker, /event\.data\?\.type==='SKIP_WAITING'/);
    assert.match(worker, /self\.skipWaiting\(\)/);
  });
});
