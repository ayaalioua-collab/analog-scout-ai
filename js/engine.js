// Similarity engine: weighted Euclidean distance + score.
// Same logic as python/similarity_engine.py, so you can test either side.

const Engine = (() => {
  const NUMERIC = ["relief", "slope", "rough"];
  const TAU = 1.5; // larger = scores fall more slowly with distance

  // Features shown in the UI: key, label, unit, default weight (percent)
  const FEATURES = [
    { k: "relief", label: "Relief",            unit: " m", w: 25 },
    { k: "slope",  label: "Slope",             unit: "°",  w: 25 },
    { k: "rough",  label: "Surface roughness", unit: "",   w: 20 },
    { k: "geo",    label: "Geology",           unit: "",   w: 30 }
  ];

  const geoSim = (a, b) => GEO_SIM[a + "|" + b] ?? GEO_SIM[b + "|" + a] ?? 0;

  function scaler(sites) {
    const mean = {}, sd = {};
    NUMERIC.forEach(k => {
      const v = sites.map(s => s[k]);
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      mean[k] = m;
      sd[k] = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1;
    });
    return { mean, sd };
  }

  // weights: { relief, slope, rough, geo } summing to 1
  function rank(ref, sites, weights) {
    const { mean, sd } = scaler(sites);
    return sites.map(site => {
      const sq = {};
      NUMERIC.forEach(k => {
        const diff = (site[k] - mean[k]) / sd[k] - (ref[k] - mean[k]) / sd[k];
        sq[k] = weights[k] * diff ** 2;
      });
      sq.geo = weights.geo * (1 - geoSim(ref.geo, site.geo)) ** 2;
      const total = Object.values(sq).reduce((a, b) => a + b, 0);
      const D = Math.sqrt(total);
      return { site, sq, total, D, score: 100 * Math.exp(-D / TAU) };
    }).sort((a, b) => b.score - a.score);
  }

  // Template explanation. Later you can pass this to an LLM to rephrase it.
  function explain(result) {
    const ord = FEATURES.map(f => ({ label: f.label.toLowerCase(), v: result.sq[f.k] })).sort((a, b) => a.v - b.v);
    return `Ranked at ${result.score.toFixed(0)} because it is closest in ${ord[0].label} and ${ord[1].label}, ` +
           `and differs most in ${ord[3].label}. Atmosphere and temperature are not modeled.`;
  }

  return { FEATURES, rank, explain };
})();
