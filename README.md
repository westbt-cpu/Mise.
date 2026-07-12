# Mise.

Personal kitchen station PWA — inventory, shopping list, recipes, and cook mode. Static files only; no build step.

## Run locally

ES modules require a real origin, so `file://` will not work. Serve the repo root:

```bash
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080`.

## Tests

Zero dependencies — Node's built-in test runner:

```bash
node --test tests/*.mjs
```

## Barcode scanning

Native `BarcodeDetector` where the browser has it (Chrome/Android); elsewhere (iOS Safari) a vendored ponyfill loads lazily on first scan:

- `js/vendor/barcode-detector-ponyfill.js` — [barcode-detector](https://github.com/Sec-ant/barcode-detector) 3.2.0 (MIT)
- `js/vendor/zxing_reader.wasm` — [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) 3.1.0 reader (Apache-2.0), SHA-256 pinned to the ponyfill's expected build (`b03d35cd…dfcf6`)

Scanned EAN/UPC codes are looked up against the [Open Food Facts](https://openfoodfacts.org) API (ODbL) to prefill the product name; offline or unmatched scans fall back to the raw code.

## Deploy

After shipping shell or JS changes, bump `VERSION` in `sw.js` so clients pick up the new service-worker cache.
