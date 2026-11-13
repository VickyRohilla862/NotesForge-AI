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

Validation:

```bash
npm run build
npm run lint
```

## Maestro integration contract

The next integration step is a server-side endpoint or Maestro trigger that accepts:

```json
{
  "topic": "The fundamentals of machine learning",
  "content": "User-provided text",
  "file": "multipart/form-data document, when provided",
  "style": "Structured"
}
```

It should return a downloadable PDF URL (or PDF bytes) and an operation identifier. The Maestro webhook URL and authentication must be kept server-side; do not put credentials in the Vite client or commit them to GitHub.

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
