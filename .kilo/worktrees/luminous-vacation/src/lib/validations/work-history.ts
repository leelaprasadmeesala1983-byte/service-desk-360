import { z } from "zod";

const createWorkHistorySchema = z.object({
  workType: z.enum(["SERVICE", "INSTALLATION", "PROJECT"]).default("SERVICE"),
  referenceId: z.string().min(1, "Ticket No is required."),
  technicianIds: z
    .array(z.string())
    .min(1, "At least one technician is required."),
  workDate: z.string().optional(),
  workDateTime: z.string().min(1, "Date & Time is required."),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"])
    .optional()
    .default("IN_PROGRESS"),
  description: z.string().optional().default(""),
  attachments: z.array(z.string()).optional().default([]),
});

const editWorkHistorySchema = z.object({
  id: z.string().uuid("Invalid work log ID"),
  technicianIds: z.array(z.string()).min(1, "Select at least one technician"),
  workDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid work date (YYYY-MM-DD)"),
  workDateTime: z.string().min(1, "Work date and time is required"),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "REJECTED"]),
  description: z.string().trim().min(1, "Work description is required"),
  attachments: z.array(z.string()).optional().default([]),
});

const deleteWorkHistorySchema = z.object({
  id: z.string().uuid("Invalid work log ID"),
});

type CreateWorkHistoryValues = z.infer<typeof createWorkHistorySchema>;
type EditWorkHistoryValues = z.infer<typeof editWorkHistorySchema>;
type DeleteWorkHistoryValues = z.infer<typeof deleteWorkHistorySchema>;

export {
  createWorkHistorySchema,
  editWorkHistorySchema,
  deleteWorkHistorySchema,
};
export type {
  CreateWorkHistoryValues,
  EditWorkHistoryValues,
  DeleteWorkHistoryValues,
};
