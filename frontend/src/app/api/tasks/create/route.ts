import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { buildBackendAuthHeaders } from "@/lib/backend-auth";
import { backendTraceHeaders } from "@/server/backend-api";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.text();
  const apiUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  const idempotencyKey = request.headers.get("idempotency-key");

  try {
    const upstream = await fetch(`${apiUrl}/tasks/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildBackendAuthHeaders(session.user.id),
        ...(await backendTraceHeaders()),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      body: payload,
    });

    const responseText = await upstream.text();
    const traceId = upstream.headers.get("x-trace-id");
    return new NextResponse(responseText, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        ...(traceId ? { "x-trace-id": traceId } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to connect to backend on port 8000:", error);
    return NextResponse.json(
      {
        detail: "Backend processing service (port 8000) is not running. Please start Docker or the backend server.",
        error: "Backend unavailable",
      },
      { status: 503 }
    );
  }
}
