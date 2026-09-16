export function documentShareMessage(senderName: string, documentLabel: string, shareUrl: string) {
  return `${senderName} shared a health record with you on SanoVault: ${documentLabel}. View it here (link expires in 7 days): ${shareUrl}`;
}

export function whatsappShareHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function familyReentryMessage(origin: string) {
  return `Open SanoVault on this phone: ${origin.replace(/\/$/, '')}/auth/signin`;
}

export function familyInviteMessage(inviterName: string, acceptUrl: string) {
  return `${inviterName} invited you to the family health folder on SanoVault. Tap to join with Google: ${acceptUrl}`;
}
