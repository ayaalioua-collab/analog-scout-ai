
// ANALOG SCOUT AI — Database + Analysis Interface

const $ = id => document.getElementById(id);

let results = [];
let references = {};
let earthSites = [];
let allSites = [];

// Convert database values without treating missing values as zero.
function numericValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Convert a database row into the format used by Engine.
function mapDatabaseSite(row) {
  return {
    id: row.site_id,
    site_id: row.site_id,
    name: row.site_name,
    planet: String(row.planet || "").toLowerCase(),
    target_site_id: row.target_site_id,

    slope: numericValue(row.slope_deg),
    roughness: numericValue(row.roughness_rms),
    albedo: numericValue(row.albedo),
    thermal: numericValue(row.thermal_inertia),
    relief: numericValue(row.local_relief_m),

    latitude: numericValue(row.latitude),
    longitude: numericValue(row.longitude),

    geology: row.geology,
    regolith: row.regolith,
    environment_limits: row.environment_limits,
    mission_use: row.mission_use,
    data_source: row.data_source,

    slope_raw_note: row.slope_raw_note,
    roughness_raw_note: row.roughness_raw_note,
    local_relief_raw_note: row.local_relief_raw_note,
    source_notes: row.source_notes
  };
}

async function loadDatabase() {
  $("ref").textContent = "Loading scientific dataset...";
  $("list").innerHTML = "";
  $("detail").innerHTML = "";

  const { data, error } = await supabaseClient
    .from("analysis_dataset")
    .select("*");

  if (error) {
    throw new Error("Could not load analysis dataset: " + error.message);
  }

  if (!data || data.length !== 48) {
    throw new Error(
      `Expected 48 sites, but received ${data ? data.length : 0}.`
    );
  }

  allSites = data.map(mapDatabaseSite);

  earthSites = allSites.filter(
    site => site.planet === "earth"
  );

  references = {
    mars: allSites.filter(site => site.planet === "mars"),
    moon: allSites.filter(site => site.planet === "moon")
  };

  console.log("Analog Scout AI dataset loaded.");
  console.log("Total sites:", allSites.length);
  console.log("Earth:", earthSites.length);
  console.log("Mars:", references.mars.length);
  console.log("Moon:", references.moon.length);

  // Show fixed equal weights: 20% for each feature.
  $("ws").innerHTML = Engine.FEATURES.map(feature =>
    `<div class="w">
       <label class="lbl">${feature.label}</label>
       <span>20%</span>
     </div>`
  ).join("");

  document.querySelectorAll("input[name=pl]").forEach(radio => {
    radio.addEventListener("change", fillSites);
  });

  $("go").addEventListener("click", run);

  fillSites();
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
    $("ref").textContent = `No ${planet} reference sites found.`;
    $("list").innerHTML = "";
    $("detail").innerHTML = "";
    results = [];
    return;
  }

  run();
}

function formatFeature(feature, site) {
  const value = site[feature.k];

  if (value === null || value === undefined) {
    return "MISSING";
  }

  return `${value}${feature.unit}`;
}

function run() {
  const selected = document.querySelector("input[name=pl]:checked");
  if (!selected) return;

  const planet = selected.value;
  const refs = references[planet] || [];

  const reference = refs.find(
    site => site.id === $("site").value
  );

  if (!reference) return;

  // Only use the five Earth sites assigned to this reference.
  const candidates = earthSites.filter(
    site => site.target_site_id === reference.site_id
  );

  if (candidates.length === 0) {
    $("ref").textContent =
      `No Earth analogs are linked to ${reference.name}.`;

    $("list").innerHTML = "";
    $("detail").innerHTML = "";
    results = [];
    return;
  }

  // Run the scientific similarity engine on the complete 48-site dataset.
  results = Engine.rank(reference, candidates, allSites);

  if (results.length === 0) {
    $("ref").textContent = "Insufficient shared numerical features.";
    $("list").innerHTML = "";
    $("detail").innerHTML = "";
    return;
  }

  $("ref").innerHTML =
    `<b>${reference.name}</b> · ${reference.planet.toUpperCase()}` +
    `<br>Earth candidates: ${candidates.length}` +
    `<br>Five scientific terrain features · Equal weights`;

  $("list").innerHTML = results.map((result, index) =>
    `<div class="row" role="option" tabindex="0"
      data-i="${index}" aria-selected="${index === 0}">
      <span class="rk">${index + 1}</span>
      <div>
        <div class="nm">${result.site.name}</div>
        <div class="bar">
          <i style="width:${result.score}%"></i>
        </div>
      </div>
      <span class="sc">${result.score.toFixed(1)}%</span>
    </div>`
  ).join("");

  document.querySelectorAll(".row").forEach(element => {
    const selectResult = () => show(+element.dataset.i, reference);

    element.addEventListener("click", selectResult);

    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectResult();
      }
    });
  });

  show(0, reference);
}

function show(index, reference) {
  document.querySelectorAll(".row").forEach(element => {
    element.setAttribute(
      "aria-selected",
      +element.dataset.i === index
    );
  });

  const result = results[index];
  if (!result) return;

  const rows = Engine.FEATURES.map(feature => {
    const contribution = result.sq[feature.k] || 0;

    const share = result.D > 0
      ? (100 * contribution / (result.D ** 2)).toFixed(1)
      : "0.0";

    return `
      <tr>
        <td>${feature.label}</td>
        <td>${formatFeature(feature, reference)}</td>
        <td>${formatFeature(feature, result.site)}</td>
        <td>${share}%</td>
      </tr>
    `;
  }).join("");

  const notes = [
    result.site.slope_raw_note,
    result.site.roughness_raw_note,
    result.site.local_relief_raw_note,
    result.site.source_notes
  ].filter(Boolean);

  $("detail").innerHTML =
    `<h3>${result.site.name}</h3>` +
    `<p class="note" style="margin:0">
      Similarity: ${result.score.toFixed(1)}% ·
      Difference: ${result.difference.toFixed(1)}% ·
      Distance: ${result.D.toFixed(4)}
    </p>` +
    `<p class="note">
      Available features: ${result.activeFeatures.length}/5
    </p>` +
    `<table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Reference</th>
          <th>Earth</th>
          <th>Distance contribution</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` +
    `<p class="why">${Engine.explain(result)}</p>` +
    (notes.length
      ? `<p class="note">Source annotations: ${notes.join(" · ")}</p>`
      : "");
}


async function init() {
  try {
    await loadDatabase();
  } catch (error) {
    console.error("Initialization failed:", error);
    $("ref").textContent =
      "Could not initialize the analysis: " + error.message;
  }
}

init();

