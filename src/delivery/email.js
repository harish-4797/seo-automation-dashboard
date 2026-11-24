const { USE_MOCKS } = require('../mocks');
const emailMock = require('../mocks/email.mock');
const { fetchWithTimeout } = require('../lib/http');

async function sendEmail(client, pdfUrl, score) {
  const subject = `Your SEO audit for ${client.websiteUrl} — ${score}/100`;
  if (USE_MOCKS) return emailMock.sendEmail(client.email, subject, pdfUrl, score);

  // Real email via Resend's HTTP API
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  if (!client.email) throw new Error('Client has no email');
  const { res } = await fetchWithTimeout('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: client.email,
      subject,
      html: `<p>Hi ${client.name},</p><p>Your SEO audit is ready. Overall score: <b>${score}/100</b>.</p><p><a href="${pdfUrl}">Download the PDF report</a></p>`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message}`);
  return { status: 'sent', id: data.id };
}

module.exports = { sendEmail };
