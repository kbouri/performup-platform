import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/password";

const DEFAULT_PASSWORD = "PerformUp2024!";

// GET /api/admin/team/executive-chefs - Liste tous les chefs executifs
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.user = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const executiveChefs = await prisma.executiveChef.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            phone: true,
            active: true,
          },
        },
        mentors: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        _count: {
          select: {
            mentors: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedExecutiveChefs = executiveChefs.map((ec) => {
      // Calculate total students supervised (through mentors)
      const totalStudentsSupervised = ec.mentors.reduce(
        (sum, m) => sum + m._count.students,
        0
      );

      return {
        id: ec.id,
        userId: ec.userId,
        user: ec.user,
        status: ec.status,
        mentors: ec.mentors.map((m) => ({
          id: m.id,
          name:
            m.user.firstName && m.user.lastName
              ? `${m.user.firstName} ${m.user.lastName}`
              : m.user.name,
          studentsCount: m._count.students,
        })),
        mentorsCount: ec._count.mentors,
        totalStudentsSupervised,
        invitedAt: ec.invitedAt,
        activatedAt: ec.activatedAt,
        createdAt: ec.createdAt,
      };
    });

    return NextResponse.json({ executiveChefs: formattedExecutiveChefs });
  } catch (error) {
    console.error("Error fetching executive chefs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des chefs executifs" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/executive-chefs - Creer un chef executif
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { email, firstName, lastName, phone, password } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, prenom et nom sont requis" },
        { status: 400 }
      );
    }

    // Normalize email to lowercase for case-insensitive login
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe deja" },
        { status: 400 }
      );
    }

    // Hash password using Better Auth scrypt format (use default if not provided)
    const hashedPassword = hashPassword(password || DEFAULT_PASSWORD);

    // Create user and executive chef in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          phone,
          role: "EXECUTIVE_CHEF",
          active: true,
          emailVerified: false,
        },
      });

      // Create account with password
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      // Create executive chef profile
      const executiveChef = await tx.executiveChef.create({
        data: {
          userId: user.id,
          status: "ACTIVE",
          activatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_EXECUTIVE_CHEF",
          resourceType: "ExecutiveChef",
          resourceId: executiveChef.id,
          metadata: {
            email,
            firstName,
            lastName,
            createdBy: session.user.email,
          },
        },
      });

      return executiveChef;
    });

    return NextResponse.json({ executiveChef: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating executive chef:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du chef executif" },
      { status: 500 }
    );
  }
}
