import { NextRequest, NextResponse } from "next/server";

import { isFeatureTourId, MAX_ONBOARDING_STEPS } from "@/lib/feature-tours";
import { getPrismaClient } from "@/server/prisma";
import { getServerSession } from "@/server/session";

export const dynamic = "force-dynamic";

const EVENTS = ["shown", "completed", "dismissed"] as const;
type TourEvent = (typeof EVENTS)[number];

// GET /api/feature-tours - When the account started, and the tours it has already been shown
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await getPrismaClient().user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true, feature_tours: { select: { tour_id: true } } },
    });
    if (!user) return NextResponse.json({ createdAt: new Date().toISOString(), seen: [] }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(
      { createdAt: user.createdAt, seen: user.feature_tours.map((tour) => tour.tour_id) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ createdAt: new Date().toISOString(), seen: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

// POST /api/feature-tours - Record that a tour was shown, then how it ended
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const event: TourEvent = body?.event === undefined ? "shown" : body.event;
  if (!isFeatureTourId(body?.id) || !EVENTS.includes(event)) {
    return NextResponse.json({ error: "Unknown tour or event" }, { status: 400 });
  }
  const step = Number.isInteger(body?.step) && body.step >= 0 && body.step <= MAX_ONBOARDING_STEPS ? body.step as number : undefined;
  const now = new Date();
  const ending = event === "completed" ? { completed_at: now } : event === "dismissed" ? { dismissed_at: now } : {};
  try {
    const prisma = getPrismaClient();
    const key = { user_id_tour_id: { user_id: session.user.id, tour_id: body.id as string } };
    const existing = await prisma.userFeatureTour.findUnique({ where: key, select: { completed_at: true, dismissed_at: true } });
    if (!existing) {
      await prisma.userFeatureTour.create({ data: { user_id: session.user.id, tour_id: body.id, ...ending, ...(step !== undefined && { last_step: step }) } });
    } else if (event !== "shown" && !existing.completed_at && !existing.dismissed_at) {
      await prisma.userFeatureTour.update({ where: key, data: { ...ending, ...(step !== undefined && { last_step: step }) } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
