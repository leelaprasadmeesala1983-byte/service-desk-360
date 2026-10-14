/**
 * WhatsApp notifications via the Meta WhatsApp Business Cloud API.
 *
 * Required in .env:
 *   WHATSAPP_ACCESS_TOKEN             permanent System User token
 *   WHATSAPP_PHONE_NUMBER_ID          from WhatsApp Manager > Phone numbers
 *
 * Optional:
 *   WHATSAPP_ENABLED                  set to "false" to turn notifications off
 *   WHATSAPP_API_VERSION              Graph API version, default v21.0
 *   WHATSAPP_TEMPLATE_LANGUAGE        template language code, default en
 *   WHATSAPP_SUPPORT_PHONE            support number shown in messages
 *
 * Approved template NAMES (WhatsApp Manager > Message templates). When one is
 * unset, the message is sent as free-form text, which WhatsApp only delivers
 * inside the 24-hour reply window. Variable order must match the template.
 *
 *   WHATSAPP_TEMPLATE_USER_CREDENTIALS         {{1}} name, {{2}} login link, {{3}} support phone
 *
 *   WHATSAPP_TEMPLATE_TICKET_CREATED           {{1}} customer, {{2}} ticket name (Service Ticket / Installation Ticket), {{3}} ticket id, {{4}} support phone
 *   WHATSAPP_TEMPLATE_STATUS_IN_PROGRESS       {{1}} customer, {{2}} ticket name, {{3}} ticket id, {{4}} support phone
 *   WHATSAPP_TEMPLATE_STATUS_CLOSED            {{1}} customer, {{2}} ticket name, {{3}} ticket id, {{4}} support phone
 *
 *   WHATSAPP_TEMPLATE_SERVICE_TECHNICIAN       {{1}} technician, {{2}} ticket id, {{3}} customer, {{4}} phone, {{5}} address, {{6}} issue, {{7}} link
 *   WHATSAPP_TEMPLATE_SERVICE_CUSTOMER         {{1}} customer, {{2}} ticket id, {{3}} technician(s), {{4}} support phone
 *   WHATSAPP_TEMPLATE_INSTALLATION_TECHNICIAN  {{1}} technician, {{2}} ticket id, {{3}} customer, {{4}} contact, {{5}} address, {{6}} details, {{7}} link
 *   WHATSAPP_TEMPLATE_INSTALLATION_CUSTOMER    {{1}} customer, {{2}} ticket id, {{3}} technician(s), {{4}} address
 *
 * Project management sends no WhatsApp messages.
 */

type TicketType = "SERVICE" | "INSTALLATION";

const TICKET_PATHS: Record<TicketType, string> = {
  SERVICE: "/service-tickets/service-management",
  INSTALLATION: "/service-tickets/installation-management",
};

/** Shown in the "ticket created" message, per management tab. */
const TICKET_NAMES: Record<TicketType, string> = {
  SERVICE: "Service Ticket",
  INSTALLATION: "Installation Ticket",
};

const TICKET_LABELS: Record<TicketType, string> = {
  SERVICE: "service request",
  INSTALLATION: "installation",
};

function templateName(name: string): string | undefined {
  return process.env[`WHATSAPP_TEMPLATE_${name}`] || undefined;
}

/** Support number shown in messages. */
function supportPhone(): string {
  return process.env.WHATSAPP_SUPPORT_PHONE ?? "";
}

/**
 * App base URL with a scheme and no trailing slash. WhatsApp only makes a URL
 * tappable when it starts with http:// or https://.
 */
function appBaseUrl(raw: string | undefined): string {
  const url = (raw ?? "").trim().replace(/\/+$/, "");
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** WhatsApp rejects empty template variables and newlines. */
function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim() || "-";
}

type SendResult = { success: boolean; messageId?: string; error?: string };

/**
 * Send a WhatsApp message through the Meta Cloud API.
 * Uses the approved template when `template` is given, else plain text.
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  body: string,
  template?: string,
  variables?: string[],
): Promise<SendResult> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    if (process.env.WHATSAPP_ENABLED === "false") {
      return { success: false, error: "WhatsApp notifications are disabled" };
    }

    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        error:
          "WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env",
      };
    }

    // Stored numbers are 10-digit Indian mobiles; add the country code.
    let digits = phoneNumber.replace(/\D/g, "");
    if (digits.length === 10) digits = `91${digits}`;

    const payload =
      template && variables
        ? {
            messaging_product: "whatsapp",
            to: digits,
            type: "template",
            template: {
              name: template,
              language: {
                code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en",
              },
              components: [
                {
                  type: "body",
                  parameters: variables.map((text) => ({ type: "text", text })),
                },
              ],
            },
          }
        : {
            messaging_product: "whatsapp",
            to: digits,
            type: "text",
            text: { body },
          };

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };

    if (!response.ok) {
      return {
        success: false,
        error: data.error
          ? `${data.error.message ?? "Failed to send WhatsApp message"} (code ${data.error.code})`
          : "Failed to send WhatsApp message",
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
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
    `Hello ${customerName}, your ${TICKET_NAMES[ticketType]} of ${ticketId} has been created. Soon the technician will reach out to you.`,
    templateName("TICKET_CREATED"),
    [
      clean(customerName),
      TICKET_NAMES[ticketType],
      clean(ticketId),
      clean(supportPhone()),
    ],
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

/**
 * Tell the customer their ticket moved to In Progress or Closed. Other
 * statuses, and unchanged statuses, send nothing.
 */
async function notifyTicketStatusChanged(params: {
  ticketType: TicketType;
  previousStatus: string | null | undefined;
  newStatus: string;
  phone: string | null | undefined;
  customerName: string;
  ticketId: string;
}): Promise<void> {
  const { ticketType, previousStatus, newStatus, phone, customerName } = params;
  if (previousStatus === newStatus) return;

  const template =
    newStatus === "IN_PROGRESS"
      ? "STATUS_IN_PROGRESS"
      : newStatus === "CLOSED"
        ? "STATUS_CLOSED"
        : null;
  if (!template) return;

  const message =
    newStatus === "CLOSED"
      ? `Hello ${customerName}, your ${TICKET_NAMES[ticketType]} of ${params.ticketId} has been closed. Thank you for choosing us.`
      : `Hello ${customerName}, your ${TICKET_NAMES[ticketType]} of ${params.ticketId} is now in progress. Our technician is working on it.`;

  await sendWhatsAppSafely(phone, () =>
    sendWhatsAppMessage(phone as string, message, templateName(template), [
      clean(customerName),
      TICKET_NAMES[ticketType],
      clean(params.ticketId),
      clean(supportPhone()),
    ]),
  );
}

type AssignedParams = {
  ticketType: TicketType;
  ticketId: string;
  owner: { name: string; phone: string | null | undefined };
  /** Service/installation address. */
  address: string;
  /** Service issue title or installation details. */
  details: string;
  technicians: { name: string; phone: string | null }[];
};

/**
 * Notify the ticket owner and each newly assigned technician, using the
 * per-tab templates.
 */
async function notifyTicketAssigned(params: AssignedParams): Promise<void> {
  const { ticketType, ticketId, owner, address, details } = params;
  const technicianNames = params.technicians.map((t) => t.name).join(", ");
  const baseUrl = appBaseUrl(process.env.APP_URL);
  const link = baseUrl ? `${baseUrl}${TICKET_PATHS[ticketType]}` : "-";

  const ownerVars: Record<TicketType, string[]> = {
    SERVICE: [owner.name, ticketId, technicianNames, supportPhone()],
    INSTALLATION: [owner.name, ticketId, technicianNames, address],
  };
  const ownerBody = `Hello ${owner.name}, technician ${technicianNames} has been assigned to your ticket ${ticketId} and will reach out to you soon.`;

  await sendWhatsAppSafely(owner.phone, () =>
    sendWhatsAppMessage(
      owner.phone as string,
      ownerBody,
      templateName(`${ticketType}_CUSTOMER`),
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
    };
    const techBody = `Hello ${tech.name}, you have been assigned a new ${TICKET_LABELS[ticketType]}. Ticket: ${ticketId}. Customer: ${owner.name}. Issue: ${clean(details)}. Please open the Service Desk app for full details.`;

    await sendWhatsAppSafely(tech.phone, () =>
      sendWhatsAppMessage(
        tech.phone as string,
        techBody,
        templateName(`${ticketType}_TECHNICIAN`),
        techVars[ticketType].map(clean),
      ),
    );
  }
}

/**
 * Send user creation notification. The password is never sent over WhatsApp:
 * the user opens the login link and sets one with "Forgot password".
 */
async function notifyUserCreation(
  phoneNumber: string,
  userName: string,
  appUrl: string,
): Promise<SendResult> {
  const loginUrl = appBaseUrl(appUrl);
  const message = `Hello ${userName}, welcome to Service Desk 360. Your access has been set up. Please complete your registration using this link: ${loginUrl}. If you need any help, contact us at ${supportPhone()}. Thank you.`;

  return sendWhatsAppMessage(
    phoneNumber,
    message,
    templateName("USER_CREDENTIALS"),
    [userName, loginUrl, supportPhone()].map(clean),
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
  notifyTicketStatusChanged,
  notifyUserCreation,
  sendNotification,
};
