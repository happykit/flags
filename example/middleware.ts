import { NextRequest, NextResponse } from "next/server";
import { getEdgeFlags } from "flags/edge";

export const config = { matcher: "/demo/middleware" };

export async function middleware(request: NextRequest) {
  const flagBag = await getEdgeFlags({ request });

  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = `/demo/middleware/${flagBag.flags?.checkout || "full"}`;
  const response = NextResponse.rewrite(nextUrl);

  if (flagBag.cookie) response.cookies.set(...flagBag.cookie.args);

  return response;
}
