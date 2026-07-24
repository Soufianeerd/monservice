export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html?: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}): Promise<boolean> {
  // Simuler une latence réseau
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`[Email Simulation] Envoi d'un email à ${to}`);
  console.log(`[Email Simulation] Sujet : ${subject}`);
  if (attachments && attachments.length > 0) {
    console.log(`[Email Simulation] Pièces jointes : ${attachments.map(a => a.filename).join(', ')}`);
  }
  
  return true;
}
