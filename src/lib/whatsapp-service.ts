/**
 * WhatsApp notifications via Twilio.
 *
 * Required in .env:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM            e.g. whatsapp:+14155238886 (sandbox)
 *
 * Optional approved Content Template SIDs (HX...). When one is unset, the
 * message is sent as free-form text, which works in the Twilio sandbox and
 * inside WhatsApp's 24-hour reply window.
 *
 *   TWILIO_TEMPLATE_USER_CREDENTIALS         {{1}} name, {{2}} login link, {{3}} username (email), {{4}} temporary password, {{5}} support phone
 *
 *   TWILIO_TEMPLATE_SERVICE_CREATED          {{1}} customer, {{2}} ticket id
 *   TWILIO_TEMPLATE_INSTALLATION_CREATED     {{1}} customer, {{2}} ticket id
 *   TWILIO_TEMPLATE_PROJECT_CREATED          {{1}} customer, {{2}} ticket id
 *
 *   TWILIO_TEMPLATE_SERVICE_TECHNICIAN       {{1}} technician, {{2}} ticket id, {{3}} customer, {{4}} phone, {{5}} address, {{6}} issue, {{7}} link
 *   TWILIO_TEMPLATE_SERVICE_CUSTOMER         {{1}} customer, {{2}} technician(s), {{3}} ticket id
 *   TWILIO_TEMPLATE_INSTALLATION_TECHNICIAN  {{1}} technician, {{2}} ticket id, {{3}} customer, {{4}} contact, {{5}} address, {{6}} details, {{7}} link
 *   TWILIO_TEMPLATE_INSTALLATION_CUSTOMER    {{1}} customer, {{2}} ticket id, {{3}} technician(s), {{4}} address
 *   TWILIO_TEMPLATE_PROJECT_TECHNICIAN       {{1}} technician, {{2}} ticket id, {{3}} company, {{4}} customer, {{5}} mobile, {{6}} location, {{7}} link
 *   TWILIO_TEMPLATE_PROJECT_CUSTOMER         {{1}} customer, {{2}} ticket id, {{3}} company, {{4}} technician(s)
 */

type TicketType = "SERVICE" | "INSTALLATION" | "PROJECT";

const TICKET_PATHS: Record<TicketType, string> = {
  SERVICE: "/service-tickets/service-management",
  INSTALLATION: "/service-tickets/installation-management",
  PROJECT: "/service-tickets/project-management",
};

const TICKET_LABELS: Record<TicketType, string> = {
  SERVICE: "service request",
  INSTALLATION: "installation",
  PROJECT: "project",
};

function templateSid(name: string): string | undefined {
  return process.env[`TWILIO_TEMPLATE_${name}`] || undefined;
}

/** Support number shown in messages: the WhatsApp sender number. */
function supportPhone(): string {
  return (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "");
}

/** WhatsApp rejects empty template variables and newlines. */
function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim() || "-";
}

type SendResult = { success: boolean; messageId?: string; error?: string };

/**
 * Send a WhatsApp message through the Twilio Messages API.
 * Uses the content template when `contentSid` is given, else the plain body.
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  body: string,
  contentSid?: string,
  variables?: string[],
): Promise<SendResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (process.env.TWILIO_WHATSAPP_ENABLED === "false") {
      return { success: false, error: "WhatsApp notifications are disabled" };
    }

    if (!accountSid || !authToken || !from) {
      return {
        success: false,
        error:
          "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM in .env",
      };
    }

    // Stored numbers are 10-digit Indian mobiles; add the country code.
    let digits = phoneNumber.replace(/\D/g, "");
    if (digits.length === 10) digits = `91${digits}`;

    const params = new URLSearchParams({
      To: `whatsapp:+${digits}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    });

    if (contentSid && variables) {
      params.set("ContentSid", contentSid);
      params.set(
        "ContentVariables",
        JSON.stringify(
          Object.fromEntries(variables.map((v, i) => [String(i + 1), v])),
        ),
      );
    } else {
      params.set("Body", body);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: params,
      },
    );

    const data = (await response.json()) as { sid?: string; message?: string };

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to send WhatsApp message",
      };
    }

    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error("WhatsApp service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Tell the ticket owner (customer) their ticket was created.
 */
async function notifyTicketCreated(
  ticketType: TicketType,
  phoneNumber: string,
  customerName: string,
  ticketId: string,
): Promise<SendResult> {
  return sendWhatsAppMessage(
    phoneNumber,
    `Hello ${customerName}, your ${TICKET_LABELS[ticketType]} ${ticketId} has been created. Soon the technician will reach out to you.`,
    templateSid(`${ticketType}_CREATED`),
    [clean(customerName), clean(ticketId)],
  );
}

/**
 * WhatsApp is best-effort: a failed message must never fail the ticket.
 */
async function sendWhatsAppSafely(
  phone: string | null | undefined,
  send: () => Promise<SendResult>,
): Promise<void> {
  if (!phone?.trim()) return;
  try {
    const result = await send();
    if (!result.success) {
      console.warn(`WhatsApp to ${phone} not sent: ${result.error}`);
    }
  } catch (error) {
    console.error(`WhatsApp to ${phone} failed:`, error);
  }
}

type AssignedParams = {
  ticketType: TicketType;
  ticketId: string;
  owner: { name: string; phone: string | null | undefined };
  /** Service/installation address, or the project location. */
  address: string;
  /** Service issue title, installation details or project description. */
  details: string;
  /** Project only. */
  company?: string;
  technicians: { name: string; phone: string | null }[];
};

/**
 * Notify the ticket owner and each newly assigned technician, using the
 * per-tab templates.
 */
async function notifyTicketAssigned(params: AssignedParams): Promise<void> {
  const { ticketType, ticketId, owner, address, details, company } = params;
  const technicianNames = params.technicians.map((t) => t.name).join(", ");
  const link = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}${TICKET_PATHS[ticketType]}`
    : "-";

  const ownerVars: Record<TicketType, string[]> = {
    SERVICE: [owner.name, technicianNames, ticketId],
    INSTALLATION: [owner.name, ticketId, technicianNames, address],
    PROJECT: [owner.name, ticketId, company ?? "", technicianNames],
  };
  const ownerBody = `Hello ${owner.name}, technician ${technicianNames} has been assigned to your ticket ${ticketId} and will reach out to you soon.`;

  await sendWhatsAppSafely(owner.phone, () =>
    sendWhatsAppMessage(
      owner.phone as string,
      ownerBody,
      templateSid(`${ticketType}_CUSTOMER`),
      ownerVars[ticketType].map(clean),
    ),
  );

  for (const tech of params.technicians) {
    const techVars: Record<TicketType, string[]> = {
      SERVICE: [
        tech.name,
        ticketId,
        owner.name,
        owner.phone ?? "",
        address,
        details,
        link,
      ],
      INSTALLATION: [
        tech.name,
        ticketId,
        owner.name,
        owner.phone ?? "",
        address,
        details,
        link,
      ],
      PROJECT: [
        tech.name,
        ticketId,
        company ?? "",
        owner.name,
        owner.phone ?? "",
        address,
        link,
      ],
    };
    const techBody = `Hello ${tech.name}, you have been assigned a new ${TICKET_LABELS[ticketType]}. Ticket: ${ticketId}. Customer: ${owner.name}. Issue: ${clean(details)}. Please open the Service Desk app for full details.`;

    await sendWhatsAppSafely(tech.phone, () =>
      sendWhatsAppMessage(
        tech.phone as string,
        techBody,
        templateSid(`${ticketType}_TECHNICIAN`),
        techVars[ticketType].map(clean),
      ),
    );
  }
}

/**
 * Send user creation notification with credentials
 */
async function notifyUserCreation(
  phoneNumber: string,
  userName: string,
  email: string,
  password: string,
  appUrl: string,
): Promise<SendResult> {
  const message = `Welcome ${userName}! Your Service Desk account has been created. Email: ${email} Password: ${password} Login: ${appUrl} Please change your password on first login.`;

  return sendWhatsAppMessage(
    phoneNumber,
    message,
    templateSid("USER_CREDENTIALS"),
    [userName, appUrl, email, password, supportPhone()].map(clean),
  );
}

/**
 * Send generic WhatsApp notification
 */
async function sendNotification(
  phoneNumber: string,
  message: string,
): Promise<SendResult> {
  return sendWhatsAppMessage(phoneNumber, message);
}

export {
  sendWhatsAppMessage,
  sendWhatsAppSafely,
  notifyTicketAssigned,
  notifyTicketCreated,
  notifyUserCreation,
  sendNotification,
};
