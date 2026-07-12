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
node --test tests/
# Node 24+: if a bare directory path fails to expand, use:
#   node --test "tests/**/*.mjs"
# or simply: node --test
```

## Deploy

After shipping shell or JS changes, bump `VERSION` in `sw.js` so clients pick up the new service-worker cache.
