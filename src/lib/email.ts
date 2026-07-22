import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "../config/env";

let resendClient: Resend | null = null;
let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (!env.smtpUser || !env.smtpPass) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return smtpTransporter;
}

function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  // Strip HTML tags for clean plain-text fallback if text is not provided
  const plainText = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // 1. First priority: Nodemailer SMTP (e.g., Gmail App Password - delivers 100% FREE to ANY inbox worldwide)
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      const fromAddr = env.smtpUser || env.emailFrom;
      const info = await transporter.sendMail({
        from: `"NGV Streaming" <${fromAddr}>`,
        to,
        subject,
        text: plainText,
        html,
      });
      console.info(`[SMTP EMAIL SUCCESS] Sent to ${to} (MessageID: ${info.messageId})`);
      return;
    } catch (err: any) {
      console.error(`[SMTP EMAIL ERROR] Failed for ${to}:`, err?.message || err);
      // Fall through to Resend fallback
    }
  }

  // 2. Second priority: Resend API
  const client = getResend();
  let sender = env.emailFrom || "NGV <onboarding@resend.dev>";
  if (
    sender.includes("yourdomain.com") ||
    sender.includes("ngv.local") ||
    !sender.includes("@")
  ) {
    sender = "NGV <onboarding@resend.dev>";
  }

  if (!client) {
    console.info(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
    console.info(`[EMAIL LOG] (Configure SMTP_USER/SMTP_PASS or RESEND_API_KEY in .env to dispatch live emails)`);
    return;
  }

  try {
    const response = await client.emails.send({ from: sender, to, subject, html });
    if (response.error) {
      console.warn(`[EMAIL WARNING] Resend error for ${to}:`, response.error);
      if (
        response.error.message?.includes("domain") ||
        response.error.message?.includes("from")
      ) {
        console.info(`[EMAIL RETRY] Attempting retry with onboarding@resend.dev...`);
        await client.emails.send({
          from: "NGV <onboarding@resend.dev>",
          to,
          subject,
          html,
        }).catch((retryErr) => {
          console.error(`[EMAIL RETRY ERROR]`, retryErr?.message || retryErr);
        });
      }
    } else {
      console.info(`[EMAIL SUCCESS] Sent to ${to} (ID: ${response.data?.id})`);
    }
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, err?.message || err);
  }
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
