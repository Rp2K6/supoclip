import { NextResponse } from "next/server";

import { getServerSession } from "@/server/session";
import { buildBackendAuthHeaders } from "@/lib/backend-auth";
import { backendTraceHeaders } from "@/server/backend-api";
import { restorePastDueEntitlement } from "@/server/stripe-subscription-sync";

const SELF_HOST_BILLING_SUMMARY = {
  plan: "scale",
  subscription_status: "active",
  subscription_provider: null,
  allowed_minutes: 99999,
  used_minutes: 0,
  remaining_minutes: 99999,
  billing_period_end: null,
  cancel_at_period_end: false,
};

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json(SELF_HOST_BILLING_SUMMARY);
  }

  const apiUrl =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  try {
    const upstream = await fetch(`${apiUrl}/tasks/billing/summary`, {
      method: "GET",
      headers: { ...buildBackendAuthHeaders(session.user.id), ...(await backendTraceHeaders()) },
      cache: "no-store",
    });

    if (upstream.ok) {
      const responseText = await upstream.text();
      const traceId = upstream.headers.get("x-trace-id");
      return new NextResponse(responseText, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "application/json",
          ...(traceId ? { "x-trace-id": traceId } : {}),
        },
      });
    }
  } catch {
    // Backend offline / not running yet
  }

  return NextResponse.json(SELF_HOST_BILLING_SUMMARY);
}

function storedPastDuePlanIsFree(responseText: string): boolean {
  try {
    const summary = JSON.parse(responseText) as {
      plan?: string;
      subscription_status?: string;
      subscription_provider?: string | null;
    };
    return (
      summary.plan === "free" &&
      summary.subscription_status === "past_due" &&
      summary.subscription_provider === "stripe"
    );
  } catch {
    return false;
  }
}
