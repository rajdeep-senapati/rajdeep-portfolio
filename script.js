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
    "I'm Rajdeep's portfolio AI — a digital representative built around his work, projects, skills and experience. Rajdeep is a Data Science graduate focused on practical machine learning, Agentic AI, Hybrid RAG and LLM products.",
  "Tell me about JobShield.":
    "JobShield v2.0 is a Multi-Agent LangGraph & Hybrid RAG career copilot built around Web Verify (Tool Use) → Hybrid RAG (BM25 + Cosine RRF) → Match → Grounded Critic. It combines autonomous DuckDuckGo web verification, Reciprocal Rank Fusion retrieval (cutting prompt tokens by up to 60% and improving Precision@2 by +33.4% over pure BM25 at 3.63 ms latency), Pydantic v2 schema enforcement, and a self-reflection grounding critic achieving 1.00/1.00 faithfulness (~$0.00057/run).",
  "What are your skills?":
    "Rajdeep works across Python, Agentic AI (LangGraph), Hybrid RAG (BM25 + Cosine RRF), GenAI/LLMs, machine learning, data analytics, SQL and cloud data engineering. His stack includes Groq, LangChain, Pydantic, XGBoost, Streamlit, OR-Tools, Flask, Pandas and Azure/AWS.",
  "What is the tech stack of this portfolio?":
    "The portfolio itself uses HTML, CSS and Vanilla JavaScript on the frontend, Python with FastAPI on the backend, Groq with GPT-OSS 20B/120B and a Qwen fallback for AI, a structured JSON knowledge base, Server-Sent Events for streaming, and Vercel for deployment.",
};

let aiBusy = false;
const aiHistory = [];

let activeDialog = null;
let lastDialogTrigger = null;

/*
 * Lock background scrolling cleanly using overflow: hidden instead of
 * position: fixed so the browser never resets window.scrollY to 0 or
 * triggers a smooth-scroll animation from Home back to Work on close.
 */
let lockedPageScrollY = 0;
const MODAL_SCROLL_STORAGE_KEY = "rajdeep-modal-scroll-y";

function lockPageScroll() {
  lockedPageScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function unlockPageScroll() {
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  window.scrollTo({ top: lockedPageScrollY, left: 0, behavior: "instant" });
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
    window.scrollTo({ top: restoreY, left: 0, behavior: "instant" });
  });
}

window.addEventListener("pagehide", rememberModalScrollForReload);
window.addEventListener("load", restoreModalScrollAfterReload);

function getDialogFocusableElements(dialog) {
  if (!dialog) return [];

  return [
    ...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    (focusables[0] || dialog)?.focus?.({ preventScroll: true });
  }, 50);
}

function deactivateDialog(dialog) {
  if (!dialog) return;

  dialog.setAttribute("aria-hidden", "true");

  if (activeDialog === dialog) {
    activeDialog = null;
    const trigger = lastDialogTrigger;
    lastDialogTrigger = null;

    if (trigger && document.contains(trigger)) {
      trigger.focus({ preventScroll: true });
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

aiChat?.addEventListener(
  "touchmove",
  () => {
    aiUserScrolledUp = true;
  },
  { passive: true },
);

aiChat?.addEventListener("keydown", (event) => {
  if (["ArrowUp", "PageUp", "Home"].includes(event.key)) {
    aiUserScrolledUp = true;
  }
  if (
    ["ArrowDown", "PageDown", "End"].includes(event.key) &&
    isAIChatAtBottom()
  ) {
    aiUserScrolledUp = false;
  }
});

function resumeAIAutoScroll() {
  aiUserScrolledUp = false;
  scrollAIChat(true);
}

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

  const walker = document.createTreeWalker(response, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue?.length
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  let lastTextNode = null;
  while (walker.nextNode()) {
    lastTextNode = walker.currentNode;
  }

  if (!lastTextNode?.parentNode) {
    response.appendChild(cursor);
    return;
  }

  lastTextNode.parentNode.insertBefore(cursor, lastTextNode.nextSibling);
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

function renderAIMath(element) {
  if (!element || typeof window.renderMathInElement !== "function") return;

  window.renderMathInElement(element, {
    delimiters: [
      { left: "$", right: "$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    throwOnError: false,
    preProcess: (math) => math.replace(/\\\\/g, "\\"),
  });
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
    html.push(
      "<p>" + paragraph.map(renderInlineMarkdown).join("<br>") + "</p>",
    );
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
        "</code></pre>",
    );
    codeLines = [];
    codeLanguage = "";
    inCodeBlock = false;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const fence = line.match(
      new RegExp("^" + String.fromCharCode(96) + "{3,}([\\w+#.-]+)?\\s*$"),
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
        lines[i + 1]?.trim() || "",
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
      while (i + 1 < lines.length && /^\|.*\|$/.test(lines[i + 1].trim())) {
        i += 1;
        rows.push(
          lines[i]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim()),
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
              "</span>",
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
    "what did you study",
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
    "why should i hire you",
  ];

  if (fastPatterns.some((pattern) => lower.includes(pattern))) {
    return 7;
  }

  if (deepPatterns.some((pattern) => lower.includes(pattern))) {
    return 20;
  }

  if (textLength > 900) return 16;
  return 12;
}

async function revealAIText(output, cursor, text, delay) {
  const chars = [...text];
  const step = 3;

  for (let i = 0; i < chars.length; i += step) {
    const chunk = chars.slice(i, i + step).join("");
    cursor.before(document.createTextNode(chunk));
    scrollAIChat();
    await wait(Math.max(12, delay));
  }

  scrollAIChat();
}

async function streamLocalAnswer(text, question = "") {
  clearActiveCursor();
  resumeAIAutoScroll();

  const thinking = addThinkingMessage();
  await wait(420);
  thinking?.remove();

  const output = addAssistantMessage();
  if (!output) return;

  const cursor = document.createElement("span");
  cursor.className = "ai-cursor";
  output.appendChild(cursor);

  await revealAIText(
    output,
    cursor,
    text,
    getAIStreamSpeed(question, text.length),
  );

  cursor.remove();
  renderAIMath(output);
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
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Rajdeep AI endpoint is unavailable.");
  }

  thinking?.remove();

  let output = addAssistantMessage();
  if (!output) return;

  let cursor = document.createElement("span");
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

  const nextCharDelay = (visible, baseDelay) => {
    const last = visible.slice(-1);
    if (last === " " || last === "\n") return Math.max(10, baseDelay * 0.6);
    if (/[.!?]/.test(last)) return baseDelay * 1.8;
    if (/[,:;]/.test(last)) return baseDelay * 1.25;
    return baseDelay;
  };

  const revealLoop = async () => {
    while (!streamFinished || displayText.length < streamedText.length) {
      if (displayText.length < streamedText.length) {
        const remaining = streamedText.length - displayText.length;
        const step = remaining > 40 ? 6 : remaining > 15 ? 3 : 2;
        displayText = streamedText.slice(0, displayText.length + step);
        renderVisible();
        await wait(Math.max(16, nextCharDelay(displayText, delay)));
      } else {
        await wait(20);
      }
    }

    revealResolve();
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

    renderAIMath(output);

    if (streamFailed) {
      throw new Error("Rajdeep AI stream ended unexpectedly.");
    }
  } finally {
    streamFinished = true;
    reader.releaseLock?.();
  }

  aiHistory.push(
    { role: "user", content: question },
    { role: "assistant", content: streamedText },
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
        { role: "assistant", content: answer },
      );
      if (aiHistory.length > 12) aiHistory.splice(0, aiHistory.length - 12);
    } else if (RAJDEEP_AI_API) {
      await streamRemoteAnswer(cleanQuestion);
    } else {
      await streamLocalAnswer(
        "I can answer questions about Rajdeep's projects, skills, experience and portfolio. The live AI endpoint is being connected for open-ended questions.",
      );
    }
  } catch (error) {
    const thinking = aiChat?.querySelector(".ai-thinking-message");
    thinking?.remove();

    const hasAssistantResponse = aiChat?.querySelector(
      ".ai-message.assistant:not(.ai-thinking-message) .ai-response",
    );

    if (!hasAssistantResponse?.textContent?.trim()) {
      await streamLocalAnswer(
        "I couldn't reach the live AI layer right now. Try one of the suggested questions, or check back once the AI endpoint is available.",
      );
    }
  } finally {
    setComposerBusy(false);
    aiInput?.focus({ preventScroll: true });
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
   ========================================================= */

const projectData = {
  jobshield: {
    kicker: "01 · AGENTIC AI / HYBRID RAG",
    title: "JobShield v2.0",
    summary:
      "Multi-Agent Job Verification & Hybrid-RAG Career Copilot built around Web Verify (Tool Use) → Hybrid RAG (BM25 + Cosine RRF) → Match → Grounded Critic.",
    problem:
      "Standard LLM resume matchers hallucinate skills, trust suspicious job listings, and waste context tokens stuffing entire multi-page resumes into a single prompt.",
    approach:
      "Architected a 3-node LangGraph StateGraph: (1) Autonomous Web Verifier agent with live DuckDuckGo tool calling, (2) Hybrid RAG retriever combining BM25 lexical search and TF-IDF Cosine similarity via Reciprocal Rank Fusion (compressing prompt context by up to 60%), and (3) a Self-Reflection Grounding Critic with Pydantic v2 schema enforcement and dynamic Groq model routing.",
    stack: [
      "Python",
      "LangGraph",
      "Hybrid RAG (BM25 + RRF)",
      "Groq API",
      "Pydantic v2",
      "DuckDuckGo Tool Use",
      "Streamlit",
    ],
    notes:
      "Benchmarked via rag_eval.py: Hybrid RRF improved Precision@2 & Recall@2 by +33.4% over pure BM25 (3.63 ms latency), achieving 1.00/1.00 faithfulness (0 hallucinations) at ~$0.00057/run.",
    live: "https://jobshield-v2.streamlit.app/",
    github: "https://github.com/rajdeep-senapati/JobShield",
  },
  pipesage: {
    kicker: "02 · DATA ENGINEERING / MCP",
    title: "PipeSage",
    summary:
      "MCP-enabled PySpark ETL and data-quality platform with configurable validation rules, invalid-record quarantine, pipeline observability, and AI assistant integration.",
    problem:
      "Silent schema drift and malformed records corrupt downstream analytics tables, while manual log inspection slows down pipeline recovery.",
    approach:
      "Built a schema-enforced PySpark ETL pipeline driven by external JSON validation rules (not_null, unique, positive, non_negative). Valid rows write to Parquet while rejected rows quarantine with a rejection_reasons array, exposed via 5 FastMCP tools and 2 MCP resources.",
    stack: [
      "Python",
      "PySpark",
      "FastMCP (MCP)",
      "Pydantic",
      "Parquet",
      "pytest",
    ],
    notes:
      "Includes a repeatable failure-scenario simulator (7 corruption modes), JSON observability reports, and 34 automated pytest unit and MCP integration tests.",
    github: "https://github.com/rajdeep-senapati/PipeSage",
  },
  stocksense: {
    kicker: "03 · DATA SCIENCE / FORECASTING",
    title: "StockSense",
    summary:
      "Predictive Inventory Intelligence connecting SKU-level demand forecasting to reorder-point and safety-stock replenishment decisions.",
    problem:
      "Retail inventory decisions must balance stockout risk against excess working capital across 3,936 SKUs where over 55% exhibit intermittent demand.",
    approach:
      "Cleaned 541,909 UCI retail transactions into 1.07M daily SKU-day records, engineered 11 leak-free lag, rolling-window, and calendar features, and trained a chronologically validated XGBoost forecaster feeding a 95% service-level reorder engine.",
    stack: [
      "Python",
      "Pandas",
      "XGBoost",
      "Feature Engineering",
      "Time Series",
      "Streamlit",
    ],
    notes:
      "Outperformed Naive and Moving-Average baselines on held-out test data (MAE: 10.25, RMSE: 41.24) and translates forecasts into Healthy / Watch / High / Critical action tiers.",
    github: "https://github.com/rajdeep-senapati/stocksense",
  },
  airwatch: {
    kicker: "04 · DATA ENGINEERING / MEDALLION",
    title: "Jamshedpur AirWatch",
    summary:
      "Reproducible Bronze → Silver → Gold PySpark & Spark SQL pipeline exploring hourly and daily air-quality trends for Jamshedpur, Jharkhand.",
    problem:
      "Raw environmental API telemetry arrives as nested hourly arrays requiring deduplication, timestamp normalization, and AQI band aggregation before decision analysis.",
    approach:
      "Ingests Open-Meteo Air Quality API feeds into raw JSON (Bronze), flattens and validates arrays into date-partitioned Parquet using PySpark (Silver), and aggregates daily pollutant metrics and US AQI categories in Spark SQL (Gold) for an interactive Streamlit dashboard.",
    stack: [
      "Python 3.11",
      "PySpark 3.5",
      "Spark SQL",
      "Parquet",
      "Plotly",
      "Streamlit",
      "GitHub Actions CI",
    ],
    notes:
      "Includes automated pytest suites validating AQI category boundaries and Gold transformations on every push via GitHub Actions CI.",
    github: "https://github.com/rajdeep-senapati/jamshedpur-airwatch",
  },
  exam: {
    kicker: "05 · FULL-STACK / ALGORITHMS",
    title: "Exam Seating System",
    summary:
      "Full-stack exam management system with a 3-phase greedy seating algorithm, load-balanced invigilator assignment, and Gemini 2.5 AI constraint parsing.",
    problem:
      "Manual exam hall allocation creates adjacent-student seating conflicts, invigilator double-booking, and uneven room utilization.",
    approach:
      "Engineered a 3-phase alternating-column seating algorithm with conflict-free invigilator load balancing in Flask + SQLAlchemy, paired with a React dashboard and Google Gemini 2.5 Flash to translate plain-English rules into structured solver constraints.",
    stack: [
      "Python",
      "Flask",
      "React 18",
      "Gemini 2.5 Flash",
      "SQLAlchemy",
      "OpenPyXL",
      "JWT",
    ],
    notes:
      "Includes role-based authentication (superadmin/admin), fairness & utilization metrics, graceful fallback without an API key, and formatted Excel export.",
    github: "https://github.com/rajdeep-senapati/Exam-seating-system",
  },
  cricket: {
    kicker: "06 · DATA ANALYTICS / POWER BI",
    title: "T20 WC Performance & BI",
    summary:
      "End-to-end sports analytics and Power BI dashboard analyzing 9,554 deliveries across 45 T20 World Cup matches to simulate optimal team selection.",
    problem:
      "Traditional batting and bowling averages overlook situational match pressure and fail to quantify how lineup combinations affect win probability.",
    approach:
      "Processed 9,554 ball-by-ball records and 260 player profiles in Python, engineered custom Player Impact Score and Pressure Index KPIs, simulated playing-XI win probabilities, and built an interactive Power BI (.pbix) executive dashboard.",
    stack: [
      "Python",
      "Pandas",
      "NumPy",
      "Power BI (.pbix)",
      "Plotly",
      "KPI Engineering",
    ],
    notes:
      "Simulated optimal lineups improved projected win probability by +15% and reduced manual player-evaluation reporting time by 40%.",
    github: "https://github.com/rajdeep-senapati/Cricket_Analysis",
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
const caseLive = document.querySelector("#caseLive");

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

  if (caseLive) {
    if (project.live) {
      caseLive.href = project.live;
      caseLive.style.display = "inline-flex";
    } else {
      caseLive.removeAttribute("href");
      caseLive.style.display = "none";
    }
  }

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
   RESPONSIVE MOBILE TICKER
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
    mobileTickerContent.style.transform = `scaleX(${availableWidth / fittedWidth})`;
  }
}

const tickerResizeObserver =
  "ResizeObserver" in window ? new ResizeObserver(fitMobileTicker) : null;

tickerResizeObserver?.observe(mobileTicker);
window.addEventListener("resize", fitMobileTicker, { passive: true });
window.addEventListener("orientationchange", fitMobileTicker);
window.addEventListener("load", fitMobileTicker);
fitMobileTicker();

const siteHeader = document.querySelector(".site-header");
let isHeaderScrolled = false;

function updateHeaderState() {
  const shouldBeScrolled = window.scrollY > 24;
  if (shouldBeScrolled !== isHeaderScrolled) {
    isHeaderScrolled = shouldBeScrolled;
    siteHeader?.classList.toggle("is-scrolled", shouldBeScrolled);
  }
}

window.addEventListener("load", updateHeaderState);
updateHeaderState();

const revealTargets = [
  ...document.querySelectorAll(
    ".section-heading, .project-card, .skills > div, .ai > div, .profile-panel, .about, .contact, .experience-item, .cert-item",
  ),
];

revealTargets.forEach((el, index) => {
  el.classList.add("scroll-reveal");
  el.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 70}ms`);
});

document
  .querySelectorAll(".experience-item, .cert-item")
  .forEach((item, index) => {
    item.style.setProperty("--profile-delay", `${index * 90}ms`);
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

function positionWorkSection() {
  const work = document.querySelector("#work");
  if (!work || window.innerWidth > 620) return;

  const header = document.querySelector(".site-header");
  const headerHeight = header?.getBoundingClientRect().height || 56;
  const targetY =
    work.getBoundingClientRect().top + window.scrollY - headerHeight - 80;

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

function resolveSectionTarget(href) {
  if (!href || !href.startsWith("#")) return null;
  if (href === "#top") {
    return document.querySelector(".hero");
  }
  return document.querySelector(href);
}

const navTargets = navLinks
  .map((link) => {
    const href = link.getAttribute("href");
    const target = resolveSectionTarget(href);
    if (!target) return null;
    return { link, target };
  })
  .filter(Boolean);

const mobileSectionNav = document.querySelector(".mobile-section-nav");
const mobileSectionIndicator = document.querySelector(
  ".mobile-section-indicator",
);
const mobileSectionLabel = mobileSectionIndicator?.querySelector("span");
const mobileSectionLinks = [
  ...document.querySelectorAll(".mobile-section-menu a"),
];

const mobileSectionTargets = mobileSectionLinks
  .map((link) => {
    const href = link.getAttribute("href");
    const target = resolveSectionTarget(href);
    if (!target) return null;
    return { link, target };
  })
  .filter(Boolean);

function setMobileSectionMenu(open) {
  if (!mobileSectionNav || !mobileSectionIndicator) return;
  mobileSectionNav.classList.toggle("is-open", open);
  mobileSectionIndicator.setAttribute("aria-expanded", String(open));
}

mobileSectionIndicator?.addEventListener("click", () => {
  setMobileSectionMenu(!mobileSectionNav?.classList.contains("is-open"));
});

mobileSectionLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (mobileSectionLabel) {
      mobileSectionLabel.textContent = link.textContent.trim().toUpperCase();
    }
    mobileSectionLinks.forEach((item) =>
      item.classList.toggle("active", item === link),
    );
    setMobileSectionMenu(false);
  });
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash || "#top";
  const activeLink = mobileSectionLinks.find(
    (link) => link.getAttribute("href") === hash,
  );
  if (!activeLink) return;
  if (mobileSectionLabel) {
    mobileSectionLabel.textContent = activeLink.textContent
      .trim()
      .toUpperCase();
  }
  mobileSectionLinks.forEach((item) =>
    item.classList.toggle("active", item === activeLink),
  );
});

document.addEventListener("click", (event) => {
  if (
    mobileSectionNav?.classList.contains("is-open") &&
    !mobileSectionNav.contains(event.target)
  ) {
    setMobileSectionMenu(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    mobileSectionNav?.classList.contains("is-open")
  ) {
    setMobileSectionMenu(false);
    mobileSectionIndicator?.focus({ preventScroll: true });
  }
});

let cachedNavTargets = [];
let cachedMobileTargets = [];

function cacheNavPositions() {
  const headerHeight =
    document.querySelector(".site-header")?.offsetHeight || 76;

  cachedNavTargets = navTargets.map((item) => ({
    link: item.link,
    top: item.target.getBoundingClientRect().top + window.scrollY,
  }));

  cachedMobileTargets = mobileSectionTargets.map((item) => ({
    link: item.link,
    top: item.target.getBoundingClientRect().top + window.scrollY,
    bottom:
      item.target.getBoundingClientRect().top +
      window.scrollY +
      item.target.getBoundingClientRect().height,
  }));

  updateActiveNav(headerHeight);
}

function updateActiveNav(headerHeight = 76) {
  const marker = window.scrollY + headerHeight + 30;

  let activeLink = navLinks[0];

  for (const item of cachedNavTargets) {
    if (item.top <= marker) activeLink = item.link;
  }

  navLinks.forEach((link) =>
    link.classList.toggle("active", link === activeLink),
  );

  if (window.innerWidth <= 620 && cachedMobileTargets.length) {
    const mobileMarker =
      window.scrollY +
      headerHeight +
      Math.max(120, (window.innerHeight - headerHeight) * 0.45);

    let activeMobile = cachedMobileTargets[0];
    let bestDistance = Infinity;

    for (const item of cachedMobileTargets) {
      if (mobileMarker >= item.top && mobileMarker <= item.bottom) {
        activeMobile = item;
        break;
      }

      const distance =
        mobileMarker < item.top
          ? item.top - mobileMarker
          : mobileMarker - item.bottom;

      if (distance < bestDistance) {
        bestDistance = distance;
        activeMobile = item;
      }
    }

    mobileSectionLinks.forEach((link) =>
      link.classList.toggle("active", link === activeMobile.link),
    );

    if (mobileSectionLabel) {
      mobileSectionLabel.textContent = activeMobile.link.textContent
        .trim()
        .toUpperCase();
    }
  }
}

let scrollUpdatePending = false;
let scrollIdleTimer = null;
let isCurrentlyScrolling = false;

function scheduleScrollUpdate() {
  if (!isCurrentlyScrolling) {
    isCurrentlyScrolling = true;
    document.documentElement.classList.add("is-scrolling");
  }

  window.clearTimeout(scrollIdleTimer);
  scrollIdleTimer = window.setTimeout(() => {
    isCurrentlyScrolling = false;
    document.documentElement.classList.remove("is-scrolling");
  }, 150);

  if (scrollUpdatePending) return;
  scrollUpdatePending = true;

  window.requestAnimationFrame(() => {
    scrollUpdatePending = false;
    updateHeaderState();
    updateActiveNav();
  });
}

window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
window.addEventListener("resize", cacheNavPositions, { passive: true });
window.addEventListener("load", cacheNavPositions);
cacheNavPositions();
