import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { hash } from "bcryptjs";

// GET /api/admin/team/mentors - Liste tous les mentors
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
    const executiveChefId = searchParams.get("executiveChefId");

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (executiveChefId) {
      whereClause.executiveChefId = executiveChefId;
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

    const mentors = await prisma.mentor.findMany({
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
        executiveChef: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
        students: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            payments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get hours worked this month for each mentor
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const formattedMentors = await Promise.all(
      mentors.map(async (m) => {
        // Count mentor sessions this month
        const sessionsThisMonth = await prisma.calendarEvent.count({
          where: {
            eventType: "SESSION_MENTOR",
            student: {
              mentorId: m.id,
            },
            startTime: { gte: currentMonth },
            endTime: { lt: nextMonth },
            completed: true,
          },
        });

        return {
          id: m.id,
          userId: m.userId,
          user: m.user,
          status: m.status,
          specialties: m.specialties,
          bio: m.bio,
          hourlyRate: m.hourlyRate,
          paymentType: m.paymentType,
          executiveChef: m.executiveChef
            ? {
                id: m.executiveChef.id,
                name:
                  m.executiveChef.user.firstName && m.executiveChef.user.lastName
                    ? `${m.executiveChef.user.firstName} ${m.executiveChef.user.lastName}`
                    : m.executiveChef.user.name,
              }
            : null,
          students: m.students.map((s) => ({
            id: s.id,
            status: s.status,
            name:
              s.user.firstName && s.user.lastName
                ? `${s.user.firstName} ${s.user.lastName}`
                : s.user.name,
          })),
          studentsCount: m._count.students,
          paymentsCount: m._count.payments,
          sessionsThisMonth,
          invitedAt: m.invitedAt,
          activatedAt: m.activatedAt,
          createdAt: m.createdAt,
        };
      })
    );

    return NextResponse.json({ mentors: formattedMentors });
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des mentors" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/mentors - Creer un mentor
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
    const {
      email,
      firstName,
      lastName,
      phone,
      password,
      specialties,
      bio,
      hourlyRate,
      paymentType,
      executiveChefId,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, prenom et nom sont requis" },
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

    // Hash password if provided
    const hashedPassword = password ? await hash(password, 12) : await hash(email + Date.now(), 12);

    // Create user and mentor in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          phone,
          role: "MENTOR",
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

      // Create mentor profile
      const mentor = await tx.mentor.create({
        data: {
          userId: user.id,
          specialties: specialties || [],
          bio,
          hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
          paymentType: paymentType || "MONTHLY",
          executiveChefId,
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
          executiveChef: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE_MENTOR",
          resourceType: "Mentor",
          resourceId: mentor.id,
          metadata: {
            email,
            firstName,
            lastName,
            createdBy: session.user.email,
          },
        },
      });

      return mentor;
    });

    return NextResponse.json({ mentor: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating mentor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du mentor" },
      { status: 500 }
    );
  }
}
