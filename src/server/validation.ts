import { ZodError, type ZodType, type z } from "zod";
import { ServerActionError } from "@/server/errors";

export function parseInput<T extends ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  try {
    return schema.parse(input) as z.infer<T>;
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ServerActionError("BAD_REQUEST", "Invalid input.", error.flatten());
    }
    throw error;
  }
}
