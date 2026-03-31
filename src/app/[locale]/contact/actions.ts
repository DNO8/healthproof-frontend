"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_TO_EMAIL = "contacto@healthproof.cl";

export async function sendContactEmail(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const subject = (formData.get("subject") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  if (!name || !email || !subject || !message) {
    return { error: "All fields are required." };
  }

  const { error } = await resend.emails.send({
    from: "HealthProof Contact <contacto@healthproof.cl>",
    to: [CONTACT_TO_EMAIL],
    replyTo: email,
    subject: `[HealthProof Contact] ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">New Contact Message</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0;" />
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0;" />
        <p style="white-space: pre-wrap; color: #334155;">${message}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8;">Sent from HealthProof contact form</p>
      </div>
    `,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
