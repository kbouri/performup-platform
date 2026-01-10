import { cookies } from "next/headers";

const IMPERSONATION_COOKIE_NAME = "performup_impersonate";
const IMPERSONATION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export interface ImpersonationData {
  adminId: string;
  targetId: string;
  sessionId: string;
  exp: number;
}

export async function setImpersonationCookie(data: Omit<ImpersonationData, "exp">) {
  const cookieStore = await cookies();
  const exp = Date.now() + IMPERSONATION_DURATION;

  const cookieData: ImpersonationData = {
    ...data,
    exp,
  };

  cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(cookieData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: IMPERSONATION_DURATION / 1000, // in seconds
    path: "/",
  });

  return cookieData;
}

export async function getImpersonationCookie(): Promise<ImpersonationData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);

  if (!cookie) {
    return null;
  }

  try {
    const data: ImpersonationData = JSON.parse(cookie.value);

    // Check if expired
    if (data.exp < Date.now()) {
      await clearImpersonationCookie();
      return null;
    }

    return data;
  } catch {
    await clearImpersonationCookie();
    return null;
  }
}

export async function clearImpersonationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

export function isValidImpersonationTarget(targetRole: string): boolean {
  // Admin can impersonate all roles except other admins
  return ["STUDENT", "MENTOR", "PROFESSOR", "EXECUTIVE_CHEF"].includes(targetRole);
}
