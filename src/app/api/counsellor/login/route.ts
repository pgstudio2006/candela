import { NextResponse } from "next/server";
import { validateCounsellorLogin } from "@/server/counsellor/index";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = await validateCounsellorLogin(email, password);
  return NextResponse.json(result);
}
