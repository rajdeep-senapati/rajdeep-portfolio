# Rajdeep Portfolio

Recruiter-focused Data + AI portfolio for Rajdeep Senapati.

**Live:** https://rajdeep-senapati.vercel.app

## Stack

- HTML
- CSS
- Vanilla JavaScript
- Python + FastAPI
- Groq
- GPT-OSS 20B / 120B
- Qwen fallback
- Structured JSON knowledge base
- Vercel

## AI Rajdeep

The portfolio includes an AI representative that answers questions about Rajdeep's projects, skills, experience and career interests.

Architecture:

```
Browser
  ↓
AI Rajdeep UI
  ↓
POST /api/chat
  ↓
FastAPI
  ↓
Groq
  ├── GPT-OSS 20B
  ├── GPT-OSS 120B
  └── Qwen fallback
  ↓
data/rajdeep.json
```

The frontend keeps the existing streaming contract, so the AI response is streamed to the browser using Server-Sent Events.

## Local setup

Install dependencies:

```bash
pip install -r requirements.txt
```

Set:

```text
GROQ_API_KEY=
GROQ_PRIMARY_MODEL=openai/gpt-oss-20b
GROQ_ESCALATION_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODEL=qwen/qwen3.8-27b
```

Run FastAPI directly:

```bash
uvicorn api.index:app --reload --port 8000
```

Health endpoint:

```text
http://localhost:8000/api
```

For a Vercel-style local test, use:

```bash
vercel dev
```

## Deployment

The project is deployed on Vercel with the Python FastAPI runtime. The production domain is:

https://rajdeep-senapati.vercel.app

No API keys are stored in the frontend or committed to GitHub.
