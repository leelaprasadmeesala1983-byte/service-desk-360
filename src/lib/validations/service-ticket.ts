import { z } from "zod";

import {
  emailField,
  optionalEmailField,
  phoneField,
  requiredText,
} from "./common";

// Shared building blocks for the three record types in the Service Ticket
// module. The service workflow UI only supports the three active service
// statuses in the current workflow.
const recordStatusField = z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"]);

const serviceCategoryField = z.enum([
  "CAMERA_NOT_WORKING",
  "DVR_NVR_ISSUE",
  "ONLINE_ISSUE",
  "NETWORK_ISSUE",
  "STORAGE_ISSUE",
  "POWER_ISSUE",
  "CABLE_WIRING",
  "GENERAL_SUPPORT",
  "OTHER",
]);

/** "" from an unset Assign Technician dropdown is stored as null. */
const assigneeField = z
  .string()
  .optional()
  .transform((value) => (value?.trim() ? value : null));

const optionalText = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    if (typeof value === "string") return value.trim();
    return value;
  },
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
);

const optionalMobileField = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    if (typeof value === "string") return value.trim();
    return value;
  },
  z
    .string()
    .trim()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null))
    .refine(
      (value) => value === null || /^[0-9]{10}$/.test(value),
      "Please enter a valid 10-digit mobile number",
    ),
);

/** Amount (₹) is edit-only and may be left blank. */
const amountField = z.preprocess(
  (value) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return undefined;
    }
    return value;
  },
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : null;
      }
      return String(value);
    })
    .refine(
      (value) => value === null || /^\d+(\.\d{1,2})?$/.test(value),
      "Enter a valid amount",
    ),
);

const urlField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) =>
      value === null ||
      /^https?:\/\/\S+$/i.test(value) ||
      /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value),
    "Enter a valid URL or an image data URL.",
  );

const assignedTechniciansField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  return value;
}, z.array(z.string()));

const dateTimeField = (label: string) =>
  z.preprocess(
    (value) => {
      if (value instanceof Date) return value;
      if (typeof value === "string" && value.trim()) {
        const d = new Date(value.trim());
        return Number.isNaN(d.getTime()) ? undefined : d;
      }
      return undefined;
    },
    z.date({
      required_error: `${label} is required`,
      invalid_type_error: `Enter a valid ${label.toLowerCase()}`,
    }),
  );

// --- Service Request -------------------------------------------------------

const serviceRequestCoreShape = {
  customerName: requiredText("Customer name"),
  phone: phoneField,
  email: optionalEmailField,
  category: serviceCategoryField,
  otherCategory: z.string().trim().optional(),
  address: requiredText("Customer address"),
  description: requiredText("Issue description"),
  status: recordStatusField,
  assignedTechnicianIds: assignedTechniciansField,
  assignedTechnicianId: z.string().optional(),
};

const validateServiceRequestCategory = (
  data: { category: string; otherCategory?: string },
  ctx: z.RefinementCtx,
) => {
  if (
    data.category === "OTHER" &&
    (!data.otherCategory || data.otherCategory.trim().length === 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["otherCategory"],
      message: "Custom issue type is required when Other is selected",
    });
  }
};

const createServiceRequestSchema = z
  .object({
    ...serviceRequestCoreShape,
    createdAt: dateTimeField("Created Date & Time"),
  })
  .superRefine(validateServiceRequestCategory);

/** Edit adds the work-outcome fields shown only on the edit screen. */
const editServiceRequestSchema = z
  .object({
    ...serviceRequestCoreShape,
    id: z.string().min(1),
    amount: amountField,
    closedDescription: optionalText,
    imageUrl: urlField,
    updatedAt: dateTimeField("Updated Date & Time"),
  })
  .superRefine((data, ctx) => {
    validateServiceRequestCategory(data, ctx);
    if (data.status === "CLOSED" && !data.closedDescription) {
      ctx.addIssue({
        code: "custom",
        path: ["closedDescription"],
        message: "Closed description is required",
      });
    }
  });

/** The subset a technician is allowed to change (spec §4.2). */
const technicianServiceRequestSchema = z.object({
  id: z.string().min(1),
  status: recordStatusField,
  amount: amountField,
  closedDescription: optionalText,
  imageUrl: urlField,
  updatedAt: dateTimeField("Updated Date & Time"),
});

const optionalAssignedTechniciansField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return [];
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  return value;
}, z.array(z.string()));

// --- Installation --------------------------------------------------------

const installationCoreShape = {
  customerName: requiredText("Customer name"),
  contactNumber: phoneField,
  email: optionalEmailField,
  address: requiredText("Address"),
  description: requiredText("Installation description"),
  status: recordStatusField,
  assignedTechnicianIds: optionalAssignedTechniciansField,
  assignedTechnicianId: z.string().optional(),
  accountUsername: optionalText,
  accountPassword: optionalText,
  accountMobile: optionalMobileField,
  referenceNo: optionalText,
};

const paymentModeField = z
  .enum(["ONLINE", "CASH"])
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const paymentStatusField = z
  .enum(["PAID", "PENDING"])
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null));

const createInstallationSchema = z.object({
  ...installationCoreShape,
  createdAt: dateTimeField("Created Date & Time"),
});

const editInstallationSchema = z
  .object({
    ...installationCoreShape,
    id: z.string().min(1),
    paymentMode: paymentModeField,
    paymentStatus: paymentStatusField,
    amount: amountField,
    updatedAt: dateTimeField("Updated Date & Time"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMode === "ONLINE") {
      if (!data.paymentStatus) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentStatus"],
          message: "Payment status is required",
        });
      }
    }
    if (data.paymentMode === "CASH") {
      if (!data.amount || Number(data.amount) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Cash amount is required and must be greater than 0",
        });
      }
    }
  });

/** The subset a technician is allowed to change (spec §4.3). */
const technicianInstallationSchema = z
  .object({
    id: z.string().min(1),
    status: recordStatusField,
    description: requiredText("Installation description"),
    accountUsername: optionalText,
    accountPassword: optionalText,
    accountMobile: optionalMobileField,
    paymentMode: paymentModeField,
    paymentStatus: paymentStatusField,
    amount: amountField,
    updatedAt: dateTimeField("Updated Date & Time"),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMode === "ONLINE") {
      if (!data.paymentStatus) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentStatus"],
          message: "Payment status is required",
        });
      }
    }
    if (data.paymentMode === "CASH") {
      if (!data.amount || Number(data.amount) <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Cash amount is required and must be greater than 0",
        });
      }
    }
  });

// --- Project ------------------------------------------------------------

const projectCoreShape = {
  companyName: requiredText("Company name"),
  customerName: requiredText("Customer name"),
  email: optionalEmailField,
  mobileNo: phoneField,
  location: requiredText("Location"),
  estimationNo: requiredText("Estimation number"),
  description: requiredText("Description"),
  status: recordStatusField,
  assignedTechnicianIds: optionalAssignedTechniciansField,
  assignedTechnicianId: z.string().optional(),
};

const createProjectSchema = z.object({
  ...projectCoreShape,
  createdAt: dateTimeField("Created Date & Time"),
});

const editProjectSchema = z.object({
  ...projectCoreShape,
  id: z.string().min(1),
  updatedAt: dateTimeField("Updated Date & Time"),
});

/** A technician may only move the status (spec §4.4). */
const technicianProjectSchema = z.object({
  id: z.string().min(1),
  status: recordStatusField,
  updatedAt: dateTimeField("Updated Date & Time"),
});

const deleteRecordSchema = z.object({ id: z.string().min(1) });

type CreateServiceRequestValues = z.input<typeof createServiceRequestSchema>;
type EditServiceRequestValues = z.input<typeof editServiceRequestSchema>;
type CreateInstallationValues = z.input<typeof createInstallationSchema>;
type EditInstallationValues = z.input<typeof editInstallationSchema>;
type CreateProjectValues = z.input<typeof createProjectSchema>;
type EditProjectValues = z.input<typeof editProjectSchema>;

export type {
  CreateServiceRequestValues,
  EditServiceRequestValues,
  CreateInstallationValues,
  EditInstallationValues,
  CreateProjectValues,
  EditProjectValues,
};

export {
  createServiceRequestSchema,
  editServiceRequestSchema,
  technicianServiceRequestSchema,
  createInstallationSchema,
  editInstallationSchema,
  technicianInstallationSchema,
  createProjectSchema,
  editProjectSchema,
  technicianProjectSchema,
  deleteRecordSchema,
};
