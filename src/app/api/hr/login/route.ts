import { NextResponse } from "next/server";
import { validateHrLogin } from "@/server/hr/login";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = await validateHrLogin(email, password);
  return NextResponse.json(result);
}
