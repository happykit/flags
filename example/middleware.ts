import { NextRequest, NextResponse } from "next/server";
import type { AppFlags } from "./types/AppFlags";
// Importing the config is necessary to configure getEdgeFlags
import "./flags.config";
import { getEdgeFlags } from "@happykit/flags/edge";

export const config = {
  matcher: "/demo/middleware",
};

export async function middleware(request: NextRequest) {
  const flagBag = await getEdgeFlags<AppFlags>({ request });

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/demo/middleware/${flagBag.flags?.checkout || "full"}`;
  const response = NextResponse.rewrite(nextUrl);

  if (flagBag.cookie) response.cookies.set(...flagBag.cookie.args);

  return response;
}
