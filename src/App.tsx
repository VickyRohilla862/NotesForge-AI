import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type NoteStyle = 'Structured' | 'Concise' | 'Detailed'

const styles: NoteStyle[] = ['Structured', 'Concise', 'Detailed']

function Icon({ name }: { name: 'sparkle' | 'file' | 'upload' | 'arrow' | 'check' | 'book' }) {
  const paths = {
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Z" /><path d="M4 5.5v16M8 7h8M8 11h7" /></>,
  }

  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState('')
  const [style, setStyle] = useState<NoteStyle>('Structured')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFile(file)
      setStatus('idle')
      setErrorMessage('')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!topic.trim() && !content.trim() && !file) {
      setStatus('error')
      setErrorMessage('Add some text or choose a document before creating notes.')
      return
    }

    setStatus('generating')
    setErrorMessage('')
    const request = new FormData()
    request.append('topic', topic)
    request.append('content', content)
    request.append('style', style)
    if (file) request.append('file', file)

    try {
      const response = await fetch('/api/generate-notes', { method: 'POST', body: request })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error || `The notes service returned HTTP ${response.status}.`)
      }

      const pdf = await response.blob()
      const downloadUrl = URL.createObjectURL(pdf)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${(topic.trim() || 'notes').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}.pdf`
      link.click()
      URL.revokeObjectURL(downloadUrl)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create notes.')
    }
  }

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/" aria-label="NotesForge AI home">
          <span className="brand-mark"><Icon name="sparkle" /></span>
          <span>NotesForge <em>AI</em></span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
          <a className="github-link" href="https://github.com/VickyRohilla862/NotesForge-AI" target="_blank" rel="noreferrer">GitHub <Icon name="arrow" /></a>
        </div>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><span className="eyebrow-dot" /> Intelligent note-making, beautifully simple</div>
        <h1>Turn information into<br /><span>understanding.</span></h1>
        <p className="hero-copy">Upload a document or paste your text. NotesForge AI distills it into clear, organized notes you can actually use.</p>
        <a className="text-link" href="#create">Start creating <Icon name="arrow" /></a>
      </section>

      <section className="workspace shell" id="create">
        <div className="section-heading">
          <div>
            <p className="section-kicker">The workspace</p>
            <h2>What would you like to understand?</h2>
          </div>
          <span className="powered"><Icon name="sparkle" /> Powered by Maestro</span>
        </div>

        <form className="forge-card" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="topic">Topic or title <span>Optional</span></label>
          <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. The fundamentals of machine learning" />

          <label className="field-label content-label" htmlFor="content">Your content <span>Paste text or upload a file</span></label>
          <textarea id="content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste an article, lecture notes, research, or anything you want to understand better..." />

          <input ref={fileInput} className="visually-hidden" type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={handleFile} />
          <button className="upload-zone" type="button" onClick={() => fileInput.current?.click()}>
            <span className="upload-icon"><Icon name="upload" /></span>
            <span><strong>{file?.name || 'Drop a file here or browse'}</strong><small>{file ? 'Ready to include in your notes' : 'PDF, DOCX, TXT, or Markdown · up to 10 MB'}</small></span>
            <Icon name="file" />
          </button>

          <div className="form-footer">
            <div className="style-control">
              <span className="field-label">Note style</span>
              <div className="style-options">
                {styles.map((option) => <button className={style === option ? 'style-option active' : 'style-option'} type="button" key={option} onClick={() => setStyle(option)}>{option}{option === 'Structured' && <Icon name="check" />}</button>)}
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={status === 'generating'}>{status === 'generating' ? 'Creating notes…' : 'Create my notes'} {status !== 'generating' && <Icon name="arrow" />}</button>
          </div>
          {status === 'error' && <p className="form-message error">{errorMessage}</p>}
          {status === 'success' && <p className="form-message success">Your PDF is ready and downloading.</p>}
        </form>
      </section>

      <section className="how shell" id="how-it-works">
        <div className="section-heading centered">
          <p className="section-kicker">A clearer way to learn</p>
          <h2>From input to insight, in three steps.</h2>
        </div>
        <div className="steps">
          <article><span className="step-number">01</span><div className="step-icon"><Icon name="upload" /></div><h3>Bring your material</h3><p>Share a document or paste the text you want to work with.</p></article>
          <article><span className="step-number">02</span><div className="step-icon"><Icon name="sparkle" /></div><h3>Let AI find the signal</h3><p>Maestro analyzes the content and organizes what matters most.</p></article>
          <article><span className="step-number">03</span><div className="step-icon"><Icon name="book" /></div><h3>Take your notes with you</h3><p>Receive a polished, downloadable PDF made for revisiting.</p></article>
        </div>
      </section>

      <footer className="footer shell" id="about">
        <div className="brand"><span className="brand-mark"><Icon name="sparkle" /></span><span>NotesForge <em>AI</em></span></div>
        <p>Make knowledge yours.</p>
      </footer>
    </main>
  )
}

export default App
