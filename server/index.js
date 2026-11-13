import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import PDFDocument from 'pdfkit'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})
const port = Number(process.env.PORT || 8787)
const maestroUrl = process.env.MAESTRO_WEBHOOK_URL
const publicApiUrl = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const jobs = new Map()

app.use(express.json({ limit: '1mb' }))

function createPdf({ title, summary, notesMarkdown }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 56 })
    const chunks = []
    document.on('data', (chunk) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
    document.fontSize(22).text(title || 'NotesForge AI Notes')
    document.moveDown(0.6)
    if (summary) {
      document.fontSize(11).text(summary)
      document.moveDown(0.8)
    }
    document.fontSize(11).text(String(notesMarkdown || '').replace(/^#+\s?/gm, ''))
    document.end()
  })
}

async function extractFileContent(file) {
  if (!file) return ''
  if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
    return file.buffer.toString('utf8')
  }
  if (file.mimetype === 'application/pdf') {
    const parser = new PDFParse({ data: file.buffer })
    try {
      return (await parser.getText()).text
    } finally {
      await parser.destroy()
    }
  }
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return (await mammoth.extractRawText({ buffer: file.buffer })).value
  }
  throw new Error('Unsupported document type. Use PDF, DOCX, TXT, or Markdown.')
}

app.post('/api/generate-notes', upload.single('file'), async (request, response) => {
  if (!maestroUrl) {
    response.status(503).json({ error: 'Maestro is not configured. Set MAESTRO_WEBHOOK_URL on the server.' })
    return
  }

  try {
    const jobId = crypto.randomUUID()
    const callbackToken = crypto.randomBytes(24).toString('hex')
    const extractedContent = await extractFileContent(request.file)
    const content = request.body.content || extractedContent
    jobs.set(jobId, { callbackToken, status: 'processing', createdAt: Date.now() })

    const payload = {
      topic: request.body.topic || '',
      content,
      style: request.body.style || 'Structured',
      jobId,
      callbackUrl: `${publicApiUrl}/api/maestro/callback`,
      callbackToken,
    }

    const headers = {}
    if (process.env.MAESTRO_WEBHOOK_SECRET) {
      headers[process.env.MAESTRO_WEBHOOK_HEADER || 'X-NotesForge-Key'] = process.env.MAESTRO_WEBHOOK_SECRET
    }
    headers['content-type'] = 'application/json'
    const maestroResponse = await fetch(maestroUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
    if (!maestroResponse.ok) {
      const details = await maestroResponse.text()
      jobs.delete(jobId)
      response.status(502).json({ error: `Maestro rejected the request (${maestroResponse.status}). ${details.slice(0, 300)}` })
      return
    }

    response.status(202).json({ jobId, statusUrl: `/api/jobs/${jobId}` })
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : 'Unable to reach Maestro.' })
  }
})

app.post('/api/maestro/callback', async (request, response) => {
  const { jobId, callbackToken, title, summary, notesMarkdown } = request.body || {}
  const job = jobs.get(jobId)
  if (!job || job.callbackToken !== callbackToken) {
    response.status(401).json({ error: 'Invalid callback.' })
    return
  }

  try {
    job.pdf = await createPdf({ title, summary, notesMarkdown })
    job.status = 'complete'
    response.status(204).end()
  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unable to create the PDF.'
    response.status(500).json({ error: job.error })
  }
})

app.get('/api/jobs/:jobId', (request, response) => {
  const job = jobs.get(request.params.jobId)
  if (!job) {
    response.status(404).json({ error: 'Notes job not found or expired.' })
    return
  }
  if (job.status === 'failed') {
    response.status(500).json({ error: job.error })
    return
  }
  if (job.status !== 'complete') {
    response.status(202).json({ status: job.status })
    return
  }
  response.json({ status: 'complete', downloadUrl: `/api/jobs/${request.params.jobId}/pdf` })
})

app.get('/api/jobs/:jobId/pdf', (request, response) => {
  const job = jobs.get(request.params.jobId)
  if (!job || job.status !== 'complete') {
    response.status(404).json({ error: 'The PDF is not ready.' })
    return
  }
  response.type('application/pdf').send(job.pdf)
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../dist')))
  app.use((_request, response) => response.sendFile(path.resolve(__dirname, '../dist/index.html')))
}

app.listen(port, () => {
  console.log(`NotesForge API listening on http://localhost:${port}`)
})
