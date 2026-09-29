import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const customerDispatchFormSchema = z.object({
  assetId: z.string().uuid("Invalid Asset ID."),

  customerName: z
    .string({ required_error: "Customer Name is required." })
    .trim()
    .min(1, "Customer Name is required.")
    .max(150, "Customer Name must be less than 150 characters."),

  customerContact: z
    .string({ required_error: "Customer Contact is required." })
    .trim()
    .min(1, "Customer Contact is required.")
    .regex(phoneRegex, "Customer Contact must contain exactly 10 digits."),

  customerAddress: z
    .string({ required_error: "Customer Address is required." })
    .trim()
    .min(1, "Customer Address is required.")
    .max(500, "Customer Address must be less than 500 characters."),

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

  dispatchDate: z
    .union([z.date(), z.string()])
    .refine((val) => Boolean(val) && !Number.isNaN(new Date(val).getTime()), {
      message: "Dispatch Date is required.",
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

export type CustomerDispatchFormValues = z.infer<
  typeof customerDispatchFormSchema
>;

export const confirmDeliverySchema = z.object({
  deliveredAt: z.union([z.date(), z.string()]).optional(),
  deliveryRemarks: z
    .string()
    .trim()
    .max(1000, "Delivery remarks must be less than 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type ConfirmDeliveryFormValues = z.infer<typeof confirmDeliverySchema>;

export const customerReturnFormSchema = z.object({
  assetId: z.string().uuid("Invalid Asset ID."),
  returnDate: z.string().min(1, "Return Date is required."),
  handedOverTo: z
    .string({ required_error: "Handed Over To is required." })
    .trim()
    .min(1, "Handed Over To name is required.")
    .max(150, "Name must be less than 150 characters."),
  phone: z
    .string({ required_error: "Phone number is required." })
    .trim()
    .min(1, "Phone number is required.")
    .regex(phoneRegex, "Phone Number must contain exactly 10 digits."),
  serviceCharges: z.coerce
    .number({ invalid_type_error: "Service charges must be a number." })
    .min(0, "Service charges cannot be negative."),
  remarks: z
    .string()
    .trim()
    .max(1000, "Remarks must be less than 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type CustomerReturnFormValues = z.infer<typeof customerReturnFormSchema>;
