import nodemailer from "nodemailer";
import { config } from "../config/env";

let transporter: nodemailer.Transporter | null = null;
let etherealAccount: { user: string; pass: string } | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (config.ethereal.email === "auto" || config.ethereal.password === "auto") {
    // Auto-generate Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    etherealAccount = { user: testAccount.user, pass: testAccount.pass };
    console.log("📧 Ethereal test account created:");
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Password: ${testAccount.pass}`);
    console.log(`   Web: https://ethereal.email/login`);

    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    etherealAccount = { user: config.ethereal.email, pass: config.ethereal.password };
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: config.ethereal.email,
        pass: config.ethereal.password,
      },
    });
  }

  return transporter;
}

export function getEtherealAccount() {
  return etherealAccount;
}

export async function sendEmail(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string; previewUrl: string | false }> {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl,
  };
}
