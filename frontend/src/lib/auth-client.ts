import { createAuthClient } from "better-auth/react";
import { useSyncExternalStore } from "react";

export const authClient = createAuthClient();

export const { signIn, signOut, signUp, requestPasswordReset, resetPassword } = authClient;

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export const LOCAL_CLIENT_USER = {
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

export const LOCAL_CLIENT_SESSION = {
  id: "local-session-id",
  userId: "local-user-admin",
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  token: "local-session-token",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

export function useSession(...args: Parameters<typeof authClient.useSession>) {
  const session = authClient.useSession(...args);
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);

  if (!hydrated) {
    return { ...session, data: null, isPending: true };
  }

  const effectiveData = session.data?.user ? session.data : {
    user: LOCAL_CLIENT_USER,
    session: LOCAL_CLIENT_SESSION,
  };

  return {
    ...session,
    data: effectiveData,
    isPending: false,
  };
}

