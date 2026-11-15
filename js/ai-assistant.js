
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

  // Preserve missing values as null.
  function siteInformation(site) {
    if (!site) return null;

    return {
      id: site.id,
      name: site.name,
      planet: site.planet,
      country: site.country,

      coordinates: {
        latitude: site.latitude,
        longitude: site.longitude
      },

      terrainMeasurements: features.map(feature => ({
        feature: feature.label,
        key: feature.k,
        unit: feature.unit,
        value: site[feature.k]
      })),

      geology: site.geology,
      regolith: site.regolith,
      missionUse: site.mission_use,
      environmentalLimitations: site.environment_limits,
      dataSource: site.data_source,

      sourceNotes: {
        slope: site.slope_raw_note,
        roughness: site.roughness_raw_note,
        localRelief: site.local_relief_raw_note,
        general: site.source_notes
      }
    };
  }

  // Send the exact calculated results from Engine.rank().
  const topFive = (
    typeof results !== "undefined" ? results : []
  ).map((result, index) => ({
    rank: index + 1,

    site: siteInformation(result.site),

    similarityScore: result.score,
    difference: result.difference,
    weightedDistance: result.D,

    availableFeatures: result.activeFeatures,
    availableFeatureCount: result.activeFeatures.length,
    activeWeightSum: result.activeWeightSum,

    featureComparison: features.map(feature => {
      const detail = result.featureDetails[feature.k] || null;

      return {
        feature: feature.label,
        key: feature.k,
        unit: feature.unit,

        referenceRawValue:
          reference ? reference[feature.k] : null,

        earthRawValue:
          result.site[feature.k],

        normalizedReference:
          detail ? detail.reference : null,

        normalizedEarth:
          detail ? detail.earth : null,

        rawDifference:
          detail ? detail.rawDifference : null,

        originalWeight:
          detail ? detail.weight : null,

        activeWeight:
          detail ? detail.activeWeight : null,

        squaredDistanceContribution:
          result.sq[feature.k] ?? null
      };
    }),

    scientificInterpretation:
      Engine.explain(result)
  }));

  const selectedRow = document.querySelector(
    '.row[aria-selected="true"]'
  );

  const selectedIndex = selectedRow
    ? Number(selectedRow.dataset.i)
    : 0;

  return {
    project: "Analog Scout AI",

    analysisStatus: reference
      ? "Analysis completed using the scientific similarity engine."
      : "No planetary reference selected.",

    selectedPlanet,

    referenceSite: siteInformation(reference),

    candidateCount:
      reference && typeof earthSites !== "undefined"
        ? earthSites.filter(
            site => site.target_site_id === reference.site_id
          ).length
        : 0,

    method: {
      scaling: "Min-Max normalization",
      distance: "Weighted Euclidean distance",
      similarityFormula: "100 * exp(-D)",
      originalFeatureWeights: "20% each",
      missingValueHandling:
        "Missing measurements are excluded and remaining weights are renormalized."
    },

    selectedAnalog:
      topFive[selectedIndex] || null,

    topFiveEarthAnalogs: topFive,

    scientificInstructions: [
      "Use only the supplied dataset and calculated analysis results.",
      "Never invent site names, measurements, scores, distances, or rankings.",
      "Never recalculate or modify similarity scores.",
      "Preserve missing measurements as missing.",
      "Explain which terrain features contribute to similarity or difference.",
      "Distinguish documented scientific information from proposed research.",
      "Do not interpret similarity as probability, geological equivalence, or landing suitability.",
      "If the requested information is absent, explicitly say it is unavailable in the supplied dataset."
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
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          context: JSON.stringify(getAnalysisContext())
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "AI service request failed.");
      }

      loading.textContent = data.answer || "No answer was returned.";

    } catch (error) {
      loading.textContent =
        "Sorry, I couldn't connect to the AI service. Please try again.";
      console.error("AI Assistant:", error);

    } finally {
      sendButton.disabled = false;
      questionInput.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", initAIAssistant);
