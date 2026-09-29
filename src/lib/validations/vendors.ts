import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const vendorFormSchema = z.object({
  vendorName: z
    .string()
    .trim()
    .min(1, "Vendor name is required.")
    .max(150, "Vendor name must be less than 150 characters."),
  contactPerson: z
    .string()
    .trim()
    .min(1, "Contact person is required.")
    .max(100, "Contact person must be less than 100 characters."),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .regex(phoneRegex, "Phone number must be exactly 10 digits."),
  address: z
    .string()
    .trim()
    .min(1, "Address is required.")
    .max(500, "Address must be less than 500 characters."),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const deleteVendorSchema = z.object({
  id: z.string().uuid("Invalid vendor ID."),
});
