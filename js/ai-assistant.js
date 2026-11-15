
// ANALOG SCOUT AI — AI Assistant

const AI_API_URL = "https://analog-scout-ai.onrender.com/ai-chat";

function getAnalysisContext() {
  return {
    selectedPlanet: document.querySelector('input[name="pl"]:checked')?.value || null,
    selectedReference: document.getElementById("site")?.selectedOptions[0]?.textContent || null,
    topResults: (typeof results !== "undefined" ? results : []).slice(0, 5).map(item => ({
      name: item.name,
      similarity: item.similarity,
      distance: item.distance,
      difference: item.difference,
      features: item.features
    }))
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
