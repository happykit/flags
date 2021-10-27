import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getFlags, EvaluationResponseBody } from "@happykit/flags/server";
import { AppFlags } from "../../../types/AppFlags";
import { NextApiRequest } from "next";

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // console.log(req.headers);
  // const { flags, data } = await getFlags<AppFlags>({ context: { req } });
  return NextResponse.rewrite(`/demo/middleware/variant-b`);
}
