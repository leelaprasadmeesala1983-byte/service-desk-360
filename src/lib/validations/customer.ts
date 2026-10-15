import { z } from "zod";

export const addCustomerSchema = z.object({
  customerName: z
    .string({ required_error: "Customer name is required" })
    .trim()
    .min(1, "Customer name is required")
    .max(100, "Customer name must be 100 characters or fewer"),
  mobileNumber: z
    .string({ required_error: "Mobile number is required" })
    .trim()
    .min(1, "Mobile number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit phone number"),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        return z.string().email().safeParse(val).success;
      },
      { message: "Enter a valid email address" },
    )
    .transform((val) => (val && val.trim() ? val.trim() : null)),
  address: z
    .string({ required_error: "Address is required" })
    .trim()
    .min(1, "Address is required"),
});

export const editCustomerSchema = addCustomerSchema.extend({
  id: z.string().uuid("Invalid customer ID"),
});

export const deleteCustomerSchema = z.object({
  id: z.string().uuid("Invalid customer ID"),
});

export type AddCustomerValues = z.infer<typeof addCustomerSchema>;
export type EditCustomerValues = z.infer<typeof editCustomerSchema>;
export type DeleteCustomerValues = z.infer<typeof deleteCustomerSchema>;
