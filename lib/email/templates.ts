import { appBaseUrl } from '@/lib/site';

const BRAND = {
  primary: '#EF8354',
  primaryDark: '#D96C3D',
  ink: '#2D3142',
  muted: '#4F5D75',
  soft: '#F4F4F5',
  border: '#BFC0C0',
  white: '#ffffff',
  footer: '#4F5D75',
};

export { appBaseUrl };

export function logoUrl(): string {
  return `${appBaseUrl()}/logo.png`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Shared HTML shell for all SanoVault system emails. */
export function renderSystemEmail(input: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerNote?: string;
}): string {
  const logo = logoUrl();
  const preheader = escapeHtml(input.preheader);
  const title = escapeHtml(input.title);
  const cta = input.cta
    ? `
      <tr>
        <td style="padding: 8px 0 28px;">
          <a href="${escapeHtml(input.cta.url)}"
             style="display:inline-block;background:${BRAND.primary};color:${BRAND.white};text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;padding:14px 28px;border-radius:10px;">
            ${escapeHtml(input.cta.label)}
          </a>
        </td>
      </tr>`
    : '';
  const footerNote = input.footerNote
    ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND.footer};">${escapeHtml(input.footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${BRAND.white};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.soft} 0%, #eef2ff 100%);padding:28px 32px 20px;border-bottom:1px solid ${BRAND.border};">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${logo}" width="48" height="48" alt="SanoVault" style="display:block;border-radius:999px;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.02em;">
                      SanoVault
                    </div>
                    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted};margin-top:2px;">
                      One vault for your family's health
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">
                ${title}
              </h1>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.muted};">
                ${input.bodyHtml}
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:8px;">
                ${cta}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;">
              ${footerNote}
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.footer};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Sent by SanoVault · <a href="${appBaseUrl()}" style="color:${BRAND.primary};text-decoration:none;">${appBaseUrl().replace(/^https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function householdInviteEmailContent(input: {
  householdName: string;
  inviterName: string;
  acceptUrl: string;
}): { subject: string; html: string; text: string } {
  const householdName = escapeHtml(input.householdName);
  const inviterName = escapeHtml(input.inviterName);
  const subject = `You're invited to join ${input.householdName} on SanoVault`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">
      <strong style="color:${BRAND.ink};">${inviterName}</strong> invited you to join
      <strong style="color:${BRAND.ink};">${householdName}</strong> on SanoVault.
    </p>
    <p style="margin:0 0 14px;">
      Once you accept, you'll be able to view and manage shared health records for everyone in that household.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 6px;background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.primary};">
            Household invite
          </p>
          <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.ink};">
            ${householdName}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:13px;color:${BRAND.footer};">
      Button not working? Paste this link into your browser:<br />
      <a href="${escapeHtml(input.acceptUrl)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(input.acceptUrl)}</a>
    </p>
  `;

  const html = renderSystemEmail({
    preheader: `${input.inviterName} invited you to join ${input.householdName} on SanoVault.`,
    title: 'Join your household vault',
    bodyHtml,
    cta: { label: 'Accept invitation', url: input.acceptUrl },
    footerNote: "If you weren't expecting this invite, you can safely ignore this email.",
  });

  const text = [
    `${input.inviterName} invited you to join ${input.householdName} on SanoVault.`,
    '',
    "Once you accept, you'll be able to view and manage shared health records for that household.",
    '',
    `Accept invitation: ${input.acceptUrl}`,
    '',
    "If you weren't expecting this invite, you can ignore this email.",
  ].join('\n');

  return { subject, html, text };
}

export function documentShareEmailContent(input: {
  senderName: string;
  documentLabel: string;
  shareUrl: string;
  expiresAt: string;
  recipientName?: string;
}): { subject: string; html: string; text: string } {
  const documentLabel = escapeHtml(input.documentLabel);
  const senderName = escapeHtml(input.senderName);
  const greeting = input.recipientName ? `Hi ${escapeHtml(input.recipientName)},` : 'Hello,';
  const expiry = new Date(input.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const subject = `${input.senderName} shared a health record with you`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">${greeting}</p>
    <p style="margin:0 0 14px;">
      <strong style="color:${BRAND.ink};">${senderName}</strong> shared a health record with you on SanoVault.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 6px;background:${BRAND.soft};border:1px solid ${BRAND.border};border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.primary};">
            Shared record
          </p>
          <p style="margin:0;font-size:16px;font-weight:600;color:${BRAND.ink};">
            ${documentLabel}
          </p>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.muted};">
            Link expires ${escapeHtml(expiry)}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:18px 0 0;font-size:13px;color:${BRAND.footer};">
      Button not working? Paste this link into your browser:<br />
      <a href="${escapeHtml(input.shareUrl)}" style="color:${BRAND.primary};word-break:break-all;">${escapeHtml(input.shareUrl)}</a>
    </p>
  `;

  const html = renderSystemEmail({
    preheader: `${input.senderName} shared ${input.documentLabel} with you.`,
    title: 'View shared health record',
    bodyHtml,
    cta: { label: 'Open record', url: input.shareUrl },
    footerNote: 'This link is private. Do not forward unless the sender intended you to share it.',
  });

  const text = [
    greeting,
    '',
    `${input.senderName} shared a health record with you on SanoVault: ${input.documentLabel}.`,
    `Link expires ${expiry}.`,
    '',
    `Open record: ${input.shareUrl}`,
  ].join('\n');

  return { subject, html, text };
}
