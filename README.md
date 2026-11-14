# Analog Scout AI

Pick a site on the Moon or Mars and find its closest terrain analogs on Earth.
The engine compares relief, slope, surface roughness and geology, ranks Earth sites,
and explains each ranking.

> Status: hackathon prototype. Site values in `js/data.js` are **illustrative**.

## Project structure

```
analog-scout-ai/
├── index.html              page structure
├── css/style.css           styling (light and dark mode)
├── js/
│   ├── data.js             reference sites, Earth sites, rock-similarity table
│   ├── engine.js           similarity engine (distance + score + explanation)
│   └── app.js              UI: reads inputs, renders results
└── python/
    ├── similarity_engine.py   same logic in Python (pandas) for data work and testing
    └── requirements.txt
```

## Run locally

Open `index.html` in a browser. No build step and no dependencies.

For the Python engine:

```bash
cd python
pip install -r requirements.txt
python similarity_engine.py
```

## Put it on GitHub

```bash
cd analog-scout-ai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-user>/analog-scout-ai.git
git push -u origin main
```

To get a public link: repository **Settings > Pages > Deploy from a branch > main / (root)**.

## How the score works

1. Standardize numeric features (z-score over the Earth candidates).
2. Weighted Euclidean distance: `D = sqrt(sum(w_i * (x_i - y_i)^2))`.
3. Geology is categorical, so it uses a rock-similarity table (`GEO_SIM`) instead of a numeric difference.
4. Score: `S = 100 * exp(-D / tau)`.

The score is a similarity index, not a probability. Change `TAU` in `js/engine.js`
and the weights in the UI to see how the ranking reacts.

## Replacing the demo data

1. Get DEM tiles: Mars (MOLA, HiRISE), Moon (LOLA), Earth (SRTM or Copernicus DEM).
2. Resample all of them to the same resolution and window size. Comparing different resolutions is not fair.
3. For each site compute: relief (max minus min elevation in the window), mean slope (from the DEM gradient), and roughness (standard deviation of slope or a Terrain Ruggedness Index).
4. Label geology from a geologic map and match the labels to `GEO_LABELS`.
5. Export the results into `js/data.js` (or a JSON file if you later serve the page over HTTP).
6. Sanity-check: well-known analogs, such as Atacama for Mars, should rank sensibly.

## Roadmap

- [ ] Real DEM-derived features
- [ ] More reference sites and 50+ Earth sites
- [ ] Map view of the ranked sites
- [ ] LLM-written explanations on top of the template text
- [ ] Export a comparison report

## Limitations

Terrain similarity does not make a site suitable for landing or mission simulation.
Atmosphere, temperature, radiation and gravity are not modeled.
