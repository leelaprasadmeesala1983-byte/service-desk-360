/**
 * WhatsApp Integration Service using Meta Business API
 *
 * Setup required:
 * 1. Create Meta Business Account at business.facebook.com
 * 2. Create WhatsApp Business App
 * 3. Get Phone Number ID and Access Token
 * 4. Add environment variables to .env
 */

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
  text?: {
    body: string;
  };
}

const WHATSAPP_API_VERSION = "v18.0";
const WHATSAPP_API_URL = `https://graph.instagram.com/${WHATSAPP_API_VERSION}`;

/**
 * Send a WhatsApp message using Meta Business API
 */
async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  templateName?: string,
  templateParams?: string[],
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.error("WhatsApp credentials not configured");
      return {
        success: false,
        error:
          "WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env",
      };
    }

    // Ensure phone number has country code (e.g., +91 for India, +1 for US)
    const formattedPhone = phoneNumber.replace(/\D/g, "");
    if (!formattedPhone.startsWith("91") && !formattedPhone.startsWith("1")) {
      console.warn(`Phone number ${phoneNumber} may be missing country code`);
    }

    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    let payload: WhatsAppMessage;

    if (templateName && templateParams) {
      // Template-based message (for structured messages)
      payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: templateParams.map((param) => ({
                type: "text",
                text: param,
              })),
            },
          ],
        },
      };
    } else {
      // Free-form text message
      payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: {
          body: message,
        },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };

    if (!response.ok) {
      console.error("WhatsApp API error:", data.error?.message);
      return {
        success: false,
        error: data.error?.message || "Failed to send WhatsApp message",
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error("WhatsApp service error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const recordType = {
    SERVICE: "Service Request",
    INSTALLATION: "Installation",
    PROJECT: "Project",
  }[ticketType];

  const message = `
👋 Hello ${technicianName},

You have been assigned a new ${recordType}!

📋 Ticket ID: ${ticketId}
👤 Customer: ${customerName}
📝 Description: ${description}

Please log in to the Service Desk app to view complete details and start working on it.

Thank you!
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
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
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `
🎉 Welcome ${userName}!

Your Service Desk account has been created successfully.

🔐 Login Credentials:
📧 Email: ${email}
🔑 Password: ${password}

🌐 Access the app: ${appUrl}

⚠️ Please change your password on first login for security.

Questions? Contact your administrator.
  `.trim();

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Send generic WhatsApp notification
 */
async function sendNotification(
  phoneNumber: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendWhatsAppMessage(phoneNumber, message);
}

export {
  sendWhatsAppMessage,
  notifyTechnicianAssignment,
  notifyUserCreation,
  sendNotification,
  type WhatsAppMessage,
};
