type SendEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
};

function parseFromAddress(from: string): { email: string; name?: string } {
  const trimmed = from.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, '').trim(), email: match[2].trim() };
  }
  return { email: trimmed };
}

export async function sendBrevoEmail(
  input: SendEmailInput
): Promise<{ sent: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromRaw = process.env.EMAIL_FROM;

  if (!apiKey) {
    console.warn('BREVO_API_KEY not set; skipping email');
    return { sent: false, error: 'Email not configured' };
  }
  // Brevo SMTP keys (xsmtpsib-…) authenticate SMTP only; REST needs an API key (xkeysib-…).
  if (apiKey.startsWith('xsmtpsib')) {
    console.warn('BREVO_API_KEY is an SMTP key; use an API key from SMTP & API → API keys');
    return {
      sent: false,
      error: 'BREVO_API_KEY is an SMTP key; use a Brevo API key (starts with xkeysib-)',
    };
  }
  if (!fromRaw) {
    console.warn('EMAIL_FROM not set; skipping email');
    return { sent: false, error: 'Email sender not configured' };
  }

  const sender = parseFromAddress(fromRaw);
  if (!sender.email.includes('@')) {
    return { sent: false, error: 'Invalid EMAIL_FROM' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to, ...(input.toName ? { name: input.toName } : {}) }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      messageId?: string;
      message?: string;
      code?: string;
    };

    if (!response.ok) {
      return {
        sent: false,
        error: data.message || `Brevo error ${response.status}`,
      };
    }

    return { sent: true, messageId: data.messageId };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}
