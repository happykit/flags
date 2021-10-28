import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getEdgeFlags, hkvkCookieOptions } from "@happykit/flags/edge";
import { AppFlags } from "../../../types/AppFlags";
import "../../../happykit.config";

function serializeVisitorKeyCookie(visitorKey: string) {
  // Max-Age 15552000 seconds equals 180 days
  return `hkvk=${encodeURIComponent(
    visitorKey
  )}; Path=/; Max-Age=15552000; SameSite=Lax`;
}

export async function middleware(request: NextRequest, ev: NextFetchEvent) {
  const flagBag = await getEdgeFlags<AppFlags>({ request });

  const response = NextResponse.rewrite(
    `/demo/middleware/variant-${flagBag.flags?.checkout || "full"}`
  );

  if (flagBag.data?.visitor?.key) {
    // response.cookie has a bug when used with an expiration date,
    // so we append Set-Cookie manually
    // https://github.com/vercel/next.js/issues/30430
    //
    // response.cookie("hkvk", flagBag.data.visitor.key, hkvkCookieOptions);
    response.headers.append(
      "Set-Cookie",
      serializeVisitorKeyCookie(flagBag.data.visitor.key)
    );
  }

  return response;
}
