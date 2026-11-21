import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export const LOCAL_USER = {
  id: "local-user-admin",
  name: "SupoClip Creator",
  email: "admin@localhost",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  is_admin: true,
  plan: "scale",
  subscription_status: "active",
};

export const LOCAL_SESSION = {
  id: "local-session-id",
  userId: LOCAL_USER.id,
  expiresAt: new Date("2099-01-01"),
  token: "local-session-token",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ipAddress: "127.0.0.1",
  userAgent: "local",
};

export async function getServerSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) return session;
  } catch {
    // If database is offline, fall back to single-user local admin
  }
  return { user: LOCAL_USER, session: LOCAL_SESSION };
}

