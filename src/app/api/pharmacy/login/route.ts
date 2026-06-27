import { NextResponse } from "next/server";
import { validatePharmacyLogin } from "@/server/pharmacy/login";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const result = await validatePharmacyLogin(email, password);
  return NextResponse.json(result);
}
