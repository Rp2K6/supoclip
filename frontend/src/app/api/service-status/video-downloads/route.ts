import { NextResponse } from "next/server";
import { getPrismaClient } from "@/server/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const fallback = {
    status: "operational",
    headline: "Operational",
    description: "All systems operational",
    updatedAt: new Date().toISOString(),
  };

  try {
    const component = await getPrismaClient().serviceStatus.findUnique({
      where: { id: "video-downloads" },
      select: { status: true, headline: true, description: true, updatedAt: true },
    });
    if (!component) {
      return NextResponse.json({ component: fallback }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ component }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ component: fallback }, { headers: { "Cache-Control": "no-store" } });
  }
}
