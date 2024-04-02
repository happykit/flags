import { type NextRequest, NextResponse } from "next/server";
import { type ApiData, verifyAccess } from "@vercel/flags";
import { getHappyKitData } from "@vercel/flags/providers/happykit";

export async function GET(request: NextRequest) {
  const access = await verifyAccess(request.headers.get("Authorization"));
  if (!access) return NextResponse.json(null, { status: 401 });

  const apiData = await getHappyKitData({
    apiToken: process.env.HAPPYKIT_API_TOKEN!,
    envKey: process.env.NEXT_PUBLIC_FLAGS_ENV_KEY!,
  });

  return NextResponse.json<ApiData>(apiData);
}
