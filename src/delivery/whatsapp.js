const { USE_MOCKS } = require('../mocks');
const twilioMock = require('../mocks/twilio.mock');
const { fetchWithTimeout } = require('../lib/http');

async function sendWhatsApp(client, pdfUrl, score) {
  if (USE_MOCKS) return twilioMock.sendWhatsApp(client.id, pdfUrl, score);

  // Real Twilio WhatsApp (production needs an approved template for business-initiated messages)
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_WHATSAPP_FROM: from } = process.env;
  if (!sid || !token) throw new Error('Twilio credentials not set');
  if (!client.whatsapp) throw new Error('Client has no WhatsApp number');

  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:${client.whatsapp}`,
    Body: `Hi ${client.name}, your monthly SEO audit is ready. Score: ${score}/100. Full report: ${pdfUrl}`,
  });
  const { res } = await fetchWithTimeout(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message}`);
  return { status: 'sent', sid: data.sid };
}

module.exports = { sendWhatsApp };
