import { z } from "zod";

const roleField = z.enum(["ADMIN", "TECHNICIAN"], {
  required_error: "Role is required",
  invalid_type_error: "Role is required",
});

const statusField = z.enum(["ACTIVE", "INACTIVE"], {
  required_error: "Status is required",
  invalid_type_error: "Status is required",
});

const departmentField = z
  .string({ required_error: "Department is required" })
  .trim()
  .min(1, "Department is required")
  .max(60, "Department must be 60 characters or fewer");

const addUserSchema = z
  .object({
    firstName: z
      .string({ required_error: "First name is required" })
      .trim()
      .min(1, "First name is required"),
    lastName: z
      .string({ required_error: "Last name is required" })
      .trim()
      .min(1, "Last name is required"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    phone: z
      .string({ required_error: "Phone number is required" })
      .trim()
      .min(1, "Phone number is required")
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit phone number"),
    role: roleField,
    department: departmentField,
    status: statusField,
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(1, "Confirm password is required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** Edit User: email is read-only, so it is not part of the payload. */
const editUserSchema = z.object({
  id: z.string().min(1),
  firstName: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(1, "First name is required"),
  lastName: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(1, "Last name is required"),
  phone: z
    .string({ required_error: "Phone number is required" })
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10 digit phone number"),
  role: roleField,
  department: departmentField,
  status: statusField,
});

const setUserStatusSchema = z.object({
  id: z.string().min(1),
  status: statusField,
});

const deleteUserSchema = z.object({ id: z.string().min(1) });

const adminUpdatePasswordSchema = z
  .object({
    id: z.string().min(1),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string({ required_error: "Confirm password is required" })
      .min(1, "Confirm password is required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AddUserValues = z.input<typeof addUserSchema>;
type EditUserValues = z.input<typeof editUserSchema>;

export type { AddUserValues, EditUserValues };
export {
  addUserSchema,
  editUserSchema,
  setUserStatusSchema,
  deleteUserSchema,
  adminUpdatePasswordSchema,
};
