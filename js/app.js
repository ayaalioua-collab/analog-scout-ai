
// UI logic + Supabase data loading

const $ = id => document.getElementById(id);

let results = [];
let references = {};
let earthSites = [];
let allSites = [];
let missingSites = [];

function normalizeGeology(value) {
  const key = String(value || "").toLowerCase().trim();

  const map = {
    basalt: "basalt",
    sedimentary: "sed",
    sed: "sed",
    volcanic_ash: "tuff",
    tuff: "tuff",
    crystalline: "cryst",
    cryst: "cryst"
  };

  return map[key] || key;
}

function hasCompleteFeatures(site) {
  return (
    Number.isFinite(site.relief) &&
    Number.isFinite(site.slope) &&
    Number.isFinite(site.rough) &&
    !!GEO_LABELS[site.geo]
  );
}

async function loadDatabase() {
  $("ref").textContent = "Loading data from database...";
  $("list").innerHTML = "";
  $("detail").innerHTML = "";

  const { data: sites, error: sitesError } = await supabaseClient
    .from("sites")
    .select("id, name, body");

  if (sitesError) {
    throw new Error("Could not load sites: " + sitesError.message);
  }

  const { data: features, error: featuresError } = await supabaseClient
    .from("terrain_features")
    .select("site_id, relief_m, mean_slope_deg, roughness, geology, data_status");

  if (featuresError) {
    throw new Error("Could not load terrain features: " + featuresError.message);
  }

  const featureMap = new Map(
    features.map(feature => [feature.site_id, feature])
  );

  allSites = sites.map(site => {
    const feature = featureMap.get(site.id);

    const item = {
      id: site.id,
      name: site.name,
      body: String(site.body || "").toLowerCase(),
      relief: feature ? feature.relief_m : null,
      slope: feature ? feature.mean_slope_deg : null,
      rough: feature ? feature.roughness : null,
      geo: feature ? normalizeGeology(feature.geology) : null,
      dataStatus: feature ? feature.data_status : null
    };

    return item;
  });

  const completeSites = allSites.filter(hasCompleteFeatures);

  references = {
    mars: completeSites.filter(site => site.body === "mars"),
    moon: completeSites.filter(site => site.body === "moon")
  };

  earthSites = completeSites.filter(site => site.body === "earth");

  missingSites = allSites.filter(site => !hasCompleteFeatures(site));

  fillSites();
}

function init() {
  $("ws").innerHTML = Engine.FEATURES.map(f =>
    `<div class="w"><label class="lbl" for="w_${f.k}">${f.label}</label><span id="v_${f.k}">${f.w}</span></div>` +
    `<input type="range" id="w_${f.k}" min="0" max="100" value="${f.w}">`
  ).join("");

  Engine.FEATURES.forEach(f =>
    $("w_" + f.k).addEventListener("input", e => {
      $("v_" + f.k).textContent = e.target.value;
    })
  );

  document.querySelectorAll("input[name=pl]").forEach(r =>
    r.addEventListener("change", fillSites)
  );

  $("go").addEventListener("click", run);

  loadDatabase().catch(error => {
    console.error(error);
    $("ref").textContent = "Database error: " + error.message;
    $("list").innerHTML = "";
    $("detail").innerHTML = "";
  });
}

function fillSites() {
  const selected = document.querySelector("input[name=pl]:checked");
  if (!selected) return;

  const planet = selected.value;
  const sites = references[planet] || [];

  $("site").innerHTML = sites.map(site =>
    `<option value="${site.id}">${site.name}</option>`
  ).join("");

  if (sites.length === 0) {
    $("ref").textContent =
      `No complete terrain data is available for ${planet} yet.`;
    $("list").innerHTML = "";
    $("detail").innerHTML =
      `<p>Reference sites for this body are waiting for terrain data.</p>`;
    results = [];
    return;
  }

  run();
}

function readWeights() {
  const raw = {};
  let sum = 0;

  Engine.FEATURES.forEach(f => {
    raw[f.k] = +$("w_" + f.k).value;
    sum += raw[f.k];
  });

  Engine.FEATURES.forEach(f => {
    raw[f.k] = sum ? raw[f.k] / sum : 0.25;
  });

  return raw;
}

function fmt(f, obj) {
  if (f.k === "geo") return GEO_LABELS[obj.geo] || "Unknown";
  return obj[f.k] + f.unit;
}

function run() {
  const selected = document.querySelector("input[name=pl]:checked");
  if (!selected) return;

  const planet = selected.value;
  const refs = references[planet] || [];
  const ref = refs.find(site => site.id === $("site").value);

  if (!ref) return;

  if (earthSites.length === 0) {
    $("ref").textContent = "No Earth sites have complete terrain data yet.";
    $("list").innerHTML = "";
    $("detail").innerHTML = "";
    results = [];
    return;
  }

  results = Engine.rank(ref, earthSites, readWeights());

  $("ref").innerHTML =
    `<b>${ref.name}</b>: relief ${ref.relief} m, slope ${ref.slope}°, ` +
    `roughness ${ref.rough}, geology ${GEO_LABELS[ref.geo]} ` +
    `(${ref.dataStatus || "unknown"} data)`;

  $("list").innerHTML = results.map((r, i) =>
    `<div class="row" role="option" tabindex="0" data-i="${i}" aria-selected="${i === 0}">` +
    `<span class="rk">${i + 1}</span><div><div class="nm">${r.site.name}</div>` +
    `<div class="bar"><i style="width:${r.score.toFixed(0)}%"></i></div></div>` +
    `<span class="sc">${r.score.toFixed(0)}%</span></div>`
  ).join("");

  document.querySelectorAll(".row").forEach(el => {
    const pick = () => show(+el.dataset.i, ref);

    el.addEventListener("click", pick);

    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });
  });

  show(0, ref);
}

function show(i, ref) {
  document.querySelectorAll(".row").forEach(el =>
    el.setAttribute("aria-selected", +el.dataset.i === i)
  );

  const r = results[i];
  if (!r) return;

  const rows = Engine.FEATURES.map(f =>
    `<tr><td>${f.label}</td><td>${fmt(f, ref)}</td><td>${fmt(f, r.site)}</td>` +
    `<td><div class="mini"><i style="width:${r.total ? (100 * r.sq[f.k] / r.total).toFixed(0) : 0}%"></i></div></td></tr>`
  ).join("");

  $("detail").innerHTML =
    `<h3>${r.site.name}</h3>` +
    `<p class="note" style="margin:0">Similarity ${r.score.toFixed(1)}, distance ${r.D.toFixed(2)}</p>` +
    `<p class="note">Earth data status: ${r.site.dataStatus}</p>` +
    `<table><thead><tr><th>Feature</th><th>Reference</th><th>Earth</th><th>Share of difference</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<p class="why">${Engine.explain(r)}</p>`;
}

init();
