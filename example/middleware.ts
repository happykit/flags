import { NextRequest, NextResponse } from "next/server";
import { getEdgeFlags, ensureVisitorKeyCookie } from "flags/edge";

export const config = {
  matcher: ["/demo/middleware", "/demo/server-components"],
};

export async function middleware(request: NextRequest) {
  switch (request.nextUrl.pathname) {
    // Server Components Demo
    case "/demo/server-components": {
      if (request.cookies.has("hkvk")) return;

      const response = NextResponse.next();
      response.cookies.set;
      ensureVisitorKeyCookie(response);
      return response;
    }

    // Middleware Demo
    case "/demo/middleware": {
      const flagBag = await getEdgeFlags({ request });

      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = `/demo/middleware/${
        flagBag.flags?.checkout || "full"
      }`;
      const response = NextResponse.rewrite(nextUrl);

      if (flagBag.cookie) response.cookies.set(...flagBag.cookie.args);

      return response;
    }
  }
}
