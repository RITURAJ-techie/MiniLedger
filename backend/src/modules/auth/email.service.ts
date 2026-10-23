
const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "MiniLedger";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo email configuration is missing.");
  }

  return { apiKey, senderEmail, senderName };
}

export async function sendEmailOtp(
  recipientEmail: string,
  otp: string,
): Promise<void> {
  const { apiKey, senderEmail, senderName } = getBrevoConfig();

  const response = await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: recipientEmail }],
      subject: "Your MiniLedger verification code",
      textContent:
        `Your MiniLedger verification code is ${otp}. ` +
        "It expires in 5 minutes. If you did not request this code, ignore this email.",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#222">
          <h2>Verify your email</h2>
          <p>Use the verification code below to continue registering for MiniLedger.</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">
            ${otp}
          </div>
          <p>This code expires in 5 minutes.</p>
          <p>If you did not request this code, you can safely ignore this email.</p>
        </div>
      `,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Don't log API keys, OTPs, or recipient details.
    const status = response.status;
    await response.body?.cancel();
    throw new Error(`Brevo email delivery request failed (${status}).`);
  }
}
