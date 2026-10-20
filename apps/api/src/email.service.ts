import { Injectable } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends email through Resend. Without RESEND_API_KEY it only logs, which is how local development and the
 * period before the church has a verified domain work: the Admin copies the link instead (ADR 0004).
 */
@Injectable()
export class EmailService {
  async send(message: EmailMessage): Promise<void> {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.log(`[email not sent: RESEND_API_KEY is not set] to ${message.to}: ${message.subject}\n${message.text}`);
      return;
    }
    // A failed email must not fail the request that triggered it, or reset requests would reveal who is registered.
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'Chords <onboarding@resend.dev>',
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      });
      if (!res.ok) console.error(`Resend refused an email to ${message.to}: ${res.status} ${await res.text()}`);
    } catch (error) {
      console.error(`Could not send an email to ${message.to}`, error);
    }
  }
}
