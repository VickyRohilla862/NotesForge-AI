import express from 'express'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})
const port = Number(process.env.PORT || 8787)
const maestroUrl = process.env.MAESTRO_WEBHOOK_URL
const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.post('/api/generate-notes', upload.single('file'), async (request, response) => {
  if (!maestroUrl) {
    response.status(503).json({ error: 'Maestro is not configured. Set MAESTRO_WEBHOOK_URL on the server.' })
    return
  }

  try {
    const payload = new FormData()
    payload.append('topic', request.body.topic || '')
    payload.append('content', request.body.content || '')
    payload.append('style', request.body.style || 'Structured')
    if (request.file) {
      payload.append('file', new Blob([request.file.buffer], { type: request.file.mimetype }), request.file.originalname)
    }

    const headers = {}
    if (process.env.MAESTRO_API_KEY) headers.Authorization = `Bearer ${process.env.MAESTRO_API_KEY}`
    const maestroResponse = await fetch(maestroUrl, { method: 'POST', headers, body: payload })
    if (!maestroResponse.ok) {
      const details = await maestroResponse.text()
      response.status(502).json({ error: `Maestro rejected the request (${maestroResponse.status}). ${details.slice(0, 300)}` })
      return
    }

    const contentType = maestroResponse.headers.get('content-type') || ''
    if (contentType.includes('application/pdf')) {
      response.type('application/pdf').send(Buffer.from(await maestroResponse.arrayBuffer()))
      return
    }

    const result = await maestroResponse.json()
    if (typeof result.pdfBase64 === 'string') {
      response.type('application/pdf').send(Buffer.from(result.pdfBase64, 'base64'))
      return
    }
    if (typeof result.pdfUrl === 'string') {
      const pdfResponse = await fetch(result.pdfUrl)
      if (!pdfResponse.ok) throw new Error(`The PDF URL returned HTTP ${pdfResponse.status}.`)
      response.type('application/pdf').send(Buffer.from(await pdfResponse.arrayBuffer()))
      return
    }

    response.status(502).json({ error: 'Maestro completed without returning PDF bytes or a pdfUrl.' })
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : 'Unable to reach Maestro.' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../dist')))
  app.get('*', (_request, response) => response.sendFile(path.resolve(__dirname, '../dist/index.html')))
}

app.listen(port, () => {
  console.log(`NotesForge API listening on http://localhost:${port}`)
})
