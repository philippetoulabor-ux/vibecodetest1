'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { logoConfig } from '@/lib/landing-config'

const LogoViewer = dynamic(
  () => import('@/components/LogoViewer'),
  { ssr: false, loading: () => <div className="logo-placeholder" /> }
)

const ACCEPT_MEDIA = 'image/*,video/*'

export default function ContactPage() {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)
  const textareaRef = useRef(null)

  const autoResizeTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.max(120, ta.scrollHeight) + 'px'
  }

  useEffect(() => {
    autoResizeTextarea()
  }, [message])

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selected])
  }

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('email', email)
      files.forEach((f) => formData.append('attachments', f))

      const res = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden')
      setStatus('success')
      setMessage('')
      setEmail('')
      setFiles([])
    } catch (err) {
      setStatus('error')
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-contact">
      <header>
        <LogoViewer config={{ ...logoConfig, href: '/', followMouse: true }} />
      </header>
      <main className="contact-main">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field contact-message-wrap">
            <textarea
              ref={textareaRef}
              className="contact-textarea"
              placeholder="text me :)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
            <div className="contact-attach-row">
              <label className="contact-attach-label">
                <input
                  type="file"
                  accept={ACCEPT_MEDIA}
                  multiple
                  onChange={handleFileChange}
                  className="contact-file-input"
                />
                + Bilder / Videos
              </label>
            </div>
            {files.length > 0 && (
              <div className="contact-file-list">
                {files.map((f, i) => (
                  <span key={i} className="contact-file-tag">
                    {f.name}
                    <button
                      type="button"
                      className="contact-file-remove"
                      onClick={() => removeFile(i)}
                      aria-label="Entfernen"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <input
            type="email"
            className="contact-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="contact-send"
            disabled={sending}
          >
            {sending ? '…' : 'SEND'}
          </button>
          {status === 'success' && (
            <p className="contact-status contact-status-success">
              Nachricht wurde gesendet.
            </p>
          )}
          {status === 'error' && (
            <p className="contact-status contact-status-error">
              Fehler beim Senden. Bitte versuchen Sie es erneut.
            </p>
          )}
        </form>
      </main>
    </div>
  )
}
