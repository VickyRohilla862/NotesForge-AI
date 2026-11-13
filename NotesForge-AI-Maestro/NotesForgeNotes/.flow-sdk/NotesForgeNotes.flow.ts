import {
  flow,
  inlineAgent,
  onEvent,
  out,
  script,
} from "@uipath/maestro-builder-sdk";
import { HttpWebhook } from "./connectors/uipath-http-webhook.ts";

export default flow("notesforge-notes")
  .name("NotesForgeNotes")
  .version("1.0.0")
  .output({
    title: "string",
    summary: "string",
    notesMarkdown: "string",
  })
  .trigger(
    onEvent(HttpWebhook, {
      connection: "notesforgeWebhook",
      folder: "shared",
    }),
  )
  .step(
    "parseRequest",
    script({
      code: `
        const request = JSON.parse($vars.start.output.request_body || "{}");
        return {
          topic: String(request.topic || "Untitled topic"),
          content: String(request.content || ""),
          style: String(request.style || "Structured"),
        };
      `,
      returns: { topic: "string", content: "string", style: "string" },
    }),
  )
  .step(
    "generateNotes",
    inlineAgent({
      model: "gpt-5.4-mini",
      systemPrompt:
        "You are NotesForge AI. Create accurate, useful study notes from the supplied material. " +
        "Do not invent facts that are not supported by the material. " +
        "Return a result conforming to the output schema. " +
        "title: a clear title. summary: a short overview. notesMarkdown: well-structured Markdown notes with headings, key concepts, examples, and a final recap.",
      userPrompt:
        "Create {{input.style}} notes for the topic {{input.topic}} from this material:\n\n{{input.content}}",
      inputs: {
        topic: out("parseRequest", "topic"),
        content: out("parseRequest", "content"),
        style: out("parseRequest", "style"),
      },
      returns: {
        title: "string",
        summary: "string",
        notesMarkdown: "string",
      },
      temperature: 0.2,
      maxTokenPerResponse: 6000,
    }),
  )
  .return({
    title: out("generateNotes", "title"),
    summary: out("generateNotes", "summary"),
    notesMarkdown: out("generateNotes", "notesMarkdown"),
  })
  .build();
