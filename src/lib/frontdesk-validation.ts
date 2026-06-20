import { z } from "zod";
import { ServerActionError } from "@/server/errors";

const phoneSchema = z
  .string()
  .min(10, "Mobile number must be at least 10 digits")
  .max(20, "Mobile number is too long");

export const registerPatientSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: phoneSchema,
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["M", "F", "O"]),
  department: z.string().min(1, "Department is required"),
});

export const checkInSchema = z.object({
  uhid: z.string().trim().min(1, "Patient UHID is required"),
  department: z.string().min(1, "Department is required"),
  doctor: z.string().min(1, "Doctor is required"),
});

export const billingSchema = z.object({
  template: z.string().optional(),
  paymentScope: z.enum(["full", "partial", "defer"]),
  amount: z.coerce.number().min(0, "Amount cannot be negative"),
  discount: z.coerce.number().min(0).optional(),
  collectedAmount: z.coerce.number().min(0).optional(),
  mode: z.string().min(1, "Payment mode is required"),
  customLine: z.string().optional(),
});

export function validateFrontdeskInput<T extends z.ZodType>(
  schema: T,
  data: Record<string, string | number | boolean>,
): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ServerActionError("VALIDATION", first?.message ?? "Invalid input");
  }
  return parsed.data;
}
