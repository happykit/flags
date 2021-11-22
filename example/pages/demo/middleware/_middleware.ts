import { NextRequest, NextResponse } from "next/server";
import type { AppFlags } from "../../../types/AppFlags";
// Importing the config is necessary to configure getEdgeFlags
import "../../../flags.config";
import { getEdgeFlags } from "@happykit/flags/edge";

export async function middleware(request: NextRequest) {
  const flagBag = await getEdgeFlags<AppFlags>({ request });

  const response = NextResponse.rewrite(
    `/demo/middleware/variant-${flagBag.flags?.checkout || "full"}`
  );

  if (flagBag.cookie) response.cookie(...flagBag.cookie.args);

  return response;
}
