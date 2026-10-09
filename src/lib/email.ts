import "server-only";
import { Resend } from "resend";
import { config } from "./config";

let resend: Resend | null = null;

/** Sends through Resend when configured; otherwise logs so dev flows still work. */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!config.email.resendKey) {
    console.log(`[email:dev] to=${to} subject=${subject}\n${text}`);
    return;
  }
  resend ??= new Resend(config.email.resendKey);
  const { error } = await resend.emails.send({ from: config.email.from, to, subject, text });
  if (error) console.error("[email] send failed", error);
}

export async function notifyAdmin(subject: string, text: string) {
  if (config.email.adminNotify) await sendEmail(config.email.adminNotify, subject, text);
}
