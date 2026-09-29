import { z } from "zod";

const phoneRegex = /^[0-9]{10}$/;

export const assetProductSchema = z
  .object({
    id: z.string().optional(),
    productType: z.enum(
      ["Camera", "NVR", "DVR", "Switch", "SMPS", "Biometric", "Other"] as const,
      {
        required_error: "Product type is required.",
        invalid_type_error: "Please select a valid product type.",
      },
    ),
    otherProductType: z.string().optional(),
    brandName: z
      .string()
      .trim()
      .min(1, "Brand name is required.")
      .max(100, "Brand name must be less than 100 characters."),
    modelNumber: z
      .string()
      .trim()
      .min(1, "Model number is required.")
      .max(100, "Model number must be less than 100 characters."),
    serialNumber: z
      .string()
      .trim()
      .min(1, "Serial number is required.")
      .max(100, "Serial number must be less than 100 characters."),
    quantity: z.coerce
      .number({
        required_error: "Quantity is required.",
        invalid_type_error: "Quantity must be a valid number.",
      })
      .int("Quantity must be a whole number.")
      .min(1, "Quantity must be at least 1."),
    accessories: z.string().trim().max(500).optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    remarks: z.string().trim().max(1000).optional().or(z.literal("")),
    status: z.string().optional(),
    dispatchId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.productType === "Other" &&
      (!data.otherProductType || !data.otherProductType.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify the custom product type.",
        path: ["otherProductType"],
      });
    }
  });

export const assetFormSchema = z
  .object({
    name: z.string().optional(),
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name is required.")
      .max(150, "Customer name must be less than 150 characters."),
    customerNumber: z
      .string()
      .trim()
      .min(1, "Customer number is required.")
      .regex(phoneRegex, "Customer number must be exactly 10 digits."),
    location: z
      .string()
      .trim()
      .min(1, "Location is required.")
      .max(200, "Location must be less than 200 characters."),
    status: z.string().optional(),
    products: z
      .array(assetProductSchema)
      .min(1, "At least one product is required."),
  })
  .superRefine((data, ctx) => {
    const seenSerials = new Map<string, number>();
    data.products.forEach((product, index) => {
      const serial = product.serialNumber?.trim().toLowerCase();
      if (serial) {
        if (seenSerials.has(serial)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Serial number must be unique.",
            path: ["products", index, "serialNumber"],
          });
        } else {
          seenSerials.set(serial, index);
        }
      }
    });
  });

export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type AssetProductFormValues = z.infer<typeof assetProductSchema>;

export const deleteAssetSchema = z.object({
  id: z.string().uuid("Invalid asset ID."),
  productId: z.string().optional(),
});
