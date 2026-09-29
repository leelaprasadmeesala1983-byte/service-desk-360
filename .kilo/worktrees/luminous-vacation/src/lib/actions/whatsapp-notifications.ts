"use server";

import {
  notifyTechnicianAssignment,
  notifyUserCreation,
} from "@/lib/whatsapp-service";

/**
 * Send WhatsApp notification when a technician is assigned to a ticket
 */
async function sendAssignmentNotification(params: {
  technicianPhoneNumber: string;
  technicianName: string;
  ticketId: string;
  ticketType: "SERVICE" | "INSTALLATION" | "PROJECT";
  customerName: string;
  description: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Validate phone number
    if (
      !params.technicianPhoneNumber ||
      params.technicianPhoneNumber.trim() === ""
    ) {
      return {
        success: false,
        error: "Technician phone number is required",
      };
    }

    const result = await notifyTechnicianAssignment(
      params.technicianPhoneNumber,
      params.technicianName,
      params.ticketId,
      params.ticketType,
      params.customerName,
      params.description,
    );

    if (!result.success) {
      console.warn(
        `Failed to send WhatsApp to ${params.technicianPhoneNumber}:`,
        result.error,
      );
      // Don't throw error - WhatsApp is optional notification
      return {
        success: false,
        error: result.error,
      };
    }

    console.log(
      `WhatsApp sent to ${params.technicianPhoneNumber} (${result.messageId})`,
    );
    return result;
  } catch (error) {
    console.error("Error sending assignment notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send WhatsApp notification when a new user is created
 */
async function sendUserCreationNotification(params: {
  phoneNumber: string;
  userName: string;
  email: string;
  password: string;
  appUrl: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    // Validate phone number
    if (!params.phoneNumber || params.phoneNumber.trim() === "") {
      return {
        success: false,
        error: "Phone number is required",
      };
    }

    const result = await notifyUserCreation(
      params.phoneNumber,
      params.userName,
      params.email,
      params.password,
      params.appUrl,
    );

    if (!result.success) {
      console.warn(
        `Failed to send WhatsApp to ${params.phoneNumber}:`,
        result.error,
      );
      return {
        success: false,
        error: result.error,
      };
    }

    console.log(`WhatsApp sent to ${params.phoneNumber} (${result.messageId})`);
    return result;
  } catch (error) {
    console.error("Error sending user creation notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { sendAssignmentNotification, sendUserCreationNotification };
