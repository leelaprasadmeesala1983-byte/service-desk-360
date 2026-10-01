/**
 * WhatsApp notifications via Twilio.
 *
 * Required in .env:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM            e.g. whatsapp:+14155238886 (sandbox)
 *
 * Optional approved Content Template SIDs (HX...). When one is unset, the
 * message is sent as free-form text, which works in the Twilio sandbox and
 * inside WhatsApp's 24-hour reply window:
 *   TWILIO_TEMPLATE_TICKET_CREATED             {{1}} customer, {{2}} ticket id
 *   TWILIO_TEMPLATE_TICKET_ASSIGNED_CUSTOMER   {{1}} customer, {{2}} technician(s), {{3}} ticket id
 *   TWILIO_TEMPLATE_TICKET_ASSIGNED_TECHNICIAN {{1}} technician, {{2}} ticket id, {{3}} customer, {{4}} issue
 */

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
  phoneNumber: string,
  customerName: string,
  ticketId: string,
): Promise<SendResult> {
  return sendWhatsAppMessage(
    phoneNumber,
    `Hello ${customerName}, your ticket ${ticketId} has been created. Soon the technician will reach out to you.`,
    process.env.TWILIO_TEMPLATE_TICKET_CREATED,
    [customerName, ticketId],
  );
}

/**
 * Tell the ticket owner (customer) which technicians were assigned.
 */
async function notifyTicketOwnerAssignment(
  phoneNumber: string,
  customerName: string,
  ticketId: string,
  technicianNames: string[],
): Promise<SendResult> {
  const technicians = technicianNames.join(", ");
  return sendWhatsAppMessage(
    phoneNumber,
    `Hello ${customerName}, technician ${technicians} has been assigned to your ticket ${ticketId} and will reach out to you soon.`,
    process.env.TWILIO_TEMPLATE_TICKET_ASSIGNED_CUSTOMER,
    [customerName, technicians, ticketId],
  );
}

/**
 * Send technician assignment notification
 */
async function notifyTechnicianAssignment(
  phoneNumber: string,
  technicianName: string,
  ticketId: string,
  ticketType: "SERVICE" | "INSTALLATION" | "PROJECT",
  customerName: string,
  description: string,
): Promise<SendResult> {
  const recordType = {
    SERVICE: "service request",
    INSTALLATION: "installation",
    PROJECT: "project",
  }[ticketType];

  // Template variables can't hold newlines.
  const issue = description.replace(/\s+/g, " ").trim();

  return sendWhatsAppMessage(
    phoneNumber,
    `Hello ${technicianName}, you have been assigned a new ${recordType}. Ticket: ${ticketId}. Customer: ${customerName}. Issue: ${issue}. Please open the Service Desk app for full details.`,
    process.env.TWILIO_TEMPLATE_TICKET_ASSIGNED_TECHNICIAN,
    [technicianName, ticketId, customerName, issue],
  );
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
  const message = `
Welcome ${userName}!

Your Service Desk account has been created successfully.

Email: ${email}
Password: ${password}

Access the app: ${appUrl}

Please change your password on first login for security.
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
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
  notifyTechnicianAssignment,
  notifyTicketCreated,
  notifyTicketOwnerAssignment,
  notifyUserCreation,
  sendNotification,
};
