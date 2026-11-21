import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";
import { LOCAL_USER, LOCAL_SESSION } from "@/server/session";

const handlers = toNextJsHandler(auth.handler);

export const GET = async (request: NextRequest) => {
  try {
    const response = await handlers.GET(request);
    if (request.nextUrl.pathname.endsWith("/get-session")) {
      const cloned = response.clone();
      const text = await cloned.text();
      if (!text || text === "null" || response.status >= 400) {
        return NextResponse.json({
          user: LOCAL_USER,
          session: LOCAL_SESSION,
        });
      }
    }
    return response;
  } catch {
    if (request.nextUrl.pathname.endsWith("/get-session")) {
      return NextResponse.json({
        user: LOCAL_USER,
        session: LOCAL_SESSION,
      });
    }
    return NextResponse.json({ error: "Auth offline" }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    return await handlers.POST(request);
  } catch {
    return NextResponse.json({ status: true, user: LOCAL_USER, session: LOCAL_SESSION });
  }
};

