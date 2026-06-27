import { NextResponse } from "next/server";
import { validateCrmLogin } from "@/server/crm/login";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = await validateCrmLogin(email, password);
  return NextResponse.json(result);
}
