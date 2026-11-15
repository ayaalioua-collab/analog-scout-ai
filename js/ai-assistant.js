
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
      gap: 11px;
      padding: 14px 21px;
      border: 1px solid rgba(0,229,255,.4);
      border-radius: 40px;
      background: linear-gradient(135deg,#102c48,#111a32);
      color: #eafaff;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 1.2px;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(0,0,0,.35);
      transition: .25s ease;
    }

    #asa-launcher:hover {
      border-color: #00e5ff;
      transform: translateY(-3px);
      box-shadow: 0 10px 35px rgba(0,229,255,.15);
    }

    #asa-launcher .asa-icon {
      color: #00e5ff;
      font-size: 21px;
    }

    #asa-panel {
      position: fixed;
      right: 24px;
      bottom: 88px;
      z-index: 99999;
      width: min(410px,calc(100vw - 28px));
      height: min(610px,calc(100vh - 115px));
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid rgba(0,229,255,.24);
      border-radius: 19px;
      background: #081323;
      color: #eaf1ff;
      box-shadow: 0 18px 60px rgba(0,0,0,.55);
      font-family: "Segoe UI", Arial, sans-serif;
    }

    #asa-panel[hidden] {
      display: none !important;
    }

    .asa-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 17px 19px;
      background: linear-gradient(120deg,#102c48,#171d3b);
      border-bottom: 1px solid rgba(0,229,255,.16);
    }

    .asa-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .asa-brand-icon {
      display: grid;
      place-items: center;
      width: 39px;
      height: 39px;
      border-radius: 12px;
      background: rgba(0,229,255,.1);
      border: 1px solid rgba(0,229,255,.18);
      color: #00e5ff;
      font-size: 21px;
    }

    .asa-brand-title {
      font-size: 12px;
      font-weight: 750;
      letter-spacing: 1.1px;
    }

    .asa-brand-status {
      margin-top: 5px;
      color: #7fa6c8;
      font-size: 10px;
      letter-spacing: .5px;
    }

    #asa-close {
      border: 0;
      background: transparent;
      color: #9db2cb;
      font-size: 25px;
      cursor: pointer;
      transition: color .2s;
    }

    #asa-close:hover {
      color: #00e5ff;
    }

    #asa-messages {
      flex: 1;
      overflow-y: auto;
      padding: 19px 15px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scrollbar-width: thin;
      scrollbar-color: #244765 transparent;
    }

    .asa-message {
      max-width: 94%;
      padding: 14px 16px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.85;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      letter-spacing: .1px;
    }

    .asa-message.assistant {
      align-self: flex-start;
      background: linear-gradient(145deg,#142840,#111f34);
      border: 1px solid rgba(100,180,220,.13);
      border-top-left-radius: 5px;
      color: #dce9f8;
    }

    .asa-message.user {
      align-self: flex-end;
      background: linear-gradient(145deg,#10415a,#12344e);
      border: 1px solid rgba(0,229,255,.2);
      border-top-right-radius: 5px;
      color: #f2fbff;
    }

    .asa-message.error {
      border-color: rgba(255,90,90,.4);
      color: #ffbaba;
    }

    .asa-typing {
      color: #00d9f2;
      font-size: 12px;
      padding: 5px 8px;
      letter-spacing: .3px;
    }

    .asa-input-area {
      padding: 14px;
      border-top: 1px solid rgba(140,170,210,.13);
      background: #0b192b;
    }

    #asa-form {
      display: flex;
      align-items: flex-end;
      gap: 9px;
    }

    #asa-question {
      flex: 1;
      min-width: 0;
      min-height: 45px;
      max-height: 110px;
      resize: vertical;
      padding: 12px 14px;
      border: 1px solid rgba(130,165,210,.22);
      border-radius: 12px;
      outline: none;
      background: #101f35;
      color: #f0f7ff;
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      transition: border-color .2s;
    }

    #asa-question:focus {
      border-color: #00cde8;
      box-shadow: 0 0 0 3px rgba(0,205,232,.07);
    }

    #asa-question::placeholder {
      color: #7e91ad;
    }

    #asa-send {
      min-width: 46px;
      height: 45px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(135deg,#00d5e8,#00a9c8);
      color: #06101d;
      font-size: 20px;
      font-weight: bold;
      cursor: pointer;
      transition: .2s;
    }

    #asa-send:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    #asa-send:disabled {
      opacity: .45;
      cursor: not-allowed;
      transform: none;
    }

    .asa-footer-note {
      margin-top: 10px;
      color: #7188a5;
      font-size: 10px;
      text-align: center;
      letter-spacing: .2px;
    }

    @media(max-width:480px) {
      #asa-launcher {
        right: 14px;
        bottom: 14px;
      }

      #asa-panel {
        right: 14px;
        bottom: 78px;
        height: min(610px,calc(100vh - 100px));
      }

      .asa-message {
        max-width: 97%;
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

  
  // Safely format inline Markdown without using innerHTML.
  function formatInline(text, parent) {
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    const parts = String(text).split(pattern);

    parts.forEach(part => {
      if (!part) return;

      if (part.startsWith("**") && part.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        strong.style.color = "#ffffff";
        parent.appendChild(strong);
      } else if (part.startsWith("`") && part.endsWith("`")) {
        const code = document.createElement("code");
        code.textContent = part.slice(1, -1);
        code.style.cssText =
          "color:#66e5f5;background:#0a192b;padding:2px 5px;border-radius:4px;font-size:.92em;";
        parent.appendChild(code);
      } else if (part.startsWith("*") && part.endsWith("*")) {
        const italic = document.createElement("em");
        italic.textContent = part.slice(1, -1);
        parent.appendChild(italic);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  }

  function addMessage(text, type = "assistant") {
    const message = document.createElement("div");

    message.className = `asa-message ${type}`;

    const lines = String(text).replace(/\r\n/g, "\n").split("\n");

    let paragraphLines = [];
    let activeList = null;
    let inCodeBlock = false;
    let codeLines = [];
    let codeLanguage = "";

    function flushParagraph() {
      if (!paragraphLines.length) return;

      const paragraph = document.createElement("p");
      paragraph.style.cssText = "margin:0 0 9px;";

      formatInline(paragraphLines.join(" "), paragraph);
      message.appendChild(paragraph);

      paragraphLines = [];
    }

    function flushList() {
      if (!activeList) return;
      activeList = null;
    }

    function flushCodeBlock() {
      const block = document.createElement("div");

      block.style.cssText =
        "margin:10px 0;padding:12px;overflow-x:auto;border:1px solid rgba(0,229,255,.16);border-radius:9px;background:#091526;color:#8eeaf5;font-family:Consolas,monospace;font-size:12px;line-height:1.8;white-space:pre-wrap;";

      block.textContent = codeLines.join("\n");

      if (codeLanguage === "math") {
        block.style.textAlign = "center";
        block.style.fontSize = "13px";
      }

      message.appendChild(block);
      codeLines = [];
      codeLanguage = "";
    }

    lines.forEach(line => {
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        flushParagraph();
        flushList();

        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim().toLowerCase();
        } else {
          inCodeBlock = false;
          flushCodeBlock();
        }

        return;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }

      if (/^[-*_]{3,}$/.test(trimmed)) {
        flushParagraph();
        flushList();

        const divider = document.createElement("div");
        divider.style.cssText =
          "height:1px;background:rgba(130,180,220,.18);margin:10px 0;";
        message.appendChild(divider);
        return;
      }

      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

      if (heading) {
        flushParagraph();
        flushList();

        const title = document.createElement("div");
        title.style.cssText =
          "margin:8px 0 5px;color:#55dff1;font-weight:700;font-size:14px;line-height:1.6;";

        formatInline(heading[2], title);
        message.appendChild(title);
        return;
      }

      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);

      if (bullet || numbered) {
        flushParagraph();

        const listType = bullet ? "ul" : "ol";

        if (!activeList || activeList.tagName.toLowerCase() !== listType) {
          flushList();

          activeList = document.createElement(listType);
          activeList.style.cssText =
            "margin:5px 0 10px;padding-left:22px;";

          message.appendChild(activeList);
        }

        const item = document.createElement("li");
        item.style.cssText = "margin:4px 0;padding-left:3px;";

        formatInline((bullet || numbered)[1], item);
        activeList.appendChild(item);
        return;
      }

      flushList();
      paragraphLines.push(trimmed);
    });

    flushParagraph();
    flushList();

    if (inCodeBlock) {
      flushCodeBlock();
    }

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
