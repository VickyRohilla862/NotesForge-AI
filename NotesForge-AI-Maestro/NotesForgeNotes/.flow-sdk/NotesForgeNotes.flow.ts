import {
  flow,
  http,
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
          jobId: String(request.jobId || ""),
          callbackUrl: String(request.callbackUrl || ""),
          callbackToken: String(request.callbackToken || ""),
        };
      `,
      returns: {
        topic: "string",
        content: "string",
        style: "string",
        jobId: "string",
        callbackUrl: "string",
        callbackToken: "string",
      },
    }),
  )
  .step(
    "generateNotes",
    inlineAgent({
      model: "gpt-4o-mini",
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
  .step(
    "buildCallback",
    script({
      code: `
        return {
          callbackUrl: $vars.parseRequest.output.callbackUrl,
          body: JSON.stringify({
            jobId: $vars.parseRequest.output.jobId,
            callbackToken: $vars.parseRequest.output.callbackToken,
            title: $vars.generateNotes.output.title,
            summary: $vars.generateNotes.output.summary,
            notesMarkdown: $vars.generateNotes.output.notesMarkdown,
          }),
        };
      `,
      returns: { callbackUrl: "string", body: "string" },
    }),
  )
  .step(
    "notifyWebsite",
    http({
      method: "POST",
      url: out("buildCallback", "callbackUrl"),
      body: out("buildCallback", "body"),
      contentType: "application/json",
      managed: true,
    }),
  )
  .return({
    title: out("generateNotes", "title"),
    summary: out("generateNotes", "summary"),
    notesMarkdown: out("generateNotes", "notesMarkdown"),
  })
  .build();
