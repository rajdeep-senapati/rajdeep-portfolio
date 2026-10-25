# Rajdeep Senapati — Portfolio

Personal portfolio showcasing my work across data analytics, machine learning, and generative AI. The site combines a responsive, editorial-style frontend with **AI Rajdeep**, a portfolio-grounded assistant that answers questions about my projects, skills, and experience.

**Live portfolio:** https://rajdeep-senapati.vercel.app  
**GitHub profile:** https://github.com/rajdeep-senapati  
**LinkedIn:** https://www.linkedin.com/in/rajdeep-senapati  
**X:** https://x.com/rajdeepirl

---

## What’s inside

- **Selected projects** with interactive case-study panels describing the problem, approach, tools, and implementation notes.
- **AI Rajdeep**, an LLM-powered assistant grounded in a structured portfolio knowledge base.
- **Experience and certifications** covering my internships, research, and continued learning.
- **Responsive layout** for desktop, tablet, and mobile screens.
- **Light-first visual design** using a cream, black, and coral palette.
- **SEO and social sharing metadata**, including canonical URL, Open Graph and Twitter card tags, and structured data.
- **Resume and contact links** so recruiters and collaborators can reach me easily.

## Featured work

The portfolio currently highlights projects such as:

| Project | Focus | Technologies |
| --- | --- | --- |
| **JobShield** | Resume analysis and job-risk signals in a verify → match → improve workflow | Python, Groq, LLMs, Streamlit |
| **StockSense** | SKU-level demand behaviour, forecasting, and inventory decisions | Python, XGBoost, Streamlit |
| **AI Route Optimizer** | Route planning and optimization supported by AI | React, Flask, Google OR-Tools, Gemini |
| **RAG-powered multi-agent Q&A assistant** | Retrieval-grounded question answering | LangChain, LLMs, vector databases |
| **Diwali Sales Analysis** | Exploratory analysis and customer segmentation | Python, Pandas, Seaborn |

The portfolio’s project cards and case studies are the best place to see the current project descriptions and implementation details.

## Tech stack

### Frontend
- HTML
- CSS
- Vanilla JavaScript

### AI backend
- Python
- FastAPI
- Groq API
- GPT-OSS models, with a Qwen fallback
- Structured JSON knowledge base
- Server-Sent Events (SSE) for streamed responses

### Deployment
- Vercel

## How AI Rajdeep works

AI Rajdeep is designed to answer questions about the information represented in my portfolio, rather than act as a general-purpose autonomous agent.

```text
Visitor
  ↓
AI Rajdeep chat interface
  ↓
POST /api/chat
  ↓
FastAPI backend
  ↓
Groq-hosted language model
  ├── Primary: GPT-OSS 20B
  ├── Escalation: GPT-OSS 120B
  └── Fallback: Qwen
  ↓
Structured portfolio knowledge (data/rajdeep.json)
  ↓
Streamed response to the browser (SSE)
```

Model selection and fallback behaviour are handled by the backend. API credentials belong in environment variables and must never be exposed in frontend code or committed to the repository.

## Run locally

You’ll need Python installed. The project uses the dependencies listed in `requirements.txt`.

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/rajdeep-senapati/rajdeep-portfolio.git
   cd rajdeep-portfolio
   ```

2. Install the Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Configure the environment variables used by the AI backend. Create a local `.env` file and add your own Groq API key and the model settings:

   ```dotenv
   GROQ_API_KEY=your_groq_api_key
   GROQ_PRIMARY_MODEL=openai/gpt-oss-20b
   GROQ_ESCALATION_MODEL=openai/gpt-oss-120b
   GROQ_FALLBACK_MODEL=qwen/qwen3.8-27b
   ```

   Use the model identifiers expected by the current backend configuration. Never commit your real API key.

4. Start the FastAPI application:

   ```bash
   uvicorn api.index:app --reload --port 8000
   ```

   The API health endpoint is available at `http://localhost:8000/api`.

5. To test the project using Vercel’s local development environment, install the Vercel CLI and run:

   ```bash
   vercel dev
   ```

The portfolio frontend is made of static HTML, CSS, and JavaScript files. For the most representative local test of the frontend and serverless API routes together, use the Vercel development command.

## Deployment

The live portfolio is hosted on Vercel:

**https://rajdeep-senapati.vercel.app**

When the GitHub repository is connected to Vercel, changes pushed to the configured production branch can trigger a deployment. Configure backend secrets in the Vercel project’s environment settings rather than in source files.

## Project structure

```text
.
├── index.html          # Portfolio markup and SEO metadata
├── style.css           # Layout, responsive styles, and visual design
├── script.js           # Navigation, project panels, and AI chat UI
├── api/                # FastAPI backend and API routes
├── data/
│   └── rajdeep.json    # Structured portfolio knowledge for AI Rajdeep
├── assets/             # Profile image, resume, icons, and certificates
├── requirements.txt    # Python dependencies
└── vercel.json         # Vercel deployment configuration
```

## Security notes

- Keep `GROQ_API_KEY` and other secrets in local environment variables or Vercel environment settings.
- Do not place API keys in HTML, CSS, JavaScript, or committed JSON files.
- Keep local `.env` files out of version control.
- Only include portfolio information that you are comfortable making public.

## About me

I’m Rajdeep Senapati, a Data Science graduate from Heritage Institute of Technology, Kolkata. I’m interested in building practical solutions across data analytics, machine learning, LLM applications, RAG, and agentic AI.

I enjoy understanding how systems work and turning ideas into useful, usable projects.

## Contact

- **Email:** rajdeepsenapati26@gmail.com
- **Portfolio:** https://rajdeep-senapati.vercel.app
- **GitHub:** https://github.com/rajdeep-senapati
- **LinkedIn:** https://www.linkedin.com/in/rajdeep-senapati
- **X:** https://x.com/rajdeepirl
