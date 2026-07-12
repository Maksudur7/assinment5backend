import { Resend } from "resend";
import { env } from "../config/env";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(env.resendApiKey || "re_placeholder");
  }
  return resend;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!env.resendApiKey) {
    // In development without a key, just log
    console.info(`[EMAIL] To: ${to} | Subject: ${subject}`);
    console.info(`[EMAIL] (Set RESEND_API_KEY in .env to send real emails)`);
    return;
  }
  await getResend().emails.send({ from: env.emailFrom, to, subject, html });
}

// ── Email Templates ─────────────────────────────────────────────────────────

export function verificationEmailTemplate(url: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px 20px;text-align:center;">
    <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:12px;padding:36px;">
      <div style="background:#e50914;display:inline-block;padding:8px 20px;border-radius:6px;margin-bottom:24px;">
        <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:2px;">NGV</span>
      </div>
      <h1 style="font-size:22px;margin:0 0 8px;">Verify your email</h1>
      <p style="color:#a1a1aa;margin:0 0 28px;">Click the button below to verify your NGV account. This link expires in 24 hours.</p>
      <a href="${url}" style="background:#e50914;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
        Verify My Email
      </a>
      <p style="color:#52525b;font-size:12px;margin-top:28px;">If you didn't create an NGV account, you can safely ignore this email.</p>
    </div>
  </body>
  </html>`;
}

export function passwordResetEmailTemplate(url: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px 20px;text-align:center;">
    <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:12px;padding:36px;">
      <div style="background:#e50914;display:inline-block;padding:8px 20px;border-radius:6px;margin-bottom:24px;">
        <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:2px;">NGV</span>
      </div>
      <h1 style="font-size:22px;margin:0 0 8px;">Reset your password</h1>
      <p style="color:#a1a1aa;margin:0 0 28px;">You requested a password reset. This link expires in 30 minutes.</p>
      <a href="${url}" style="background:#e50914;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
        Reset Password
      </a>
      <p style="color:#52525b;font-size:12px;margin-top:28px;">If you didn't request this, you can safely ignore this email. Your password will not change.</p>
    </div>
  </body>
  </html>`;
}

export function welcomeEmailTemplate(name: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:sans-serif;background:#0a0a0a;color:#fff;padding:40px 20px;text-align:center;">
    <div style="max-width:480px;margin:0 auto;background:#18181b;border-radius:12px;padding:36px;">
      <div style="background:#e50914;display:inline-block;padding:8px 20px;border-radius:6px;margin-bottom:24px;">
        <span style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:2px;">NGV</span>
      </div>
      <h1 style="font-size:22px;margin:0 0 8px;">Welcome to NGV, ${name}! 🎬</h1>
      <p style="color:#a1a1aa;margin:0 0 28px;">
        You now have access to Bangladesh's cleanest, safest streaming platform.<br/>
        100% free. No subscription. Ever.
      </p>
      <a href="${env.frontendAppUrl}" style="background:#e50914;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
        Start Watching
      </a>
    </div>
  </body>
  </html>`;
}
