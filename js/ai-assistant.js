
// ANALOG SCOUT AI — AI Assistant

const AI_API_URL = "https://analog-scout-ai.onrender.com/ai-chat";


function getAnalysisContext() {
  const selected = document.querySelector('input[name="pl"]:checked');
  const planet = selected?.value || null;

  const refs = planet && typeof references !== "undefined"
    ? references[planet] || []
    : [];

  const reference = refs.find(
    site => site.id === $("site").value
  ) || null;

  const featureDefinitions =
    typeof Engine !== "undefined" ? Engine.FEATURES : [];

  const referenceFeatures = reference
    ? featureDefinitions.map(feature => ({
        feature: feature.k,
        value: reference[feature.k]
      }))
    : [];

  const topResults = (
    typeof results !== "undefined" ? results : []
  ).slice(0, 5).map(result => ({
    earthSite: {
      name: result.site?.name,
      country: result.site?.country,
      coordinates: {
        latitude: result.site?.lat,
        longitude: result.site?.long
      },
      geology: result.site?.geology,
      regolith: result.site?.regolith,
      missionUse: result.site?.mission_use,
      environmentalLimits: result.site?.environment_limits,
      dataSource: result.site?.data_source
    },

    similarity: result.score,
    difference: result.difference,
    distance: result.D,
    activeFeatures: result.activeFeatures,

    featureComparison: featureDefinitions.map(feature => ({
      feature: feature.k,
      referenceValue: reference?.[feature.k],
      earthValue: result.site?.[feature.k],
      squaredContribution: result.sq?.[feature.k]
    })),

    engineExplanation:
      typeof Engine.explain === "function"
        ? Engine.explain(result)
        : null
  }));

  return {
    project: "Analog Scout AI",
    selectedPlanet: planet,

    referenceSite: reference ? {
      name: reference.name,
      id: reference.id,
      planet: reference.planet,
      features: referenceFeatures
    } : null,

    topFiveEarthAnalogs: topResults,

    analysisStatus: reference
      ? "Reference selected. Results reflect the current analysis state."
      : "No planetary reference selected yet.",

    instructions: [
      "Use only the supplied analysis data.",
      "Do not recalculate similarity scores or distances.",
      "Do not invent missing measurements.",
      "Distinguish scientific facts from research suggestions."
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
