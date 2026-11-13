# NotesForge AI

NotesForge AI is a web workspace for turning user-provided text or documents into organized, downloadable study notes. The UI is designed to hand the request to a UiPath Maestro workflow, which performs analysis and returns a generated PDF.

## Current MVP

- Responsive NotesForge AI landing page and note-creation workspace
- Topic, text, note-style, and document-upload inputs
- Clear request states and validation before a workflow call
- GitHub link and product positioning for the public project

## Local development

```bash
npm install
npm run dev
```

Run the API in a second terminal:

```bash
cp .env.example .env
# Set MAESTRO_WEBHOOK_URL in .env
npm run dev:api
```

Validation:

```bash
npm run build
npm run lint
```

## Maestro integration contract

The server endpoint now accepts the request and forwards it to the configured Maestro trigger:

```json
{
  "topic": "The fundamentals of machine learning",
  "content": "User-provided text",
  "file": "multipart/form-data document, when provided",
  "style": "Structured"
}
```

Maestro must return either PDF bytes (`application/pdf`) or JSON containing `pdfBase64` or `pdfUrl`. The website downloads the resulting PDF automatically. The Maestro webhook URL and authentication must be kept server-side; do not put credentials in the Vite client or commit them to GitHub.

## Product flow

1. The user pastes text or selects a supported document.
2. The website sends the request to a protected backend endpoint.
3. UiPath Maestro coordinates extraction, analysis, note formatting, and PDF generation.
4. The website presents the resulting PDF as a download.

## Stack

- React
- TypeScript
- Vite
- UiPath Maestro for orchestration
