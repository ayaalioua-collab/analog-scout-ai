
// ANALOG SCOUT AI — Database + Analysis Interface

const $ = id => document.getElementById(id);

let results = [];
let references = {};
let earthSites = [];
let allSites = [];

let similarityChart = null;
let radarChart = null;

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
    country: row.country,
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

// Send database and analysis data to the planetary map.
function updatePlanetaryMap(reference = null) {
  if (typeof window.updateAnalogGlobe === "function") {
    window.updateAnalogGlobe({
      allSites,
      references,
      results,
      reference
    });
  }
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
const customWeights = {
  slope: 20,
  roughness: 20,
  albedo: 20,
  thermal: 20,
  relief: 20
};

$("ws").innerHTML = Engine.FEATURES.map(feature =>
  `<div class="w">
     <label class="lbl" for="weight-${feature.k}">
       ${feature.label}
     </label>

     <input
       type="range"
       id="weight-${feature.k}"
       min="0"
       max="100"
       step="1"
       value="20"
       data-feature="${feature.k}"
     >

     <span id="value-${feature.k}">20%</span>
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
    clearCharts();
    updatePlanetaryMap(null);
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

// Clear previous charts when there are no valid results.
function clearCharts() {
  if (similarityChart) {
    similarityChart.destroy();
    similarityChart = null;
  }

  if (radarChart) {
    radarChart.destroy();
    radarChart = null;
  }
}

// Chart 1: Similarity and difference ranking.
function updateSimilarityChart() {
  const canvas = $("similarityChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (similarityChart) {
    similarityChart.destroy();
  }

  similarityChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: results.map(result => result.site.name),

      datasets: [
        {
          label: "Similarity",
          data: results.map(result => result.score),
          backgroundColor: "rgba(0, 229, 255, 0.85)",
          borderColor: "#00e5ff",
          borderWidth: 1,
          borderRadius: 5
        },
        {
          label: "Difference",
          data: results.map(result => result.difference),
          backgroundColor: "rgba(167, 139, 250, 0.75)",
          borderColor: "#a78bfa",
          borderWidth: 1,
          borderRadius: 5
        }
      ]
    },

    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        x: {
          stacked: true,
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "Percentage (%)",
            color: "#aab7d4"
          },
          ticks: {
            color: "#aab7d4"
          },
          grid: {
            color: "rgba(150, 170, 210, 0.12)"
          }
        },

        y: {
          stacked: true,
          ticks: {
            color: "#dce8ff"
          },
          grid: {
            display: false
          }
        }
      },

      plugins: {
        legend: {
          labels: {
            color: "#dce8ff"
          }
        },

        tooltip: {
          callbacks: {
            label: context =>
              `${context.dataset.label}: ${context.parsed.x.toFixed(1)}%`
          }
        }
      }
    }
  });
}

// Chart 2: Radar comparison using the same MinMax scaling
// used by the scientific similarity engine.
function updateRadarChart(reference) {
  const canvas = $("radarChart");

  if (!canvas || typeof Chart === "undefined") return;

  if (radarChart) {
    radarChart.destroy();
    radarChart = null;
  }

  const bestAnalog = results[0];
  if (!bestAnalog) return;

  const ranges = Engine.scaler(allSites);

  function normalizeForChart(value, featureKey) {
    if (value === null || value === undefined) return null;

    const number = Number(value);
    if (!Number.isFinite(number)) return null;

    const range = ranges[featureKey];
    if (!range) return null;

    const span = range.max - range.min;
    return span === 0 ? 0 : (number - range.min) / span;
  }

  const featureLabels = Engine.FEATURES.map(
    feature => feature.label
  );

  const referenceValues = Engine.FEATURES.map(feature =>
    normalizeForChart(reference[feature.k], feature.k)
  );

  const analogValues = Engine.FEATURES.map(feature =>
    normalizeForChart(bestAnalog.site[feature.k], feature.k)
  );

  radarChart = new Chart(canvas, {
    type: "radar",

    data: {
      labels: featureLabels,

      datasets: [
        {
          label: reference.name,
          data: referenceValues,
          borderColor: "#00e5ff",
          backgroundColor: "rgba(0, 229, 255, 0.15)",
          pointBackgroundColor: "#00e5ff",
          borderWidth: 2
        },
        {
          label: bestAnalog.site.name,
          data: analogValues,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167, 139, 250, 0.15)",
          pointBackgroundColor: "#a78bfa",
          borderWidth: 2
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        r: {
          min: 0,
          max: 1,

          ticks: {
            stepSize: 0.2,
            color: "#aab7d4",
            backdropColor: "transparent"
          },

          pointLabels: {
            color: "#dce8ff",
            font: {
              size: 11
            }
          },

          grid: {
            color: "rgba(150, 170, 210, 0.2)"
          },

          angleLines: {
            color: "rgba(150, 170, 210, 0.2)"
          }
        }
      },

      plugins: {
        legend: {
          labels: {
            color: "#dce8ff"
          }
        },

        tooltip: {
          callbacks: {
            label: context => {
              const value = context.raw;

              return value === null
                ? `${context.dataset.label}: MISSING`
                : `${context.dataset.label}: ${value.toFixed(3)}`;
            }
          }
        }
      }
    }
  });
}

function updateCharts(reference) {
  if (typeof Chart === "undefined") {
    console.error("Chart.js library is not available.");
    return;
  }

  if (!results.length) {
    clearCharts();
    return;
  }

  updateSimilarityChart();
  updateRadarChart(reference);
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
    clearCharts();
    updatePlanetaryMap(reference);
    return;
  }

  // Run the scientific similarity engine on the complete 48-site dataset.
  results = Engine.rank(reference, candidates, allSites);
  updatePlanetaryMap(reference);

  if (results.length === 0) {
    $("ref").textContent = "Insufficient shared numerical features.";
    $("list").innerHTML = "";
    $("detail").innerHTML = "";
    clearCharts();
    updatePlanetaryMap(reference);
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
  updateCharts(reference);
}


// Generate research directions using documented site information
// and the available numerical terrain features.
function generateScientificApplications(site, result) {
  const applications = [];

  const missionUse = site.mission_use ||
    "No specific mission application is documented in the dataset.";

  // 1. Research focus: documented information from the dataset.
  applications.push({
    title: "Research Focus",
    description: missionUse,
    source: "Documented dataset information"
  });

  // 2. Proposed experiment: slope and roughness.
  const hasSlope = site.slope !== null;
  const hasRoughness = site.roughness !== null;

  if (hasSlope || hasRoughness) {
    let terrainFeatures = [];

    if (hasSlope) terrainFeatures.push("slope");
    if (hasRoughness) terrainFeatures.push("surface roughness");

    applications.push({
      title: "Terrain and Mobility Testing",
      description:
        `Proposed experiment: investigate rover mobility and surface interaction ` +
        `using the available ${terrainFeatures.join(" and ")} measurements. ` +
        `Compare the results with the planetary reference and consider the ` +
        `remaining terrain differences.`,
      source: "Proposed research direction"
    });
  }

  // 3. Proposed experiment: thermal behavior.
  if (site.thermal !== null) {
    applications.push({
      title: "Thermal Surface Investigation",
      description:
        "Proposed experiment: study how the site's thermal properties " +
        "may influence surface heating and cooling. Compare its thermal " +
        "inertia with the planetary reference before drawing conclusions.",
      source: "Proposed research direction"
    });
  }

  // 4. Geological and regolith investigation.
  if (site.geology || site.regolith) {
    const geologicalDetails = [
      site.geology,
      site.regolith
    ].filter(Boolean).join(" ");

    applications.push({
      title: "Geological and Regolith Investigation",
      description:
        "Proposed experiment: investigate the documented geological " +
        "materials and surface characteristics to identify relevant " +
        "mineralogical or regolith processes. " +
        `Available site information: ${geologicalDetails}`,
      source: "Dataset information + proposed research"
    });
  }

  // 5. Environmental limitations.
  const limitations = site.environment_limits ||
    "Environmental limitations are not fully documented in the available dataset.";

  return {
    applications,
    limitations
  };
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

  updatePlanetaryMap(reference);

  const site = result.site;

  // Feature comparison table.
  const rows = Engine.FEATURES.map(feature => {
    const contribution = result.sq[feature.k] || 0;

    const share = result.D > 0
      ? (100 * contribution / (result.D ** 2)).toFixed(1)
      : "0.0";

    return `
      <tr>
        <td>${feature.label}</td>
        <td>${formatFeature(feature, reference)}</td>
        <td>${formatFeature(feature, site)}</td>
        <td>${share}%</td>
      </tr>
    `;
  }).join("");

  // Original source annotations.
  const notes = [
    site.slope_raw_note,
    site.roughness_raw_note,
    site.local_relief_raw_note,
    site.source_notes
  ].filter(Boolean);

  // Coordinates.
  const coordinates =
    Number.isFinite(site.latitude) &&
    Number.isFinite(site.longitude)
      ? `${site.latitude.toFixed(5)}°, ${site.longitude.toFixed(5)}°`
      : "Coordinates unavailable";

  // Scientific information from the original dataset.
  const geology = site.geology || "Not specified";
  const regolith = site.regolith || "Not specified";
  const missionUse = site.mission_use || "Not specified";
  const limitations = site.environment_limits || "Not specified";
  const source = site.data_source || "Not specified";

  // Generate research directions.
  const scientificPlan = generateScientificApplications(site, result);

  const applicationCards = scientificPlan.applications.map(item => `
    <div class="application-card">
      <h5>${item.title}</h5>
      <p class="why">${item.description}</p>
      <span class="note">${item.source}</span>
    </div>
  `).join("");

  $("detail").innerHTML = `
    <h3>${site.name}</h3>

    <p class="note" style="margin:0">
      Similarity: ${result.score.toFixed(1)}% ·
      Difference: ${result.difference.toFixed(1)}% ·
      Distance: ${result.D.toFixed(4)}
    </p>

    <p class="note">
      Available features: ${result.activeFeatures.length}/5
    </p>

    <h4>Scientific Comparison</h4>

    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>Reference</th>
          <th>Earth</th>
          <th>Distance contribution</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <h4>Scientific Site Assessment</h4>

    <table>
      <tbody>
        <tr>
          <td><strong>Location</strong></td>
          <td>${site.country || "Not specified"}</td>
        </tr>
        <tr>
          <td><strong>Coordinates</strong></td>
          <td>${coordinates}</td>
        </tr>
        <tr>
          <td><strong>Geology</strong></td>
          <td>${geology}</td>
        </tr>
        <tr>
          <td><strong>Regolith</strong></td>
          <td>${regolith}</td>
        </tr>
        <tr>
          <td><strong>Potential Mission Use</strong></td>
          <td>${missionUse}</td>
        </tr>
        <tr>
          <td><strong>Environmental Limitations</strong></td>
          <td>${limitations}</td>
        </tr>
        <tr>
          <td><strong>Data Source</strong></td>
          <td>${source}</td>
        </tr>
      </tbody>
    </table>

    <h4>Scientific Interpretation</h4>
    <p class="why">${Engine.explain(result)}</p>

    <h4>Scientific Research Opportunities</h4>

    <p class="note">
      Documented information is distinguished from proposed experiments.
      These research directions are suggestions, not reports of experiments
      already performed.
    </p>

    <div class="scientific-applications">
      ${applicationCards}
    </div>

    <h4>Environmental Constraints</h4>
    <p class="why">${scientificPlan.limitations}</p>

    ${
      notes.length
        ? `
          <h4>Data Notes and Annotations</h4>
          <p class="note">${notes.join(" · ")}</p>
        `
        : ""
    }
  `;
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
