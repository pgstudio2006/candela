import NextAuth from "next-auth";
import { ensureAuthUrl } from "@/lib/auth/app-url";
import { authConfig } from "@/lib/auth/config";

ensureAuthUrl();

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
