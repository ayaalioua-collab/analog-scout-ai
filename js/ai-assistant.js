
// ANALOG SCOUT AI — AI Assistant

const AI_API_URL = "https://analog-scout-ai.onrender.com/ai-chat";

function getAnalysisContext() {
  const selectedPlanet =
    document.querySelector('input[name="pl"]:checked')?.value || null;

  const referenceSites =
    selectedPlanet && typeof references !== "undefined"
      ? references[selectedPlanet] || []
      : [];

  const referenceId = $("site")?.value;

  const reference = referenceSites.find(
    site => site.id === referenceId
  ) || null;

  const features =
    typeof Engine !== "undefined" ? Engine.FEATURES : [];
    // Complete scientific dataset: all 48 sites.
  const completeDataset =
    typeof allSites !== "undefined"
      ? allSites.map(site => ({
          id: site.id,
          name: site.name,
          planet: site.planet,
          country: site.country,
          targetSiteId: site.target_site_id,

          features: {
            slope: site.slope,
            roughness: site.roughness,
            albedo: site.albedo,
            thermalInertia: site.thermal,
            localRelief: site.relief
          },

          coordinates: {
            latitude: site.latitude,
            longitude: site.longitude
          },

          geology: site.geology,
          regolith: site.regolith,
          missionUse: site.mission_use,
          environmentalLimitations: site.environment_limits,
          dataSource: site.data_source,

          dataNotes: {
            slope: site.slope_raw_note,
            roughness: site.roughness_raw_note,
            localRelief: site.local_relief_raw_note,
            source: site.source_notes
          }
        }))
      : [];

  const selectedRow = document.querySelector(
    '.row[aria-selected="true"]'
  );

  const selectedIndex = selectedRow
    ? Number(selectedRow.dataset.i)
    : 0;

  const currentResults =
    typeof results !== "undefined" ? results : [];

  const topFive = currentResults.map((result, index) => ({
    rank: index + 1,
    name: result.site.name,
    id: result.site.id,
    country: result.site.country,
    similarity: result.score,
    difference: result.difference,
    distance: result.D,
    availableFeatures: result.activeFeatures
  }));

  const selectedResult =
    currentResults[selectedIndex] || currentResults[0] || null;

  let selectedAnalog = null;

  if (selectedResult && reference) {
    const result = selectedResult;
    const site = result.site;

    selectedAnalog = {
      name: site.name,
      id: site.id,
      country: site.country,

      similarity: result.score,
      difference: result.difference,
      distance: result.D,

      availableFeatures: result.activeFeatures,

      featureComparison: features.map(feature => {
        const detail = result.featureDetails[feature.k] || null;
        const contribution = result.sq[feature.k] ?? null;

        return {
          feature: feature.label,
          key: feature.k,
          unit: feature.unit,

          referenceValue: reference[feature.k],
          earthValue: site[feature.k],

          rawDifference: detail?.rawDifference ?? null,

          normalizedDifference: detail
            ? Math.abs(detail.earth - detail.reference)
            : null,

          activeWeight: detail?.activeWeight ?? null,

          contributionPercent:
            contribution !== null && result.D > 0
              ? 100 * contribution / (result.D ** 2)
              : 0
        };
      }),

      geology: site.geology,
      regolith: site.regolith,
      missionUse: site.mission_use,
      environmentalLimitations: site.environment_limits,
      dataSource: site.data_source,

      interpretation: Engine.explain(result)
    };
  }

  return {
    project: "Analog Scout AI",
        completeDataset,

    analysisStatus: reference
      ? "Analysis completed"
      : "No reference selected",

    reference: reference
      ? {
          name: reference.name,
          planet: reference.planet,
          features: features.map(feature => ({
            name: feature.label,
            value: reference[feature.k],
            unit: feature.unit
          }))
        }
      : null,

    method: {
      scaling: "Min-Max normalization",
      distance: "Weighted Euclidean distance",
      similarityFormula: "100 * exp(-D)",
      originalWeights: "20% per feature",
      missingValues:
        "Missing measurements excluded; remaining weights renormalized"
    },

    topFiveEarthAnalogs: topFive,
    selectedAnalog,

    instructions: [
      "Use completeDataset to answer questions about any of the 48 sites.",
      "You can compare Earth, Mars, and Moon sites using their supplied records.",
      "When asked about a site, identify it by its exact name or ID.",
      "Use only the fields available for that site.",
      "Never treat missing values as zero.",
      "Do not confuse documented site information with proposed research applications.",
      "Use only supplied project data.",
      "Never invent measurements, scores, distances, or rankings.",
      "Never recalculate similarity scores.",
      "Preserve missing values.",
      "Distinguish numerical terrain similarity from geological similarity.",
      "Distinguish documented information from research proposals.",
      "State when requested information is unavailable."
    ]
  };
}

function initAIAssistant() {
  if (document.getElementById("ai-assistant")) return;

  const assistant = document.createElement("div");
  assistant.id = "ai-assistant";

  assistant.innerHTML = `
    <button id="ai-toggle" type="button" aria-label="Open AI assistant">
      ✦
    </button>

    <section id="ai-panel" hidden>
      <header class="ai-header">
        <div>
          <strong>ANALOG SCOUT AI</strong>
          <small>Planetary Research Assistant</small>
        </div>
        <button id="ai-close" type="button" aria-label="Close">×</button>
      </header>

      <div id="ai-messages" aria-live="polite">
        <div class="ai-message ai-bot">
          Hello! I'm your Analog Scout AI assistant.
          Ask me about planetary analogs, terrain comparisons, or your analysis results.
        </div>
      </div>

      <form id="ai-form">
        <input
          id="ai-question"
          type="text"
          placeholder="Ask about your analysis..."
          maxlength="2000"
          autocomplete="off"
          required
        >
        <button id="ai-send" type="submit">➤</button>
      </form>
    </section>
  `;

  document.body.appendChild(assistant);

  const panel = document.getElementById("ai-panel");
  const messages = document.getElementById("ai-messages");
  const form = document.getElementById("ai-form");
  const questionInput = document.getElementById("ai-question");
  const sendButton = document.getElementById("ai-send");

  document.getElementById("ai-toggle").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  document.getElementById("ai-close").addEventListener("click", () => {
    panel.hidden = true;
  });

  function addMessage(content, sender) {
    const message = document.createElement("div");
    message.className = `ai-message ai-${sender}`;
    message.textContent = content;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const question = questionInput.value.trim();
    if (!question) return;

    addMessage(question, "user");
    questionInput.value = "";
    sendButton.disabled = true;

    const loading = addMessage("Analyzing your question...", "bot");

    try {
      const context = JSON.stringify(getAnalysisContext());

      console.log("AI context size:", context.length);

      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          context
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail || data)
        );
      }

      loading.textContent = data.answer || "No answer was returned.";

    } catch (error) {
      loading.textContent =
        "AI service error. Please try again shortly.";

      console.error("AI Assistant:", error);

    } finally {
      sendButton.disabled = false;
      questionInput.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", initAIAssistant);
