# Gen 3 Static Webapp

Single-page static client-side app for exporting Gen 3 `.gba` ROM data with a required HMA-style `.toml` layout file.

## Run

From the repo root:

```bash
cd webapp
python3 -m http.server 4173
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).


## Verify

From the repo root:

```bash
node tests/test_gen3_webapp_exporter.mjs
```

That test regenerates fresh CLI outputs for `firered` and `autumnred`, then asserts the browser exporter matches them exactly.

## Data Snapshots

The app imports frozen browser-friendly data snapshots in [`src/data`](./src/data):

- `showdown-defaults.mjs`
- `ddex-base.mjs`

If the source defaults or ddex base data change, rebuild those modules from the repo root with:

```bash
node tools/build_webapp_data_modules.cjs
```
