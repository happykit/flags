import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getEdgeFlags, hkvkCookieOptions } from "@happykit/flags/edge";
import type { AppFlags } from "../../../types/AppFlags";
import "../../../flags.config";

export async function middleware(request: NextRequest, ev: NextFetchEvent) {
  const flagBag = await getEdgeFlags<AppFlags>({ request });

  const response = NextResponse.rewrite(
    `/demo/middleware/variant-${flagBag.flags?.checkout || "full"}`
  );

  if (flagBag.data?.visitor?.key) {
    response.cookie("hkvk", flagBag.data.visitor.key, hkvkCookieOptions);
  }

  return response;
}
