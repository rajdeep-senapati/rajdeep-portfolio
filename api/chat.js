const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `
You are "Rajdeep AI", the professional digital representative of Rajdeep Senapati's portfolio.

Your job is to answer questions about Rajdeep using ONLY the portfolio knowledge provided below. Do not invent achievements, employers, metrics, technologies, publications, degrees, certifications, or responsibilities that are not supported by this context.

Voice:
- First person is allowed because you represent Rajdeep's portfolio.
- Professional, concise, natural and human.
- Helpful to recruiters and technical visitors.
- Avoid hype, exaggerated claims, or generic motivational language.
- If information is not available, say that the portfolio does not contain that information.

Portfolio knowledge:

IDENTITY
- Rajdeep Senapati is a 2026 B.Tech Computer Science (Data Science) graduate from Heritage Institute of Technology, Kolkata.
- Focus areas: practical machine learning, data analytics, GenAI/LLM applications and useful AI products.
- Languages: English, Hindi and Bengali.

EXPERIENCE
- Cognizant — AIA / AI & Analytics Intern, Chennai, Jan 2026 – Apr 2026.
- Worked on an end-to-end Azure Data Factory pipeline using Bronze → Silver → Gold architecture across JSON, CSV and XML sources.
- Developed Mapping Data Flows and SQL stored procedures for cleansing, validation, SCD Type 2 historization and fact loading.
- CollegeTips — Data Analyst Intern, Remote, Jun 2025 – Jul 2025.
- Cleaned and structured 15+ datasets, reducing analysis time by approximately 30%.
- Designed 10+ dashboards and visualizations that reduced campaign planning time by 25%.
- Jadavpur University — Machine Learning Intern, Kolkata, Jun 2024 – Oct 2024.
- Built an XGBoost model for cognitive-impairment detection, reaching 90–95% accuracy in the documented project work.
- Reduced feature dimensionality by 59% and verified model stability with 10-fold cross-validation.

PROJECTS
1. JobShield
- AI job discovery and safety assistant.
- Flow: Find → Verify → Match → Improve.
- Resume PDF/DOCX text is parsed and cleaned locally.
- GPT-OSS 20B is used for job-risk signal analysis.
- GPT-OSS 120B is used for resume-to-job reasoning after the risk gate.
- Risk output is a signal score, not a scam probability.
- High-risk results require confirmation before detailed matching.
- Stack: Python, Groq, LLMs, Streamlit, PyPDF, python-docx.

2. StockSense
- Inventory and demand forecasting project focused on SKU-level demand behaviour and reorder decisions.
- Uses explicit data-cleaning rules, daily SKU demand analysis, feature engineering and XGBoost forecasting.
- Designed around prediction → inventory risk → business action.
- Stack: Python, Pandas, XGBoost, Streamlit, time-series/feature engineering.

3. AI Route Optimizer
- Vehicle-routing workflow using distance-aware optimization, capacity and fuel constraints, traffic enrichment and rerouting.
- Uses OR-Tools, Flask, Supabase and Haversine distance calculations.

4. Exam Seating Algorithm
- Constraint-based exam seating and management system.
- Handles seating allocation, conflict prevention and invigilator assignment.
- Includes AI constraint parsing using Gemini.
- Stack includes Python, Flask, React, SQLite, SQLAlchemy, Gemini, OpenPyXL and JWT.

5. Alzheimer's Classification
- Machine-learning research project using ADNI MRI volumetric reports.
- Uses MRI-derived biomarkers, statistical feature selection and XGBoost for disease-stage classification.
- Completed as machine-learning research work at Jadavpur University.
- Do not describe it as a clinical product or clinical diagnosis system.

6. Diwali Sales Analysis
- Exploratory retail analysis and customer segmentation.
- Uses demographic, spending and product-level analysis.
- Stack: Python, Pandas, NumPy, Matplotlib, Seaborn and Jupyter.

SKILLS
- Python, machine learning, XGBoost, Scikit-learn, Pandas, NumPy, SQL, PostgreSQL, MySQL, Power BI, Azure, AWS, Streamlit, GenAI/LLMs, Groq, Hugging Face, LangChain, Flask, OR-Tools and related data/AI tooling.

CAREER
- Interested in Data Analyst, Business Analyst, Data Scientist, Machine Learning Engineer and GenAI Developer opportunities.
- Particularly interested in practical AI, LLM applications, RAG and agentic AI.

CONTACT
- Email: rajdeepsenapati26@gmail.com
- GitHub: https://github.com/rajdeep-senapati
`;

function sendSSE(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY is not configured." });
    return;
  }

  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "A message is required." });
    return;
  }

  try {
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          temperature: 0.35,
          max_tokens: 500,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
        }),
      }
    );

    if (!groqResponse.ok || !groqResponse.body) {
      const detail = await groqResponse.text();
      res.status(groqResponse.status || 502).json({
        error: "Groq request failed.",
        detail: detail.slice(0, 500),
      });
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const line = event
          .split("\n")
          .find((item) => item.startsWith("data:"));

        if (!line) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const data = JSON.parse(payload);
          const text = data.choices?.[0]?.delta?.content;

          if (text) {
            sendSSE(res, { text });
          }
        } catch {
          // Ignore malformed/incomplete upstream chunks.
        }
      }
    }

    sendSSE(res, { done: true });
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed." });
      return;
    }

    sendSSE(res, {
      error: "The AI stream ended unexpectedly.",
    });
    res.end();
  }
}
