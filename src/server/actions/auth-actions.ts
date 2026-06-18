"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { ServerActionError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional(),
});

export async function loginWithPassword(input: unknown) {
  const payload = parseInput(loginSchema, input);
  try {
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirectTo: payload.redirectTo ?? "/app",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      throw new ServerActionError("UNAUTHORIZED", "Invalid email or password.");
    }
    throw error;
  }
}

export async function logoutFromServer(redirectTo = "/login") {
  await signOut({ redirectTo });
}
