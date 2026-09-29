const modal = document.querySelector("#modal");
const openButton = document.querySelector("#open");
const headerAI = document.querySelector(".header-ai");
const closeButton = document.querySelector("#close");
const backdrop = document.querySelector("#backdrop");

const aiChat = document.querySelector("#aiChat");
const aiInput = document.querySelector("#aiInput");
const aiComposer = document.querySelector("#aiComposer");
const aiSend = document.querySelector("#aiSend");
const aiQuestions = document.querySelector("#aiQuestions");

const RAJDEEP_AI_API =
  window.RAJDEEP_AI_API ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000/api/chat"
    : "/api/chat");

const quickAnswers = {
  "Who are you?":
    "I'm Rajdeep's portfolio AI — a digital representative built around his work, projects, skills and experience. Rajdeep is a Data Science graduate focused on practical machine learning, analytics and GenAI products.",
  "Tell me about JobShield.":
    "JobShield is an AI job discovery and safety assistant built around the flow Find → Verify → Match → Improve. It uses resume parsing, job-risk signals and evidence-based resume matching to help job seekers make better-informed decisions.",
  "What are your skills?":
    "Rajdeep works with Python, machine learning, data analytics, SQL, GenAI/LLMs and cloud technologies. His project work includes XGBoost, Streamlit, Groq, OR-Tools, Flask, Pandas and Azure/AWS technologies.",
  "What is the tech stack of this portfolio?":
    "The portfolio itself uses HTML, CSS and Vanilla JavaScript on the frontend, Python with FastAPI on the backend, Groq with GPT-OSS 20B/120B and a Qwen fallback for AI, a structured JSON knowledge base, Server-Sent Events for streaming, and Vercel for deployment."
};

let aiBusy = false;
const aiHistory = [];

let activeDialog = null;
let lastDialogTrigger = null;

/*
 * Preserve the page position while a full-screen modal is open.
 * Using a fixed body prevents the underlying page from jumping to the
 * top when the modal takes control of scrolling.
 */
let lockedPageScrollY = 0;
const MODAL_SCROLL_STORAGE_KEY = "rajdeep-modal-scroll-y";

function lockPageScroll() {
  lockedPageScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedPageScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  const restoreY = lockedPageScrollY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, restoreY);
}

function rememberModalScrollForReload() {
  if (!document.body.classList.contains("modal-open")) return;
  sessionStorage.setItem(MODAL_SCROLL_STORAGE_KEY, String(lockedPageScrollY));
}

function restoreModalScrollAfterReload() {
  const saved = sessionStorage.getItem(MODAL_SCROLL_STORAGE_KEY);
  if (!saved) return;

  sessionStorage.removeItem(MODAL_SCROLL_STORAGE_KEY);
  const restoreY = Number(saved);

  if (!Number.isFinite(restoreY)) return;

  window.requestAnimationFrame(() => {
    window.scrollTo(0, restoreY);
  });
}

window.addEventListener("pagehide", rememberModalScrollForReload);
window.addEventListener("load", restoreModalScrollAfterReload);

function getDialogFocusableElements(dialog) {
  if (!dialog) return [];

  return [
    ...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function activateDialog(dialog, trigger) {
  activeDialog = dialog;
  lastDialogTrigger = trigger || document.activeElement;
  dialog?.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    const focusables = getDialogFocusableElements(dialog);
    (focusables[0] || dialog)?.focus?.();
  }, 80);
}

function deactivateDialog(dialog) {
  if (!dialog) return;

  dialog.setAttribute("aria-hidden", "true");

  if (activeDialog === dialog) {
    activeDialog = null;
    const trigger = lastDialogTrigger;
    lastDialogTrigger = null;

    if (trigger && document.contains(trigger)) {
      window.setTimeout(() => trigger.focus(), 0);
    }
  }
}

function trapDialogFocus(event) {
  if (event.key !== "Tab" || !activeDialog) return;

  const focusables = getDialogFocusableElements(activeDialog);
  if (!focusables.length) {
    event.preventDefault();
    activeDialog.focus?.();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openAI(e) {
  if (e) e.preventDefault();
  lockPageScroll();
  modal?.classList.add("open");
  document.body.classList.add("modal-open");
  activateDialog(modal, e?.currentTarget);
}

function closeAI() {
  modal?.classList.remove("open");
  document.body.classList.remove("modal-open");
  unlockPageScroll();
  deactivateDialog(modal);
}

openButton?.addEventListener("click", openAI);
headerAI?.addEventListener("click", openAI);
closeButton?.addEventListener("click", closeAI);
backdrop?.addEventListener("click", closeAI);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAI();
    closeCaseStudy();
    return;
  }

  trapDialogFocus(event);
});

let aiUserScrolledUp = false;

function isAIChatAtBottom() {
  if (!aiChat) return true;
  return aiChat.scrollHeight - aiChat.scrollTop - aiChat.clientHeight < 28;
}

function scrollAIChat(force = false) {
  if (!aiChat) return;
  if (!force && aiUserScrolledUp) return;
  aiChat.scrollTop = aiChat.scrollHeight;
}

/*
 * Auto-follow stays on by default. A real user scroll temporarily pauses
 * it, so the reader can move through the answer without being pulled back
 * to the bottom. Reaching the bottom automatically resumes follow mode.
 */
aiChat?.addEventListener("scroll", () => {
  if (aiUserScrolledUp && isAIChatAtBottom()) {
    aiUserScrolledUp = false;
  }
});

aiChat?.addEventListener("wheel", (event) => {
  if (event.deltaY < 0) {
    aiUserScrolledUp = true;
  }
});

aiChat?.addEventListener("pointerdown", () => {
  aiUserScrolledUp = true;
});

aiChat?.addEventListener("touchmove", () => {
  aiUserScrolledUp = true;
}, { passive: true });

aiChat?.addEventListener("keydown", (event) => {
  if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
    aiUserScrolledUp = true;
  }
  if (["ArrowDown", "PageDown", "End"].includes(event.key) && isAIChatAtBottom()) {
    aiUserScrolledUp = false;
  }
});

function resumeAIAutoScroll() {
  aiUserScrolledUp = false;
  scrollAIChat(true);
}

/* The terminal-style cursor is singular: only the active response owns it. */
function clearActiveCursor() {
  aiChat?.querySelectorAll(".ai-cursor").forEach((cursor) => {
    cursor.remove();
  });
}

function addUserMessage(text) {
  if (!aiChat) return;
  const message = document.createElement("div");
  message.className = "ai-message user";
  message.innerHTML = `
    <div class="ai-bubble">
      <p></p>
    </div>
  `;
  message.querySelector("p").textContent = text;
  aiChat.appendChild(message);
  scrollAIChat();
}

function addAssistantMessage() {
  if (!aiChat) return null;
  const message = document.createElement("div");
  message.className = "ai-message assistant";
  message.innerHTML = `
    <span class="ai-avatar">R.</span>
    <div class="ai-bubble">
      <small>RAJDEEP AI</small>
      <div class="ai-response"></div>
    </div>
  `;
  aiChat.appendChild(message);
  scrollAIChat();
  return message.querySelector(".ai-response");
}

function placeAIResponseCursor(response, cursor) {
  if (!response || !cursor) return;

  const candidates = response.querySelectorAll(
    ".ai-table-row span, li, h4, p, code"
  );

  const target = candidates[candidates.length - 1] || response;

  target.appendChild(cursor);
}

function addThinkingMessage() {
  if (!aiChat) return null;
  const message = document.createElement("div");
  message.className = "ai-message assistant ai-thinking-message";
  message.innerHTML = `
    <span class="ai-avatar">R.</span>
    <div class="ai-bubble">
      <small>RAJDEEP AI</small>
      <div class="ai-thinking" aria-label="Thinking">
        <i></i><i></i><i></i>
      </div>
    </div>
  `;
  aiChat.appendChild(message);
  scrollAIChat();
  return message;
}

function setComposerBusy(busy) {
  aiBusy = busy;
  if (aiInput) aiInput.disabled = busy;
  if (aiSend) aiSend.disabled = busy;
  aiQuestions?.querySelectorAll("button").forEach((button) => {
    button.disabled = busy;
  });
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeAIText(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:p|div|span|section)[^>]*>/gi, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function renderInlineMarkdown(text) {
  return escapeHTML(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>");
}


function renderAIText(text) {
  const normalized = normalizeAIText(text.trim());
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const html = [];
  let paragraph = [];
  let listType = null;
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push("<p>" + paragraph.map(renderInlineMarkdown).join("<br>") + "</p>");
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push("</" + listType + ">");
    listType = null;
  };

  const openList = (type) => {
    if (listType === type) return;
    closeList();
    listType = type;
    html.push("<" + type + ">");
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    const languageClass = codeLanguage
      ? ' class="language-' + escapeHTML(codeLanguage) + '"'
      : "";
    html.push(
      "<pre><code" +
        languageClass +
        ">" +
        escapeHTML(codeLines.join("\n")) +
        "</code></pre>"
    );
    codeLines = [];
    codeLanguage = "";
    inCodeBlock = false;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const fence = line.match(
      new RegExp("^" + String.fromCharCode(96) + "{3,}([\\w+#.-]+)?\\s*$")
    );

    if (fence) {
      flushParagraph();
      closeList();

      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
        codeLanguage = fence[1] || "";
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    if (
      /^\|.*\|$/.test(line) &&
      /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(
        lines[i + 1]?.trim() || ""
      )
    ) {
      flushParagraph();
      closeList();

      const headers = line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());

      i += 1;

      const rows = [];
      while (
        i + 1 < lines.length &&
        /^\|.*\|$/.test(lines[i + 1].trim())
      ) {
        i += 1;
        rows.push(
          lines[i]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim())
        );
      }

      html.push('<div class="ai-table">');
      html.push('<div class="ai-table-head">');
      headers.forEach((cell) => {
        html.push("<strong>" + renderInlineMarkdown(cell) + "</strong>");
      });
      html.push("</div>");

      rows.forEach((row) => {
        html.push('<div class="ai-table-row">');
        row.forEach((cell, index) => {
          html.push(
            "<span><small>" +
              renderInlineMarkdown(headers[index] || "") +
              "</small>" +
              renderInlineMarkdown(cell) +
              "</span>"
          );
        });
        html.push("</div>");
      });

      html.push("</div>");
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push("<h4>" + renderInlineMarkdown(heading[1]) + "</h4>");
      continue;
    }

    if (/^([-*_]){3,}$/.test(line)) {
      flushParagraph();
      closeList();
      html.push("<hr>");
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      openList("ul");
      html.push("<li>" + renderInlineMarkdown(bullet[1]) + "</li>");
      continue;
    }

    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      openList("ol");
      html.push("<li>" + renderInlineMarkdown(numbered[2]) + "</li>");
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  if (inCodeBlock) {
    flushCodeBlock();
  }

  flushParagraph();
  closeList();

  return html.join("");
}



function getAIStreamSpeed(question, textLength = 0) {
  const lower = question.toLowerCase();

  const fastPatterns = [
    "who are you",
    "what are your skills",
    "what skills do you have",
    "tell me about your skills",
    "tell me about jobshield",
    "tell me about stocksense",
    "what projects have you built",
    "where did you study",
    "what did you study"
  ];

  const deepPatterns = [
    "compare",
    "difference between",
    "how did you",
    "why did you",
    "explain your approach",
    "technical",
    "architecture",
    "walk me through",
    "how does",
    "weakness",
    "why should i hire you"
  ];

  if (fastPatterns.some((pattern) => lower.includes(pattern))) {
    return 7;
  }

  if (deepPatterns.some((pattern) => lower.includes(pattern))) {
    return 24;
  }

  if (textLength > 900) return 18;
  return 14;
}

async function revealAIText(output, cursor, text, delay) {
  const chars = [...text];

  for (let i = 0; i < chars.length; i += 1) {
    cursor.before(document.createTextNode(chars[i]));

    if (i % 2 === 0) scrollAIChat();

    await wait(chars[i] === " " ? Math.max(4, delay * 0.45) : delay);
  }

  scrollAIChat();
}

async function streamLocalAnswer(text, question = "") {
  clearActiveCursor();
  resumeAIAutoScroll();

  const thinking = addThinkingMessage();
  await wait(520);
  let output = null;
  let cursor = null;

  await revealAIText(output, cursor, text, getAIStreamSpeed(question, text.length));
}

async function streamRemoteAnswer(question) {
  clearActiveCursor();
  resumeAIAutoScroll();

  const thinking = addThinkingMessage();

  const response = await fetch(RAJDEEP_AI_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: question,
      messages: aiHistory.slice(-10),
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    throw new Error("Rajdeep AI endpoint is unavailable.");
  }

  thinking?.remove();

  const output = addAssistantMessage();
  if (!output) return;

  const cursor = document.createElement("span");
  cursor.className = "ai-cursor";
  output.appendChild(cursor);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamedText = "";
  let displayText = "";
  let streamFinished = false;
  let streamFailed = false;
  let revealResolve = null;
  const revealDone = new Promise((resolve) => {
    revealResolve = resolve;
  });

  const delay = getAIStreamSpeed(question);

  const renderVisible = () => {
    output.innerHTML = renderAIText(displayText);
    placeAIResponseCursor(output, cursor);
    scrollAIChat();
  };

  const revealLoop = async () => {
    while (!streamFinished || displayText.length < streamedText.length) {
      if (displayText.length < streamedText.length) {
        const nextChar = [...streamedText][[...displayText].length];
        if (nextChar !== undefined) {
          displayText += nextChar;
          renderVisible();
        }
      } else {
        await wait(16);
      }

      if (displayText.length < streamedText.length) {
        await wait(nextCharDelay(displayText, delay));
      }
    }

    revealResolve();
  };

  const nextCharDelay = (visible, baseDelay) => {
    const last = visible.slice(-1);
    if (last === " " || last === "\n") return Math.max(4, baseDelay * 0.45);
    if (/[.!?]/.test(last)) return baseDelay * 2.2;
    if (/[,:;]/.test(last)) return baseDelay * 1.35;
    return baseDelay;
  };

  const revealPromise = revealLoop();

  const processEvent = (event) => {
    const lines = event.split(/\r?\n/);

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let data;
      try {
        data = JSON.parse(payload);
      } catch {
        continue;
      }

      if (data.error) {
        streamFailed = true;
        throw new Error(data.error);
      }

      if (data.text) {
        if (!output) {
          thinking?.remove();
          output = addAssistantMessage();
          if (!output) return;
          cursor = document.createElement("span");
          cursor.className = "ai-cursor";
          output.appendChild(cursor);
        }
        streamedText += data.text;
      }
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const event of events) {
        processEvent(event);
      }
    }

    if (buffer.trim()) {
      processEvent(buffer);
    }

    streamFinished = true;
    await revealPromise;

    if (!streamedText) {
      throw new Error("Rajdeep AI returned an empty response.");
    }

    if (streamFailed) {
      throw new Error("Rajdeep AI stream ended unexpectedly.");
    }
  } finally {
    streamFinished = true;
    reader.releaseLock?.();
  }

  aiHistory.push(
    { role: "user", content: question },
    { role: "assistant", content: streamedText }
  );

  if (aiHistory.length > 12) {
    aiHistory.splice(0, aiHistory.length - 12);
  }
}

async function askRajdeep(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion || aiBusy) return;

  resumeAIAutoScroll();
  addUserMessage(cleanQuestion);
  setComposerBusy(true);

  try {
    if (quickAnswers[cleanQuestion]) {
      const answer = quickAnswers[cleanQuestion];
      await streamLocalAnswer(answer);
      aiHistory.push(
        { role: "user", content: cleanQuestion },
        { role: "assistant", content: answer }
      );
      if (aiHistory.length > 12) aiHistory.splice(0, aiHistory.length - 12);
    } else if (RAJDEEP_AI_API) {
      await streamRemoteAnswer(cleanQuestion);
    } else {
      await streamLocalAnswer(
        "I can answer questions about Rajdeep's projects, skills, experience and portfolio. The live AI endpoint is being connected for open-ended questions."
      );
    }
  } catch (error) {
    const thinking = aiChat?.querySelector(".ai-thinking-message");
    thinking?.remove();

    const hasAssistantResponse = aiChat?.querySelector(
      ".ai-message.assistant:not(.ai-thinking-message) .ai-response"
    );

    if (!hasAssistantResponse?.textContent?.trim()) {
      await streamLocalAnswer(
        "I couldn't reach the live AI layer right now. Try one of the suggested questions, or check back once the AI endpoint is available."
      );
    }
  } finally {
    setComposerBusy(false);
    aiInput?.focus();
  }
}

aiComposer?.addEventListener("submit", (event) => {
  event.preventDefault();
  askRajdeep(aiInput?.value || "");
  if (aiInput) aiInput.value = "";
});

aiQuestions?.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => askRajdeep(button.textContent || ""));
});

/* =========================================================
   PROJECT CASE STUDIES
   Card -> case study -> GitHub.
   No live-demo buttons are shown because these projects are not deployed.
   ========================================================= */

const projectData = {
  jobshield: {
    kicker: "01 · AI / GENAI",
    title: "JobShield",
    summary:
      "AI Job Discovery & Safety Assistant built around the flow Find → Verify → Match → Improve.",
    problem:
      "Job seekers need to distinguish suspicious recruitment signals from legitimate job requirements before relying on an automated match.",
    approach:
      "Resume PDF/DOCX text is parsed and cleaned locally. A 20B model analyzes job-risk signals, while a separate 120B model performs evidence-based resume-to-job reasoning after the risk gate.",
    stack: [
      "Python",
      "Groq",
      "GPT-OSS 20B",
      "GPT-OSS 120B",
      "Streamlit",
      "PyPDF",
      "python-docx",
    ],
    notes:
      "Risk output is a signal score, not a scam probability. High-risk results require confirmation before detailed matching.",
    github: "https://github.com/rajdeep-senapati/JobShield",
  },
  stocksense: {
    kicker: "02 · ML / FORECASTING",
    title: "StockSense",
    summary:
      "Predictive Inventory Intelligence connecting SKU-level demand forecasting to replenishment decisions.",
    problem:
      "Retail inventory decisions need to balance stockout risk against excess inventory while demand can be intermittent and highly variable.",
    approach:
      "Transactions are cleaned with explicit business rules, transformed into daily SKU demand, analyzed for intermittency, then modeled with lag, rolling and calendar features. Forecasts feed a reorder-point and inventory-risk decision layer.",
    stack: [
      "Python",
      "Pandas",
      "XGBoost",
      "Feature Engineering",
      "Time Series",
      "Streamlit",
    ],
    notes:
      "The project is designed around prediction → inventory risk → business action rather than forecasting alone.",
    github: "https://github.com/rajdeep-senapati/stocksense",
  },
  route: {
    kicker: "03 · AI / OPTIMIZATION",
    title: "AI Route Optimizer",
    summary:
      "Vehicle-routing workflow combining optimization, capacity, fuel constraints and traffic-aware enrichment.",
    problem:
      "Delivery planning has to account for multiple customers, vehicle capacity, route distance, fuel usage and changing traffic conditions.",
    approach:
      "A Flask backend uses OR-Tools for vehicle routing, Haversine distance calculations and capacity constraints. The solver can attempt a fuel-aware model, fall back when necessary, then enrich routes with traffic durations and rerouting logic.",
    stack: [
      "Python",
      "OR-Tools",
      "Flask",
      "Supabase",
      "Haversine",
      "Traffic APIs",
    ],
    notes:
      "The portfolio case study links both the optimization backend and the separate React frontend repository.",
    github: "https://github.com/rajdeep-senapati/Route_Optimizer",
  },
  exam: {
    kicker: "04 · ALGORITHMS",
    title: "Exam Seating Algorithm",
    summary:
      "Full-stack exam management system with constraint-based seating, invigilator assignment and AI constraint parsing.",
    problem:
      "Manual exam hall allocation is repetitive and can create seating conflicts, invigilator double-booking and poor room utilization.",
    approach:
      "A three-phase seating algorithm handles department distribution and leftover allocation. Invigilators are load-balanced with conflict prevention, while Gemini converts natural-language constraints into structured rules.",
    stack: [
      "Python",
      "Flask",
      "React",
      "SQLite",
      "SQLAlchemy",
      "Gemini",
      "OpenPyXL",
      "JWT",
    ],
    notes:
      "The repository includes the frontend, backend, sample data and screenshots, making the case study useful even without a hosted demo.",
    github: "https://github.com/rajdeep-senapati/Exam-seating-system",
  },
  alzheimers: {
    kicker: "05 · ML / RESEARCH",
    title: "Alzheimer’s Classification",
    summary:
      "Research project using MRI-derived biomarkers, statistical feature selection and XGBoost for disease-stage classification.",
    problem:
      "MRI-derived volumetric biomarkers can contain many candidate variables, making feature selection and stage-specific classification important parts of the modeling workflow.",
    approach:
      "ADNI MRI volumetric reports were processed into biomarker features. Statistical z-test selection was used before XGBoost models were trained for binary disease-stage classification tasks.",
    stack: [
      "Python",
      "XGBoost",
      "Statistics",
      "Feature Selection",
      "Cross-validation",
    ],
    notes:
      "The project was completed as machine-learning research work at Jadavpur University; the portfolio should present the documented methodology rather than imply clinical deployment.",
    github: "https://github.com/rajdeep-senapati/ML-and-DL",
  },
  diwali: {
    kicker: "06 · DATA ANALYTICS",
    title: "Diwali Sales Analysis",
    summary:
      "Exploratory retail analysis focused on customer demographics, spending patterns and product categories.",
    problem:
      "Festive retail data can reveal which customer segments, regions and product categories contribute most to sales.",
    approach:
      "The notebook cleans the transaction data, engineers total-spend and age-group features, then uses univariate and bivariate analysis to explore demographic and product-level patterns.",
    stack: ["Python", "Pandas", "NumPy", "Matplotlib", "Seaborn", "Jupyter"],
    notes:
      "The repository contains the analysis notebook and source dataset, so the portfolio case study can explain the findings before sending the recruiter to the code.",
    github: "https://github.com/rajdeep-senapati/Diwali_Sales",
  },
};

const caseModal = document.querySelector("#caseModal");
const caseBackdrop = document.querySelector("#caseBackdrop");
const caseClose = document.querySelector("#caseClose");
const caseTitle = document.querySelector("#caseTitle");
const caseKicker = document.querySelector("#caseKicker");
const caseSummary = document.querySelector("#caseSummary");
const caseProblem = document.querySelector("#caseProblem");
const caseApproach = document.querySelector("#caseApproach");
const caseNotes = document.querySelector("#caseNotes");
const caseTags = document.querySelector("#caseTags");
const caseGithub = document.querySelector("#caseGithub");

function openCaseStudy(key, trigger = document.activeElement) {
  const project = projectData[key];
  if (!project || !caseModal) return;

  caseKicker.textContent = project.kicker;
  caseTitle.textContent = project.title;
  caseSummary.textContent = project.summary;
  caseProblem.textContent = project.problem;
  caseApproach.textContent = project.approach;
  caseNotes.textContent = project.notes;
  caseTags.innerHTML = project.stack
    .map((tag) => `<span>${tag}</span>`)
    .join("");
  caseGithub.href = project.github;

  lockPageScroll();
  caseModal.classList.add("open");
  document.body.classList.add("modal-open");
  activateDialog(caseModal, trigger);

}

function closeCaseStudy() {
  if (!caseModal) return;
  caseModal.classList.remove("open");
  document.body.classList.remove("modal-open");
  unlockPageScroll();
  deactivateDialog(caseModal);
}

caseClose?.addEventListener("click", closeCaseStudy);
caseBackdrop?.addEventListener("click", closeCaseStudy);

document.querySelectorAll(".project-card[data-project]").forEach((card) => {
  const open = () => openCaseStudy(card.dataset.project, card);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
});

/* =========================================================
   HEADER STATE + PAGE/SCROLL MOTION
   ========================================================= */

/* =========================================================
   RESPONSIVE MOBILE TICKER
   Measure the actual rendered ticker text, not its 100%-wide
   container, then fit the complete string to the phone width.
   ========================================================= */

const mobileTicker = document.querySelector(".ticker");
const mobileTickerContent = mobileTicker?.querySelector(".ticker-content");

function getTickerTextWidth() {
  if (!mobileTickerContent) return 0;

  const range = document.createRange();
  range.selectNodeContents(mobileTickerContent);

  const rects = [...range.getClientRects()];
  range.detach();

  if (!rects.length) return 0;

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));

  return right - left;
}

function fitMobileTicker() {
  if (!mobileTicker || !mobileTickerContent) return;

  if (!window.matchMedia("(max-width: 620px)").matches) {
    mobileTickerContent.style.fontSize = "";
    mobileTickerContent.style.transform = "";
    return;
  }

  const availableWidth = Math.max(1, mobileTicker.clientWidth - 16);
  const maxSize = 10;
  const minSize = 5.5;

  mobileTickerContent.style.transform = "none";
  mobileTickerContent.style.fontSize = `${maxSize}px`;

  const naturalWidth = getTickerTextWidth();

  if (!naturalWidth) return;

  const fittedSize = Math.max(
    minSize,
    maxSize * Math.min(1, availableWidth / naturalWidth),
  );

  mobileTickerContent.style.fontSize = `${fittedSize}px`;

  const fittedWidth = getTickerTextWidth();

  if (fittedWidth > availableWidth) {
    mobileTickerContent.style.transform =
      `scaleX(${availableWidth / fittedWidth})`;
  }
}

const tickerResizeObserver =
  "ResizeObserver" in window
    ? new ResizeObserver(fitMobileTicker)
    : null;

tickerResizeObserver?.observe(mobileTicker);
window.addEventListener("resize", fitMobileTicker, { passive: true });
window.addEventListener("orientationchange", fitMobileTicker);
window.addEventListener("load", fitMobileTicker);
fitMobileTicker();

const siteHeader = document.querySelector(".site-header");

function updateHeaderState() {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 24);
}

window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("load", updateHeaderState);
updateHeaderState();

/* Add the same restrained reveal language to the main sections/cards. */
const revealTargets = [
  ...document.querySelectorAll(
    ".section-heading, .project-card, .skills > div, .ai > div, .profile-panel, .about, .contact, .experience-item, .cert-item",
  ),
];

revealTargets.forEach((el, index) => {
  el.classList.add("scroll-reveal");
  el.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 70}ms`);
});

/* Experience + certification items use a tighter stagger. */
document
  .querySelectorAll(".experience-item, .cert-item")
  .forEach((item, index) => {
    item.style.setProperty(
      "--profile-delay",
      `${index * 90}ms`,
    );
  });

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
}

const skillsSection = document.querySelector("#skills");
if (skillsSection && "IntersectionObserver" in window) {
  const skillObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        skillsSection.classList.add("skills-visible");
        skillObserver.disconnect();
      }
    },
    { threshold: 0.2 },
  );
  skillObserver.observe(skillsSection);
}

const aiTerminal = document.querySelector("#ai-terminal");

if (aiTerminal && "IntersectionObserver" in window) {
  const terminalObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        aiTerminal.classList.add("is-booted");
        terminalObserver.disconnect();
      }
    },
    {
      threshold: 0.35,
    },
  );

  terminalObserver.observe(aiTerminal);
}

/* =========================================================
   NAVIGATION
   ========================================================= */

/* =========================================================
   MOBILE HASH NAVIGATION
   Fixed glass header must never cover the Work section when
   #work is opened directly or through an anchor.
   ========================================================= */

function positionWorkSection() {
  const work = document.querySelector("#work");
  if (!work || window.innerWidth > 620) return;

  const header = document.querySelector(".site-header");
  const headerHeight = header?.getBoundingClientRect().height || 56;
  const targetY =
    work.getBoundingClientRect().top +
    window.scrollY -
    headerHeight -
    80;

  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: "auto",
  });
}

document.querySelectorAll('a[href="#work"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (window.innerWidth > 620) return;

    event.preventDefault();
    history.pushState(null, "", "#work");
    positionWorkSection();
  });
});

if (window.location.hash === "#work") {
  window.addEventListener("load", positionWorkSection, { once: true });
  window.setTimeout(positionWorkSection, 100);
}

const navLinks = [...document.querySelectorAll(".main-nav a")];

const navTargets = navLinks
  .map((link) => {
    const href = link.getAttribute("href");

    if (!href || !href.startsWith("#")) return null;

    const target = document.querySelector(href);

    if (!target) return null;

    return {
      link,
      target,
    };
  })
  .filter(Boolean);

function updateActiveNav() {
  const headerHeight =
    document.querySelector(".site-header")?.offsetHeight || 76;

  const marker =
    window.scrollY + headerHeight + Math.min(window.innerHeight * 0.22, 180);

  let activeLink = navLinks[0];

  for (const item of navTargets) {
    if (item.target.offsetTop <= marker) {
      activeLink = item.link;
    }
  }

  navLinks.forEach((link) => {
    link.classList.toggle("active", link === activeLink);
  });
}

window.addEventListener("scroll", updateActiveNav, { passive: true });

window.addEventListener("resize", updateActiveNav);

updateActiveNav();
