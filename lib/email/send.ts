import { sendBrevoEmail } from '@/lib/email/brevo';
import { documentShareEmailContent, householdInviteEmailContent } from '@/lib/email/templates';

export async function sendHouseholdInviteEmail(input: {
  to: string;
  householdName: string;
  inviterName: string;
  acceptUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const content = householdInviteEmailContent(input);
  return sendBrevoEmail({
    to: input.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}

export async function sendDocumentShareEmail(input: {
  to: string;
  recipientName?: string;
  senderName: string;
  documentLabel: string;
  shareUrl: string;
  expiresAt: string;
}): Promise<{ sent: boolean; error?: string }> {
  const content = documentShareEmailContent(input);
  return sendBrevoEmail({
    to: input.to,
    toName: input.recipientName,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
