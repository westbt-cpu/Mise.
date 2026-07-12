// ── PLANNER (recipe quantity semantics, stated once) ─────────────────────────
// Semantics:
// - item.qty is a PACKAGE COUNT (how many packages you have on the shelf).
// - ing.amount is an informational measure in recipe units (g, ml, cups, …).
// - The two are NEVER compared arithmetically.
// - Availability = a matched, unmuted item with qty>0 (or a staple).
// - Consumption = 1 package per cooked non-staple matched ingredient.
// Pure: no DOM, no localStorage, no globals. Explicit args only.

import { match, normalize, sharesToken } from './interpret.js';

export function isStaple(ingName, stapleList) {
  const n = normalize(ingName);
  if (!n) return false;
  return (stapleList || []).some((s) => {
    const m = normalize(s);
    return n === m || sharesToken(n, m);
  });
}

export function readiness(recipe, itemList, stapleList) {
  itemList = itemList || [];
  stapleList = stapleList || [];
  const ings = recipe.ingredients || [];
  if (!ings.length) return 'ready';
  let ok = 0;
  for (const ing of ings) {
    if (isStaple(ing.name, stapleList)) {
      ok++;
      continue;
    }
    const item = match(ing.name, itemList);
    if (item && (item.noAlert || item.qty > 0)) ok++;
  }
  if (ok === ings.length) return 'ready';
  if (ok >= Math.ceil(ings.length / 2)) return 'mostly';
  return 'missing';
}

export function detail(recipe, scale, itemList, stapleList) {
  scale = scale || 1;
  itemList = itemList || [];
  stapleList = stapleList || [];
  const details = (recipe.ingredients || []).map((ing) => {
    if (isStaple(ing.name, stapleList)) return { ...ing, status: 'staple' };
    const item = match(ing.name, itemList);
    if (!item) return { ...ing, status: 'missing' };
    // qty is package count — never compared to ing.amount*scale
    if (item.noAlert || item.qty > 0)
      return { ...ing, status: 'ok', haveQty: item.qty, haveUnit: item.unit || '' };
    return { ...ing, status: 'out', haveQty: 0, haveUnit: item.unit || '' };
  });
  return { details };
}

export function consumption(recipe, scale, itemList, stapleList) {
  itemList = itemList || [];
  stapleList = stapleList || [];
  const skipped = [],
    plan = [];
  // Simulate package decrements so multi-ingredient hits on one item match original cook loop
  const sim = {};
  itemList.forEach((i) => {
    sim[i.id] = i.qty;
  });
  for (const ing of recipe.ingredients || []) {
    if (isStaple(ing.name, stapleList)) {
      skipped.push({ name: ing.name, reason: 'staple' });
      continue;
    }
    const item = match(ing.name, itemList);
    if (!item) {
      skipped.push({ name: ing.name, reason: 'not in station' });
      continue;
    }
    if (item.noAlert) {
      skipped.push({ name: ing.name, reason: 'muted' });
      continue;
    }
    if ((sim[item.id] || 0) <= 0) {
      skipped.push({ name: ing.name, reason: 'already out' });
      continue;
    }
    plan.push({ id: item.id, name: item.name });
    sim[item.id] = (sim[item.id] || 0) - 1;
  }
  return { plan, skipped };
}
