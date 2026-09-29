import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const dispatchItemSchema = z.object({
  receivedMaterialId: z.string().uuid("Invalid Material ID."),
  receivedItemId: z.string().min(1, "Item ID is required."),
  trackId: z.string().min(1, "Track ID is required."),
  productId: z.string().optional(),
  productName: z.string().min(1, "Product Name is required."),
  serialNumber: z.string().min(1, "Serial Number is required."),
  brandName: z.string().optional(),
  modelNumber: z.string().optional(),
  quantity: z.number().optional(),
  customerName: z.string().optional(),
});

export const sendToVendorFormSchema = z.object({
  assetId: z
    .string()
    .uuid("Invalid Material / Asset ID.")
    .optional()
    .or(z.literal("")),

  items: z.array(dispatchItemSchema).optional(),

  vendorId: z.string().uuid("Invalid Vendor ID.").optional().or(z.literal("")),

  vendorName: z
    .string({ required_error: "Vendor Name is required." })
    .trim()
    .min(1, "Vendor Name is required.")
    .max(200, "Vendor Name must be less than 200 characters."),

  contactPerson: z
    .string({ required_error: "Contact Person is required." })
    .trim()
    .min(1, "Contact Person is required.")
    .max(150, "Contact Person must be less than 150 characters."),

  phoneNumber: z
    .string({ required_error: "Phone Number is required." })
    .trim()
    .min(1, "Phone Number is required.")
    .regex(phoneRegex, "Phone Number must contain exactly 10 digits."),

  address: z
    .string({ required_error: "Address is required." })
    .trim()
    .min(1, "Address is required.")
    .max(500, "Address must be less than 500 characters."),

  reasonForRepair: z
    .string({ required_error: "Reason for Repair is required." })
    .trim()
    .min(1, "Reason for Repair is required.")
    .max(1000, "Reason for Repair must be less than 1000 characters."),

  remarks: z
    .string()
    .trim()
    .max(1000, "Remarks must be less than 1000 characters.")
    .optional()
    .or(z.literal("")),

  courierName: z
    .string({ required_error: "Courier Name is required." })
    .trim()
    .min(1, "Courier Name is required.")
    .max(150, "Courier Name must be less than 150 characters."),

  docketAwbNumber: z
    .string({ required_error: "Docket / AWB Number is required." })
    .trim()
    .min(1, "Docket / AWB Number is required.")
    .max(100, "Docket / AWB Number must be less than 100 characters."),

  bookingDate: z
    .union([z.date(), z.string()])
    .refine((val) => Boolean(val) && !Number.isNaN(new Date(val).getTime()), {
      message: "Booking Date is required.",
    }),

  numberOfPackages: z
    .number({
      required_error: "No. of Packages is required.",
      invalid_type_error: "Please enter a valid number of packages.",
    })
    .int("Please enter a valid number of packages.")
    .min(1, "Number of packages must be at least 1."),

  dispatchRemarks: z
    .string()
    .trim()
    .max(1000, "Dispatch Remarks must be less than 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type SendToVendorFormValues = z.infer<typeof sendToVendorFormSchema>;

export const receiveFromVendorSchema = z.object({
  vendorReturnDate: z
    .union([z.date(), z.string()])
    .refine((val) => Boolean(val) && !Number.isNaN(new Date(val).getTime()), {
      message: "Vendor Return Date is required.",
    }),

  repairStatus: z.enum(["REPAIR_COMPLETED", "REPAIR_REJECTED"] as const, {
    required_error: "Repair Status is required.",
  }),

  repairRemarks: z
    .string({ required_error: "Repair Remarks are required." })
    .trim()
    .min(1, "Repair Remarks are required.")
    .max(1000, "Repair Remarks must be less than 1000 characters."),

  returnDocketNumber: z
    .string()
    .trim()
    .max(100, "Return Docket must be less than 100 characters.")
    .optional()
    .or(z.literal("")),

  additionalRemarks: z
    .string()
    .trim()
    .max(1000, "Additional Remarks must be less than 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type ReceiveFromVendorFormValues = z.infer<
  typeof receiveFromVendorSchema
>;

export const deleteSendToVendorSchema = z.object({
  id: z.string().uuid("Invalid Send to Vendor ID."),
});
