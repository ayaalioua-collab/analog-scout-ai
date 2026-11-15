
/* =========================================
   ANALOG SCOUT AI — AI ASSISTANT
   Chat interface + compact scientific context
   ========================================= */

(() => {
  "use strict";

  const API_URL = "https://analog-scout-ai.onrender.com/ai-chat";

  const byId = id => document.getElementById(id);

  let isSending = false;

  // -----------------------------------------
  // 1. Assistant interface styles
  // -----------------------------------------

  const styles = document.createElement("style");

  styles.id = "analog-ai-styles";

  styles.textContent = `
    #asa-launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      border: 1px solid rgba(0,229,255,.5);
      border-radius: 40px;
      background: linear-gradient(135deg,#10243d,#10152b);
      color: #eafaff;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 1px;
      cursor: pointer;
      box-shadow: 0 8px 35px rgba(0,0,0,.4);
    }

    #asa-launcher:hover {
      border-color: #00e5ff;
      transform: translateY(-2px);
    }

    #asa-launcher .asa-icon {
      color: #00e5ff;
      font-size: 20px;
    }

    #asa-panel {
      position: fixed;
      right: 24px;
      bottom: 88px;
      z-index: 99999;
      width: min(390px, calc(100vw - 28px));
      height: min(570px, calc(100vh - 115px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0,229,255,.3);
      border-radius: 17px;
      background: #091225;
      color: #eaf1ff;
      box-shadow: 0 15px 55px rgba(0,0,0,.55);
      font-family: Arial, sans-serif;
    }

    #asa-panel[hidden] {
      display: none !important;
    }

    .asa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 17px;
      background: linear-gradient(120deg,#102a43,#171b38);
      border-bottom: 1px solid rgba(0,229,255,.2);
    }

    .asa-brand {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .asa-brand-icon {
      display: grid;
      place-items: center;
      width: 37px;
      height: 37px;
      border-radius: 11px;
      background: rgba(0,229,255,.12);
      color: #00e5ff;
      font-size: 21px;
    }

    .asa-brand-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .asa-brand-status {
      margin-top: 5px;
      color: #8da5c5;
      font-size: 10px;
    }

    #asa-close {
      border: 0;
      background: transparent;
      color: #aabbd4;
      font-size: 24px;
      cursor: pointer;
    }

    #asa-messages {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .asa-message {
      max-width: 90%;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .asa-message.assistant {
      align-self: flex-start;
      background: #14243b;
      border: 1px solid rgba(0,229,255,.12);
      color: #e0edff;
    }

    .asa-message.user {
      align-self: flex-end;
      background: #123d56;
      border: 1px solid rgba(0,229,255,.3);
      color: #fff;
    }

    .asa-message.error {
      border-color: rgba(255,90,90,.4);
      color: #ffbaba;
    }

    .asa-typing {
      color: #00e5ff;
      font-size: 12px;
      padding: 4px;
    }

    .asa-input-area {
      padding: 12px;
      border-top: 1px solid rgba(140,170,210,.15);
      background: #0c172b;
    }

    #asa-form {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    #asa-question {
      flex: 1;
      min-width: 0;
      min-height: 43px;
      max-height: 100px;
      resize: vertical;
      padding: 12px;
      border: 1px solid rgba(130,165,210,.25);
      border-radius: 10px;
      outline: none;
      background: #101f36;
      color: #fff;
      font-family: inherit;
      font-size: 13px;
    }

    #asa-question:focus {
      border-color: #00cde8;
    }

    #asa-question::placeholder {
      color: #7e91ad;
    }

    #asa-send {
      min-width: 45px;
      height: 43px;
      border: 0;
      border-radius: 10px;
      background: #00bcd4;
      color: #06101d;
      font-size: 19px;
      font-weight: bold;
      cursor: pointer;
    }

    #asa-send:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .asa-footer-note {
      margin-top: 8px;
      color: #7387a5;
      font-size: 10px;
      text-align: center;
    }

    @media(max-width:480px) {
      #asa-launcher {
        right: 14px;
        bottom: 14px;
      }

      #asa-panel {
        right: 14px;
        bottom: 78px;
        height: min(570px, calc(100vh - 100px));
      }
    }
  `;

  document.head.appendChild(styles);

  // -----------------------------------------
  // 2. Create assistant interface
  // -----------------------------------------

  const launcher = document.createElement("button");

  launcher.id = "asa-launcher";
  launcher.type = "button";
  launcher.innerHTML = `
    <span class="asa-icon">✦</span>
    <span>ASK AI ASSISTANT</span>
  `;

  const panel = document.createElement("section");

  panel.id = "asa-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Analog Scout AI Assistant");

  panel.innerHTML = `
    <div class="asa-header">
      <div class="asa-brand">
        <div class="asa-brand-icon">✦</div>
        <div>
          <div class="asa-brand-title">ANALOG SCOUT AI</div>
          <div class="asa-brand-status">SCIENTIFIC ASSISTANT · ONLINE</div>
        </div>
      </div>

      <button id="asa-close" type="button" aria-label="Close assistant">
        ×
      </button>
    </div>

    <div id="asa-messages" aria-live="polite"></div>

    <div class="asa-input-area">
      <form id="asa-form">
        <textarea
          id="asa-question"
          maxlength="2000"
          rows="1"
          placeholder="Ask a scientific question..."
          aria-label="Your question"
        ></textarea>

        <button id="asa-send" type="submit" aria-label="Send message">
          ↑
        </button>
      </form>

      <div class="asa-footer-note">
        AI-generated answers · Verify scientific interpretations
      </div>
    </div>
  `;

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const messages = byId("asa-messages");
  const questionInput = byId("asa-question");
  const sendButton = byId("asa-send");

  // -----------------------------------------
  // 3. Chat message helpers
  // -----------------------------------------

  function addMessage(text, type = "assistant") {
    const message = document.createElement("div");

    message.className = `asa-message ${type}`;
    message.textContent = String(text);

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;

    return message;
  }

  function setTyping(active) {
    const existing = byId("asa-typing");

    if (active && !existing) {
      const typing = document.createElement("div");

      typing.id = "asa-typing";
      typing.className = "asa-typing";
      typing.textContent = "Analyzing scientific data...";

      messages.appendChild(typing);
    }

    if (!active && existing) {
      existing.remove();
    }

    messages.scrollTop = messages.scrollHeight;
  }

  function openAssistant() {
    panel.hidden = false;
    questionInput.focus();
  }

  function closeAssistant() {
    panel.hidden = true;
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) {
      openAssistant();
    } else {
      closeAssistant();
    }
  });

  byId("asa-close").addEventListener("click", closeAssistant);

  addMessage(
    "Welcome to Analog Scout AI!\n\nI can help you understand planetary terrain comparisons, Earth analogs, numerical similarity scores, and scientific research opportunities.\n\nAsk me anything about the current analysis."
  );

  // -----------------------------------------
  // 4. Build compact scientific context
  // -----------------------------------------

  function shortText(value, maxLength = 2500) {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value);

    return text.length > maxLength
      ? text.slice(0, maxLength) + "..."
      : text;
  }

  function getAnalysisContext() {
    const selectedPlanet =
      document.querySelector('input[name="pl"]:checked')?.value || null;

    const referenceSites =
      selectedPlanet && typeof references !== "undefined"
        ? references[selectedPlanet] || []
        : [];

    const referenceId = byId("site")?.value;

    const reference =
      referenceSites.find(site => site.id === referenceId) ||
      referenceSites[0] ||
      null;

    const selectedRow = document.querySelector(
      '.row[aria-selected="true"]'
    );

    const selectedIndex = selectedRow
      ? Number(selectedRow.dataset.i)
      : 0;

    const currentResults =
      typeof results !== "undefined" && Array.isArray(results)
        ? results
        : [];

    const engineFeatures =
      typeof Engine !== "undefined" ? Engine.FEATURES : [];

    const topFive = currentResults.slice(0, 5).map((result, index) => ({
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

      let interpretation = null;

      try {
        interpretation =
          typeof Engine !== "undefined"
            ? Engine.explain(result)
            : null;
      } catch (error) {
        interpretation = "Interpretation unavailable.";
      }

      selectedAnalog = {
        name: site.name,
        id: site.id,
        country: site.country,

        similarity: result.score,
        difference: result.difference,
        distance: result.D,

        availableFeatures: result.activeFeatures,

        featureComparison: engineFeatures.map(feature => {
          const detail =
            result.featureDetails?.[feature.k] || null;

          const contribution =
            result.sq?.[feature.k] ?? null;

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

        geology: shortText(site.geology),
        regolith: shortText(site.regolith),
        missionUse: shortText(site.mission_use),
        environmentalLimitations: shortText(site.environment_limits),
        dataSource: shortText(site.data_source),

        interpretation
      };
    }

    return {
      project: "Analog Scout AI",

      analysisStatus: reference
        ? "Analysis completed"
        : "No reference selected",

      reference: reference
        ? {
            name: reference.name,
            id: reference.id,
            planet: reference.planet,

            features: engineFeatures.map(feature => ({
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
        "Use the supplied reference, top five Earth analogs, and selected analog data.",
        "Answer using only the information available in the supplied context.",
        "Identify sites by their exact names or IDs.",
        "Never treat missing values as zero.",
        "Never invent measurements, scores, distances, or rankings.",
        "Never recalculate similarity scores.",
        "A numerical similarity score does not prove geological equivalence.",
        "A contribution percentage is a share of weighted squared distance, not a feature similarity percentage.",
        "Distinguish documented information from proposed research applications.",
        "State when requested information is unavailable."
      ]
    };
  }

  // -----------------------------------------
  // 5. Send question to FastAPI / Groq
  // -----------------------------------------

  async function sendQuestion(question) {
    if (isSending || !question.trim()) return;

    isSending = true;
    sendButton.disabled = true;
    questionInput.disabled = true;

    addMessage(question, "user");
    setTyping(true);

    try {
      const contextObject = getAnalysisContext();
      const context = JSON.stringify(contextObject);

      if (context.length > 29000) {
        throw new Error(
          "The scientific context is too large. Please select a reference and try again."
        );
      }

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          question,
          context
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage =
          data.detail ||
          data.error ||
          `Server error: HTTP ${response.status}`;

        throw new Error(
          typeof errorMessage === "string"
            ? errorMessage
            : JSON.stringify(errorMessage)
        );
      }

      const answer =
        data.answer ||
        data.response ||
        data.message ||
        data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(
          "The server returned an empty answer. Please try again."
        );
      }

      addMessage(answer, "assistant");

    } catch (error) {
      console.error("AI Assistant:", error);

      addMessage(
        "I couldn't complete your request.\n\n" + error.message,
        "error"
      );

    } finally {
      setTyping(false);

      isSending = false;
      sendButton.disabled = false;
      questionInput.disabled = false;

      questionInput.value = "";
      questionInput.focus();
    }
  }

  // -----------------------------------------
  // 6. Form events
  // -----------------------------------------

  byId("asa-form").addEventListener("submit", event => {
    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question) return;

    sendQuestion(question);
  });

  questionInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      byId("asa-form").requestSubmit();
    }
  });

  console.log("Analog Scout AI Assistant initialized.");

})();
