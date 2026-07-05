import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.mailEnabled || !env.smtp.host) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user
        ? { user: env.smtp.user, pass: env.smtp.pass }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMail(input: SendMailInput): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    console.log('[mail:dev]', {
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  await transport.sendMail({
    from: env.smtp.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html ?? input.text.replace(/\n/g, '<br>'),
    attachments: input.attachments,
  });
}

export async function notifyPlatformNewTicket(input: {
  ticketNumber: number;
  companyName: string;
  subject: string;
  contactEmail: string;
  priority: string;
}): Promise<void> {
  await sendMail({
    to: env.platformNotifyEmail,
    subject: `[Ticket #${input.ticketNumber}] ${input.companyName} — ${input.subject}`,
    text: [
      `Nuovo ticket di assistenza`,
      ``,
      `Azienda: ${input.companyName}`,
      `Oggetto: ${input.subject}`,
      `Priorità: ${input.priority}`,
      `Contatto: ${input.contactEmail}`,
      ``,
      `Apri inbox: ${env.appUrl}/admin/tickets`,
    ].join('\n'),
  });
}

export async function notifyClientTicketReply(input: {
  to: string;
  ticketNumber: number;
  subject: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `Risposta al ticket #${input.ticketNumber}: ${input.subject}`,
    text: [
      `Il team di assistenza ha risposto al tuo ticket #${input.ticketNumber}.`,
      ``,
      `Oggetto: ${input.subject}`,
      ``,
      `Visualizza: ${env.appUrl}/tickets`,
    ].join('\n'),
  });
}

export async function sendInvitationEmail(input: {
  to: string;
  tenantName: string;
  inviteUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: `Invito a Gestionale — ${input.tenantName}`,
    text: [
      `Sei stato invitato a unirti a ${input.tenantName} su Gestionale.`,
      ``,
      `Accetta l'invito: ${input.inviteUrl}`,
      ``,
      `Il link scade tra 7 giorni.`,
    ].join('\n'),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: 'Reimposta password — Gestionale',
    text: [
      `Hai richiesto il reset della password.`,
      ``,
      `Reimposta la password: ${input.resetUrl}`,
      ``,
      `Il link scade tra 1 ora. Se non hai richiesto tu il reset, ignora questa email.`,
    ].join('\n'),
  });
}

export async function sendDocumentEmail(input: {
  to: string;
  subject: string;
  text: string;
  attachment: { filename: string; content: Buffer };
}): Promise<void> {
  await sendMail({
    to: input.to,
    subject: input.subject,
    text: input.text,
    attachments: [input.attachment],
  });
}
