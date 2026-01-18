import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/password";

const DEFAULT_PASSWORD = "PerformUp2024!";

// GET /api/admin/team/professors - Liste tous les professeurs
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
    const type = searchParams.get("type"); // QUANT, VERBAL
    const search = searchParams.get("search");

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
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

    const professors = await prisma.professor.findMany({
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
        _count: {
          select: {
            studentsQuant: true,
            studentsVerbal: true,
            calendarEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get hours worked this month for each professor
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const formattedProfessors = await Promise.all(
      professors.map(async (p) => {
        // Count sessions this month
        const eventsThisMonth = await prisma.calendarEvent.count({
          where: {
            instructorId: p.id,
            startTime: { gte: currentMonth },
            endTime: { lt: nextMonth },
          },
        });

        const completedEventsThisMonth = await prisma.calendarEvent.count({
          where: {
            instructorId: p.id,
            startTime: { gte: currentMonth },
            endTime: { lt: nextMonth },
            completed: true,
          },
        });

        // Calculate hours (assuming 1.5h per event)
        const hoursThisMonth = completedEventsThisMonth * 1.5;
        const earningsThisMonth = p.hourlyRate
          ? (hoursThisMonth * p.hourlyRate) / 100
          : 0;

        return {
          id: p.id,
          userId: p.userId,
          user: p.user,
          type: p.type,
          status: p.status,
          hourlyRate: p.hourlyRate,
          availability: p.availability,
          studentsCount: p._count.studentsQuant + p._count.studentsVerbal,
          studentsQuantCount: p._count.studentsQuant,
          studentsVerbalCount: p._count.studentsVerbal,
          totalEventsCount: p._count.calendarEvents,
          eventsThisMonth,
          completedEventsThisMonth,
          hoursThisMonth,
          earningsThisMonth,
          invitedAt: p.invitedAt,
          activatedAt: p.activatedAt,
          createdAt: p.createdAt,
        };
      })
    );

    return NextResponse.json({ professors: formattedProfessors });
  } catch (error) {
    console.error("Error fetching professors:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des professeurs" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/professors - Creer un professeur
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
    const { email, firstName, lastName, phone, password, type, hourlyRate, availability } =
      body;

    // Validate required fields
    if (!email || !firstName || !lastName || !type) {
      return NextResponse.json(
        { error: "Email, prenom, nom et type sont requis" },
        { status: 400 }
      );
    }

    if (!["QUANT", "VERBAL"].includes(type)) {
      return NextResponse.json(
        { error: "Type doit etre QUANT ou VERBAL" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe deja" },
        { status: 400 }
      );
    }

    // Hash password using Better Auth scrypt format (use default if not provided)
    const hashedPassword = hashPassword(password || DEFAULT_PASSWORD);

    // Create user and professor in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          phone,
          role: "PROFESSOR",
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

      // Create professor profile
      const professor = await tx.professor.create({
        data: {
          userId: user.id,
          type,
          hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
          availability: availability || null,
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
          action: "CREATE_PROFESSOR",
          resourceType: "Professor",
          resourceId: professor.id,
          metadata: {
            email,
            firstName,
            lastName,
            type,
            createdBy: session.user.email,
          },
        },
      });

      return professor;
    });

    return NextResponse.json({ professor: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating professor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du professeur" },
      { status: 500 }
    );
  }
}
