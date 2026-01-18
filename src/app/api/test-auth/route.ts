import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { scrypt } from "@noble/hashes/scrypt.js";

const DEFAULT_PASSWORD = "PerformUp2024!";

// Scrypt config (same as Better Auth)
const config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedKey] = hash.split(":");
  if (!salt || !storedKey) return false;

  const key = scrypt(password.normalize("NFKC"), salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    dkLen: config.dkLen,
  });

  return bytesToHex(key) === storedKey;
}

// GET /api/test-auth?email=xxx
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        emailVerified: true,
      },
    });

    if (!user) {
      // Try case-insensitive search
      const userCaseInsensitive = await prisma.user.findFirst({
        where: {
          email: {
            mode: "insensitive",
            equals: email,
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      return NextResponse.json({
        found: false,
        exactMatch: false,
        caseInsensitiveMatch: userCaseInsensitive ? {
          found: true,
          storedEmail: userCaseInsensitive.email,
          providedEmail: email,
          hint: "Email exists but with different case",
        } : null,
      });
    }

    // Find credential account
    const account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      select: {
        id: true,
        password: true,
        providerId: true,
      },
    });

    if (!account) {
      return NextResponse.json({
        found: true,
        user: { email: user.email, role: user.role },
        account: null,
        error: "No credential account found",
      });
    }

    if (!account.password) {
      return NextResponse.json({
        found: true,
        user: { email: user.email, role: user.role },
        account: { exists: true, hasPassword: false },
        error: "Account has no password",
      });
    }

    // Verify password
    const isValid = verifyPassword(DEFAULT_PASSWORD, account.password);

    return NextResponse.json({
      found: true,
      user: {
        email: user.email,
        role: user.role,
        active: user.active,
        emailVerified: user.emailVerified,
      },
      account: {
        exists: true,
        hasPassword: true,
        passwordFormatValid: account.password.split(":").length === 2,
      },
      passwordTest: {
        testedPassword: DEFAULT_PASSWORD,
        isValid,
      },
    });
  } catch (error) {
    console.error("Error testing auth:", error);
    return NextResponse.json(
      { error: "Error testing auth", details: String(error) },
      { status: 500 }
    );
  }
}
