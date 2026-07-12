// Canonical normalize / parse / fuzzy-match. Prefer recipe-matcher behavior.
// Pure: no DOM, no localStorage, no globals.

export function normalize(n) {
  return String(n || '')
    .toLowerCase()
    .replace(/\bunsalted\b|\bsalted\b/g, '')
    .replace(/\ball[-\s]purpose\b|\bplain\b/g, 'ap')
    .replace(/,.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseLine(line) {
  const clean = String(line || '')
    .replace(/^[\s\-•·–*]+/, '')
    .trim();
  if (!clean) return null;
  let name = '',
    qty = 1;
  const m1 = clean.match(/^(.+?)[,\-–]\s*(\d+)\s*$/);
  const m2 = clean.match(/^(\d+)\s*[x×]\s*(.+)$/i);
  const m3 = clean.match(/^(.+?)\s*\((\d+)\)\s*$/);
  const m4 = clean.match(/^(.+?)\s+(\d+)$/);
  if (m1) {
    name = m1[1].trim();
    qty = parseInt(m1[2], 10);
  } else if (m2) {
    qty = parseInt(m2[1], 10);
    name = m2[2].trim();
  } else if (m3) {
    name = m3[1].trim();
    qty = parseInt(m3[2], 10);
  } else if (m4) {
    name = m4[1].trim();
    qty = parseInt(m4[2], 10);
  } else {
    name = clean;
    qty = 1;
  }
  return name ? { name, qty: qty || 1 } : null;
}

// Whole-word tokens (3+ chars) — raw substring matching gave false positives
// like foil→oil, steak→tea, basalt→salt.
function tokens(s) {
  return s.split(' ').filter((t) => t.length >= 3);
}

export function sharesToken(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  return ta.some((t) => tb.includes(t));
}

export function match(name, itemList) {
  const list = itemList || [];
  const n = normalize(name);
  if (!n) return undefined;
  const exact = list.find((i) => normalize(i.name) === n);
  if (exact) return exact;
  return list.find((i) => sharesToken(normalize(i.name), n));
}

// Accept "YYYY-MM-DD" or "YYYY-MM" (day defaults to 01); anything else -> ''.
export function normalizeExpiry(s) {
  const v = String(s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}$/.test(v)) return v + '-01';
  return '';
}

// Haul/photo import lines: "name | qty | category | notes | expiry" with
// trailing fields optional; lines without pipes fall back to parseLine.
export function parseHaulLine(line) {
  const clean = String(line || '')
    .replace(/^[\s\-•·–*]+/, '')
    .trim();
  if (!clean) return null;
  if (!clean.includes('|')) return parseLine(clean);
  const parts = clean.split('|').map((s) => s.trim());
  const name = parts[0];
  if (!name) return null;
  const qty = parseInt(parts[1], 10);
  const out = { name, qty: qty > 0 ? qty : 1 };
  if (parts[2]) out.category = parts[2];
  if (parts[3]) out.notes = parts[3];
  const expiry = normalizeExpiry(parts[4]);
  if (expiry) out.expiry = expiry;
  return out;
}
