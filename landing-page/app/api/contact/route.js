import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.CONTACT_FROM || 'onboarding@resend.dev'
const TO_EMAIL = process.env.CONTACT_TO || process.env.RESEND_TO_EMAIL

export async function POST(request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert (RESEND_API_KEY fehlt)' },
        { status: 500 }
      )
    }

    const to = TO_EMAIL
    if (!to) {
      return NextResponse.json(
        { error: 'Empfänger-E-Mail nicht konfiguriert (CONTACT_TO oder RESEND_TO_EMAIL)' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const message = formData.get('message') || ''
    const email = formData.get('email') || ''

    const attachmentFiles = formData.getAll('attachments').filter(Boolean)
    const attachments = []
    for (const f of attachmentFiles) {
      const buf = Buffer.from(await f.arrayBuffer())
      attachments.push({
        filename: f.name || 'anhang',
        content: buf,
      })
    }

    const { data, error } = await resend.emails.send({
      from: `Contact <${FROM_EMAIL}>`,
      to: [to],
      replyTo: email || undefined,
      subject: `Kontakt von ${email || 'Unbekannt'}`,
      html: `
        <p><strong>Von:</strong> ${email || '—'}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${message.replace(/\n/g, '<br>') || '—'}</p>
      `,
      attachments: attachments.length ? attachments : undefined,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (err) {
    console.error('Contact API error:', err)
    return NextResponse.json(
      { error: err.message || 'Fehler beim Senden' },
      { status: 500 }
    )
  }
}
