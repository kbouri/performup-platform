import { NextRequest, NextResponse } from "next/server";
import { auth, canAccessStudent, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/students - List students with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canAccessStudent(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const mentorId = searchParams.get("mentorId") || "all";
    const packId = searchParams.get("packId") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Search filter (name, email)
    if (search) {
      where.OR = [
        {
          user: {
            name: { contains: search, mode: "insensitive" },
          },
        },
        {
          user: {
            email: { contains: search, mode: "insensitive" },
          },
        },
        {
          user: {
            firstName: { contains: search, mode: "insensitive" },
          },
        },
        {
          user: {
            lastName: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Status filter
    if (status !== "all") {
      where.status = status;
    }

    // Mentor filter
    if (mentorId !== "all") {
      where.mentorId = mentorId;
    }

    // Pack filter
    if (packId !== "all") {
      where.packs = {
        some: {
          packId: packId,
        },
      };
    }

    // If user is a mentor, only show their students
    if (session.user.role === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: session.user.id },
      });
      if (mentor) {
        where.mentorId = mentor.id;
      }
    }

    // If user is a professor, only show their students
    if (session.user.role === "PROFESSOR") {
      const professor = await prisma.professor.findUnique({
        where: { userId: session.user.id },
      });
      if (professor) {
        where.OR = [
          { professorQuantId: professor.id },
          { professorVerbalId: professor.id },
        ];
      }
    }

    // Get total count
    const total = await prisma.student.count({ where });

    // Get students
    const students = await prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            image: true,
            active: true,
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        packs: {
          include: {
            pack: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        schools: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
          },
        },
        paymentSchedules: {
          select: {
            amount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
    });

    // Calculate computed fields
    const studentsWithComputed = students.map((student) => {
      // Calculate total paid
      const totalPaid = student.payments
        .filter((p) => p.status === "VALIDATED")
        .reduce((acc, p) => acc + p.amount, 0);

      // Calculate total due
      const totalDue = student.paymentSchedules.reduce(
        (acc, ps) => acc + ps.amount,
        0
      );

      // Calculate average progress across packs
      const averageProgress =
        student.packs.length > 0
          ? Math.round(
              student.packs.reduce((acc, p) => acc + p.progressPercent, 0) /
                student.packs.length
            )
          : 0;

      return {
        id: student.id,
        userId: student.userId,
        name: student.user.name,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        phone: student.user.phone,
        image: student.user.image,
        active: student.user.active,
        status: student.status,
        startDate: student.startDate,
        programType: student.programType,
        nationality: student.nationality,
        currentFormation: student.currentFormation,
        mentor: student.mentor
          ? {
              id: student.mentor.id,
              name:
                student.mentor.user.name ||
                `${student.mentor.user.firstName || ""} ${student.mentor.user.lastName || ""}`.trim(),
            }
          : null,
        packs: student.packs.map((p) => ({
          id: p.id,
          packId: p.packId,
          displayName: p.pack.displayName,
          progress: p.progressPercent,
          status: p.status,
          customPrice: p.customPrice,
        })),
        schools: student.schools.map((s) => ({
          id: s.school.id,
          name: s.school.name,
          priority: s.priority,
          status: s.status,
        })),
        totalPaid,
        totalDue,
        progress: averageProgress,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      };
    });

    return NextResponse.json({
      students: studentsWithComputed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des étudiants" },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canManageStudents(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const {
      personalInfo,
      packs,
      team,
      schools,
      internalNotes,
    } = body;

    // Validate required fields
    if (!personalInfo?.email) {
      return NextResponse.json(
        { error: "L'email est requis" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: personalInfo.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      );
    }

    // Create user and student in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email: personalInfo.email,
          name: `${personalInfo.firstName || ""} ${personalInfo.lastName || ""}`.trim() || personalInfo.email,
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          phone: personalInfo.phone,
          role: "STUDENT",
          emailVerified: false,
          active: true,
        },
      });

      // Create the student profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          dateOfBirth: personalInfo.dateOfBirth
            ? new Date(personalInfo.dateOfBirth)
            : null,
          nationality: personalInfo.nationality,
          currentFormation: personalInfo.currentFormation,
          linkedinUrl: personalInfo.linkedinUrl,
          programType: personalInfo.programType || "MASTER",
          mentorId: team?.mentorId,
          professorQuantId: team?.professorQuantId,
          professorVerbalId: team?.professorVerbalId,
          internalNotes: internalNotes,
          status: "EN_DEMARRAGE",
          startDate: new Date(),
        },
      });

      // Create student packs
      if (packs && Array.isArray(packs)) {
        for (const packData of packs) {
          if (packData.selected && packData.packId) {
            await tx.studentPack.create({
              data: {
                studentId: student.id,
                packId: packData.packId,
                customPrice: packData.customPrice || 0,
                config: packData.config || {},
                status: "active",
                startDate: new Date(),
              },
            });
          }
        }
      }

      // Create student schools
      if (schools && Array.isArray(schools)) {
        for (const schoolData of schools) {
          await tx.studentSchool.create({
            data: {
              studentId: student.id,
              schoolId: schoolData.schoolId,
              programId: schoolData.programId,
              priority: schoolData.priority || 1,
              status: "TARGET",
            },
          });
        }
      }

      return { user, student };
    });

    // Return the created student
    const createdStudent = await prisma.student.findUnique({
      where: { id: result.student.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        packs: {
          include: {
            pack: true,
          },
        },
        schools: {
          include: {
            school: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        student: createdStudent,
        message: "Étudiant créé avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'étudiant" },
      { status: 500 }
    );
  }
}
