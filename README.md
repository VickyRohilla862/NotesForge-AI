# NotesForge AI

NotesForge AI turns text or uploaded documents into organized study notes and a downloadable PDF using UiPath Maestro.

## Live application

**Website:** [notesforge-ai.onrender.com](https://notesforge-ai.onrender.com)

## Features

- Enter a topic and source text.
- Upload PDF, DOCX, TXT, or Markdown documents.
- Choose a notes style.
- Generate structured notes through a UiPath Maestro Flow.(Generation may take upto 2 minutes)
- Download the generated notes as a PDF.

## How it works

1. The React frontend sends the topic, style, text, and optional document to the Express API.
2. The API creates an asynchronous job and sends the request to the Maestro HTTP Webhook.
3. Maestro parses the request and uses its NotesForge AI agent to generate a title, summary, and Markdown notes.
4. Maestro sends the result to the API callback endpoint.
5. The API creates the PDF, and the frontend polls the job until the download is ready.

## Project structure

```text
src/                         React frontend
server/index.js              Express API, job handling, extraction, and PDF generation
NotesForge-AI-Maestro/       UiPath Maestro solution and Flow source
render.yaml                  Render deployment configuration
.env.example                 Server environment variable template
```

## Tech stack

- React 19
- TypeScript
- Vite
- Express 5
- PDFKit
- PDF and DOCX text extraction
- UiPath Maestro
- Render

## Local development

Install dependencies:

```bash
npm install
```

Create the server environment file:

```bash
cp .env.example .env
```

Set the Maestro webhook URL and server-side secret in `.env`, then run the frontend and API in separate terminals:

```bash
npm run dev
npm run dev:api
```

The Vite development server normally runs at `http://localhost:5173`.

## Environment variables

| Variable | Description |
| --- | --- |
| `MAESTRO_WEBHOOK_URL` | Public UiPath Maestro HTTP Webhook URL |
| `MAESTRO_WEBHOOK_HEADER` | Authentication header name, normally `X-NotesForge-Key` |
| `MAESTRO_WEBHOOK_SECRET` | Secret configured for the Maestro webhook |
| `PUBLIC_API_URL` | Public API base URL used for Maestro callbacks |
| `PORT` | Express server port |

Never expose these values as `VITE_*` variables or commit `.env` to GitHub.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/generate-notes` | Starts a notes-generation job |
| `GET` | `/api/jobs/:jobId` | Returns job status |
| `GET` | `/api/jobs/:jobId/pdf` | Downloads the completed PDF |
| `POST` | `/api/maestro/callback` | Receives completed notes from Maestro |

The generation endpoint returns `202 Accepted` with a job ID because Maestro runs asynchronously.

## Validation

```bash
npm run build
npm run lint
```

## Deployment

The production service is deployed on Render using:

```bash
npm install && npm run build
npm start
```

Configure the required environment variables in the Render service dashboard. The active Maestro solution deployment is **NotesForge AI Production**.
