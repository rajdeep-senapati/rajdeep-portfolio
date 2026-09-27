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
  ((window.location.protocol === "http:" || window.location.protocol === "https:")
    ? "/api/chat"
    : "");

const quickAnswers = {
  "Who are you?":
    "I'm Rajdeep's portfolio AI — a digital representative built around his work, projects, skills and experience. Rajdeep is a Data Science graduate focused on practical machine learning, analytics and GenAI products.",
  "Tell me about JobShield.":
    "JobShield is an AI job discovery and safety assistant built around the flow Find → Verify → Match → Improve. It uses resume parsing, job-risk signals and evidence-based resume matching to help job seekers make better-informed decisions.",
  "What are your skills?":
    "Rajdeep works with Python, machine learning, data analytics, SQL, GenAI/LLMs and cloud technologies. His project work includes XGBoost, Streamlit, Groq, OR-Tools, Flask, Pandas and Azure/AWS technologies."
};

let aiBusy = false;
const aiHistory = [];

function openAI(e) {
  if (e) e.preventDefault();
  modal?.classList.add("open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => aiInput?.focus(), 80);
}

function closeAI() {
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

openButton?.addEventListener("click", openAI);
headerAI?.addEventListener("click", openAI);
closeButton?.addEventListener("click", closeAI);
backdrop?.addEventListener("click", closeAI);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAI();
    closeCaseStudy();
  }
});

function scrollAIChat() {
  if (aiChat) aiChat.scrollTop = aiChat.scrollHeight;
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
      <p></p>
    </div>
  `;
  aiChat.appendChild(message);
  scrollAIChat();
  return message.querySelector("p");
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

async function streamLocalAnswer(text) {
  clearActiveCursor();

  const thinking = addThinkingMessage();
  await wait(520);
  thinking?.remove();

  const output = addAssistantMessage();
  if (!output) return;

  const cursor = document.createElement("span");
  cursor.className = "ai-cursor";
  output.appendChild(cursor);

  const chars = [...text];
  for (let i = 0; i < chars.length; i += 1) {
    cursor.before(document.createTextNode(chars[i]));
    if (i % 2 === 0) scrollAIChat();
    await wait(chars[i] === " " ? 7 : 13);
  }

  scrollAIChat();
}

async function streamRemoteAnswer(question) {
  clearActiveCursor();

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

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const data = JSON.parse(payload);

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.text) {
            streamedText += data.text;
            cursor.before(document.createTextNode(data.text));
            scrollAIChat();
          }
        } catch {
          // Ignore incomplete SSE frames.
        }
      }
    }
  }

  if (streamedText) {
    aiHistory.push(
      { role: "user", content: question },
      { role: "assistant", content: streamedText }
    );
    if (aiHistory.length > 12) aiHistory.splice(0, aiHistory.length - 12);
  }
}

async function askRajdeep(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion || aiBusy) return;

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

    await streamLocalAnswer(
      "I couldn't reach the live AI layer right now. Try one of the suggested questions, or check back once the AI endpoint is available."
    );
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

function openCaseStudy(key) {
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

  caseModal.classList.add("open");
  caseModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  caseClose?.focus();
}

function closeCaseStudy() {
  if (!caseModal) return;
  caseModal.classList.remove("open");
  caseModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

caseClose?.addEventListener("click", closeCaseStudy);
caseBackdrop?.addEventListener("click", closeCaseStudy);

document.querySelectorAll(".project-card[data-project]").forEach((card) => {
  const open = () => openCaseStudy(card.dataset.project);
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
